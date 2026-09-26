import type { Layout } from 'react-grid-layout'
import type { AuthState, ProviderAuthState, PublicAuthState } from './lib/authState'
import type { HotkeyAction } from './lib/hotkeys'
import { defaultHotkeys } from './lib/hotkeys'
import type { PlatformId } from './lib/platformId'

export type { AuthState, PlatformId, ProviderAuthState, PublicAuthState }

export type StreamItem = {
  id: string
  platform: PlatformId
  channel: string
  muted: boolean
  popped?: boolean
}

export type SavedStream = {
  platform: PlatformId
  channel: string
  savedAt: number
  /** Display name for the Saved menu only; `channel` stays the real slug for embeds and chat. */
  name?: string
}

export type ChatDock = 'right' | 'left' | 'bottom' | 'float'
export type WatchMode = 'standard' | 'focus' | 'performance'
export type ThemeName = 'dark' | 'dim' | 'light'
export type ChromeEdge = 'top' | 'left' | 'right' | 'bottom'
export type ChatFont =
  | 'system'
  | 'ibm'
  | 'inter'
  | 'mono'
  | 'source'
  | 'roboto'
  | 'geist'
  | 'custom'

export type ChatFloatPosition = {
  x: number
  y: number
  width: number
  height: number
}

export type LayoutTemplate = {
  id: string
  name: string
  layout: Layout[]
}

export type AppearanceSettings = {
  theme: ThemeName
  accent: string
  surface: string
  text: string
  backgroundColor: string
  backgroundImage: string
  backgroundOpacity: number
  chromeEdge: ChromeEdge
  seeThrough: boolean
  ghostOverlay: boolean
}

export type ChatSettings = {
  font: ChatFont
  customFont: string
  fontSize: number
  drawerWidth: number
}

export type AppSettings = AppearanceSettings & {
  chat: ChatSettings
  hotkeys: Record<HotkeyAction, string>
  pinToolbar: boolean
  dismissedTips: string[]
}

export type PersistedState = {
  streams: StreamItem[]
  layout: Layout[]
  focusedId: string | null
  chatChannel: string | null
  clientId: string
  savedStreams: SavedStream[]
  chatOpen: boolean
  chatDock: ChatDock
  chatFloat: ChatFloatPosition
  mode: WatchMode
  templates: LayoutTemplate[]
  settings: AppSettings
  windowLocked: boolean
}

export const DEFAULT_CHAT_FLOAT: ChatFloatPosition = {
  x: 72,
  y: 56,
  width: 320,
  height: 440,
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  accent: '#7ec8d8',
  surface: '#141018',
  text: '#f4ece2',
  backgroundColor: '#0c0a10',
  backgroundImage: '',
  backgroundOpacity: 1,
  chromeEdge: 'top',
  seeThrough: false,
  ghostOverlay: false,
  chat: {
    font: 'ibm',
    customFont: '',
    fontSize: 13,
    drawerWidth: 320,
  },
  hotkeys: { ...defaultHotkeys },
  pinToolbar: false,
  dismissedTips: [],
}

export type PopoutKind = 'stream' | 'chat'

export type PopoutInfo = {
  channel: string
  kind: PopoutKind
  platform: PlatformId
  alwaysOnTop: boolean
}
