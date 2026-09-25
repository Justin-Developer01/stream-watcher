import { useCallback, useEffect, useRef, useState } from 'react'
import { log } from '../lib/log'
import type { PlatformAuth } from '../lib/platforms/types'
import { clearAuth, loadAuth, loadSecureAuth, saveSecureAuth } from '../lib/storage'
import { CHAT_SCOPES, fetchTwitchUser, revokeTwitchToken, validateTwitchToken } from '../lib/twitch'
import type { ProviderAuthState } from '../types'

const DEFAULT_REDIRECT = 'http://localhost:5173/oauth/callback'
const EMPTY_AUTH: ProviderAuthState = {
  accessToken: null,
  username: null,
  displayName: null,
  scopes: [],
}
const VALIDATE_INTERVAL_MS = 60 * 60 * 1000

export function useTwitchAuth(clientId: string): PlatformAuth & {
  loginForChat: () => Promise<void>
  loginForPrime: () => Promise<void>
  loginToTwitch: () => Promise<void>
} {
  const [auth, setAuth] = useState<ProviderAuthState>(EMPTY_AUTH)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const clientIdRef = useRef(clientId)
  clientIdRef.current = clientId

  // Load from main-process safeStorage on launch; migrate a pre-existing
  // localStorage auth entry into it once, then drop the localStorage copy.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const stored = await loadSecureAuth()
      if (cancelled) return
      if (stored?.twitch.accessToken) {
        setAuth(stored.twitch)
        return
      }
      const legacy = loadAuth().twitch
      if (legacy.accessToken) {
        await saveSecureAuth({ twitch: legacy })
        clearAuth()
        if (!cancelled) setAuth(legacy)
      }
    })()
    return () => {
      cancelled = true
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
      await saveSecureAuth({ twitch: next })
      setAuth(next)
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
    if (auth.accessToken && clientIdRef.current.trim()) {
      await revokeTwitchToken(clientIdRef.current.trim(), auth.accessToken)
    }
    await saveSecureAuth({ twitch: EMPTY_AUTH })
    clearAuth()
    setAuth(EMPTY_AUTH)
    await window.vesper?.clearTwitchSession()
  }, [auth.accessToken])

  // Validate on launch and hourly. An expired/revoked token (401) is cleared
  // locally so the UI drops back to logged-out and prompts a fresh login —
  // this never calls Twitch's revoke endpoint, since the token is already dead.
  useEffect(() => {
    const token = auth.accessToken
    if (!token) return
    let cancelled = false
    const check = async () => {
      const ok = await validateTwitchToken(token).catch(() => true)
      if (cancelled || ok) return
      log.warn('twitch token no longer valid; signing out')
      await saveSecureAuth({ twitch: EMPTY_AUTH })
      clearAuth()
      if (!cancelled) {
        setAuth(EMPTY_AUTH)
        setError('Your Twitch session expired — log in again.')
      }
    }
    void check()
    const id = setInterval(check, VALIDATE_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [auth.accessToken])

  return {
    auth,
    busy,
    error,
    login: loginToTwitch,
    loginForChat,
    loginForPrime,
    loginToTwitch,
    logout,
    isLoggedIn: Boolean(auth.accessToken && auth.username),
  }
}
