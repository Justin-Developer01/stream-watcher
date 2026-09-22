import { useCallback, useEffect, useState } from 'react'

function norm(channel: string) {
  return channel.replace(/^#/, '').trim().toLowerCase()
}

function subscribeList(
  list: (() => Promise<string[]>) | undefined,
  onOpen: ((callback: (channel: string) => void) => () => void) | undefined,
  onClose: ((callback: (channel: string) => void) => () => void) | undefined,
  setList: (next: string[] | ((prev: string[]) => string[])) => void,
) {
  if (!list || !onOpen || !onClose) return () => undefined

  let cancelled = false
  void list().then((channels) => {
    if (!cancelled) setList(channels.map(norm))
  })

  const offOpen = onOpen((channel) => {
    const key = norm(channel)
    setList((prev) => (prev.includes(key) ? prev : [...prev, key]))
  })
  const offClose = onClose((channel) => {
    const key = norm(channel)
    setList((prev) => prev.filter((item) => item !== key))
  })

  return () => {
    cancelled = true
    offOpen()
    offClose()
  }
}

export function usePopouts() {
  const [chat, setChat] = useState<string[]>([])
  const [streams, setStreams] = useState<string[]>([])

  useEffect(() => {
    const api = window.streamWatcher
    const offChat = subscribeList(
      api?.listChatPopouts,
      api?.onChatPopoutOpened,
      api?.onChatPopoutClosed,
      setChat,
    )
    const offStream = subscribeList(
      api?.listStreamPopouts,
      api?.onStreamPopoutOpened,
      api?.onStreamPopoutClosed,
      setStreams,
    )
    const offChatDock = api?.onChatPopoutDocked?.((channel) => {
      const key = norm(channel)
      setChat((prev) => prev.filter((item) => item !== key))
    })
    const offStreamDock = api?.onStreamPopoutDocked?.((channel) => {
      const key = norm(channel)
      setStreams((prev) => prev.filter((item) => item !== key))
    })
    return () => {
      offChat()
      offStream()
      offChatDock?.()
      offStreamDock?.()
    }
  }, [])

  const isChatPopped = useCallback(
    (channel: string | null | undefined) => {
      if (!channel) return false
      return chat.includes(norm(channel))
    },
    [chat],
  )

  const isStreamPopped = useCallback(
    (channel: string | null | undefined) => {
      if (!channel) return false
      return streams.includes(norm(channel))
    },
    [streams],
  )

  const markChatPopped = useCallback((channel: string) => {
    const key = norm(channel)
    setChat((prev) => (prev.includes(key) ? prev : [...prev, key]))
  }, [])

  const markStreamPopped = useCallback((channel: string) => {
    const key = norm(channel)
    setStreams((prev) => (prev.includes(key) ? prev : [...prev, key]))
  }, [])

  return {
    poppedChat: chat,
    poppedStreams: streams,
    isChatPopped,
    isStreamPopped,
    markChatPopped,
    markStreamPopped,
  }
}
