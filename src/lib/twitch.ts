const HELIX = 'https://api.twitch.tv/helix'

export const CHAT_SCOPES = ['chat:read', 'chat:edit']

export async function fetchTwitchUser(clientId: string, accessToken: string) {
  const res = await fetch(`${HELIX}/users`, {
    headers: {
      'Client-ID': clientId,
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!res.ok) {
    throw new Error(`Twitch user lookup failed (${res.status})`)
  }

  const data = (await res.json()) as {
    data: Array<{ login: string; display_name: string }>
  }

  const user = data.data[0]
  if (!user) throw new Error('No Twitch user returned')
  return user
}

type HelixList<T> = { data: T[] }

export type HelixEmote = {
  id: string
  name: string
  emote_type?: string
  images?: { url_1x?: string; url_2x?: string }
}

export type HelixBadgeSet = {
  set_id: string
  versions: Array<{
    id: string
    image_url_1x?: string
    image_url_2x?: string
  }>
}

export type ChatEmote = {
  id: string
  name: string
  url: string
  source: 'global' | 'channel'
}

export type BadgeLookup = Record<string, string>

export function emoteCdnUrl(id: string, scale: '1.0' | '2.0' = '1.0') {
  return `https://static-cdn.jtvnw.net/emoticons/v2/${encodeURIComponent(id)}/default/dark/${scale}`
}

async function helixGet<T>(path: string, clientId: string, accessToken: string): Promise<T | null> {
  try {
    const res = await fetch(`${HELIX}${path}`, {
      headers: {
        'Client-ID': clientId,
        Authorization: `Bearer ${accessToken}`,
      },
    })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

function isBitsEmote(emote: HelixEmote) {
  const kind = (emote.emote_type ?? '').toLowerCase()
  return kind === 'bitstier' || kind === 'bits'
}

function toChatEmote(emote: HelixEmote, source: ChatEmote['source']): ChatEmote | null {
  if (!emote.id || !emote.name || isBitsEmote(emote)) return null
  return {
    id: emote.id,
    name: emote.name,
    url: emote.images?.url_1x || emoteCdnUrl(emote.id),
    source,
  }
}

export async function fetchUsersByLogin(clientId: string, accessToken: string, logins: string[]) {
  const unique = [...new Set(logins.map((login) => login.trim().toLowerCase()).filter(Boolean))]
  if (!unique.length) return []
  const params = unique.map((login) => `login=${encodeURIComponent(login)}`).join('&')
  const data = await helixGet<HelixList<{ id: string; login: string }>>(
    `/users?${params}`,
    clientId,
    accessToken,
  )
  return data?.data ?? []
}

export async function fetchGlobalChatEmotes(clientId: string, accessToken: string) {
  const data = await helixGet<HelixList<HelixEmote>>('/chat/emotes/global', clientId, accessToken)
  return (data?.data ?? []).map((emote) => toChatEmote(emote, 'global')).filter((emote): emote is ChatEmote => Boolean(emote))
}

export async function fetchChannelChatEmotes(
  clientId: string,
  accessToken: string,
  broadcasterId: string,
) {
  const data = await helixGet<HelixList<HelixEmote>>(
    `/chat/emotes?broadcaster_id=${encodeURIComponent(broadcasterId)}`,
    clientId,
    accessToken,
  )
  return (data?.data ?? []).map((emote) => toChatEmote(emote, 'channel')).filter((emote): emote is ChatEmote => Boolean(emote))
}

function badgeLookup(sets: HelixBadgeSet[]): BadgeLookup {
  const next: BadgeLookup = {}
  for (const set of sets) {
    for (const version of set.versions) {
      const url = version.image_url_1x || version.image_url_2x
      if (!url) continue
      next[`${set.set_id}/${version.id}`] = url
    }
  }
  return next
}

export async function fetchGlobalChatBadges(clientId: string, accessToken: string) {
  const data = await helixGet<HelixList<HelixBadgeSet>>('/chat/badges/global', clientId, accessToken)
  return badgeLookup(data?.data ?? [])
}

export async function fetchChannelChatBadges(
  clientId: string,
  accessToken: string,
  broadcasterId: string,
) {
  const data = await helixGet<HelixList<HelixBadgeSet>>(
    `/chat/badges?broadcaster_id=${encodeURIComponent(broadcasterId)}`,
    clientId,
    accessToken,
  )
  return badgeLookup(data?.data ?? [])
}

export function getEmbedParent(): string {
  // Electron loads localhost in dev; file:// in production needs a parent too.
  if (typeof window === 'undefined') return 'localhost'
  const host = window.location.hostname
  return host || 'localhost'
}
