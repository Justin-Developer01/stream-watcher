import type { Layout } from 'react-grid-layout'

export type StreamItem = {
  id: string
  channel: string
  muted: boolean
}

export type SavedStream = {
  channel: string
  savedAt: number
}

export type ChatDock = 'right' | 'left' | 'bottom' | 'float'

export type LayoutMode = '1x1' | '1x2' | '2x2' | '1+3'

export type ChatFloatPosition = {
  x: number
  y: number
  width: number
  height: number
}

export type ChatMessage = {
  id: string
  channel: string
  user: string
  color?: string
  text: string
  timestamp: number
}

export type AuthState = {
  accessToken: string | null
  username: string | null
  displayName: string | null
  scopes: string[]
}

export type PersistedState = {
  streams: StreamItem[]
  layout: Layout[]
  focusedId: string | null
  chatChannel: string | null
  clientId: string
  savedStreams: SavedStream[]
  leftSidebarOpen: boolean
  chatSidebarOpen: boolean
  chatDock: ChatDock
  chatFloat: ChatFloatPosition
  layoutMode?: LayoutMode
  focusMode?: boolean
}

export const DEFAULT_LAYOUT_COLS = 12
export const DEFAULT_ROW_HEIGHT = 48

export const DEFAULT_CHAT_FLOAT: ChatFloatPosition = {
  x: 72,
  y: 72,
  width: 300,
  height: 420,
}
