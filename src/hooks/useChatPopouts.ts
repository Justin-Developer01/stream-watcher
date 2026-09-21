import { useCallback, useEffect, useState } from 'react'

function norm(channel: string) {
  return channel.replace(/^#/, '').trim().toLowerCase()
}

export function useChatPopouts() {
  const [popped, setPopped] = useState<string[]>([])

  useEffect(() => {
    const api = window.streamWatcher
    if (!api?.listChatPopouts || !api.onChatPopoutOpened || !api.onChatPopoutClosed) {
      return
    }

    let cancelled = false
    void api.listChatPopouts().then((list) => {
      if (!cancelled) setPopped(list.map(norm))
    })

    const offOpen = api.onChatPopoutOpened((channel) => {
      const key = norm(channel)
      setPopped((prev) => (prev.includes(key) ? prev : [...prev, key]))
    })
    const offClose = api.onChatPopoutClosed((channel) => {
      const key = norm(channel)
      setPopped((prev) => prev.filter((c) => c !== key))
    })

    return () => {
      cancelled = true
      offOpen()
      offClose()
    }
  }, [])

  const isPopped = useCallback((channel: string | null | undefined) => {
    if (!channel) return false
    return popped.includes(norm(channel))
  }, [popped])

  const markPopped = useCallback((channel: string) => {
    const key = norm(channel)
    setPopped((prev) => (prev.includes(key) ? prev : [...prev, key]))
  }, [])

  return { poppedChannels: popped, isPopped, markPopped }
}
