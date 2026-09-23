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

export type TwitchEmote = { id: string; name: string }

export async function fetchGlobalEmotes(clientId: string, accessToken: string): Promise<TwitchEmote[]> {
  const res = await fetch(`${HELIX}/chat/emotes/global`, {
    headers: {
      'Client-ID': clientId,
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!res.ok) {
    throw new Error(`Global emotes lookup failed (${res.status})`)
  }

  const data = (await res.json()) as { data: Array<{ id: string; name: string }> }
  return data.data.map((emote) => ({ id: emote.id, name: emote.name }))
}

export function getEmbedParent(): string {
  // Electron loads localhost in dev; file:// in production needs a parent too.
  if (typeof window === 'undefined') return 'localhost'
  const host = window.location.hostname
  return host || 'localhost'
}
