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
  onTwitchSessionUpdated: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('twitch-session-updated', handler)
    return () => ipcRenderer.removeListener('twitch-session-updated', handler)
  },
}

contextBridge.exposeInMainWorld('streamWatcher', api)

export type StreamWatcherApi = typeof api
