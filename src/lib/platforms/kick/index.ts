import { KickPlayer } from '../../../components/KickPlayer'
import type { StreamPlatform } from '../types'

// Only matches explicit kick.com URLs. A bare alphanumeric string is ambiguous with a
// Twitch channel name and always falls through to Twitch — see registry.ts's matchChannelInput.
const KICK_URL = /(?:https?:\/\/)?(?:www\.)?kick\.com\/([a-z0-9_-]{2,25})(?:[/?#]|$)/i

function matchKickInput(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  const match = KICK_URL.exec(trimmed)
  return match?.[1] ? match[1].toLowerCase() : null
}

export const kickPlatform: StreamPlatform = {
  id: 'kick',
  label: 'Kick',
  Player: KickPlayer,
  hasChat: false,
  matchChannelInput: matchKickInput,
}
