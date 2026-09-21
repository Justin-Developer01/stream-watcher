import { app, BrowserWindow, shell, ipcMain, session } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

let mainWindow: BrowserWindow | null = null
const chatPopouts = new Map<string, BrowserWindow>()

function resolvePreloadPath() {
  const candidates = ['preload.mjs', 'preload.js', 'preload.cjs']
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
    backgroundColor: '#0b0f14',
    webPreferences: {
      preload: resolvePreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: false,
    },
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

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
    existing.focus()
    return
  }

  const popout = new BrowserWindow({
    width: 320,
    height: 520,
    minWidth: 260,
    minHeight: 320,
    title: `#${key}`,
    backgroundColor: '#0b0f14',
    autoHideMenuBar: true,
    webPreferences: {
      preload: resolvePreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  chatPopouts.set(key, popout)
  popout.on('closed', () => {
    chatPopouts.delete(key)
  })

  const query = `mode=chat&channel=${encodeURIComponent(key)}`
  if (VITE_DEV_SERVER_URL) {
    void popout.loadURL(`${VITE_DEV_SERVER_URL}?${query}`)
  } else {
    void popout.loadFile(path.join(RENDERER_DIST, 'index.html'), {
      search: query,
    })
  }
}

function openTwitchLogin() {
  const loginWin = new BrowserWindow({
    width: 520,
    height: 720,
    parent: mainWindow ?? undefined,
    modal: false,
    title: 'Twitch Login',
    backgroundColor: '#0b0f14',
    webPreferences: {
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
      title: 'Authorize Stream Watcher',
      backgroundColor: '#0b0f14',
      webPreferences: {
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
      resolve(result)
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
    await session.defaultSession.clearStorageData({
      storages: ['cookies', 'localstorage'],
    })
    mainWindow?.webContents.send('twitch-session-updated')
  })

  ipcMain.handle('chat:open-popout', (_event, channel: string) => {
    if (typeof channel === 'string' && channel.trim()) {
      openChatPopout(channel.trim().toLowerCase())
    }
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
  mainWindow = null
})
