import { useEffect, useState } from 'react'
import { fetchGlobalEmotes, type TwitchEmote } from '../lib/twitch'

export function useGlobalEmotes(clientId: string, accessToken: string | null) {
  const [emotes, setEmotes] = useState<TwitchEmote[]>([])

  useEffect(() => {
    if (!accessToken) {
      setEmotes([])
      return
    }
    let cancelled = false
    fetchGlobalEmotes(clientId, accessToken)
      .then((result) => {
        if (!cancelled) setEmotes(result)
      })
      .catch(() => {
        if (!cancelled) setEmotes([])
      })
    return () => {
      cancelled = true
    }
  }, [clientId, accessToken])

  return emotes
}
