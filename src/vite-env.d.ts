/// <reference types="vite/client" />

import type { StreamWatcherApi } from '../electron/preload'

declare global {
  interface Window {
    streamWatcher?: StreamWatcherApi
  }

  interface ImportMetaEnv {
    readonly VITE_TWITCH_CLIENT_ID?: string
  }
}

export {}
