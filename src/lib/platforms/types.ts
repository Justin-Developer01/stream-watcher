import type { ComponentType } from 'react'
import type { PlatformId, ProviderAuthState } from '../../types'

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
}

export interface PlatformAuth {
  auth: ProviderAuthState
  busy: boolean
  error: string | null
  login: () => Promise<void>
  logout: () => Promise<void>
  isLoggedIn: boolean
}
