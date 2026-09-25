import { useCallback, useState } from 'react'
import { log } from '../lib/log'
import type { PlatformAuth } from '../lib/platforms/types'
import { clearAuth, loadAuth, saveAuth } from '../lib/storage'
import { CHAT_SCOPES, fetchTwitchUser } from '../lib/twitch'
import type { ProviderAuthState } from '../types'

const DEFAULT_REDIRECT = 'http://localhost:5173/oauth/callback'
const EMPTY_AUTH: ProviderAuthState = {
  accessToken: null,
  username: null,
  displayName: null,
  scopes: [],
}

export function useTwitchAuth(clientId: string): PlatformAuth & {
  loginForChat: () => Promise<void>
  loginForPrime: () => Promise<void>
  loginToTwitch: () => Promise<void>
} {
  const [auth, setAuth] = useState<ProviderAuthState>(() => loadAuth().twitch)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      saveAuth({ twitch: next })
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
    clearAuth()
    setAuth(EMPTY_AUTH)
    await window.vesper?.clearTwitchSession()
  }, [])

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
