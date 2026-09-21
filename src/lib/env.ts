import { PUBLIC_TWITCH_CLIENT_ID } from './twitchPublicClientId'

export function isElectronApp() {
  return Boolean(typeof window !== 'undefined' && window.streamWatcher)
}

export const MISSING_TWITCH_CLIENT_ID_ERROR = 'Add a Twitch Client ID in Settings → Developer'

export const TWITCH_OAUTH_REDIRECT = 'http://localhost:5173/oauth/callback'

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
