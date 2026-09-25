import { app, BrowserWindow, ipcMain, safeStorage, session, shell, type IpcMainInvokeEvent } from 'electron'
import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { log, logMemory, openLogFolder, setupLogging } from './logging'
import { readPopoutStore, recordFromWindow, resolvePopoutBounds, writePopoutStore, type SavedPopout } from './popoutStore'
import { EMPTY_PROVIDER_AUTH, toPublicAuthState, type AuthState, type ProviderAuthState, type PublicAuthState } from '../lib/authState'
import type { PlatformId } from '../lib/platformId'
import { revokeTwitchToken, validateTwitchToken } from '../lib/twitchAuthApi'

const moduleDir = dirname(fileURLToPath(import.meta.url))

setupLogging()

type PopoutKind = 'stream' | 'chat'

type PopoutRecord = {
  channel: string
  kind: PopoutKind
  platform: PlatformId
  win: BrowserWindow
  alwaysOnTop: boolean
}

const popouts = new Map<string, PopoutRecord>()
let popoutDisk: Record<string, SavedPopout> = {}

let mainWindow: BrowserWindow | null = null
let clickThrough = false
let clickThroughLocked = false

// Main is the sole owner of the Twitch session: the one place that reads/writes
// twitch-auth.bin, the one validation timer, the one thing that can clear it.
// Renderers only ever see a sanitized PublicAuthState (auth:get-session,
// auth:changed) or, if they're the desk or a chat pop-out, the raw token via
// auth:get-chat-credentials — never through a generic load/save bridge a
// window could call unprompted.
let currentAuth: AuthState = { twitch: EMPTY_PROVIDER_AUTH }
let authWriteChain: Promise<void> = Promise.resolve()
let validateTimer: NodeJS.Timeout | null = null
const VALIDATE_INTERVAL_MS = 60 * 60 * 1000

// Platform is part of the key so a Twitch and a Kick pop-out sharing a
// channel name (e.g. both "xqc") never collide in this Map.
function popoutKey(kind: PopoutKind, platform: PlatformId, channel: string) {
  // YouTube video ids are case-sensitive; channel names are not.
  return `${kind}:${platform}:${platform === 'youtube' ? channel : channel.toLowerCase()}`
}

function preloadPath() {
  // `"type": "module"` emits ESM preload as index.mjs and requires sandbox: false.
  for (const name of ['index.mjs', 'index.js', 'index.cjs']) {
    const candidate = join(moduleDir, '../preload', name)
    if (existsSync(candidate)) return candidate
  }
  return join(moduleDir, '../preload/index.mjs')
}

/** The logo for the taskbar, Alt-Tab, and window icons (the EXE icon comes from electron-builder). */
function appIconPath() {
  const packaged = join(process.resourcesPath, 'icon.png')
  if (app.isPackaged && existsSync(packaged)) return packaged
  const dev = join(app.getAppPath(), 'build/icon.png')
  return existsSync(dev) ? dev : undefined
}

function loadRenderer(win: BrowserWindow, search = '') {
  const q = search.startsWith('?') || search === '' ? search : `?${search}`
  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
    void win.loadURL(`${process.env.ELECTRON_RENDERER_URL}${q}`)
    return
  }
  void win.loadFile(join(moduleDir, '../renderer/index.html'), {
    search: q.replace(/^\?/, ''),
  })
}

function broadcastPopouts() {
  const payload = [...popouts.values()].map((p) => ({
    channel: p.channel,
    kind: p.kind,
    platform: p.platform,
    alwaysOnTop: p.alwaysOnTop,
  }))
  mainWindow?.webContents.send('popouts:changed', payload)
  for (const rec of popouts.values()) {
    if (!rec.win.isDestroyed()) rec.win.webContents.send('popouts:changed', payload)
  }
}

const YOUTUBE_REFERER = 'https://com.justin.vesperdesk/'

const isWebUrl = (url: string) => /^https?:\/\//i.test(url)

// These windows expose the preload API: embeds may only open http(s) links in the browser, never navigate the app.
function hardenWindow(win: BrowserWindow) {
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isWebUrl(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (event, url) => {
    if (url !== win.webContents.getURL()) event.preventDefault()
  })
}

function clickThroughActive() {
  return clickThrough && !clickThroughLocked
}

