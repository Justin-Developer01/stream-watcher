import type { ComponentType } from 'react'
import type { PlatformId } from '../../types'

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
