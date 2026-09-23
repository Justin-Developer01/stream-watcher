const HELIX = 'https://api.twitch.tv/helix'

export const CHAT_SCOPES = ['chat:read', 'chat:edit', 'user:read:email']

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

export function getEmbedParent(): string {
  if (typeof window === 'undefined') return 'localhost'
  const host = window.location.hostname
  return host || 'localhost'
}

export function badgeUrl(set: string, version: string) {
  return `https://static-cdn.jtvnw.net/badges/v1/${set}/${version}/1`
}

export function emoteUrl(id: string) {
  return `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/1.0`
}
