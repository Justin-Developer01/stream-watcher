/// <reference types="vite/client" />

import type { PlatformId, ProviderAuthState, PublicAuthState } from './types'

interface ImportMetaEnv {
  readonly VITE_TWITCH_CLIENT_ID?: string
}

type VesperPopout = {
  channel: string
  kind: 'stream' | 'chat'
  platform: PlatformId
  alwaysOnTop: boolean
}

type VesperChatCredentials = { username: string; accessToken: string }

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
  getAuthSession: () => Promise<PublicAuthState>
  getChatCredentials: () => Promise<VesperChatCredentials | null>
  migrateLegacyAuth: (legacy: ProviderAuthState) => Promise<void>
  loginTwitchSession: (session: ProviderAuthState) => Promise<void>
  logoutTwitch: (clientId: string) => Promise<void>
  onAuthChanged: (callback: (session: PublicAuthState) => void) => () => void
  openPopout: (kind: 'stream' | 'chat', channel: string, platform: PlatformId) => Promise<void>
  dockPopout: (kind: 'stream' | 'chat', channel: string, platform: PlatformId) => Promise<void>
  dockAllPopouts: () => Promise<void>
  listPopouts: () => Promise<VesperPopout[]>
  onTwitchSessionUpdated: (callback: () => void) => () => void
  onPopoutsChanged: (callback: (list: VesperPopout[]) => void) => () => void
  onDockRequest: (
    callback: (payload: { channel: string; kind: 'stream' | 'chat'; platform: PlatformId }) => void,
  ) => () => void
  onFullscreenChange: (callback: (value: boolean) => void) => () => void
  onMinimizedChange?: (callback: (value: boolean) => void) => () => void
}

declare global {
  interface Window {
    vesper?: VesperApi
    onYouTubeIframeAPIReady?: () => void
    YT?: {
      Player: {
        new (
          element: HTMLElement | string,
          options: {
            videoId: string
            width?: string | number
            height?: string | number
            playerVars?: Record<string, string | number>
            events?: {
              onReady?: () => void
              onError?: (event: { data: number }) => void
            }
          },
        ): {
          mute: () => void
          unMute: () => void
          playVideo: () => void
          pauseVideo: () => void
          /** 0..100; only after onReady. */
          setVolume?: (volume: number) => void
          setPlaybackQuality?: (quality: string) => void
          destroy?: () => void
        }
      }
    }
    Twitch?: {
      Player: {
        new (
          element: HTMLElement | string,
          options: {
            channel: string
            width: string | number
            height: string | number
            parent: string[]
            muted?: boolean
            autoplay?: boolean
          },
        ): {
          setChannel: (channel: string) => void
          setMuted: (muted: boolean) => void
          /** 0..1 */
          setVolume?: (volume: number) => void
          play: () => void
          pause: () => void
          setQuality?: (quality: string) => void
          getQuality?: () => string
          getQualities?: () => Array<{ group: string; name?: string }>
          addEventListener?: (event: string, callback: () => void) => void
          destroy?: () => void
        }
        READY?: string
        PLAYING?: string
      }
    }
  }
}

declare module '*.svg' {
  const src: string
  export default src
}

export {}
