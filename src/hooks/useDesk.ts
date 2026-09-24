import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Layout } from 'react-grid-layout'
import {
  createDefaultLayout,
  loadState,
  newStreamId,
  normalizeChannel,
  saveState,
  streamKey,
} from '../lib/storage'
import { DEFAULT_CHAT_FLOAT, DEFAULT_SETTINGS, type AppSettings, type ChatDock, type LayoutTemplate, type PersistedState, type SavedStream, type StreamItem, type WatchMode } from '../types'

const DEFAULT_STREAMS: StreamItem[] = [
  { id: newStreamId(), platform: 'twitch', channel: 'xqc', muted: false },
  { id: newStreamId(), platform: 'twitch', channel: 'shroud', muted: true },
]

export function useDesk() {
  const initial = useMemo(() => {
    const saved = loadState()
    if (saved?.streams?.length) {
      return {
        ...saved,
        layout: saved.layout?.length ? saved.layout : createDefaultLayout(saved.streams),
        settings: saved.settings ?? DEFAULT_SETTINGS,
      }
    }
    return {
      streams: DEFAULT_STREAMS,
      layout: createDefaultLayout(DEFAULT_STREAMS),
      focusedId: DEFAULT_STREAMS[0]?.id ?? null,
      chatChannel: DEFAULT_STREAMS[0]?.channel ?? null,
      clientId: saved?.clientId ?? '',
      savedStreams: saved?.savedStreams ?? [],
      chatOpen: saved?.chatOpen ?? false,
      chatDock: saved?.chatDock ?? 'right',
      chatFloat: saved?.chatFloat ?? DEFAULT_CHAT_FLOAT,
      mode: saved?.mode ?? 'standard',
      templates: saved?.templates ?? [],
      settings: saved?.settings ?? DEFAULT_SETTINGS,
      windowLocked: saved?.windowLocked === true,
    }
  }, [])

  const [streams, setStreams] = useState<StreamItem[]>(initial.streams)
  const [layout, setLayout] = useState<Layout[]>(initial.layout)
  const [focusedId, setFocusedId] = useState<string | null>(initial.focusedId)
  const [chatChannel, setChatChannel] = useState<string | null>(initial.chatChannel)
  const [clientId, setClientId] = useState(initial.clientId)
  const [savedStreams, setSavedStreams] = useState<SavedStream[]>(initial.savedStreams)
  const [chatOpen, setChatOpen] = useState(initial.chatOpen)
  const [chatDock, setChatDock] = useState<ChatDock>(initial.chatDock)
  const [chatFloat, setChatFloat] = useState(initial.chatFloat)
  const [mode, setMode] = useState<WatchMode>(initial.mode)
  const [templates, setTemplates] = useState<LayoutTemplate[]>(initial.templates)
  const [settings, setSettings] = useState<AppSettings>(initial.settings)
  const [isDragging, setIsDragging] = useState(false)
  const [windowLocked, setWindowLocked] = useState(initial.windowLocked)
  const [toolbarForced, setToolbarForced] = useState(false)
  const snapshotRef = useRef<PersistedState | null>(null)

  const snapshot = useMemo<PersistedState>(
    () => ({
      streams,
      layout,
      focusedId,
      chatChannel,
      clientId,
      savedStreams,
      chatOpen,
      chatDock,
      chatFloat,
      mode,
      templates,
      settings,
      windowLocked,
    }),
    [
      streams,
      layout,
      focusedId,
      chatChannel,
      clientId,
      savedStreams,
      chatOpen,
      chatDock,
      chatFloat,
      mode,
      templates,
      settings,
      windowLocked,
    ],
  )
  snapshotRef.current = snapshot

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (snapshotRef.current) saveState(snapshotRef.current)
    }, 200)
    return () => window.clearTimeout(timer)
  }, [snapshot])

  useEffect(() => {
    const flush = () => {
      if (snapshotRef.current) saveState(snapshotRef.current)
    }
    window.addEventListener('beforeunload', flush)
    return () => window.removeEventListener('beforeunload', flush)
  }, [])

  const visibleStreams = useMemo(() => streams.filter((s) => !s.popped), [streams])

  const addStream = useCallback((raw: string) => {
    // Only Twitch is matched here today; Phase 5 adds platform-aware
    // channel input (kick.com URLs etc.) alongside this.
    const platform = 'twitch' as const
    const channel = normalizeChannel(raw)
    if (!channel) return { ok: false as const, error: 'Enter a valid Twitch channel or URL' }
    const key = streamKey(platform, channel)
    const existing = streams.find((s) => streamKey(s.platform, s.channel) === key)
    if (existing && !existing.popped) {
      return { ok: false as const, error: 'That channel is already open' }
    }
    if (existing?.popped) {
      setStreams((prev) => prev.map((s) => (streamKey(s.platform, s.channel) === key ? { ...s, popped: false } : s)))
      return { ok: true as const, channel }
    }
    const id = newStreamId()
    setStreams((prev) => [...prev, { id, platform, channel, muted: prev.length > 0 }])
    setLayout((prev) => [
      ...prev,
      { i: id, x: (prev.length * 4) % 12, y: Infinity, w: 4, h: 8, minW: 3, minH: 4 },
    ])
    setFocusedId((current) => current ?? id)
    setChatChannel((current) => current ?? channel)
    return { ok: true as const, channel }
  }, [streams])

  const removeStream = useCallback((id: string) => {
    setStreams((prev) => {
      const next = prev.filter((s) => s.id !== id)
      setLayout((layoutPrev) => layoutPrev.filter((l) => l.i !== id))
      setFocusedId((current) => (current === id ? next.find((s) => !s.popped)?.id ?? null : current))
      return next
    })
  }, [])

  const toggleSaveStream = useCallback((raw: string) => {
    // Twitch-only until Phase 5; see addStream.
    const platform = 'twitch' as const
    const channel = normalizeChannel(raw)
    if (!channel) return
    const key = streamKey(platform, channel)
    setSavedStreams((prev) =>
      prev.some((s) => streamKey(s.platform, s.channel) === key)
        ? prev.filter((s) => streamKey(s.platform, s.channel) !== key)
        : [{ platform, channel, savedAt: Date.now() }, ...prev],
    )
  }, [])

  const unsaveStream = useCallback((channel: string) => {
    const key = streamKey('twitch', channel)
    setSavedStreams((prev) => prev.filter((s) => streamKey(s.platform, s.channel) !== key))
  }, [])

  const focusStream = useCallback((id: string) => {
    setFocusedId(id)
    setStreams((prev) => prev.map((s) => ({ ...s, muted: s.id !== id })))
    const stream = streams.find((s) => s.id === id)
    if (stream) setChatChannel(stream.channel)
  }, [streams])

  const toggleMute = useCallback((id: string) => {
    setStreams((prev) => prev.map((s) => (s.id === id ? { ...s, muted: !s.muted } : s)))
  }, [])

  const muteAll = useCallback(() => {
    setStreams((prev) => prev.map((s) => ({ ...s, muted: true })))
  }, [])

  const muteFocus = useCallback(() => {
    if (!focusedId) return
    setStreams((prev) => prev.map((s) => (s.id === focusedId ? { ...s, muted: !s.muted } : s)))
  }, [focusedId])

  const cycleStreams = useCallback(() => {
    if (!visibleStreams.length) return
    const idx = visibleStreams.findIndex((s) => s.id === focusedId)
    const next = visibleStreams[(idx + 1) % visibleStreams.length]
    if (next) focusStream(next.id)
  }, [visibleStreams, focusedId, focusStream])

  const switchFocus = useCallback(() => {
    if (visibleStreams.length < 2) return
    const idx = visibleStreams.findIndex((s) => s.id === focusedId)
    const next = visibleStreams[(idx + 1) % visibleStreams.length]
    if (next) focusStream(next.id)
  }, [visibleStreams, focusedId, focusStream])

  const applyPreset = useCallback((preset: '1x1' | '1x2' | '2x2' | '1+3') => {
    const list = visibleStreams
    if (!list.length) return
    let next: Layout[] = []
    if (preset === '1x1') {
      next = list.slice(0, 1).map((s) => ({ i: s.id, x: 0, y: 0, w: 12, h: 16, minW: 3, minH: 4 }))
    } else if (preset === '1x2') {
      next = list.slice(0, 2).map((s, i) => ({ i: s.id, x: i * 6, y: 0, w: 6, h: 14, minW: 3, minH: 4 }))
    } else if (preset === '2x2') {
      next = list.slice(0, 4).map((s, i) => ({
        i: s.id,
        x: (i % 2) * 6,
        y: Math.floor(i / 2) * 8,
        w: 6,
        h: 8,
        minW: 3,
        minH: 4,
      }))
    } else {
      const [main, ...rest] = list
      next = [
        { i: main.id, x: 0, y: 0, w: 8, h: 16, minW: 4, minH: 6 },
        ...rest.slice(0, 3).map((s, i) => ({ i: s.id, x: 8, y: i * 5, w: 4, h: 5, minW: 3, minH: 4 })),
      ]
    }
    const placed = new Set(next.map((n) => n.i))
    const extras = list
      .filter((s) => !placed.has(s.id))
      .map((s, i) => ({ i: s.id, x: 0, y: 20 + i * 6, w: 4, h: 6, minW: 3, minH: 4 }))
    setLayout([...next, ...extras])
    setMode('standard')
  }, [visibleStreams])

  const saveTemplate = useCallback((name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    setTemplates((prev) => [
      ...prev.filter((t) => t.name !== trimmed),
      { id: crypto.randomUUID(), name: trimmed, layout },
    ])
  }, [layout])

  const deleteTemplate = useCallback((id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const applyTemplate = useCallback((id: string) => {
    const template = templates.find((t) => t.id === id)
    if (!template) return
    setLayout(template.layout)
    setMode('standard')
  }, [templates])

  const popStream = useCallback((channel: string) => {
    const key = streamKey('twitch', channel)
    setStreams((prev) => prev.map((s) => (streamKey(s.platform, s.channel) === key ? { ...s, popped: true } : s)))
  }, [])

  const dockStream = useCallback((channel: string) => {
    const key = streamKey('twitch', channel)
    setStreams((prev) => prev.map((s) => (streamKey(s.platform, s.channel) === key ? { ...s, popped: false } : s)))
  }, [])

  const applySettings = useCallback((next: AppSettings, nextClientId?: string) => {
    setSettings(next)
    if (nextClientId !== undefined) setClientId(nextClientId)
    const current = snapshotRef.current
    if (!current) return
    const committed: PersistedState = {
      ...current,
      settings: next,
      clientId: nextClientId ?? current.clientId,
    }
    snapshotRef.current = committed
    saveState(committed)
  }, [])

  return {
    streams,
    visibleStreams,
    layout,
    setLayout,
    focusedId,
    chatChannel,
    setChatChannel,
    clientId,
    setClientId,
    savedStreams,
    chatOpen,
    setChatOpen,
    chatDock,
    setChatDock,
    chatFloat,
    setChatFloat,
    mode,
    setMode,
    templates,
    settings,
    applySettings,
    isDragging,
    setIsDragging,
    windowLocked,
    setWindowLocked,
    toolbarForced,
    setToolbarForced,
    addStream,
    removeStream,
    toggleSaveStream,
    unsaveStream,
    focusStream,
    toggleMute,
    muteAll,
    muteFocus,
    cycleStreams,
    switchFocus,
    applyPreset,
    saveTemplate,
    deleteTemplate,
    applyTemplate,
    popStream,
    dockStream,
  }
}
