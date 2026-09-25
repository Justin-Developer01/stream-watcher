import { useCallback, useEffect, useState } from 'react'
import { log } from '../lib/log'
import type { PlatformAuth } from '../lib/platforms/types'
import { clearAuth, loadAuth } from '../lib/storage'
import { CHAT_SCOPES, fetchTwitchUser } from '../lib/twitch'
import type { ProviderAuthState, PublicAuthState } from '../types'

const DEFAULT_REDIRECT = 'http://localhost:5173/oauth/callback'
const EMPTY_SESSION: PublicAuthState = {
  isLoggedIn: false,
  username: null,
  displayName: null,
  scopes: [],
}

function toProviderShape(session: PublicAuthState): ProviderAuthState {
  // The desk never holds the raw token itself — see useChatCredentials for
  // that. accessToken here is always null; it exists only so this return
  // shape keeps satisfying PlatformAuth's existing `auth: ProviderAuthState`
  // field without changing that shared interface for a Twitch-only concern.
  return {
    accessToken: null,
    username: session.username,
    displayName: session.displayName,
    scopes: session.scopes,
  }
}

/**
 * Desk-only (App.tsx). Pop-outs never call this — they have no login UI and
 * main rejects login/logout/save from anything but the desk window anyway
 * (see isMainWindowSender in src/main/index.ts). Pop-outs that need chat
 * credentials use useChatCredentials() instead, which never runs a validate/
 * clear cycle of its own.
 */
export function useTwitchAuth(clientId: string): PlatformAuth & {
  loginForChat: () => Promise<void>
  loginForPrime: () => Promise<void>
  loginToTwitch: () => Promise<void>
} {
  const [session, setSession] = useState<PublicAuthState>(EMPTY_SESSION)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Seed from main's session, subscribe to changes (login/logout/expiry are all
  // broadcast from there — this window never decides any of that itself), and
  // hand off any pre-existing localStorage auth entry once, on first launch.
  useEffect(() => {
    let cancelled = false
    if (!window.vesper) return
    void window.vesper.getAuthSession().then((s) => {
      if (!cancelled) setSession(s)
    })
    const unsubscribe = window.vesper.onAuthChanged((s) => {
      if (!cancelled) setSession(s)
    })
    const legacy = loadAuth().twitch
    if (legacy.accessToken) {
      void window.vesper.migrateLegacyAuth(legacy).then(() => clearAuth())
    }
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  const loginForChat = useCallback(async () => {
    if (!clientId.trim()) {
      setError('Add a Twitch Client ID in Settings → Advanced')
      return
    }
    if (!window.vesper) {
      setError('Twitch login requires the desktop app')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const result = await window.vesper.startTwitchOAuth({
        clientId: clientId.trim(),
        redirectUri: DEFAULT_REDIRECT,
        scopes: CHAT_SCOPES,
      })
      if (!result?.accessToken) {
        log.warn('twitch login cancelled')
        setError('Login was cancelled')
        return
      }
      const user = await fetchTwitchUser(clientId.trim(), result.accessToken)
      const next: ProviderAuthState = {
        accessToken: result.accessToken,
        username: user.login,
        displayName: user.display_name,
        scopes: result.scope.split(/[\s+]+/).filter(Boolean),
      }
      await window.vesper.loginTwitchSession(next)
      // onAuthChanged will also deliver this, but setting it directly here
      // avoids a visible flash of "logged out" while that round-trip lands.
      setSession({
        isLoggedIn: true,
        username: next.username,
        displayName: next.displayName,
        scopes: next.scopes,
      })
    } catch (err) {
      log.error('twitch login failed:', err)
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setBusy(false)
    }
  }, [clientId])

  const loginForPrime = useCallback(async () => {
    if (!window.vesper) {
      setError('Twitch session login requires the desktop app')
      return
    }
    setError(null)
    await window.vesper.openTwitchLogin()
  }, [])

  // One OAuth window. Main warms twitch.tv cookies after it, so the Prime session rides along
  // (pre.17). Opening the twitch.tv login window here too stacked two windows at once.
  const loginToTwitch = loginForChat

  const logout = useCallback(async () => {
    setSession(EMPTY_SESSION)
    // Main does the (best-effort, timed-out) revoke, clears twitch-auth.bin, and
    // clears cookies — always, even if revoke fails, so this can't hang or leave
    // the app looking logged out while the file still holds a token.
    await window.vesper?.logoutTwitch(clientId.trim())
  }, [clientId])

  return {
    auth: toProviderShape(session),
    busy,
    error,
    login: loginToTwitch,
    loginForChat,
    loginForPrime,
    loginToTwitch,
    logout,
    isLoggedIn: session.isLoggedIn,
  }
}
