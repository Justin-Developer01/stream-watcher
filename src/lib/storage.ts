import type { Layout } from 'react-grid-layout'
import { defaultHotkeys } from './hotkeys'
import {
  DEFAULT_SETTINGS,
  type AppSettings,
  type AuthState,
  type PersistedState,
  type PlatformId,
  type SavedStream,
  type StreamItem,
} from '../types'

const STATE_KEY = 'vesper-desk:v1'
const LEGACY_KEY = 'stream-watcher:v1'
const AUTH_KEY = 'vesper-desk:auth:v1'
const LEGACY_AUTH = 'stream-watcher:auth:v1'

export type GridLayout = Layout[]

function mergeSettings(raw: Partial<AppSettings> | undefined): AppSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...raw,
    chat: { ...DEFAULT_SETTINGS.chat, ...raw?.chat },
    hotkeys: { ...defaultHotkeys, ...raw?.hotkeys },
  }
}

type LegacyStreamItem = Omit<StreamItem, 'platform'> & { platform?: PlatformId }
type LegacySavedStream = Omit<SavedStream, 'platform'> & { platform?: PlatformId }

export function loadState(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STATE_KEY) ?? localStorage.getItem(LEGACY_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<Omit<PersistedState, 'streams' | 'savedStreams'>> & {
      streams?: LegacyStreamItem[]
      savedStreams?: LegacySavedStream[]
      chatSidebarOpen?: boolean
      leftSidebarOpen?: boolean
    }
    return {
      // Streams saved before the platform field existed are all Twitch.
      streams: (parsed.streams ?? []).map((s) => ({ ...s, platform: s.platform ?? 'twitch' })),
      layout: parsed.layout ?? [],
      focusedId: parsed.focusedId ?? null,
      chatChannel: parsed.chatChannel ?? null,
      clientId: parsed.clientId ?? '',
      savedStreams: (parsed.savedStreams ?? []).map((s) => ({ ...s, platform: s.platform ?? 'twitch' })),
      chatOpen: parsed.chatOpen ?? parsed.chatSidebarOpen ?? false,
      chatDock: parsed.chatDock ?? 'right',
      chatFloat: parsed.chatFloat ?? { x: 72, y: 56, width: 320, height: 440 },
      mode: parsed.mode ?? 'standard',
      templates: parsed.templates ?? [],
      settings: mergeSettings(parsed.settings),
      windowLocked: parsed.windowLocked === true,
    }
  } catch {
    return null
  }
}

export function saveState(state: PersistedState) {
  localStorage.setItem(STATE_KEY, JSON.stringify(state))
}

export function loadAuth(): AuthState {
  try {
    const raw = localStorage.getItem(AUTH_KEY) ?? localStorage.getItem(LEGACY_AUTH)
    if (!raw) return { accessToken: null, username: null, displayName: null, scopes: [] }
    return JSON.parse(raw) as AuthState
  } catch {
    return { accessToken: null, username: null, displayName: null, scopes: [] }
  }
}

export function saveAuth(auth: AuthState) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(auth))
}

export function clearAuth() {
  localStorage.removeItem(AUTH_KEY)
  localStorage.removeItem(LEGACY_AUTH)
}

export function createDefaultLayout(streams: StreamItem[]): GridLayout {
  const visible = streams.filter((s) => !s.popped)
  const count = Math.max(visible.length, 1)
  const cols = count <= 2 ? 2 : count <= 4 ? 2 : 3
  const w = Math.floor(12 / cols)

  return visible.map((stream, index) => {
    const col = index % cols
    const row = Math.floor(index / cols)
    return {
      i: stream.id,
      x: col * w,
      y: row * 8,
      w,
      h: 8,
      minW: 3,
      minH: 4,
    }
  })
}

/**
 * Identifies a stream/pop-out by platform + channel so two platforms with
 * the same channel name (e.g. a Kick and a Twitch "xqc") never collide.
 */
export function streamKey(platform: PlatformId, channel: string): string {
  return `${platform}:${channel}`
}

export function normalizeChannel(input: string): string | null {
  const trimmed = input.trim().toLowerCase()
  if (!trimmed) return null
  const urlMatch = trimmed.match(
    /(?:https?:\/\/)?(?:www\.)?twitch\.tv\/([a-z0-9_]{3,25})/i,
  )
  if (urlMatch?.[1]) return urlMatch[1].toLowerCase()
  const bare = trimmed.replace(/^@/, '')
  if (/^[a-z0-9_]{3,25}$/.test(bare)) return bare
  return null
}

export function newStreamId() {
  return `stream-${crypto.randomUUID()}`
}

export function chatFontFamily(settings: AppSettings): string {
  switch (settings.chat.font) {
    case 'ibm':
      return '"IBM Plex Sans", sans-serif'
    case 'inter':
      return 'Inter, sans-serif'
    case 'mono':
      return '"IBM Plex Mono", ui-monospace, monospace'
    case 'source':
      return '"Source Sans 3", sans-serif'
    case 'roboto':
      return 'Roboto, sans-serif'
    case 'geist':
      return 'Geist, sans-serif'
    case 'custom':
      return settings.chat.customFont || 'system-ui, sans-serif'
    default:
      return 'system-ui, sans-serif'
  }
}