function applyClickThrough() {
  if (!mainWindow || mainWindow.isDestroyed()) return
  if (clickThroughActive()) {
    // Stay above windows that receive the passed-through clicks, so the chrome
    // cannot drop behind the desktop when click-through unlocks.
    mainWindow.setAlwaysOnTop(true, 'floating')
    return
  }
  mainWindow.setAlwaysOnTop(false)
  mainWindow.setIgnoreMouseEvents(false)
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 880,
    minHeight: 560,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    title: 'Vesper Desk',
    show: false,
    autoHideMenuBar: true,
    thickFrame: true,
    icon: appIconPath(),
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.maximize()
    mainWindow?.show()
  })

  mainWindow.on('minimize', () => mainWindow?.webContents.send('window:minimized-changed', true))
  mainWindow.on('restore', () => mainWindow?.webContents.send('window:minimized-changed', false))
  mainWindow.on('enter-full-screen', () => {
    mainWindow?.webContents.send('window:fullscreen-changed', true)
  })
  mainWindow.on('leave-full-screen', () => {
    mainWindow?.webContents.send('window:fullscreen-changed', false)
  })

  mainWindow.on('closed', () => {
    mainWindow = null
    // Closing the desk quits. Pop-outs veto their own close (it docks them), so without this an
    // OS close (Alt+F4, taskbar) left them running with no desk to dock into.
    app.quit()
  })

  hardenWindow(mainWindow)
  loadRenderer(mainWindow)
}

function rememberPopout(key: string, saved: SavedPopout) {
  popoutDisk = { ...popoutDisk, [key]: saved }
  writePopoutStore(popoutDisk)
}

function persistPopoutWindow(key: string) {
  const rec = popouts.get(key)
  if (!rec || rec.win.isDestroyed()) return
  rememberPopout(key, recordFromWindow(rec.win, rec.alwaysOnTop))
}

function openPopout(kind: PopoutKind, platform: PlatformId, channel: string) {
  const key = popoutKey(kind, platform, channel)
  const existing = popouts.get(key)
  if (existing && !existing.win.isDestroyed()) {
    existing.win.focus()
    return
  }

  log.info(`pop-out open ${key}`)
  const saved = resolvePopoutBounds(popoutDisk[key])
  const win = new BrowserWindow({
    width: saved?.width ?? (kind === 'chat' ? 340 : 960),
    height: saved?.height ?? (kind === 'chat' ? 560 : 540),
    ...(saved ? { x: saved.x, y: saved.y } : {}),
    minWidth: kind === 'chat' ? 260 : 420,
    minHeight: 280,
    frame: false,
    title: kind === 'chat' ? `#${channel}` : channel,
    backgroundColor: '#0c0a10',
    autoHideMenuBar: true,
    thickFrame: true,
    icon: appIconPath(),
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  const alwaysOnTop = Boolean(saved?.alwaysOnTop)
  if (alwaysOnTop) win.setAlwaysOnTop(true, 'floating')

  const rec: PopoutRecord = { channel, kind, platform, win, alwaysOnTop }
  popouts.set(key, rec)

  hardenWindow(win)
  win.on('moved', () => persistPopoutWindow(key))
  win.on('resized', () => persistPopoutWindow(key))
  win.on('close', (event) => {
    event.preventDefault()
    dockPopout(kind, platform, channel)
  })

  loadRenderer(win, `mode=${kind}&channel=${encodeURIComponent(channel)}&platform=${platform}`)
  broadcastPopouts()
}

function dockPopout(kind: PopoutKind, platform: PlatformId, channel: string) {
  const key = popoutKey(kind, platform, channel)
  const rec = popouts.get(key)
  if (!rec) return
  log.info(`pop-out dock ${key}`)
  if (!rec.win.isDestroyed()) {
    persistPopoutWindow(key)
    rec.win.destroy()
  }
  popouts.delete(key)
  mainWindow?.webContents.send('popouts:dock-request', {
    channel: rec.channel,
    kind: rec.kind,
    platform: rec.platform,
  })
  broadcastPopouts()
}

function openTwitchLogin() {
  const loginWin = new BrowserWindow({
    width: 520,
    height: 720,
    parent: mainWindow ?? undefined,
    title: 'Login to Twitch',
    backgroundColor: '#0c0a10',
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  })
  void loginWin.loadURL('https://www.twitch.tv/login')
  loginWin.webContents.on('did-navigate', (_e, url) => {
    if (url.includes('twitch.tv') && !url.includes('/login') && !url.includes('/signup')) {
      mainWindow?.webContents.send('twitch-session-updated')
      setTimeout(() => loginWin.close(), 350)
    }
  })
}

/** Load twitch.tv once in the shared session so player embeds pick up the new login cookies. */
function warmTwitchCookies() {
  return new Promise<void>((resolve) => {
    const warm = new BrowserWindow({
      show: false,
      webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
    })
    let finished = false
    const done = () => {
      if (finished) return
      finished = true
      if (!warm.isDestroyed()) warm.destroy()
      resolve()
    }
    setTimeout(done, 5000)
    warm.webContents.once('did-finish-load', done)
    warm.webContents.once('did-fail-load', done)
    void warm.loadURL('https://www.twitch.tv/')
  })
}

async function openTwitchOAuth(clientId: string, redirectUri: string, scopes: string[]) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'token',
    scope: scopes.join(' '),
    force_verify: 'true',
  })
  const authUrl = `https://id.twitch.tv/oauth2/authorize?${params.toString()}`
  log.info(`twitch oauth start (scopes: ${scopes.join(' ')})`)

  return new Promise<{ accessToken: string; scope: string } | null>((resolve) => {
    const authWin = new BrowserWindow({
      width: 520,
      height: 720,
      parent: mainWindow ?? undefined,
      modal: true,
      title: 'Authorize Vesper Desk',
      backgroundColor: '#0c0a10',
      webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
    })
    let settled = false
    const finish = (result: { accessToken: string; scope: string } | null) => {
      if (settled) return
      settled = true
      if (!authWin.isDestroyed()) authWin.close()
      if (!result) {
        log.warn('twitch oauth cancelled or closed before a token arrived')
        resolve(null)
        return
      }
      log.info(`twitch oauth ok (granted: ${result.scope})`)
      void warmTwitchCookies().finally(() => {
        mainWindow?.webContents.send('twitch-session-updated')
        resolve(result)
      })
    }
    authWin.on('closed', () => finish(null))
    // The redirect URI is never served: the token is read from the redirect URL itself, so the
    // packaged build needs no dev server on localhost:5173.
    const tryParseHash = (url: string) => {
      if (!url.startsWith(redirectUri) && !url.includes('access_token=')) return
      const hash = url.includes('#') ? url.slice(url.indexOf('#') + 1) : ''
      const data = new URLSearchParams(hash)
      const accessToken = data.get('access_token')
      const scope = data.get('scope') ?? scopes.join(' ')
      if (accessToken) finish({ accessToken, scope })
    }
    authWin.webContents.on('will-redirect', (_e, url) => tryParseHash(url))
    authWin.webContents.on('will-navigate', (_e, url) => tryParseHash(url))
    authWin.webContents.on('did-navigate', (_e, url) => tryParseHash(url))
    void authWin.loadURL(authUrl)
  })
}

