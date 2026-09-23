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
import { hasBuiltInTwitchClientId, resolveTwitchClientId } from '../lib/env'
import { applyAppearance, normalizeAppearance, type AppearanceTheme } from '../lib/theme'
import { normalizeHotkeys, type HotkeyChord, type HotkeyId } from '../lib/hotkeys'
import type {
  ChatDock,
  ChatFloatPosition,
  LayoutMode,
  LayoutTemplate,
  SavedStream,
  StreamItem,
} from '../types'
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
        appearance: normalizeAppearance(saved.appearance),
        windowLocked: saved.windowLocked === true,
        hotkeys: normalizeHotkeys(saved.hotkeys),
        performanceMode: saved.performanceMode === true,
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
      appearance: normalizeAppearance(saved?.appearance),
      windowLocked: saved?.windowLocked === true,
      hotkeys: normalizeHotkeys(saved?.hotkeys),
      performanceMode: saved?.performanceMode === true,
    }
  }, [])

  const [streams, setStreams] = useState<StreamItem[]>(initial.streams)
  const [layout, setLayout] = useState<Layout[]>(initial.layout)
  const [focusedId, setFocusedId] = useState<string | null>(initial.focusedId)
  const [chatChannel, setChatChannel] = useState<string | null>(initial.chatChannel)
  const [clientIdOverride, setClientId] = useState(initial.clientId)
  const clientId = resolveTwitchClientId(clientIdOverride)
  const hasBuiltInClientId = hasBuiltInTwitchClientId()
  const [savedStreams, setSavedStreams] = useState<SavedStream[]>(initial.savedStreams)
  const [chatSidebarOpen, setChatSidebarOpen] = useState(initial.chatSidebarOpen)
  const [chatDock, setChatDock] = useState<ChatDock>(initial.chatDock)
  const [chatFloat, setChatFloat] = useState<ChatFloatPosition>(initial.chatFloat)
  const [isDragging, setIsDragging] = useState(false)
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(initial.layoutMode)
  const [focusMode, setFocusMode] = useState(initial.focusMode)
  const [appearance, setAppearanceState] = useState<AppearanceTheme>(() => {
    applyAppearance(initial.appearance)
    return initial.appearance
  })
  const [windowLocked, setWindowLocked] = useState(initial.windowLocked)
  const [hotkeys, setHotkeys] = useState<Record<HotkeyId, HotkeyChord>>(initial.hotkeys)
  const [performanceMode, setPerformanceModeState] = useState(initial.performanceMode)

  useEffect(() => {
    const ok = saveState({
      streams,
      layout,
      focusedId,
      chatChannel,
      clientId: clientIdOverride,
      savedStreams,
      leftSidebarOpen: false,
      chatSidebarOpen,
      chatDock,
      chatFloat,
      layoutMode,
      focusMode,
      appearance,
      windowLocked,
      hotkeys,
      performanceMode,
    })
    if (!ok && appearance.backgroundImage) {
      const next = { ...appearance, backgroundImage: null }
      applyAppearance(next)
      setAppearanceState(next)
    }
  }, [
    streams,
    layout,
    focusedId,
    chatChannel,
    clientIdOverride,
    savedStreams,
    chatSidebarOpen,
    chatDock,
    chatFloat,
    layoutMode,
    focusMode,
    appearance,
    windowLocked,
    hotkeys,
    performanceMode,
  ])

  useEffect(() => {
    applyAppearance(appearance)
  }, [appearance])

  const setAppearance = useCallback((next: AppearanceTheme | ((prev: AppearanceTheme) => AppearanceTheme)) => {
    setAppearanceState((prev) => {
      const resolved = normalizeAppearance(typeof next === 'function' ? next(prev) : next)
      applyAppearance(resolved)
      return resolved
    })
  }, [])

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

  const cycleFocus = useCallback(() => {
    if (streams.length < 2) return
    const idx = streams.findIndex((s) => s.id === focusedId)
    const next = streams[(idx + 1) % streams.length] ?? streams[0]
    if (next) focusStream(next.id)
  }, [streams, focusedId, focusStream])

  const muteAll = useCallback(() => {
    setStreams((prev) => prev.map((s) => ({ ...s, muted: true })))
  }, [])

  const toggleMute = useCallback((id: string) => {
    setStreams((prev) => {
      const target = prev.find((s) => s.id === id)
      if (!target) return prev
      if (performanceMode && target.muted) {
        return prev.map((s) => ({ ...s, muted: s.id !== id }))
      }
      return prev.map((s) => (s.id === id ? { ...s, muted: !s.muted } : s))
    })
  }, [performanceMode])

  const setPerformanceMode = useCallback((next: boolean) => {
    setPerformanceModeState(next)
    if (!next) return
    setStreams((prev) => {
      const keep = focusedId ?? prev[0]?.id
      return prev.map((s) => ({ ...s, muted: s.id !== keep }))
    })
  }, [focusedId])

  const setMode = useCallback(
    (mode: 'standard' | 'focus' | 'performance') => {
      if (mode === 'focus') {
        setIsDragging(false)
        setFocusMode(true)
        setFocusedId((id) => id ?? streams[0]?.id ?? null)
        setPerformanceMode(false)
      } else if (mode === 'performance') {
        setFocusMode(false)
        setPerformanceMode(true)
      } else {
        setFocusMode(false)
        setPerformanceMode(false)
      }
    },
    [streams, setPerformanceMode],
  )

  const toggleSeeThroughWindows = useCallback(() => {
    const isOn = appearance.seeDesktop && !windowLocked
    setAppearance((prev) => ({ ...prev, seeDesktop: !isOn }))
    setWindowLocked(false)
  }, [appearance.seeDesktop, windowLocked])

  const applyPreset = useCallback(
    (preset: LayoutMode) => {
      setLayoutMode(preset)
      setFocusMode(false)
      if (!streams.length) return
      setLayout(buildPresetLayout(streams, preset))
    },
    [streams],
  )

  const applyTemplate = useCallback((template: LayoutTemplate) => {
    if (!template.channels.length) return

    const focusChannel =
      template.focusedChannel && template.channels.includes(template.focusedChannel)
        ? template.focusedChannel
        : template.channels[0]

    const newStreams: StreamItem[] = template.channels.map((channel) => ({
      id: newStreamId(),
      channel,
      muted: channel !== focusChannel,
    }))

    setStreams(newStreams)
    setLayoutMode(template.layoutMode)
    setLayout(buildPresetLayout(newStreams, template.layoutMode))
    setFocusMode(template.focusMode)
    setFocusedId(newStreams.find((s) => s.channel === focusChannel)?.id ?? newStreams[0].id)

    setChatDock(template.chatDock)
    setChatSidebarOpen(template.chatSidebarOpen)
    const chatMatch =
      template.chatChannel && template.channels.includes(template.chatChannel)
        ? template.chatChannel
        : newStreams[0].channel
    setChatChannel(chatMatch)
  }, [])

  return {
    streams,
    layout,
    setLayout,
    focusedId,
    chatChannel,
    setChatChannel,
    clientId,
    clientIdOverride,
    setClientId,
    hasBuiltInClientId,
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
    cycleFocus,
    muteAll,
    toggleMute,
    setMode,
    toggleSeeThroughWindows,
    applyPreset,
    applyTemplate,
    appearance,
    setAppearance,
    windowLocked,
    setWindowLocked,
    hotkeys,
    setHotkeys,
    performanceMode,
    setPerformanceMode,
  }
}
