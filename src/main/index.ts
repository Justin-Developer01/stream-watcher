import { app, BrowserWindow, ipcMain, session, shell } from 'electron'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

type PopoutKind = 'stream' | 'chat'

type PopoutRecord = {
  channel: string
  kind: PopoutKind
  win: BrowserWindow
  alwaysOnTop: boolean
}

const popouts = new Map<string, PopoutRecord>()
const boundsStore = new Map<string, Electron.Rectangle>()

let mainWindow: BrowserWindow | null = null
let clickThrough = false
let clickThroughLocked = false

function popoutKey(kind: PopoutKind, channel: string) {
  return `${kind}:${channel.toLowerCase()}`
}

function preloadPath() {
  const mjs = join(__dirname, '../preload/index.mjs')
  const js = join(__dirname, '../preload/index.js')
  return existsSync(mjs) ? mjs : js
}

function loadRenderer(win: BrowserWindow, search = '') {
  const q = search.startsWith('?') || search === '' ? search : `?${search}`
  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
    void win.loadURL(`${process.env.ELECTRON_RENDERER_URL}${q}`)
    return
  }
  void win.loadFile(join(__dirname, '../renderer/index.html'), {
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

function applyClickThrough() {
  if (!mainWindow || mainWindow.isDestroyed()) return
  const ignore = clickThrough && !clickThroughLocked
  mainWindow.setIgnoreMouseEvents(ignore, { forward: true })
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

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  loadRenderer(mainWindow)
}

function openPopout(kind: PopoutKind, channel: string) {
  const key = popoutKey(kind, channel)
  const existing = popouts.get(key)
  if (existing && !existing.win.isDestroyed()) {
    existing.win.focus()
    return
  }

  const saved = boundsStore.get(key)
  const win = new BrowserWindow({
    width: kind === 'chat' ? 340 : 960,
    height: kind === 'chat' ? 560 : 540,
    minWidth: kind === 'chat' ? 260 : 420,
    minHeight: 280,
    ...saved,
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

  const rec: PopoutRecord = { channel, kind, win, alwaysOnTop: false }
  popouts.set(key, rec)

  win.on('moved', () => boundsStore.set(key, win.getBounds()))
  win.on('resized', () => boundsStore.set(key, win.getBounds()))
  win.on('close', (event) => {
    event.preventDefault()
    boundsStore.set(key, win.getBounds())
    popouts.delete(key)
    mainWindow?.webContents.send('popouts:dock-request', { channel, kind })
    if (!win.isDestroyed()) win.destroy()
    broadcastPopouts()
  })

  loadRenderer(win, `mode=${kind}&channel=${encodeURIComponent(channel)}`)
  broadcastPopouts()
}

function dockPopout(kind: PopoutKind, channel: string) {
  const key = popoutKey(kind, channel)
  const rec = popouts.get(key)
  if (!rec) return
  if (!rec.win.isDestroyed()) {
    boundsStore.set(key, rec.win.getBounds())
    rec.win.destroy()
  }
  popouts.delete(key)
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
      resolve(result)
    }
    authWin.on('closed', () => finish(null))
    const tryParseHash = (url: string) => {
      if (!url.includes('access_token=')) return
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
  ipcMain.handle('window:set-always-on-top', (event, enabled: boolean) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.setAlwaysOnTop(Boolean(enabled))
    for (const rec of popouts.values()) {
      if (rec.win === win) rec.alwaysOnTop = Boolean(enabled)
    }
    broadcastPopouts()
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
    await session.defaultSession.clearStorageData({ storages: ['cookies', 'localstorage'] })
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

  createMainWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