function authFilePath() {
  return join(app.getPath('userData'), 'twitch-auth.bin')
}

/**
 * The stored file is a 1-byte marker (1 = safeStorage-encrypted, 0 = plain
 * JSON) followed by the payload. safeStorage needs an OS keychain (DPAPI on
 * Windows, always available; some headless Linux setups have none) — the
 * plain fallback keeps auth working there instead of failing to persist.
 */
async function loadTwitchAuthFile(): Promise<AuthState | null> {
  try {
    const buf = await readFile(authFilePath())
    const marker = buf[0]
    const body = buf.subarray(1)
    const json = marker === 1 ? safeStorage.decryptString(body) : body.toString('utf8')
    return JSON.parse(json) as AuthState
  } catch {
    return null
  }
}

async function saveTwitchAuthFile(auth: AuthState): Promise<void> {
  const json = JSON.stringify(auth)
  const encrypt = safeStorage.isEncryptionAvailable()
  if (!encrypt) log.warn('safeStorage encryption unavailable; storing Twitch auth unencrypted')
  const body = encrypt ? safeStorage.encryptString(json) : Buffer.from(json, 'utf8')
  await writeFile(authFilePath(), Buffer.concat([Buffer.from([encrypt ? 1 : 0]), body]))
}

function isMainWindowSender(event: IpcMainInvokeEvent): boolean {
  return BrowserWindow.fromWebContents(event.sender) === mainWindow
}

/** The pop-out kind hosted by this sender's window, or null (desk, or not a pop-out at all). */
function popoutKindForSender(event: IpcMainInvokeEvent): PopoutKind | null {
  const win = BrowserWindow.fromWebContents(event.sender)
  for (const rec of popouts.values()) {
    if (rec.win === win) return rec.kind
  }
  return null
}

function publicAuthState(): PublicAuthState {
  return toPublicAuthState(currentAuth.twitch)
}

function broadcastAuthChanged() {
  const payload = publicAuthState()
  mainWindow?.webContents.send('auth:changed', payload)
  for (const rec of popouts.values()) {
    if (!rec.win.isDestroyed()) rec.win.webContents.send('auth:changed', payload)
  }
}

/** The only place that writes twitch-auth.bin — serialized so a migrate/login/logout
 * race can't interleave two writes or broadcast a stale intermediate state. */
