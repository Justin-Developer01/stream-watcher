/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TWITCH_CLIENT_ID?: string
}

type VesperPopout = {
  channel: string
  kind: 'stream' | 'chat'
  alwaysOnTop: boolean
}

type VesperApi = {
  minimize: () => Promise<void>
  maximize: () => Promise<boolean>
  close: () => Promise<void>
  isMaximized: () => Promise<boolean>
  quit: () => Promise<void>
  setClickThrough: (enabled: boolean) => Promise<void>
  setClickThroughLocked: (locked: boolean) => Promise<void>
  setIgnoreMouseEvents: (ignore: boolean) => Promise<void>
  setFullscreen: (value: boolean) => Promise<boolean>
  isFullscreen: () => Promise<boolean>
  setAlwaysOnTop: (enabled: boolean) => Promise<boolean>
  getThisPopoutAlwaysOnTop: () => Promise<boolean>
  openExternal: (url: string) => Promise<void>
  openTwitchLogin: () => Promise<void>
  startTwitchOAuth: (payload: {
    clientId: string
    redirectUri: string
    scopes: string[]
  }) => Promise<{ accessToken: string; scope: string } | null>
  openLogFolder: () => Promise<string>
  clearTwitchSession: () => Promise<void>
  openPopout: (kind: 'stream' | 'chat', channel: string) => Promise<void>
  dockPopout: (kind: 'stream' | 'chat', channel: string) => Promise<void>
  dockAllPopouts: () => Promise<void>
  listPopouts: () => Promise<VesperPopout[]>
  onTwitchSessionUpdated: (callback: () => void) => () => void
  onPopoutsChanged: (callback: (list: VesperPopout[]) => void) => () => void
  onDockRequest: (
    callback: (payload: { channel: string; kind: 'stream' | 'chat' }) => void,
  ) => () => void
  onFullscreenChange: (callback: (value: boolean) => void) => () => void
}

declare global {
  interface Window {
    vesper?: VesperApi
    Twitch?: {
      Player: new (
        element: HTMLElement | string,
        options: {
          channel: string
          width: string | number
          height: string | number
          parent: string[]
          muted?: boolean
          autoplay?: boolean
        },
      ) => {
        setChannel: (channel: string) => void
        setMuted: (muted: boolean) => void
        play: () => void
        pause: () => void
        setQuality?: (quality: string) => void
        destroy?: () => void
      }
    }
  }
}

declare module '*.svg' {
  const src: string
  export default src
}

export {}
