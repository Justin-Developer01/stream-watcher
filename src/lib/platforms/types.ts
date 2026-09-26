import type { ComponentType } from 'react'
import type { PlatformId, ProviderAuthState } from '../../types'
import type { ChatEvent, RoomState } from '../chat/types'

/** In-place playback position control for Stream Sync (Phase C). Only a seekable platform
 * (YouTube) ever calls this; a live platform with no seek API (Twitch, Kick) never does, so it
 * simply never has an entry for Sync's follow-leader loop to find. */
export type PlayerTimeApi = {
  getCurrentTime: () => number | null
  seekTo: (seconds: number) => void
}

export type StreamPlayerProps = {
  channel: string
  muted: boolean
  /** Level 0..1 while unmuted; players that can't change it in place (Kick) ignore it. */
  volume?: number
  interactive: boolean
  paused?: boolean
  lowQuality?: boolean
  /** Called with a live api once the player can seek in place, and with null on unmount/remount.
   * Ignored by players with no such API (see PlayerTimeApi). */
  onTimeApi?: (api: PlayerTimeApi | null) => void
}

export type StreamPlayerComponent = ComponentType<StreamPlayerProps>

export type StreamPlatform = {
  id: PlatformId
  label: string
  Player: StreamPlayerComponent
  /** False hides chat toggles for this platform's tiles (e.g. Kick, until its chat transport is built). */
  hasChat: boolean
  /** Parses a URL or bare channel name typed into "Add channel"; null if this platform doesn't recognize it. */
  matchChannelInput: (input: string) => string | null
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
