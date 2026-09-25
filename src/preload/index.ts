import { contextBridge, ipcRenderer } from 'electron'
import type { ProviderAuthState, PublicAuthState } from '../lib/authState'
import type { PlatformId } from '../lib/platformId'

export type ChatCredentials = { username: string; accessToken: string }

export type TwitchOAuthResult = {
  accessToken: string
  scope: string
}

export type PopoutInfo = {
  channel: string
  kind: 'stream' | 'chat'
  platform: PlatformId
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
  setIgnoreMouseEvents: (ignore: boolean) =>
    ipcRenderer.invoke('window:set-ignore-mouse', ignore) as Promise<void>,
  setFullscreen: (value: boolean) =>
    ipcRenderer.invoke('window:set-fullscreen', value) as Promise<boolean>,
  isFullscreen: () => ipcRenderer.invoke('window:is-fullscreen') as Promise<boolean>,
  setAlwaysOnTop: (enabled: boolean) =>
    ipcRenderer.invoke('window:set-always-on-top', enabled) as Promise<boolean>,
  getThisPopoutAlwaysOnTop: () =>
    ipcRenderer.invoke('popout:get-always-on-top') as Promise<boolean>,
  openExternal: (url: string) => ipcRenderer.invoke('window:open-external', url) as Promise<void>,
  openTwitchLogin: () => ipcRenderer.invoke('twitch:open-login') as Promise<void>,
  startTwitchOAuth: (payload: { clientId: string; redirectUri: string; scopes: string[] }) =>
    ipcRenderer.invoke('twitch:oauth', payload) as Promise<TwitchOAuthResult | null>,
  openLogFolder: () => ipcRenderer.invoke('log:open-folder') as Promise<string>,
  getAuthSession: () => ipcRenderer.invoke('auth:get-session') as Promise<PublicAuthState>,
  getChatCredentials: () =>
    ipcRenderer.invoke('auth:get-chat-credentials') as Promise<ChatCredentials | null>,
  migrateLegacyAuth: (legacy: ProviderAuthState) =>
    ipcRenderer.invoke('auth:migrate-legacy', legacy) as Promise<void>,
  loginTwitchSession: (session: ProviderAuthState) =>
    ipcRenderer.invoke('auth:login', session) as Promise<void>,
  logoutTwitch: (clientId: string) => ipcRenderer.invoke('auth:logout', clientId) as Promise<void>,
  onAuthChanged: (callback: (session: PublicAuthState) => void) => {
    const handler = (_e: unknown, session: PublicAuthState) => callback(session)
    ipcRenderer.on('auth:changed', handler)
    return () => ipcRenderer.removeListener('auth:changed', handler)
  },
  openPopout: (kind: 'stream' | 'chat', channel: string, platform: PlatformId) =>
    ipcRenderer.invoke('popout:open', { kind, channel, platform }) as Promise<void>,
  dockPopout: (kind: 'stream' | 'chat', channel: string, platform: PlatformId) =>
    ipcRenderer.invoke('popout:dock', { kind, channel, platform }) as Promise<void>,
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
  onDockRequest: (
    callback: (payload: { channel: string; kind: 'stream' | 'chat'; platform: PlatformId }) => void,
  ) => {
    const handler = (
      _e: unknown,
      payload: { channel: string; kind: 'stream' | 'chat'; platform: PlatformId },
    ) => callback(payload)
    ipcRenderer.on('popouts:dock-request', handler)
    return () => ipcRenderer.removeListener('popouts:dock-request', handler)
  },
  onMinimizedChange: (callback: (value: boolean) => void) => {
    const handler = (_e: unknown, value: boolean) => callback(Boolean(value))
    ipcRenderer.on('window:minimized-changed', handler)
    return () => ipcRenderer.removeListener('window:minimized-changed', handler)
  },
  onFullscreenChange: (callback: (value: boolean) => void) => {
    const handler = (_e: unknown, value: boolean) => callback(Boolean(value))
    ipcRenderer.on('window:fullscreen-changed', handler)
    return () => ipcRenderer.removeListener('window:fullscreen-changed', handler)
  },
}

contextBridge.exposeInMainWorld('vesper', api)

export type VesperApi = typeof api
