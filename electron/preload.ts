import { contextBridge, ipcRenderer } from 'electron'

import type { UpdaterStatus } from '../src/types'

export type TwitchOAuthResult = {
  accessToken: string
  scope: string
}

const api = {
  openTwitchLogin: () => ipcRenderer.invoke('twitch:open-login') as Promise<void>,
  startTwitchOAuth: (payload: {
    clientId: string
    redirectUri: string
    scopes: string[]
  }) => ipcRenderer.invoke('twitch:oauth', payload) as Promise<TwitchOAuthResult | null>,
  clearTwitchSession: () => ipcRenderer.invoke('twitch:clear-session') as Promise<void>,
  openChatPopout: (channel: string) =>
    ipcRenderer.invoke('chat:open-popout', channel) as Promise<void>,
  listChatPopouts: () => ipcRenderer.invoke('chat:list-popouts') as Promise<string[]>,
  checkForUpdates: () => ipcRenderer.invoke('updater:check') as Promise<UpdaterStatus>,
  downloadUpdate: () => ipcRenderer.invoke('updater:download') as Promise<UpdaterStatus>,
  installUpdate: () => ipcRenderer.invoke('updater:install') as Promise<void>,
  getUpdaterStatus: () => ipcRenderer.invoke('updater:status') as Promise<UpdaterStatus>,
  onUpdaterStatus: (callback: (status: UpdaterStatus) => void) => {
    const handler = (_event: unknown, status: UpdaterStatus) => callback(status)
    ipcRenderer.on('updater:status', handler)
    return () => {
      ipcRenderer.removeListener('updater:status', handler)
    }
  },
  onChatPopoutOpened: (callback: (channel: string) => void) => {
    const handler = (_event: unknown, channel: string) => callback(channel)
    ipcRenderer.on('chat:popout-opened', handler)
    return () => ipcRenderer.removeListener('chat:popout-opened', handler)
  },
  onChatPopoutClosed: (callback: (channel: string) => void) => {
    const handler = (_event: unknown, channel: string) => callback(channel)
    ipcRenderer.on('chat:popout-closed', handler)
    return () => ipcRenderer.removeListener('chat:popout-closed', handler)
  },
  setFullscreen: (value: boolean) =>
    ipcRenderer.invoke('window:set-fullscreen', value) as Promise<void>,
  isFullscreen: () => ipcRenderer.invoke('window:is-fullscreen') as Promise<boolean>,
  setWindowTransparent: (enabled: boolean, color?: string) =>
    ipcRenderer.invoke('window:set-transparent', enabled, color) as Promise<void>,
  setIgnoreMouseEvents: (ignore: boolean) =>
    ipcRenderer.invoke('window:set-ignore-mouse', ignore) as Promise<void>,
  onFullscreenChange: (callback: (value: boolean) => void) => {
    const handler = (_event: unknown, value: boolean) => callback(value)
    ipcRenderer.on('window:fullscreen-changed', handler)
    return () => ipcRenderer.removeListener('window:fullscreen-changed', handler)
  },
  onTwitchSessionUpdated: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('twitch-session-updated', handler)
    return () => ipcRenderer.removeListener('twitch-session-updated', handler)
  },
}

contextBridge.exposeInMainWorld('streamWatcher', api)

export type StreamWatcherApi = typeof api
