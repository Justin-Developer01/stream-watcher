export function isElectronApp() {
  return Boolean(typeof window !== 'undefined' && window.streamWatcher)
}

export const MISSING_TWITCH_CLIENT_ID_ERROR = 'Add a Twitch Client ID in Settings → Developer'

export function getBuiltInTwitchClientId() {
  const value = import.meta.env.VITE_TWITCH_CLIENT_ID
  return typeof value === 'string' ? value.trim() : ''
}

export function resolveTwitchClientId(saved?: string | null) {
  const override = saved?.trim() ?? ''
  return override || getBuiltInTwitchClientId()
}

export function hasBuiltInTwitchClientId() {
  return Boolean(getBuiltInTwitchClientId())
}
