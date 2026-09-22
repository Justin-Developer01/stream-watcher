import { app, BrowserWindow, shell, ipcMain, session, screen } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { registerUpdater } from './updater'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

let mainWindow: BrowserWindow | null = null
const chatPopouts = new Map<string, BrowserWindow>()

type PopoutBounds = { x: number; y: number; width: number; height: number }

function popoutBoundsPath() {
  return path.join(app.getPath('userData'), 'chat-popout-bounds.json')
}

function readPopoutBounds(): Record<string, PopoutBounds> {
  try {
    return JSON.parse(fs.readFileSync(popoutBoundsPath(), 'utf8')) as Record<string, PopoutBounds>
  } catch {
    return {}
  }
}

function writePopoutBounds(next: Record<string, PopoutBounds>) {
  try {
    fs.writeFileSync(popoutBoundsPath(), JSON.stringify(next))
  } catch {
    // ignore disk errors
  }
}

function boundsOnADisplay(bounds: PopoutBounds) {
  return screen.getAllDisplays().some((display) => {
    const area = display.workArea
    return (
      bounds.x < area.x + area.width &&
      bounds.x + 48 > area.x &&
      bounds.y < area.y + area.height &&
      bounds.y + 48 > area.y
    )
  })
}

function notifyMain(channel: string, event: 'opened' | 'closed') {
  if (!mainWindow || mainWindow.isDestroyed()) return
  mainWindow.webContents.send(`chat:popout-${event}`, channel)
}

function defaultPopoutOrigin() {
  if (!mainWindow || mainWindow.isDestroyed()) return undefined
  const bounds = mainWindow.getBounds()
  return {
    x: bounds.x + Math.max(48, bounds.width - 360),
    y: bounds.y + 72,
  }
}

function resolvePreloadPath() {
  const candidates = ['preload.cjs', 'preload.js', 'preload.mjs']
  for (const name of candidates) {
    const full = path.join(__dirname, name)
    if (fs.existsSync(full)) return full
  }
  return path.join(__dirname, 'preload.mjs')
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
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

  if (VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(VITE_DEV_SERVER_URL)
  } else {
    void mainWindow.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

function openChatPopout(channel: string) {
  const key = channel.toLowerCase()
  const existing = chatPopouts.get(key)
  if (existing && !existing.isDestroyed()) {
    existing.show()
    existing.focus()
    notifyMain(key, 'opened')
    return
  }

  const saved = readPopoutBounds()[key]
  const restore = saved && boundsOnADisplay(saved) ? saved : null
  const fallback = defaultPopoutOrigin()
  const popout = new BrowserWindow({
    width: restore?.width ?? 320,
    height: restore?.height ?? 520,
    x: restore?.x ?? fallback?.x,
    y: restore?.y ?? fallback?.y,
    minWidth: 260,
    minHeight: 320,
    title: `#${key}`,
    backgroundColor: '#0b0f14',
    autoHideMenuBar: true,
    parent: undefined,
    modal: false,
    skipTaskbar: false,
    fullscreenable: false,
    webPreferences: {
      preload: resolvePreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  let lastBounds = popout.getBounds()
  const persist = () => {
    if (!popout.isDestroyed()) lastBounds = popout.getBounds()
    writePopoutBounds({ ...readPopoutBounds(), [key]: lastBounds })
  }

  popout.webContents.on('preload-error', (_event, preloadPath, error) => {
    console.error('popout preload failed', preloadPath, error)
  })

  chatPopouts.set(key, popout)
  notifyMain(key, 'opened')
  // Linux fires move/resize; macOS/Windows also fire moved/resized.
  popout.on('move', persist)
  popout.on('moved', persist)
  popout.on('resize', persist)
  popout.on('resized', persist)
  popout.on('closed', () => {
    persist()
    chatPopouts.delete(key)
    notifyMain(key, 'closed')
  })

  const query = `mode=chat&channel=${encodeURIComponent(key)}`
  if (VITE_DEV_SERVER_URL) {
    void popout.loadURL(`${VITE_DEV_SERVER_URL}?${query}`)
  } else {
    void popout.loadFile(path.join(RENDERER_DIST, 'index.html'), {
      query: { mode: 'chat', channel: key },
    })
  }
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
      openChatPopout(channel.trim().toLowerCase())
    }
  })

  ipcMain.handle('chat:list-popouts', () => [...chatPopouts.keys()])

  registerUpdater(() => mainWindow)

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
  mainWindow = null
})
