import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Layout } from 'react-grid-layout'
import { buildPresetLayout, reconcileLayout } from '../lib/layout'
import {
  createDefaultLayout,
  loadState,
  newStreamId,
  normalizeChannel,
  saveState,
} from '../lib/storage'
import type { ChatDock, ChatFloatPosition, LayoutMode, SavedStream, StreamItem } from '../types'
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
        layout: reconcileLayout(
          saved.streams,
          saved.layout ?? [],
          saved.layoutMode ?? (saved.streams.length <= 1 ? '1x1' : saved.streams.length === 2 ? '1x2' : '2x2'),
        ),
        focusedId: saved.focusedId,
        chatChannel: saved.chatChannel ?? saved.streams[0]?.channel ?? null,
        clientId: saved.clientId ?? '',
        savedStreams: saved.savedStreams ?? [],
        chatSidebarOpen: saved.chatSidebarOpen ?? false,
        chatDock: saved.chatDock ?? 'right',
        chatFloat: saved.chatFloat ?? DEFAULT_CHAT_FLOAT,
        layoutMode: saved.layoutMode ?? (saved.streams.length <= 1 ? '1x1' : saved.streams.length === 2 ? '1x2' : '2x2'),
        focusMode: saved.focusMode ?? false,
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
      layoutMode: saved?.layoutMode ?? '1x2',
      focusMode: false,
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
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(initial.layoutMode)
  const [focusMode, setFocusMode] = useState(initial.focusMode)

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
      layoutMode,
      focusMode,
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
    layoutMode,
    focusMode,
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
        h: 6,
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

  const focusStream = useCallback((id: string, options?: { enterFocusMode?: boolean }) => {
    setFocusedId(id)
    if (options?.enterFocusMode) {
      setFocusMode(true)
      setIsDragging(false)
    }
    setStreams((prev) =>
      prev.map((s) => ({
        ...s,
        muted: s.id !== id,
      })),
    )
    const stream = streams.find((s) => s.id === id)
    if (stream) setChatChannel(stream.channel)
  }, [streams])

  const toggleFocusMode = useCallback(() => {
    setIsDragging(false)
    setFocusMode((current) => {
      if (!current) {
        setFocusedId((id) => id ?? streams[0]?.id ?? null)
      }
      return !current
    })
  }, [streams])

  const toggleMute = useCallback((id: string) => {
    setStreams((prev) =>
      prev.map((s) => (s.id === id ? { ...s, muted: !s.muted } : s)),
    )
  }, [])

  const applyPreset = useCallback(
    (preset: LayoutMode) => {
      setLayoutMode(preset)
      setFocusMode(false)
      if (!streams.length) return
      setLayout(buildPresetLayout(streams, preset))
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
    layoutMode,
    focusMode,
    toggleFocusMode,
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
