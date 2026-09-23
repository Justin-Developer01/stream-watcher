import { contextBridge, ipcRenderer } from 'electron'

export type TwitchOAuthResult = {
  accessToken: string
  scope: string
}

export type PopoutInfo = {
  channel: string
  kind: 'stream' | 'chat'
  alwaysOnTop: boolean
}

const api = {
  minimize: () => ipcRenderer.invoke('window:minimize') as Promise<void>,
  maximize: () => ipcRenderer.invoke('window:maximize') as Promise<boolean>,
  close: () => ipcRenderer.invoke('window:close') as Promise<void>,
  isMaximized: () => ipcRenderer.invoke('window:is-maximized') as Promise<boolean>,
  quit: () => ipcRenderer.invoke('window:quit') as Promise<void>,
  setClickThrough: (enabled: boolean) =>
    ipcRenderer.invoke('window:set-click-through', enabled) as Promise<void>,
  setClickThroughLocked: (locked: boolean) =>
    ipcRenderer.invoke('window:set-click-through-locked', locked) as Promise<void>,
  setAlwaysOnTop: (enabled: boolean) =>
    ipcRenderer.invoke('window:set-always-on-top', enabled) as Promise<void>,
  openExternal: (url: string) => ipcRenderer.invoke('window:open-external', url) as Promise<void>,
  openTwitchLogin: () => ipcRenderer.invoke('twitch:open-login') as Promise<void>,
  startTwitchOAuth: (payload: { clientId: string; redirectUri: string; scopes: string[] }) =>
    ipcRenderer.invoke('twitch:oauth', payload) as Promise<TwitchOAuthResult | null>,
  clearTwitchSession: () => ipcRenderer.invoke('twitch:clear-session') as Promise<void>,
  openPopout: (kind: 'stream' | 'chat', channel: string) =>
    ipcRenderer.invoke('popout:open', { kind, channel }) as Promise<void>,
  dockPopout: (kind: 'stream' | 'chat', channel: string) =>
    ipcRenderer.invoke('popout:dock', { kind, channel }) as Promise<void>,
  dockAllPopouts: () => ipcRenderer.invoke('popout:dock-all') as Promise<void>,
  listPopouts: () => ipcRenderer.invoke('popout:list') as Promise<PopoutInfo[]>,
  onTwitchSessionUpdated: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('twitch-session-updated', handler)
    return () => ipcRenderer.removeListener('twitch-session-updated', handler)
  },
  onPopoutsChanged: (callback: (list: PopoutInfo[]) => void) => {
    const handler = (_e: unknown, list: PopoutInfo[]) => callback(list)
    ipcRenderer.on('popouts:changed', handler)
    return () => ipcRenderer.removeListener('popouts:changed', handler)
  },
  onDockRequest: (callback: (payload: { channel: string; kind: 'stream' | 'chat' }) => void) => {
    const handler = (_e: unknown, payload: { channel: string; kind: 'stream' | 'chat' }) =>
      callback(payload)
    ipcRenderer.on('popouts:dock-request', handler)
    return () => ipcRenderer.removeListener('popouts:dock-request', handler)
  },
}

contextBridge.exposeInMainWorld('vesper', api)

export type VesperApi = typeof api
