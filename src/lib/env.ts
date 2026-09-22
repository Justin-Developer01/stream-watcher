import { PUBLIC_TWITCH_CLIENT_ID } from './twitchPublicClientId'

export function isElectronApp() {
  return Boolean(typeof window !== 'undefined' && window.streamWatcher)
}

export const MISSING_TWITCH_CLIENT_ID_ERROR = 'Add a Twitch Client ID in Settings → Advanced'

export const TWITCH_OAUTH_REDIRECT = 'http://localhost:5173/oauth/callback'

export const DOCS_USAGE_URL = 'https://github.com/Justin-Developer01/stream-watcher/blob/main/docs/USAGE.md'

export function getBuiltInTwitchClientId() {
  const value = import.meta.env.VITE_TWITCH_CLIENT_ID
  const fromEnv = typeof value === 'string' ? value.trim() : ''
  return fromEnv || PUBLIC_TWITCH_CLIENT_ID
}

export function resolveTwitchClientId(saved?: string | null) {
  const override = saved?.trim() ?? ''
  return override || getBuiltInTwitchClientId()
}

export function hasBuiltInTwitchClientId() {
  return Boolean(getBuiltInTwitchClientId())
}
