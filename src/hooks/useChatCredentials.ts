import { useEffect, useState } from 'react'

type ChatCredentials = { username: string; accessToken: string } | null

/**
 * The only place the raw Twitch token ever reaches a renderer. Main only answers
 * this for the desk window or a chat pop-out (see auth:get-chat-credentials in
 * src/main/index.ts) — a video pop-out passing enabled=false never even asks,
 * so it never receives a token it has no use for.
 *
 * Read-only: this never validates or clears anything itself. Session lifecycle
 * (migrate/validate/login/logout) is owned entirely by main and useTwitchAuth();
 * this hook just re-reads after every auth:changed broadcast.
 */
export function useChatCredentials(enabled: boolean): ChatCredentials {
  const [credentials, setCredentials] = useState<ChatCredentials>(null)

  useEffect(() => {
    if (!enabled || !window.vesper) {
      setCredentials(null)
      return
    }
    let cancelled = false
    const refresh = () => {
      void window.vesper?.getChatCredentials().then((c) => {
        if (!cancelled) setCredentials(c)
      })
    }
    refresh()
    const unsubscribe = window.vesper.onAuthChanged(refresh)
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [enabled])

  return credentials
}
