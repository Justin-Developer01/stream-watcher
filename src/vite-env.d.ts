/// <reference types="vite/client" />

import type { StreamWatcherApi } from '../electron/preload'

declare global {
  interface Window {
    streamWatcher?: StreamWatcherApi
  }
}

export {}
