import { emoteUrl } from './parse'
import type { BadgeLookup, CheermoteLookup, CheermoteTier, Emote } from './types'

const HELIX = 'https://api.twitch.tv/helix'
const TTL_MS = 10 * 60 * 1000

export type HelixAuth = { clientId: string; accessToken: string | null }
type Theme = 'dark' | 'light'

type HelixPage<T> = { data: T[]; pagination?: { cursor?: string }; template?: string }

async function helixPage<T>(path: string, auth: HelixAuth): Promise<HelixPage<T> | null> {
  if (!auth.accessToken || !auth.clientId) return null
  try {
    const res = await fetch(`${HELIX}${path}`, {
      headers: { 'Client-ID': auth.clientId, Authorization: `Bearer ${auth.accessToken}` },
    })
    if (!res.ok) return null
    return (await res.json()) as HelixPage<T>
  } catch {
    return null
  }
}

async function helixAll<T>(path: string, auth: HelixAuth, maxPages = 20): Promise<T[] | null> {
  const out: T[] = []
  let cursor: string | undefined
  for (let page = 0; page < maxPages; page++) {
    const sep = path.includes('?') ? '&' : '?'
    const res = await helixPage<T>(cursor ? `${path}${sep}after=${encodeURIComponent(cursor)}` : path, auth)
    if (!res) return page === 0 ? null : out
    out.push(...res.data)
    cursor = res.pagination?.cursor
    if (!cursor) break
  }
  return out
}

const cache = new Map<string, { at: number; value: Promise<unknown> }>()

function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value as Promise<T>
  const value = load()
  cache.set(key, { at: Date.now(), value })
  // Do not keep failures (null or a rejection) around; try again next time.
  value.then(
    (v) => {
      if (v == null) cache.delete(key)
    },
    () => cache.delete(key),
  )
  return value
}

export function clearChatAssetCache() {
  cache.clear()
}

type HelixBadgeSet = { set_id: string; versions: Array<{ id: string; image_url_1x: string; image_url_2x?: string; title?: string }> }
type HelixEmote = { id: string; name: string; emote_type?: string; owner_id?: string; format?: string[] }
type HelixCheermote = {
  prefix: string
  tiers: Array<{
    min_bits: number
    color: string
    can_cheer?: boolean
    images: Record<Theme, { animated?: Record<string, string>; static?: Record<string, string> }>
  }>
}

function badgeLookup(sets: HelixBadgeSet[] | null): BadgeLookup | null {
  if (!sets) return null
  const map: BadgeLookup = new Map()
  for (const set of sets) {
    for (const v of set.versions) map.set(`${set.set_id}/${v.id}`, { url: v.image_url_1x, title: v.title || set.set_id })
  }
  return map
}

function toEmotes(list: HelixEmote[] | null, source: Emote['source'], theme: Theme): Emote[] | null {
  if (!list) return null
  const seen = new Set<string>()
  const out: Emote[] = []
  for (const e of list) {
    if (seen.has(e.name)) continue
    seen.add(e.name)
    out.push({ id: e.id, name: e.name, url: emoteUrl(e.id, theme), source, owner: e.owner_id })
  }
  return out
}

function cheerLookup(list: HelixCheermote[] | null, theme: Theme): CheermoteLookup | null {
  if (!list) return null
  const map: CheermoteLookup = new Map()
  for (const cm of list) {
    const tiers: CheermoteTier[] = cm.tiers
      .map((t) => ({
        minBits: t.min_bits,
        color: t.color,
        url: t.images?.[theme]?.animated?.['1'] ?? t.images?.[theme]?.static?.['1'] ?? '',
      }))
      .filter((t) => t.url)
      .sort((a, b) => a.minBits - b.minBits)
    if (tiers.length) map.set(cm.prefix.toLowerCase(), tiers)
  }
  return map
}

export type GlobalAssets = { badges: BadgeLookup | null; emotes: Emote[] | null }
export type ChannelAssets = {
  broadcasterId: string | null
  badges: BadgeLookup | null
  emotes: Emote[] | null
  cheermotes: CheermoteLookup | null
}

export function loadSelf(auth: HelixAuth) {
  return cached(`self:${auth.accessToken}`, async () => {
    const res = await helixPage<{ id: string; login: string }>('/users', auth)
    return res?.data[0] ?? null
  })
}

export function loadGlobalAssets(auth: HelixAuth, theme: Theme): Promise<GlobalAssets> {
  return cached(`global:${theme}:${auth.accessToken}`, async () => {
    const [badges, emotes] = await Promise.all([
      helixAll<HelixBadgeSet>('/chat/badges/global', auth),
      helixAll<HelixEmote>('/chat/emotes/global', auth),
    ])
    if (!badges && !emotes) throw new Error('Helix global chat assets unavailable')
    return { badges: badgeLookup(badges), emotes: toEmotes(emotes, 'global', theme) }
  })
}

export function loadChannelAssets(login: string, roomId: string | null, auth: HelixAuth, theme: Theme): Promise<ChannelAssets> {
  return cached(`channel:${login}:${theme}:${auth.accessToken}`, async () => {
    let broadcasterId = roomId
    if (!broadcasterId) {
      const users = await helixPage<{ id: string }>(`/users?login=${encodeURIComponent(login)}`, auth)
      broadcasterId = users?.data[0]?.id ?? null
    }
    if (!broadcasterId) throw new Error(`Unknown channel ${login}`)
    const id = encodeURIComponent(broadcasterId)
    const [badges, emotes, cheermotes] = await Promise.all([
      helixAll<HelixBadgeSet>(`/chat/badges?broadcaster_id=${id}`, auth),
      helixAll<HelixEmote>(`/chat/emotes?broadcaster_id=${id}`, auth),
      helixAll<HelixCheermote>(`/bits/cheermotes?broadcaster_id=${id}`, auth),
    ])
    if (!badges && !emotes && !cheermotes) throw new Error(`Helix chat assets unavailable for ${login}`)
    return {
      broadcasterId,
      badges: badgeLookup(badges),
      emotes: toEmotes(emotes, 'channel', theme),
      cheermotes: cheerLookup(cheermotes, theme),
    }
  })
}

/** Every emote the signed-in user can use (subs, follower, Turbo/Prime sets). Needs user:read:emotes. */
export function loadUserEmotes(userId: string, auth: HelixAuth, theme: Theme): Promise<Emote[] | null> {
  return cached(`user:${userId}:${theme}:${auth.accessToken}`, async () =>
    toEmotes(await helixAll<HelixEmote>(`/chat/emotes/user?user_id=${encodeURIComponent(userId)}`, auth, 50), 'user', theme),
  )
}