function persistAuth(next: AuthState): Promise<void> {
  currentAuth = next
  authWriteChain = authWriteChain
    .then(() => saveTwitchAuthFile(next))
    .catch((err: unknown) => log.error('failed to write twitch-auth.bin:', err))
  const result = authWriteChain
  broadcastAuthChanged()
  scheduleValidation()
  return result
}

function scheduleValidation() {
  if (validateTimer) {
    clearInterval(validateTimer)
    validateTimer = null
  }
  if (!currentAuth.twitch.accessToken) return
  void runValidation()
  validateTimer = setInterval(() => void runValidation(), VALIDATE_INTERVAL_MS)
}

async function runValidation() {
  const token = currentAuth.twitch.accessToken
  if (!token) return
  // Test-only escape hatch: the e2e harness seeds a fake token to exercise the
  // migrate/chat-credentials path without a real Twitch session, and Node's
  // own fetch (not Chromium's, so it's not proxy-mockable from Playwright) would
  // otherwise correctly — but unhelpfully, for a test — flag it invalid.
  if (process.env.VD_E2E_SKIP_TWITCH_VALIDATE === '1') return
  const result = await validateTwitchToken(token)
  if (result !== 'invalid') return
  if (currentAuth.twitch.accessToken !== token) return // already changed under us
  log.warn('twitch token no longer valid (401); signing out')
  await persistAuth({ twitch: EMPTY_PROVIDER_AUTH })
}

/** Adopts a pre-safeStorage localStorage blob only if nothing is stored yet, so a
 * pop-out's stale read of an old key can never clobber a newer, main-owned session. */
async function migrateLegacyAuth(legacy: ProviderAuthState): Promise<void> {
  if (currentAuth.twitch.accessToken || !legacy?.accessToken) return
  await persistAuth({ twitch: legacy })
}

async function loginWithSession(session_: ProviderAuthState): Promise<void> {
  await persistAuth({ twitch: session_ })
}

async function logoutTwitch(clientId: string): Promise<void> {
  const token = currentAuth.twitch.accessToken
  if (token && clientId?.trim()) {
    await revokeTwitchToken(clientId.trim(), token)
  }
  await persistAuth({ twitch: EMPTY_PROVIDER_AUTH })
  await session.defaultSession.clearStorageData({ storages: ['cookies'] })
}

