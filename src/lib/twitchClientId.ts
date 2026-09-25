/** Public Twitch Client ID (not a Client Secret). CI or .env can override it with VITE_TWITCH_CLIENT_ID. */
export const PUBLIC_TWITCH_CLIENT_ID = 'dqxba57by77shem4jb9nzz39rtah2x'

/** The Client ID baked into this build: VITE_TWITCH_CLIENT_ID when set, else the public one. */
export function builtInTwitchClientId() {
  const fromEnv = import.meta.env.VITE_TWITCH_CLIENT_ID
  return (typeof fromEnv === 'string' ? fromEnv.trim() : '') || PUBLIC_TWITCH_CLIENT_ID
}

/** A Developer Client ID saved in Settings → Advanced overrides the built-in one. */
export function resolveTwitchClientId(saved?: string | null) {
  return saved?.trim() || builtInTwitchClientId()
}
