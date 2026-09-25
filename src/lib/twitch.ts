const HELIX = 'https://api.twitch.tv/helix'

// user:read:emotes lists the viewer's sub/follower emotes for the picker, as twitch.tv does.
export const CHAT_SCOPES = ['chat:read', 'chat:edit', 'user:read:emotes']

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

/** True if the token is still valid per id.twitch.tv/oauth2/validate. */
export async function validateTwitchToken(accessToken: string): Promise<boolean> {
  const res = await fetch('https://id.twitch.tv/oauth2/validate', {
    headers: { Authorization: `OAuth ${accessToken}` },
  })
  return res.ok
}

/** Best-effort: logging out locally should never hang on Twitch's revoke endpoint. */
export async function revokeTwitchToken(clientId: string, accessToken: string): Promise<void> {
  try {
    await fetch('https://id.twitch.tv/oauth2/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, token: accessToken }).toString(),
    })
  } catch (err) {
    void err
  }
}

export function getEmbedParent(): string {
  if (typeof window === 'undefined') return 'localhost'
  const host = window.location.hostname
  return host || 'localhost'
}