app.whenReady().then(() => {
  // Twitch's player rejects a file:// parent via frame-ancestors; strip CSP there only, not on login/OAuth pages.
  session.defaultSession.webRequest.onHeadersReceived(
    { urls: ['https://player.twitch.tv/*', 'https://embed.twitch.tv/*'] },
    (details, callback) => {
      const headers = { ...details.responseHeaders }
      delete headers['Content-Security-Policy']
      delete headers['content-security-policy']
      callback({ responseHeaders: headers })
    },
  )

  // YouTube rejects embeds with no Referer (Error 153) and file:// sends none; identify as the app id instead.
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ['https://www.youtube.com/embed/*', 'https://www.youtube-nocookie.com/embed/*'] },
    (details, callback) => {
      const headers = { ...details.requestHeaders }
      if (!headers.Referer && !headers.referer) headers.Referer = YOUTUBE_REFERER
      callback({ requestHeaders: headers })
    },
  )

  ipcMain.handle('window:minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize()
  })
  ipcMain.handle('window:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return false
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
    return win.isMaximized()
  })
  ipcMain.handle('window:close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win === mainWindow) {
      app.quit()
      return
    }
    win?.close()
  })
  ipcMain.handle('window:is-maximized', (event) => {
    return BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false
  })
  ipcMain.handle('window:quit', () => {
    app.quit()
  })
  ipcMain.handle('window:set-click-through', (_e, enabled: boolean) => {
    if (clickThrough !== Boolean(enabled)) log.info(`see-through ${enabled ? 'on' : 'off'}`)
    clickThrough = Boolean(enabled)
    applyClickThrough()
  })
  ipcMain.handle('window:set-click-through-locked', (_e, locked: boolean) => {
    if (clickThroughLocked !== Boolean(locked)) log.info(`window lock ${locked ? 'on' : 'off'}`)
    clickThroughLocked = Boolean(locked)
    applyClickThrough()
  })
  ipcMain.handle('window:set-ignore-mouse', (_e, ignore: boolean) => {
    if (!mainWindow || mainWindow.isDestroyed()) return
    if (!clickThroughActive()) {
      mainWindow.setIgnoreMouseEvents(false)
      return
    }
    if (ignore) mainWindow.setIgnoreMouseEvents(true, { forward: true })
    else mainWindow.setIgnoreMouseEvents(false)
  })
  ipcMain.handle('window:set-fullscreen', (_event, value: boolean) => {
    if (!mainWindow || mainWindow.isDestroyed()) return false
    mainWindow.setFullScreen(Boolean(value))
    return mainWindow.isFullScreen()
  })
  ipcMain.handle('window:is-fullscreen', () => mainWindow?.isFullScreen() ?? false)
  ipcMain.handle('window:set-always-on-top', (event, enabled: boolean) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return false
    const on = Boolean(enabled)
    if (on) win.setAlwaysOnTop(true, 'floating')
    else win.setAlwaysOnTop(false)
    for (const [key, rec] of popouts) {
      if (rec.win !== win) continue
      rec.alwaysOnTop = on
      rememberPopout(key, recordFromWindow(win, on))
    }
    broadcastPopouts()
    return win.isAlwaysOnTop()
  })
  ipcMain.handle('popout:get-always-on-top', (event) => {
    return BrowserWindow.fromWebContents(event.sender)?.isAlwaysOnTop() ?? false
  })
  ipcMain.handle('window:open-external', (_e, url: string) => {
    if (typeof url === 'string' && isWebUrl(url)) void shell.openExternal(url)
  })

  // Login/logout/save are desk-only: a pop-out has no login UI and must not be able
  // to trigger or blindly overwrite the session (see the auth ownership comment above).
  ipcMain.handle('twitch:open-login', (event) => {
    if (isMainWindowSender(event)) openTwitchLogin()
  })
  ipcMain.handle(
    'twitch:oauth',
    async (event, payload: { clientId: string; redirectUri: string; scopes: string[] }) =>
      isMainWindowSender(event)
        ? openTwitchOAuth(payload.clientId, payload.redirectUri, payload.scopes)
        : null,
  )
  ipcMain.handle('auth:get-session', () => publicAuthState())
  // Any window may call this: it's read-only, and only adopts a legacy blob when main
  // has nothing stored yet, so a pop-out calling it can never clobber a live session.
  ipcMain.handle('auth:migrate-legacy', (_e, legacy: ProviderAuthState) => migrateLegacyAuth(legacy))
  ipcMain.handle('auth:login', (event, session_: ProviderAuthState) =>
    isMainWindowSender(event) ? loginWithSession(session_) : undefined,
  )
  ipcMain.handle('auth:logout', (event, clientId: string) =>
    isMainWindowSender(event) ? logoutTwitch(clientId) : undefined,
  )
  // The raw token only ever goes to the desk or a chat pop-out (tmi.js needs it for
  // IRC login) — never a video pop-out, which hosts Twitch/Kick/YouTube player scripts
  // and has no reason to hold a credential it doesn't use.
  ipcMain.handle('auth:get-chat-credentials', (event) => {
    const isChatWindow = isMainWindowSender(event) || popoutKindForSender(event) === 'chat'
    if (!isChatWindow) return null
    const { accessToken, username } = currentAuth.twitch
    return accessToken && username ? { username, accessToken } : null
  })

  ipcMain.handle(
    'popout:open',
    (_e, payload: { kind: PopoutKind; platform: PlatformId; channel: string }) => {
      if (payload?.channel) openPopout(payload.kind, payload.platform, payload.channel.trim())
    },
  )
  ipcMain.handle(
    'popout:dock',
    (_e, payload: { kind: PopoutKind; platform: PlatformId; channel: string }) => {
      if (payload?.channel) dockPopout(payload.kind, payload.platform, payload.channel.trim())
    },
  )
  ipcMain.handle('popout:dock-all', () => {
    for (const rec of [...popouts.values()]) {
      dockPopout(rec.kind, rec.platform, rec.channel)
    }
  })
  ipcMain.handle('popout:list', () =>
    [...popouts.values()].map((p) => ({
      channel: p.channel,
      kind: p.kind,
      platform: p.platform,
      alwaysOnTop: p.alwaysOnTop,
    })),
  )

  ipcMain.handle('log:open-folder', async () => {
    const error = await openLogFolder()
    if (error) log.warn(`open log folder failed: ${error}`)
    return error
  })

  popoutDisk = readPopoutStore()
  void loadTwitchAuthFile().then((stored) => {
    currentAuth = stored ?? { twitch: EMPTY_PROVIDER_AUTH }
    scheduleValidation()
  })
  createMainWindow()
  setTimeout(() => logMemory('startup'), 60_000)
  setInterval(() => logMemory('periodic'), 10 * 60_000)
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('before-quit', () => {
  log.info('quitting')
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
