import type { PlatformId } from '../../types'
import type { StreamPlatform } from './types'
import { twitchPlatform } from './twitch'

// Partial until every PlatformId has a real implementation — Kick lands in
// a later phase (player first, chat/auth after that).
export const platforms: Partial<Record<PlatformId, StreamPlatform>> = {
  twitch: twitchPlatform,
}

export function getPlatform(id: PlatformId): StreamPlatform {
  const platform = platforms[id]
  if (!platform) throw new Error(`No StreamPlatform registered for "${id}"`)
  return platform
}
