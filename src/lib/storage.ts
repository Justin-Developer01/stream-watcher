import type { Layout } from 'react-grid-layout'
import type { AuthState, PersistedState, StreamItem } from '../types'

const STATE_KEY = 'stream-watcher:v1'
const AUTH_KEY = 'stream-watcher:auth:v1'

export type GridLayout = Layout[]

export function loadState(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STATE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PersistedState
  } catch {
    return null
  }
}

export function saveState(state: PersistedState) {
  localStorage.setItem(STATE_KEY, JSON.stringify(state))
}

export function loadAuth(): AuthState {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (!raw) {
      return { accessToken: null, username: null, displayName: null, scopes: [] }
    }
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
}

export function createDefaultLayout(streams: StreamItem[]): GridLayout {
  const count = Math.max(streams.length, 1)
  const cols = count <= 2 ? 2 : count <= 4 ? 2 : 3
  const w = Math.floor(12 / cols)

  return streams.map((stream, index) => {
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
