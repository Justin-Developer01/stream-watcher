import type { PlatformId } from '../../types'
import type { StreamPlatform } from './types'
import { twitchPlatform } from './twitch'
import { kickPlatform } from './kick'

export const platforms: Record<PlatformId, StreamPlatform> = {
  twitch: twitchPlatform,
  kick: kickPlatform,
}

export function getPlatform(id: PlatformId): StreamPlatform {
  const platform = platforms[id]
  if (!platform) throw new Error(`No StreamPlatform registered for "${id}"`)
  return platform
}

// Kick's matcher only recognizes explicit kick.com URLs, so it's tried first; Twitch's
// matcher also accepts a bare alphanumeric string as a fallback, which is why it goes
// last — a bare string with no URL is inherently ambiguous, and defaults to Twitch.
const MATCH_ORDER: PlatformId[] = ['kick', 'twitch']

export function matchChannelInput(raw: string): { platform: PlatformId; channel: string } | null {
  for (const id of MATCH_ORDER) {
    const channel = platforms[id].matchChannelInput(raw)
    if (channel) return { platform: id, channel }
  }
  return null
}
