import { YouTubePlayer } from '../../../components/YouTubePlayer'
import type { StreamPlatform } from '../types'

// URL-only, like Kick's matcher: a bare 11-character YouTube video id
// ([A-Za-z0-9_-]) would otherwise collide with Twitch's bare-channel regex,
// so unlike a channel name, a video id must always come from a recognized URL.
const YOUTUBE_URL =
  /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i

function matchYouTubeInput(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  const match = YOUTUBE_URL.exec(trimmed)
  return match?.[1] ?? null
}

export const youtubePlatform: StreamPlatform = {
  id: 'youtube',
  label: 'YouTube',
  Player: YouTubePlayer,
  hasChat: false,
  matchChannelInput: matchYouTubeInput,
}
