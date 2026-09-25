// Deliberately its own zero-dependency module: src/types.ts pulls in
// lib/hotkeys.ts (DOM types), which main/preload's tsconfig (no "dom" lib)
// can't typecheck. Main/preload import PlatformId from here directly
// instead of from ../types, so they never touch that chain.
export type PlatformId = 'twitch' | 'kick'
