import { app, BrowserWindow, ipcMain, session, shell } from 'electron'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readPopoutStore, recordFromWindow, resolvePopoutBounds, writePopoutStore, type SavedPopout } from './popoutStore'

const moduleDir = dirname(fileURLToPath(import.meta.url))

type PopoutKind = 'stream' | 'chat'

type PopoutRecord = {
  channel: string
  kind: PopoutKind
  win: BrowserWindow
  alwaysOnTop: boolean
}

const popouts = new Map<string, PopoutRecord>()
let popoutDisk: Record<string, SavedPopout> = {}

let mainWindow: BrowserWindow | null = null
let clickThrough = false
let clickThroughLocked = false

function popoutKey(kind: PopoutKind, channel: string) {
  return `${kind}:${channel.toLowerCase()}`
}

function preloadPath() {
  // `"type": "module"` emits ESM preload as index.mjs and requires sandbox: false.
  for (const name of ['index.mjs', 'index.js', 'index.cjs']) {
    const candidate = join(moduleDir, '../preload', name)
    if (existsSync(candidate)) return candidate
  }
  return join(moduleDir, '../preload/index.mjs')
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
    alwaysOnTop: p.alwaysOnTop,
  }))
  mainWindow?.webContents.send('popouts:changed', payload)
  for (const rec of popouts.values()) {
    if (!rec.win.isDestroyed()) rec.win.webContents.send('popouts:changed', payload)
  }
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

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

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

function openPopout(kind: PopoutKind, channel: string) {
  const key = popoutKey(kind, channel)
  const existing = popouts.get(key)
  if (existing && !existing.win.isDestroyed()) {
    existing.win.focus()
    return
  }

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
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  const alwaysOnTop = Boolean(saved?.alwaysOnTop)
  if (alwaysOnTop) win.setAlwaysOnTop(true, 'floating')

  const rec: PopoutRecord = { channel, kind, win, alwaysOnTop }
  popouts.set(key, rec)

  win.on('moved', () => persistPopoutWindow(key))
  win.on('resized', () => persistPopoutWindow(key))
  win.on('close', (event) => {
    event.preventDefault()
    dockPopout(kind, channel)
  })

  loadRenderer(win, `mode=${kind}&channel=${encodeURIComponent(channel)}`)
  broadcastPopouts()
}

function dockPopout(kind: PopoutKind, channel: string) {
  const key = popoutKey(kind, channel)
  const rec = popouts.get(key)
  if (!rec) return
  if (!rec.win.isDestroyed()) {
    persistPopoutWindow(key)
    rec.win.destroy()
  }
  popouts.delete(key)
  mainWindow?.webContents.send('popouts:dock-request', { channel: rec.channel, kind: rec.kind })
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
        resolve(null)
        return
      }
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

app.whenReady().then(() => {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const headers = { ...details.responseHeaders }
    delete headers['Content-Security-Policy']
    delete headers['content-security-policy']
    callback({ responseHeaders: headers })
  })

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
    clickThrough = Boolean(enabled)
    applyClickThrough()
  })
  ipcMain.handle('window:set-click-through-locked', (_e, locked: boolean) => {
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
    if (typeof url === 'string' && /^https?:\/\//.test(url)) void shell.openExternal(url)
  })

  ipcMain.handle('twitch:open-login', () => openTwitchLogin())
  ipcMain.handle(
    'twitch:oauth',
    async (_e, payload: { clientId: string; redirectUri: string; scopes: string[] }) =>
      openTwitchOAuth(payload.clientId, payload.redirectUri, payload.scopes),
  )
  ipcMain.handle('twitch:clear-session', async () => {
    // Cookies only. Renderer localStorage holds the desk layout and must survive logout.
    await session.defaultSession.clearStorageData({ storages: ['cookies'] })
    mainWindow?.webContents.send('twitch-session-updated')
  })

  ipcMain.handle('popout:open', (_e, payload: { kind: PopoutKind; channel: string }) => {
    if (payload?.channel) openPopout(payload.kind, payload.channel.trim().toLowerCase())
  })
  ipcMain.handle('popout:dock', (_e, payload: { kind: PopoutKind; channel: string }) => {
    if (payload?.channel) dockPopout(payload.kind, payload.channel.trim().toLowerCase())
  })
  ipcMain.handle('popout:dock-all', () => {
    for (const rec of [...popouts.values()]) {
      dockPopout(rec.kind, rec.channel)
    }
  })
  ipcMain.handle('popout:list', () =>
    [...popouts.values()].map((p) => ({
      channel: p.channel,
      kind: p.kind,
      alwaysOnTop: p.alwaysOnTop,
    })),
  )

  popoutDisk = readPopoutStore()
  createMainWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
