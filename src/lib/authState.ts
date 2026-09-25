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
