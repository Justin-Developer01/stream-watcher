import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Layout } from 'react-grid-layout'
import {
  createDefaultLayout,
  loadState,
  newStreamId,
  normalizeChannel,
  saveState,
} from '../lib/storage'
import type { ChatDock, ChatFloatPosition, SavedStream, StreamItem } from '../types'
import { DEFAULT_CHAT_FLOAT } from '../types'

const DEFAULT_STREAMS: StreamItem[] = [
  { id: newStreamId(), channel: 'xqc', muted: false },
  { id: newStreamId(), channel: 'shroud', muted: true },
]

export function useStreams() {
  const initial = useMemo(() => {
    const saved = loadState()
    if (saved?.streams?.length) {
      return {
        streams: saved.streams,
        layout: saved.layout?.length ? saved.layout : createDefaultLayout(saved.streams),
        focusedId: saved.focusedId,
        chatChannel: saved.chatChannel ?? saved.streams[0]?.channel ?? null,
        clientId: saved.clientId ?? '',
        savedStreams: saved.savedStreams ?? [],
        chatSidebarOpen: saved.chatSidebarOpen ?? false,
        chatDock: saved.chatDock ?? 'right',
        chatFloat: saved.chatFloat ?? DEFAULT_CHAT_FLOAT,
      }
    }
    return {
      streams: DEFAULT_STREAMS,
      layout: createDefaultLayout(DEFAULT_STREAMS),
      focusedId: DEFAULT_STREAMS[0]?.id ?? null,
      chatChannel: DEFAULT_STREAMS[0]?.channel ?? null,
      clientId: saved?.clientId ?? '',
      savedStreams: saved?.savedStreams ?? [],
      chatSidebarOpen: saved?.chatSidebarOpen ?? false,
      chatDock: saved?.chatDock ?? 'right',
      chatFloat: saved?.chatFloat ?? DEFAULT_CHAT_FLOAT,
    }
  }, [])

  const [streams, setStreams] = useState<StreamItem[]>(initial.streams)
  const [layout, setLayout] = useState<Layout[]>(initial.layout)
  const [focusedId, setFocusedId] = useState<string | null>(initial.focusedId)
  const [chatChannel, setChatChannel] = useState<string | null>(initial.chatChannel)
  const [clientId, setClientId] = useState(initial.clientId)
  const [savedStreams, setSavedStreams] = useState<SavedStream[]>(initial.savedStreams)
  const [chatSidebarOpen, setChatSidebarOpen] = useState(initial.chatSidebarOpen)
  const [chatDock, setChatDock] = useState<ChatDock>(initial.chatDock)
  const [chatFloat, setChatFloat] = useState<ChatFloatPosition>(initial.chatFloat)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    saveState({
      streams,
      layout,
      focusedId,
      chatChannel,
      clientId,
      savedStreams,
      leftSidebarOpen: false,
      chatSidebarOpen,
      chatDock,
      chatFloat,
    })
  }, [
    streams,
    layout,
    focusedId,
    chatChannel,
    clientId,
    savedStreams,
    chatSidebarOpen,
    chatDock,
    chatFloat,
  ])

  const addStream = useCallback((raw: string) => {
    const channel = normalizeChannel(raw)
    if (!channel) return { ok: false as const, error: 'Enter a valid Twitch channel or URL' }
    if (streams.some((s) => s.channel === channel)) {
      return { ok: false as const, error: 'That channel is already open' }
    }

    const id = newStreamId()
    const item: StreamItem = { id, channel, muted: streams.length > 0 }

    setStreams((prev) => [...prev, item])
    setLayout((prev) => [
      ...prev,
      {
        i: id,
        x: (prev.length * 4) % 12,
        y: Infinity,
        w: 4,
        h: 8,
        minW: 3,
        minH: 4,
      },
    ])
    setFocusedId((current) => current ?? id)
    setChatChannel((current) => current ?? channel)
    return { ok: true as const, channel }
  }, [streams])

  const removeStream = useCallback((id: string) => {
    setStreams((prev) => {
      const next = prev.filter((s) => s.id !== id)
      setLayout((layoutPrev) => layoutPrev.filter((l) => l.i !== id))
      setFocusedId((current) => {
        if (current !== id) return current
        return next[0]?.id ?? null
      })
      setChatChannel((current) => {
        const removed = prev.find((s) => s.id === id)
        if (!removed || current !== removed.channel) return current
        return next[0]?.channel ?? null
      })
      return next
    })
  }, [])

  const saveStream = useCallback((raw: string) => {
    const channel = normalizeChannel(raw)
    if (!channel) return { ok: false as const, error: 'Enter a valid Twitch channel or URL' }
    if (savedStreams.some((s) => s.channel === channel)) {
      return { ok: false as const, error: 'Already in saved streams' }
    }
    setSavedStreams((prev) => [{ channel, savedAt: Date.now() }, ...prev])
    return { ok: true as const, channel }
  }, [savedStreams])

  const unsaveStream = useCallback((channel: string) => {
    setSavedStreams((prev) => prev.filter((s) => s.channel !== channel))
  }, [])

  const toggleSaveStream = useCallback((raw: string) => {
    const channel = normalizeChannel(raw)
    if (!channel) return { ok: false as const, error: 'Invalid channel' }
    if (savedStreams.some((s) => s.channel === channel)) {
      setSavedStreams((prev) => prev.filter((s) => s.channel !== channel))
      return { ok: true as const, saved: false as const, channel }
    }
    setSavedStreams((prev) => [{ channel, savedAt: Date.now() }, ...prev])
    return { ok: true as const, saved: true as const, channel }
  }, [savedStreams])

  const focusStream = useCallback((id: string) => {
    setFocusedId(id)
    setStreams((prev) =>
      prev.map((s) => ({
        ...s,
        muted: s.id !== id,
      })),
    )
    const stream = streams.find((s) => s.id === id)
    if (stream) setChatChannel(stream.channel)
  }, [streams])

  const toggleMute = useCallback((id: string) => {
    setStreams((prev) =>
      prev.map((s) => (s.id === id ? { ...s, muted: !s.muted } : s)),
    )
  }, [])

  const applyPreset = useCallback(
    (preset: '1x1' | '1x2' | '2x2' | '1+3') => {
      if (!streams.length) return

      let next: Layout[] = []
      if (preset === '1x1') {
        next = streams.slice(0, 1).map((s) => ({
          i: s.id,
          x: 0,
          y: 0,
          w: 12,
          h: 16,
          minW: 3,
          minH: 4,
        }))
      } else if (preset === '1x2') {
        next = streams.slice(0, 2).map((s, i) => ({
          i: s.id,
          x: i * 6,
          y: 0,
          w: 6,
          h: 14,
          minW: 3,
          minH: 4,
        }))
      } else if (preset === '2x2') {
        next = streams.slice(0, 4).map((s, i) => ({
          i: s.id,
          x: (i % 2) * 6,
          y: Math.floor(i / 2) * 8,
          w: 6,
          h: 8,
          minW: 3,
          minH: 4,
        }))
      } else {
        const [main, ...rest] = streams
        next = [
          {
            i: main.id,
            x: 0,
            y: 0,
            w: 8,
            h: 16,
            minW: 4,
            minH: 6,
          },
          ...rest.slice(0, 3).map((s, i) => ({
            i: s.id,
            x: 8,
            y: i * 5,
            w: 4,
            h: 5,
            minW: 3,
            minH: 4,
          })),
        ]
      }

      const placed = new Set(next.map((n) => n.i))
      const extras = streams
        .filter((s) => !placed.has(s.id))
        .map((s, i) => ({
          i: s.id,
          x: 0,
          y: 20 + i * 6,
          w: 4,
          h: 6,
          minW: 3,
          minH: 4,
        }))

      setLayout([...next, ...extras])
    },
    [streams],
  )

  return {
    streams,
    layout,
    setLayout,
    focusedId,
    chatChannel,
    setChatChannel,
    clientId,
    setClientId,
    savedStreams,
    chatSidebarOpen,
    setChatSidebarOpen,
    chatDock,
    setChatDock,
    chatFloat,
    setChatFloat,
    isDragging,
    setIsDragging,
    addStream,
    removeStream,
    saveStream,
    unsaveStream,
    toggleSaveStream,
    focusStream,
    toggleMute,
    applyPreset,
  }
}
