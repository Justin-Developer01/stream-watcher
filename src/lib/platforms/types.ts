import type { ComponentType } from 'react'
import type { PlatformId, ProviderAuthState } from '../../types'
import type { ChatEvent, RoomState } from '../chat/types'

export type StreamPlayerProps = {
  channel: string
  muted: boolean
  interactive: boolean
  paused?: boolean
  lowQuality?: boolean
}

export type StreamPlayerComponent = ComponentType<StreamPlayerProps>

export type StreamPlatform = {
  id: PlatformId
  label: string
  Player: StreamPlayerComponent
  /** False hides chat toggles for this platform's tiles (e.g. Kick, until its chat transport is built). */
  hasChat: boolean
}

export interface PlatformAuth {
  auth: ProviderAuthState
  busy: boolean
  error: string | null
  login: () => Promise<void>
  logout: () => Promise<void>
  isLoggedIn: boolean
}

export interface ChatConnection {
  version: number
  status: 'idle' | 'connecting' | 'connected' | 'error'
  error: string | null
  sendMessage: (text: string, channel: string | null) => Promise<{ ok: true } | { ok: false; error: string }>
  eventsFor: (channel: string | null) => ChatEvent[]
  roomStateFor: (channel: string | null) => RoomState
  recentChatters: (channel: string | null) => string[]
}
