import { contextBridge, ipcRenderer } from 'electron'

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
  setFullscreen: (value: boolean) =>
    ipcRenderer.invoke('window:set-fullscreen', value) as Promise<void>,
  isFullscreen: () => ipcRenderer.invoke('window:is-fullscreen') as Promise<boolean>,
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
