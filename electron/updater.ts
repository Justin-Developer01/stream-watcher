import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { createRequire } from 'node:module'
import type { UpdaterStatus } from '../src/types'

const require = createRequire(import.meta.url)

type AutoUpdater = {
  autoDownload: boolean
  allowPrerelease: boolean
  autoInstallOnAppQuit: boolean
  verifyUpdateCodeSignature?: boolean
  checkForUpdates: () => Promise<unknown>
  downloadUpdate: () => Promise<unknown>
  quitAndInstall: (isSilent?: boolean, isForceRunAfter?: boolean) => void
  on: (event: string, listener: (...args: never[]) => void) => void
}

let updater: AutoUpdater | null = null
let bound = false

function loadUpdater(): AutoUpdater {
  if (updater) return updater
  const mod = require('electron-updater') as { autoUpdater: AutoUpdater }
  updater = mod.autoUpdater
  updater.autoDownload = false
  updater.allowPrerelease = true
  updater.autoInstallOnAppQuit = true
  updater.verifyUpdateCodeSignature = false
  return updater
}

function isPortable() {
  return Boolean(process.env.PORTABLE_EXECUTABLE_FILE || process.env.PORTABLE_EXECUTABLE_DIR)
}

export function registerUpdater(getMain: () => BrowserWindow | null) {
  let status: UpdaterStatus = {
    state: 'idle',
    currentVersion: app.getVersion(),
  }

  const send = () => {
    const win = getMain()
    if (!win || win.isDestroyed()) return
    win.webContents.send('updater:status', status)
  }

  const set = (patch: Partial<UpdaterStatus>) => {
    status = { ...status, currentVersion: app.getVersion(), ...patch }
    send()
  }

  const bindEvents = (autoUpdater: AutoUpdater) => {
    if (bound) return
    bound = true
    autoUpdater.on('checking-for-update', () => {
      set({ state: 'checking', error: undefined, message: undefined })
    })
    autoUpdater.on('update-available', ((info: { version?: string }) => {
      set({
        state: 'available',
        availableVersion: info?.version,
        message: `Version ${info?.version} is available.`,
      })
    }) as (...args: never[]) => void)
    autoUpdater.on('update-not-available', () => {
      set({
        state: 'not-available',
        availableVersion: undefined,
        message: 'You are on the latest version.',
      })
    })
    autoUpdater.on('download-progress', ((progress: { percent?: number }) => {
      set({ state: 'downloading', percent: progress?.percent ?? 0 })
    }) as (...args: never[]) => void)
    autoUpdater.on('update-downloaded', ((info: { version?: string }) => {
      set({
        state: 'ready',
        availableVersion: info?.version,
        percent: 100,
        message: `Version ${info?.version} is ready to install.`,
      })
    }) as (...args: never[]) => void)
    autoUpdater.on('error', ((err: Error) => {
      set({ state: 'error', error: err?.message || String(err) })
    }) as (...args: never[]) => void)
  }

  ipcMain.handle('updater:status', () => status)

  ipcMain.handle('updater:check', async () => {
    if (!app.isPackaged) {
      set({
        state: 'unsupported',
        message: 'Updates work in the installed Windows Setup (NSIS) app.',
      })
      return status
    }
    if (isPortable()) {
      set({
        state: 'unsupported',
        message: 'Portable build: download a new Setup/Portable from GitHub Releases.',
      })
      await shell.openExternal('https://github.com/Justin-Developer01/stream-watcher/releases')
      return status
    }
    try {
      const autoUpdater = loadUpdater()
      bindEvents(autoUpdater)
      set({ state: 'checking', error: undefined, message: undefined })
      await autoUpdater.checkForUpdates()
    } catch (err) {
      set({ state: 'error', error: err instanceof Error ? err.message : String(err) })
    }
    return status
  })

  ipcMain.handle('updater:download', async () => {
    try {
      const autoUpdater = loadUpdater()
      bindEvents(autoUpdater)
      set({ state: 'downloading', percent: 0, error: undefined })
      await autoUpdater.downloadUpdate()
    } catch (err) {
      set({ state: 'error', error: err instanceof Error ? err.message : String(err) })
    }
    return status
  })

  ipcMain.handle('updater:install', () => {
    const autoUpdater = loadUpdater()
    autoUpdater.quitAndInstall(false, true)
  })
}
