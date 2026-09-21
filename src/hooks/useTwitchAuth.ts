import { useCallback, useEffect, useState } from 'react'
import { clearAuth, loadAuth, saveAuth } from '../lib/storage'
import { CHAT_SCOPES, fetchTwitchUser } from '../lib/twitch'
import type { AuthState } from '../types'

const DEFAULT_REDIRECT = 'http://localhost:5173/oauth/callback'

export function useTwitchAuth(clientId: string) {
  const [auth, setAuth] = useState<AuthState>(() => loadAuth())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = window.streamWatcher?.onTwitchSessionUpdated(() => {
      // Session cookies updated for embeds (Prime/Turbo path)
    })
    return () => {
      unsubscribe?.()
    }
  }, [])

  const loginForChat = useCallback(async () => {
    if (!clientId.trim()) {
      setError('Add your Twitch Client ID in Settings first')
      return
    }
    if (!window.streamWatcher) {
      setError('Twitch login requires the desktop Electron app')
      return
    }

    setBusy(true)
    setError(null)
    try {
      const result = await window.streamWatcher.startTwitchOAuth({
        clientId: clientId.trim(),
        redirectUri: DEFAULT_REDIRECT,
        scopes: CHAT_SCOPES,
      })

      if (!result?.accessToken) {
        setError('Login was cancelled')
        return
      }

      const user = await fetchTwitchUser(clientId.trim(), result.accessToken)
      const next: AuthState = {
        accessToken: result.accessToken,
        username: user.login,
        displayName: user.display_name,
        scopes: result.scope.split(/[\s+]+/).filter(Boolean),
      }
      saveAuth(next)
      setAuth(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setBusy(false)
    }
  }, [clientId])

  const loginForPrime = useCallback(async () => {
    if (!window.streamWatcher) {
      setError('Twitch session login requires the desktop Electron app')
      return
    }
    setError(null)
    await window.streamWatcher.openTwitchLogin()
  }, [])

  const logout = useCallback(async () => {
    clearAuth()
    setAuth({ accessToken: null, username: null, displayName: null, scopes: [] })
    await window.streamWatcher?.clearTwitchSession()
  }, [])

  return {
    auth,
    busy,
    error,
    loginForChat,
    loginForPrime,
    logout,
    isLoggedIn: Boolean(auth.accessToken && auth.username),
  }
}
