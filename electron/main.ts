import { app, BrowserWindow, shell, ipcMain, session, screen } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  clampToDisplays,
  debounce,
  defaultPopoutBounds,
  primaryWorkAreaBounds,
  readPopout,
  writePopout,
  type PopoutKind,
} from './popouts'
import { registerUpdater } from './updater'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

let mainWindow: BrowserWindow | null = null
const popoutWindows: Record<PopoutKind, Map<string, BrowserWindow>> = {
  chat: new Map(),
  stream: new Map(),
}

function notifyMain(kind: PopoutKind, channel: string, event: 'opened' | 'closed' | 'docked') {
  if (!mainWindow || mainWindow.isDestroyed()) return
  mainWindow.webContents.send(`${kind}:popout-${event}`, channel)
}

function resolvePreloadPath() {
  const candidates = ['preload.cjs', 'preload.js', 'preload.mjs']
  for (const name of candidates) {
    const full = path.join(__dirname, name)
    if (fs.existsSync(full)) return full
  }
  return path.join(__dirname, 'preload.mjs')
}

function keepMainOnADisplay() {
  if (!mainWindow || mainWindow.isDestroyed()) return
  const bounds = mainWindow.getBounds()
  const visible = screen.getAllDisplays().some((display) => {
    const area = display.workArea
    return (
      bounds.x < area.x + area.width &&
      bounds.x + Math.min(48, bounds.width) > area.x &&
      bounds.y < area.y + area.height &&
      bounds.y + Math.min(48, bounds.height) > area.y
    )
  })
  if (visible) return
  mainWindow.setBounds(primaryWorkAreaBounds(bounds.width, bounds.height))
}

