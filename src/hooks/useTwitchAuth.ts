import { useCallback, useEffect, useState } from 'react'
import { clearAuth, loadAuth, saveAuth } from '../lib/storage'
import { CHAT_SCOPES, fetchTwitchUser } from '../lib/twitch'
import { MISSING_TWITCH_CLIENT_ID_ERROR } from '../lib/env'
import type { AuthState } from '../types'

const DEFAULT_REDIRECT = 'http://localhost:5173/oauth/callback'

function redirectUri() {
  if (typeof window === 'undefined') return DEFAULT_REDIRECT
  return `${window.location.origin}/oauth/callback`
}

function readTokenFromLocation() {
  if (typeof window === 'undefined') return null
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : ''
  const search = window.location.search.startsWith('?') ? window.location.search.slice(1) : ''
  const data = new URLSearchParams(hash || search)
  const accessToken = data.get('access_token')
  const scope = data.get('scope') ?? ''
  if (!accessToken) return null
  return { accessToken, scope }
}

function clearOAuthLocation() {
  const url = new URL(window.location.href)
  url.hash = ''
  if (url.pathname.endsWith('/oauth/callback')) {
    url.pathname = '/'
  }
  window.history.replaceState({}, document.title, url.pathname + url.search)
}

async function runChatOAuth(clientId: string) {
  if (window.streamWatcher) {
    const result = await window.streamWatcher.startTwitchOAuth({
      clientId,
      redirectUri: DEFAULT_REDIRECT,
      scopes: CHAT_SCOPES,
    })
    if (!result?.accessToken) {
      throw new Error('Login was cancelled')
    }
    return result
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri(),
    response_type: 'token',
    scope: CHAT_SCOPES.join(' '),
    force_verify: 'true',
  })
  window.location.assign(`https://id.twitch.tv/oauth2/authorize?${params.toString()}`)
  return null
}

export function useTwitchAuth(clientId: string) {
  const [auth, setAuth] = useState<AuthState>(() => loadAuth())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = window.streamWatcher?.onTwitchSessionUpdated(() => {
      // Electron defaultSession cookies now apply to player embeds (Prime/ads).
    })
    return () => {
      unsubscribe?.()
    }
  }, [])

  const finishLogin = useCallback(
    async (accessToken: string, scope: string) => {
      const user = await fetchTwitchUser(clientId.trim(), accessToken)
      const next: AuthState = {
        accessToken,
        username: user.login,
        displayName: user.display_name,
        scopes: scope.split(/[\s+]+/).filter(Boolean),
      }
      saveAuth(next)
      setAuth(next)
    },
    [clientId],
  )

  useEffect(() => {
    const fromUrl = readTokenFromLocation()
    if (!fromUrl || !clientId.trim()) return

    let cancelled = false
    setBusy(true)
    setError(null)
    void finishLogin(fromUrl.accessToken, fromUrl.scope)
      .then(() => {
        if (!cancelled) clearOAuthLocation()
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Login failed')
      })
      .finally(() => {
        if (!cancelled) setBusy(false)
      })

    return () => {
      cancelled = true
    }
  }, [clientId, finishLogin])

  const loginToTwitch = useCallback(async () => {
    if (!clientId.trim()) {
      setError(MISSING_TWITCH_CLIENT_ID_ERROR)
      return
    }

    setBusy(true)
    setError(null)
    try {
      const result = await runChatOAuth(clientId.trim())
      if (!result) return
      await finishLogin(result.accessToken, result.scope)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setBusy(false)
    }
  }, [clientId, finishLogin])

  const reconnectChat = useCallback(async () => {
    await loginToTwitch()
  }, [loginToTwitch])

  const refreshPrimeSession = useCallback(async () => {
    if (!window.streamWatcher) {
      setError('Desktop app only')
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
    loginToTwitch,
    reconnectChat,
    refreshPrimeSession,
    logout,
    isLoggedIn: Boolean(auth.accessToken && auth.username),
  }
}
