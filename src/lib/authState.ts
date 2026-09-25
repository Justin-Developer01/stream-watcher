// Deliberately its own zero-dependency module, same reasoning as platformId.ts:
// src/types.ts pulls in lib/hotkeys.ts (DOM types), which main/preload's
// tsconfig (no "dom" lib) can't typecheck. Main/preload import these types
// from here directly instead of from ../types, so they never touch that chain.
export type ProviderAuthState = {
  accessToken: string | null
  username: string | null
  displayName: string | null
  scopes: string[]
}

export type AuthState = {
  twitch: ProviderAuthState
}

export const EMPTY_PROVIDER_AUTH: ProviderAuthState = {
  accessToken: null,
  username: null,
  displayName: null,
  scopes: [],
}

/**
 * What main is willing to hand to any window, including video pop-outs: no
 * accessToken. Main is the sole holder of the raw token (see src/main/index.ts);
 * only the desk and chat pop-outs can ask for it, via auth:get-chat-credentials.
 */
export type PublicAuthState = {
  isLoggedIn: boolean
  username: string | null
  displayName: string | null
  scopes: string[]
}

export function toPublicAuthState(twitch: ProviderAuthState): PublicAuthState {
  return {
    isLoggedIn: Boolean(twitch.accessToken && twitch.username),
    username: twitch.username,
    displayName: twitch.displayName,
    scopes: twitch.scopes,
  }
}
