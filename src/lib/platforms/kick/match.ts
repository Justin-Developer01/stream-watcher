// Only explicit kick.com URLs: a bare name is ambiguous with Twitch and falls through to it (registry.ts).
const KICK_URL = /^(?:https?:\/\/)?(?:www\.)?kick\.com\/([a-z0-9_-]{2,25})(?:[/?#]|$)/i

// kick.com pages that share the /<name> shape but are not channels.
const KICK_RESERVED = new Set([
  'about', 'browse', 'categories', 'category', 'clip', 'clips', 'community-guidelines', 'dashboard',
  'dmca-policy', 'following', 'login', 'privacy-policy', 'search', 'settings', 'signup', 'subscriptions',
  'terms-of-service', 'video', 'videos',
])

export function matchKickInput(input: string): string | null {
  const channel = KICK_URL.exec(input.trim())?.[1]?.toLowerCase()
  return channel && !KICK_RESERVED.has(channel) ? channel : null
}