function createWindow() {
  const placed = primaryWorkAreaBounds(1440, 900)
  mainWindow = new BrowserWindow({
    ...placed,
    minWidth: 960,
    minHeight: 640,
    title: 'Stream Watcher',
    transparent: true,
    backgroundColor: '#0b0f14',
    autoHideMenuBar: true,
    webPreferences: {
      preload: resolvePreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: false,
    },
  })

  mainWindow.webContents.on('preload-error', (_event, preloadPath, error) => {
    console.error('preload failed', preloadPath, error)
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  const sendFullscreen = (value: boolean) => {
    if (!mainWindow || mainWindow.isDestroyed()) return
    mainWindow.webContents.send('window:fullscreen-changed', value)
  }

  mainWindow.on('enter-full-screen', () => sendFullscreen(true))
  mainWindow.on('leave-full-screen', () => sendFullscreen(false))
  mainWindow.on('closed', () => {
    for (const kind of ['chat', 'stream'] as PopoutKind[]) {
      for (const win of popoutWindows[kind].values()) {
        if (!win.isDestroyed()) win.close()
      }
      popoutWindows[kind].clear()
    }
    mainWindow = null
  })

  if (VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(VITE_DEV_SERVER_URL)
  } else {
    void mainWindow.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

function openPopout(kind: PopoutKind, channel: string) {
  const key = channel.toLowerCase()
  const map = popoutWindows[kind]
  const existing = map.get(key)
  if (existing && !existing.isDestroyed()) {
    existing.show()
    existing.focus()
    notifyMain(kind, key, 'opened')
    return
  }

  const saved = readPopout(kind, key)
  const restore = saved ? clampToDisplays(saved) : defaultPopoutBounds(kind, mainWindow, map.size)
  const min =
    kind === 'chat' ? { minWidth: 260, minHeight: 320 } : { minWidth: 360, minHeight: 220 }

  const popout = new BrowserWindow({
    width: restore.width,
    height: restore.height,
    x: restore.x,
    y: restore.y,
    ...min,
    title: kind === 'chat' ? `#${key}` : key,
    backgroundColor: '#0b0f14',
    autoHideMenuBar: true,
    parent: undefined,
    modal: false,
    skipTaskbar: false,
    fullscreenable: false,
    alwaysOnTop: Boolean(restore.alwaysOnTop),
    webPreferences: {
      preload: resolvePreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (restore.alwaysOnTop) popout.setAlwaysOnTop(true, 'floating')

  let lastBounds = popout.getBounds()
  let lastAlwaysOnTop = popout.isAlwaysOnTop()
  const persistNow = () => {
    if (!popout.isDestroyed()) {
      lastBounds = popout.getBounds()
      lastAlwaysOnTop = popout.isAlwaysOnTop()
    }
    writePopout(kind, key, { ...lastBounds, alwaysOnTop: lastAlwaysOnTop })
  }
  const persist = debounce(persistNow, 200)

  popout.webContents.on('preload-error', (_event, preloadPath, error) => {
    console.error('popout preload failed', preloadPath, error)
  })

  map.set(key, popout)
  notifyMain(kind, key, 'opened')
  popout.on('move', persist)
  popout.on('moved', persist)
  popout.on('resize', persist)
  popout.on('resized', persist)
  popout.on('closed', () => {
    persistNow()
    map.delete(key)
    notifyMain(kind, key, 'closed')
  })

  const query = `mode=${kind}&channel=${encodeURIComponent(key)}`
  if (VITE_DEV_SERVER_URL) {
    void popout.loadURL(`${VITE_DEV_SERVER_URL}?${query}`)
  } else {
    void popout.loadFile(path.join(RENDERER_DIST, 'index.html'), {
      query: { mode: kind, channel: key },
    })
  }
}

function dockPopout(kind: PopoutKind, channel: string) {
  const key = channel.toLowerCase()
  const win = popoutWindows[kind].get(key)
  if (win && !win.isDestroyed()) {
    writePopout(kind, key, { ...win.getBounds(), alwaysOnTop: win.isAlwaysOnTop() })
    win.close()
  }
  notifyMain(kind, key, 'docked')
}

function findSenderPopout(sender: Electron.WebContents) {
  for (const kind of ['chat', 'stream'] as PopoutKind[]) {
    for (const [channel, win] of popoutWindows[kind]) {
      if (!win.isDestroyed() && win.webContents.id === sender.id) {
        return { kind, channel, win }
      }
    }
  }
  return null
}

function openTwitchLogin() {
  const loginWin = new BrowserWindow({
    width: 520,
    height: 720,
    parent: mainWindow ?? undefined,
    modal: false,
    title: 'Refresh Prime session',
    backgroundColor: '#0b0f14',
    webPreferences: {
      session: session.defaultSession,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  // Share cookies with embeds so Turbo/Prime ad benefits apply in players
  void loginWin.loadURL('https://www.twitch.tv/login')

  loginWin.webContents.on('did-navigate', (_event, url) => {
    if (url.includes('twitch.tv') && !url.includes('/login') && !url.includes('/signup')) {
      mainWindow?.webContents.send('twitch-session-updated')
      setTimeout(() => loginWin.close(), 400)
    }
  })
}

function warmTwitchCookies() {
  return new Promise<void>((resolve) => {
    const warm = new BrowserWindow({
      show: false,
      webPreferences: {
        session: session.defaultSession,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
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
      title: 'Login to Twitch',
      backgroundColor: '#0b0f14',
      webPreferences: {
        session: session.defaultSession,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
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

    const tryParseHash = (url: string) => {
      if (!url.startsWith(redirectUri) && !url.includes('access_token=')) return
      try {
        const hash = url.includes('#') ? url.slice(url.indexOf('#') + 1) : ''
        const data = new URLSearchParams(hash)
        const accessToken = data.get('access_token')
        const scope = data.get('scope') ?? scopes.join(' ')
        if (accessToken) finish({ accessToken, scope })
      } catch {
        // ignore parse errors
      }
    }

    authWin.webContents.on('will-redirect', (_e, url) => tryParseHash(url))
    authWin.webContents.on('will-navigate', (_e, url) => tryParseHash(url))
    authWin.webContents.on('did-navigate', (_e, url) => tryParseHash(url))

    void authWin.loadURL(authUrl)
  })
}

app.whenReady().then(() => {
  // Strip CSP headers from responses that block Twitch embeds inside Electron
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const headers = { ...details.responseHeaders }
    delete headers['Content-Security-Policy']
    delete headers['content-security-policy']
    callback({ responseHeaders: headers })
  })

  ipcMain.handle('twitch:open-login', () => {
    openTwitchLogin()
  })

  ipcMain.handle(
    'twitch:oauth',
    async (_event, payload: { clientId: string; redirectUri: string; scopes: string[] }) => {
      return openTwitchOAuth(payload.clientId, payload.redirectUri, payload.scopes)
    },
  )

  ipcMain.handle('twitch:clear-session', async () => {
    // Cookies only — never wipe renderer localStorage (layout / client id).
    await session.defaultSession.clearStorageData({
      storages: ['cookies'],
    })
    mainWindow?.webContents.send('twitch-session-updated')
  })

  ipcMain.handle('window:set-fullscreen', (_event, value: boolean) => {
    mainWindow?.setFullScreen(Boolean(value))
  })

  ipcMain.handle('window:is-fullscreen', () => mainWindow?.isFullScreen() ?? false)

  ipcMain.handle('window:set-transparent', (_event, enabled: boolean, color?: string) => {
    if (!mainWindow || mainWindow.isDestroyed()) return
    const opaque = typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#0b0f14'
    mainWindow.setBackgroundColor(enabled ? '#00000000' : opaque)
  })

  ipcMain.handle('window:set-ignore-mouse', (_event, ignore: boolean) => {
    if (!mainWindow || mainWindow.isDestroyed()) return
    if (ignore) {
      mainWindow.setIgnoreMouseEvents(true, { forward: true })
      return
    }
    mainWindow.setIgnoreMouseEvents(false)
  })

  ipcMain.handle('chat:open-popout', (_event, channel: string) => {
    if (typeof channel === 'string' && channel.trim()) {
      openPopout('chat', channel.trim().toLowerCase())
    }
  })

  ipcMain.handle('stream:open-popout', (_event, channel: string) => {
    if (typeof channel === 'string' && channel.trim()) {
      openPopout('stream', channel.trim().toLowerCase())
    }
  })

  ipcMain.handle('chat:list-popouts', () => [...popoutWindows.chat.keys()])
  ipcMain.handle('stream:list-popouts', () => [...popoutWindows.stream.keys()])

  ipcMain.handle('popout:dock', (_event, kind: PopoutKind, channel: string) => {
    if ((kind === 'chat' || kind === 'stream') && typeof channel === 'string' && channel.trim()) {
      dockPopout(kind, channel.trim().toLowerCase())
    }
  })

  ipcMain.handle('popout:dock-this', (event) => {
    const found = findSenderPopout(event.sender)
    if (found) dockPopout(found.kind, found.channel)
  })

  ipcMain.handle('popout:set-always-on-top', (event, value: boolean) => {
    const found = findSenderPopout(event.sender)
    if (!found) return false
    found.win.setAlwaysOnTop(Boolean(value), 'floating')
    writePopout(found.kind, found.channel, {
      ...found.win.getBounds(),
      alwaysOnTop: found.win.isAlwaysOnTop(),
    })
    return found.win.isAlwaysOnTop()
  })

  ipcMain.handle('popout:get-always-on-top', (event) => {
    const found = findSenderPopout(event.sender)
    return found?.win.isAlwaysOnTop() ?? false
  })

  registerUpdater(() => mainWindow)

  screen.on('display-removed', keepMainOnADisplay)
  screen.on('display-metrics-changed', keepMainOnADisplay)

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
  mainWindow = null
})
