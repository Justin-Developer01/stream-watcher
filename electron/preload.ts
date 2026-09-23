import { contextBridge, ipcRenderer } from 'electron'

import type { UpdaterStatus } from '../src/types'

export type TwitchOAuthResult = {
  accessToken: string
  scope: string
}

export type PopoutKind = 'chat' | 'stream'

function listen<T extends unknown[]>(channel: string, callback: (...args: T) => void) {
  const handler = (_event: unknown, ...args: T) => callback(...args)
  ipcRenderer.on(channel, handler)
  return () => {
    ipcRenderer.removeListener(channel, handler)
  }
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
  openStreamPopout: (channel: string) =>
    ipcRenderer.invoke('stream:open-popout', channel) as Promise<void>,
  listChatPopouts: () => ipcRenderer.invoke('chat:list-popouts') as Promise<string[]>,
  listStreamPopouts: () => ipcRenderer.invoke('stream:list-popouts') as Promise<string[]>,
  dockPopout: (kind: PopoutKind, channel: string) =>
    ipcRenderer.invoke('popout:dock', kind, channel) as Promise<void>,
  dockThisPopout: () => ipcRenderer.invoke('popout:dock-this') as Promise<void>,
  setThisPopoutAlwaysOnTop: (value: boolean) =>
    ipcRenderer.invoke('popout:set-always-on-top', value) as Promise<boolean>,
  getThisPopoutAlwaysOnTop: () => ipcRenderer.invoke('popout:get-always-on-top') as Promise<boolean>,
  checkForUpdates: () => ipcRenderer.invoke('updater:check') as Promise<UpdaterStatus>,
  downloadUpdate: () => ipcRenderer.invoke('updater:download') as Promise<UpdaterStatus>,
  installUpdate: () => ipcRenderer.invoke('updater:install') as Promise<void>,
  getUpdaterStatus: () => ipcRenderer.invoke('updater:status') as Promise<UpdaterStatus>,
  onUpdaterStatus: (callback: (status: UpdaterStatus) => void) => listen('updater:status', callback),
  onChatPopoutOpened: (callback: (channel: string) => void) => listen('chat:popout-opened', callback),
  onChatPopoutClosed: (callback: (channel: string) => void) => listen('chat:popout-closed', callback),
  onChatPopoutDocked: (callback: (channel: string) => void) => listen('chat:popout-docked', callback),
  onStreamPopoutOpened: (callback: (channel: string) => void) =>
    listen('stream:popout-opened', callback),
  onStreamPopoutClosed: (callback: (channel: string) => void) =>
    listen('stream:popout-closed', callback),
  onStreamPopoutDocked: (callback: (channel: string) => void) =>
    listen('stream:popout-docked', callback),
  setFullscreen: (value: boolean) =>
    ipcRenderer.invoke('window:set-fullscreen', value) as Promise<void>,
  isFullscreen: () => ipcRenderer.invoke('window:is-fullscreen') as Promise<boolean>,
  minimizeWindow: () => ipcRenderer.invoke('window:minimize') as Promise<void>,
  toggleMaximizeWindow: () => ipcRenderer.invoke('window:maximize-toggle') as Promise<void>,
  isWindowMaximized: () => ipcRenderer.invoke('window:is-maximized') as Promise<boolean>,
  closeWindow: () => ipcRenderer.invoke('window:close') as Promise<void>,
  quitApp: () => ipcRenderer.invoke('app:quit') as Promise<void>,
  onMaximizedChange: (callback: (value: boolean) => void) =>
    listen('window:maximized-changed', callback),
  setWindowTransparent: (enabled: boolean, color?: string) =>
    ipcRenderer.invoke('window:set-transparent', enabled, color) as Promise<void>,
  setIgnoreMouseEvents: (ignore: boolean) =>
    ipcRenderer.invoke('window:set-ignore-mouse', ignore) as Promise<void>,
  onFullscreenChange: (callback: (value: boolean) => void) =>
    listen('window:fullscreen-changed', callback),
  onTwitchSessionUpdated: (callback: () => void) => listen('twitch-session-updated', callback),
}

contextBridge.exposeInMainWorld('streamWatcher', api)

export type StreamWatcherApi = typeof api
