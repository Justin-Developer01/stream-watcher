// Zero-dependency module (only fetch/URLSearchParams/AbortSignal, no `window`)
// so src/main/index.ts can import it directly — same reasoning as authState.ts.
// This is the ONLY place that decides whether a Twitch token is still good.

export type ValidationResult = 'valid' | 'invalid' | 'indeterminate'

/**
 * Only a real 401 from id.twitch.tv means the token is dead. Anything else —
 * a rate limit, a 5xx, a timeout, no network — is indeterminate: the caller
 * must keep the session, since wiping it on a transient failure would log
 * someone out for a reason that has nothing to do with their token.
 */
export async function validateTwitchToken(accessToken: string): Promise<ValidationResult> {
  try {
    const res = await fetch('https://id.twitch.tv/oauth2/validate', {
      headers: { Authorization: `OAuth ${accessToken}` },
      signal: AbortSignal.timeout(8000),
    })
    if (res.status === 401) return 'invalid'
    return res.ok ? 'valid' : 'indeterminate'
  } catch {
    return 'indeterminate'
  }
}

/** Best-effort: logout always clears the local session locally regardless of this outcome. */
export async function revokeTwitchToken(clientId: string, accessToken: string): Promise<void> {
  try {
    await fetch('https://id.twitch.tv/oauth2/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, token: accessToken }).toString(),
      signal: AbortSignal.timeout(5000),
    })
  } catch {
    // Nothing to do — the caller clears local state either way.
  }
}
