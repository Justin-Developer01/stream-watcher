import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChatPanel } from './components/ChatPanel'
import { ChatPopoutApp } from './components/ChatPopoutApp'
import { FirstRunTips } from './components/FirstRunTips'
import { SettingsModal, type SettingsTab } from './components/SettingsModal'
import { StreamGrid } from './components/StreamGrid'
import { StreamPopoutApp } from './components/StreamPopoutApp'
import { TopBar } from './components/TopBar'
import { useChat } from './hooks/useChat'
import { usePopouts } from './hooks/usePopouts'
import { useTemplates } from './hooks/useTemplates'
import { useClickThrough } from './hooks/useClickThrough'
import { useFullscreen } from './hooks/useFullscreen'
import { useHotkeys } from './hooks/useHotkeys'
import { useStreams } from './hooks/useStreams'
import { useAppUpdater } from './hooks/useAppUpdater'
import { useTwitchAuth } from './hooks/useTwitchAuth'
import { MISSING_TWITCH_CLIENT_ID_ERROR } from './lib/env'

const FULLSCREEN_IDLE_MS = 2400
const SETTINGS_ALLOWED_HOTKEYS = ['openSettings', 'quitApp'] as const

function MainApp() {
  const {
    streams,
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
    layout,
    setLayout,
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
    switchFocus,
    muteAll,
    toggleMute,
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
  } = useStreams()

  const { auth, busy, error, loginToTwitch, reconnectChat, refreshPrimeSession, logout, isLoggedIn } =
    useTwitchAuth(clientId)
  const updater = useAppUpdater()
  const { isFullscreen, toggleFullscreen, setFullscreen } = useFullscreen()
  const { poppedChat, poppedStreams, isChatPopped, isStreamPopped, markChatPopped, markStreamPopped } =
    usePopouts()
  const { templates, saveCurrentAsTemplate, deleteTemplate } = useTemplates()

  const [chromeHidden, setChromeHidden] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [chromePinned, setChromePinned] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('appearance')
  const [openStreamsRequest, setOpenStreamsRequest] = useState(0)
  const suppressChatAutoOpenRef = useRef(false)

  const channels = streams.map((s) => s.channel)
  const focused = streams.find((s) => s.id === focusedId) ?? streams[0]
  const title = focused?.channel ?? chatChannel ?? 'Stream Watcher'
  const drawerChannels = channels.filter((channel) => !isChatPopped(channel))
  const chat = useChat({
    channels: drawerChannels,
    activeChannel: chatChannel && !isChatPopped(chatChannel) ? chatChannel : drawerChannels[0] ?? null,
    username: auth.username,
    accessToken: auth.accessToken,
  })

  const popoutChat = useCallback(
    async (channel: string) => {
      setChatChannel(channel)
      if (window.streamWatcher?.openChatPopout) {
        markChatPopped(channel)
        await window.streamWatcher.openChatPopout(channel)
        setChatSidebarOpen(false)
        return
      }
      setChatDock('float')
      setChatSidebarOpen(true)
    },
    [markChatPopped, setChatChannel, setChatDock, setChatSidebarOpen],
  )

  const popoutStream = useCallback(
    async (channel: string) => {
      if (!window.streamWatcher?.openStreamPopout) return
      markStreamPopped(channel)
      await window.streamWatcher.openStreamPopout(channel)
    },
    [markStreamPopped],
  )

  const dockStream = useCallback((channel: string) => {
    void window.streamWatcher?.dockPopout?.('stream', channel)
  }, [])

  const openChatFor = useCallback(
    (channel: string) => {
      if (isChatPopped(channel) && window.streamWatcher?.openChatPopout) {
        void popoutChat(channel)
        return
      }
      setChatChannel(channel)
      setChatSidebarOpen(true)
    },
    [isChatPopped, popoutChat, setChatChannel, setChatSidebarOpen],
  )

  const toggleChatDrawer = useCallback(() => {
    if (chatSidebarOpen) {
      setChatSidebarOpen(false)
      return
    }
    if (chatChannel && isChatPopped(chatChannel)) {
      const next = drawerChannels[0]
      if (!next) {
        void popoutChat(chatChannel)
        return
      }
      setChatChannel(next)
    } else if (!chatChannel && drawerChannels[0]) {
      setChatChannel(drawerChannels[0])
    }
    setChatSidebarOpen(true)
  }, [
    chatChannel,
    chatSidebarOpen,
    drawerChannels,
    isChatPopped,
    popoutChat,
    setChatChannel,
    setChatSidebarOpen,
  ])

  useEffect(() => {
    const api = window.streamWatcher
    if (!api?.onChatPopoutDocked) return
    return api.onChatPopoutDocked((channel) => {
      if (suppressChatAutoOpenRef.current) return
      setChatChannel(channel)
      setChatSidebarOpen(true)
    })
  }, [setChatChannel, setChatSidebarOpen])

  const dockAllPopouts = useCallback(async () => {
    const api = window.streamWatcher
    if (!api?.dockPopout) return
    suppressChatAutoOpenRef.current = true
    try {
      await Promise.all([
        ...poppedChat.map((channel) => api.dockPopout('chat', channel)),
        ...poppedStreams.map((channel) => api.dockPopout('stream', channel)),
      ])
    } finally {
      suppressChatAutoOpenRef.current = false
    }
  }, [poppedChat, poppedStreams])

  const buildTemplateSnapshot = useCallback(() => {
    const focusedStream = streams.find((s) => s.id === focusedId)
    return {
      channels: streams.map((s) => s.channel),
      focusMode,
      focusedChannel: focusedStream?.channel ?? null,
      layoutMode,
      chatDock,
      chatSidebarOpen,
      chatChannel,
    }
  }, [streams, focusedId, focusMode, layoutMode, chatDock, chatSidebarOpen, chatChannel])

  useClickThrough(appearance.seeDesktop && !windowLocked)

  const openSettings = useCallback((tab: SettingsTab = 'appearance') => {
    setSettingsTab(tab)
    setSettingsOpen(true)
  }, [])

  const quitApp = useCallback(() => {
    if (window.streamWatcher?.quitApp) {
      void window.streamWatcher.quitApp()
      return
    }
    window.close()
  }, [])

  useEffect(() => {
    if (error === MISSING_TWITCH_CLIENT_ID_ERROR) {
      openSettings('advanced')
    }
  }, [error, openSettings])

  const hotkeyActions = useMemo(
    () => ({
      focusMode: toggleFocusMode,
      fullscreen: () => void toggleFullscreen(),
      toggleChat: toggleChatDrawer,
      lockWindow: () => {
        if (!appearance.seeDesktop) return
        setWindowLocked((value) => !value)
      },
      openSettings: () => setSettingsOpen((open) => !open),
      addStream: () => setOpenStreamsRequest((value) => value + 1),
      muteFocus: () => {
        if (focusedId) toggleMute(focusedId)
      },
      cycleFocus,
      switchFocus,
      muteAll,
      toggleChrome: () => setChromePinned((value) => !value),
      quitApp,
    }),
    [
      appearance.seeDesktop,
      focusedId,
      quitApp,
      setWindowLocked,
      toggleChatDrawer,
      toggleFocusMode,
      toggleFullscreen,
      toggleMute,
      cycleFocus,
      switchFocus,
      muteAll,
    ],
  )

  useHotkeys(hotkeys, hotkeyActions, {
    paused: settingsOpen,
    allowWhenPaused: SETTINGS_ALLOWED_HOTKEYS,
  })

  useEffect(() => {
    const autoHideChrome = isFullscreen || appearance.ghostOverlay
    if (!autoHideChrome || menuOpen || chatSidebarOpen || chromePinned || settingsOpen) {
      setChromeHidden(false)
      return
    }

    let timer = window.setTimeout(() => setChromeHidden(true), FULLSCREEN_IDLE_MS)
    const onMove = (event: MouseEvent) => {
      const nearEdge = appearance.chrome === 'left' ? event.clientX <= 52 : event.clientY <= 52
      if (nearEdge) {
        setChromeHidden(false)
        window.clearTimeout(timer)
        return
      }
      setChromeHidden(false)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setChromeHidden(true), FULLSCREEN_IDLE_MS)
    }
    const onKey = () => {
      setChromeHidden(false)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setChromeHidden(true), FULLSCREEN_IDLE_MS)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('keydown', onKey)
    }
  }, [
    appearance.chrome,
    appearance.ghostOverlay,
    chromePinned,
    isFullscreen,
    menuOpen,
    chatSidebarOpen,
    settingsOpen,
  ])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (settingsOpen) {
        event.preventDefault()
        setSettingsOpen(false)
        return
      }
      if (isFullscreen) {
        event.preventDefault()
        void setFullscreen(false)
        return
      }
      if (chatSidebarOpen) {
        setChatSidebarOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [chatSidebarOpen, isFullscreen, setChatSidebarOpen, setFullscreen, settingsOpen])

  const chatVisible = chatSidebarOpen
  const chatPushes = chatVisible && chatDock !== 'float'
  const chatPanel = chatVisible ? (
    <ChatPanel
      collapsed={false}
      onToggleCollapsed={() => setChatSidebarOpen(false)}
      dock={chatDock}
      onDockChange={(dock) => {
        setChatDock(dock)
        setChatSidebarOpen(true)
      }}
      float={chatFloat}
      onFloatChange={setChatFloat}
      channels={drawerChannels}
      activeChannel={chatChannel && !isChatPopped(chatChannel) ? chatChannel : drawerChannels[0] ?? null}
      onChannelChange={setChatChannel}
      messages={chat.messages}
      status={chat.status}
      error={chat.error}
      canSend={isLoggedIn}
      username={auth.username}
      onSend={chat.sendMessage}
      onPopout={() => {
        const target = chatChannel && !isChatPopped(chatChannel) ? chatChannel : drawerChannels[0]
        if (target) void popoutChat(target)
      }}
    />
  ) : null

  return (
    <div
      className={[
        'app-shell',
        'overflow-hidden',
        isFullscreen ? 'app-shell--fullscreen' : '',
        chromeHidden ? 'app-shell--chrome-hidden' : '',
        appearance.seeDesktop ? 'app-shell--see-desktop' : '',
        performanceMode ? 'app-shell--performance' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="topbar-hotzone" aria-hidden data-hit />
      <TopBar
        hidden={chromeHidden}
        title={title}
        onAddStream={addStream}
        onSaveStream={saveStream}
        onUnsaveStream={unsaveStream}
        savedStreams={savedStreams}
        openChannels={channels}
        chatChannel={chatChannel}
        onChatChannelChange={(channel) => {
          const stream = streams.find((s) => s.channel === channel)
          if (stream) focusStream(stream.id)
          else openChatFor(channel)
        }}
        chatOpen={chatSidebarOpen}
        onToggleChat={toggleChatDrawer}
        onPopoutChat={() => {
          const target = chatChannel ?? focused?.channel
          if (target) void popoutChat(target)
        }}
        layoutMode={layoutMode}
        focusMode={focusMode}
        onToggleFocusMode={toggleFocusMode}
        performanceMode={performanceMode}
        onTogglePerformanceMode={() => setPerformanceMode(!performanceMode)}
        onPreset={applyPreset}
        isFullscreen={isFullscreen}
        onToggleFullscreen={() => void toggleFullscreen()}
        chromePinned={chromePinned}
        onTogglePin={() => setChromePinned((value) => !value)}
        isLoggedIn={isLoggedIn}
        displayName={auth.displayName}
        authBusy={busy}
        authError={error}
        onLoginTwitch={loginToTwitch}
        seeDesktop={appearance.seeDesktop}
        windowLocked={windowLocked}
        onToggleWindowLock={() => setWindowLocked((value) => !value)}
        settingsOpen={settingsOpen}
        onOpenSettings={() => openSettings(error === MISSING_TWITCH_CLIENT_ID_ERROR ? 'advanced' : 'appearance')}
        openStreamsRequest={openStreamsRequest}
        onMenuOpenChange={setMenuOpen}
        onDockAllPopouts={() => void dockAllPopouts()}
        hasPoppedOut={poppedChat.length + poppedStreams.length > 0}
        templates={templates}
        onApplyTemplate={applyTemplate}
        onSaveTemplate={(name) => saveCurrentAsTemplate(name, buildTemplateSnapshot())}
        onDeleteTemplate={deleteTemplate}
        chrome={appearance.chrome}
      />

      <div
        className={[
          'workspace',
          chatPushes ? `workspace--chat-open workspace--chat-${chatDock}` : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {chatPushes && chatDock === 'left' && chatPanel}
        <main className="main-stage">
          <StreamGrid
            streams={streams}
            layout={layout}
            onLayoutChange={setLayout}
            focusedId={focusedId}
            focusMode={focusMode}
            performanceMode={performanceMode}
            isDragging={isDragging}
            onDraggingChange={setIsDragging}
            onFocus={(id) => focusStream(id, { enterFocusMode: true })}
            onToggleMute={toggleMute}
            onRemove={removeStream}
            onOpenChat={(channel) => {
              openChatFor(channel)
              if (chatDock === 'float') setChatDock('right')
            }}
            onPopoutChat={(channel) => {
              void popoutChat(channel)
            }}
            onPopoutStream={(channel) => {
              void popoutStream(channel)
            }}
            onDockStream={dockStream}
            isStreamPopped={isStreamPopped}
            onToggleSave={toggleSaveStream}
            savedChannels={savedStreams.map((s) => s.channel)}
          />
        </main>
        {chatPushes && chatDock === 'right' && chatPanel}
        {chatPushes && chatDock === 'bottom' && chatPanel}
      </div>
      {chatVisible && chatDock === 'float' && chatPanel}
      {settingsOpen && (
        <SettingsModal
          tab={settingsTab}
          onTabChange={setSettingsTab}
          onClose={() => setSettingsOpen(false)}
          appearance={appearance}
          onAppearanceChange={setAppearance}
          hotkeys={hotkeys}
          onHotkeysChange={setHotkeys}
          clientId={clientIdOverride}
          onClientIdChange={setClientId}
          hasBuiltInClientId={hasBuiltInClientId}
          isLoggedIn={isLoggedIn}
          authBusy={busy}
          authError={error}
          onReconnectChat={reconnectChat}
          onRefreshPrime={refreshPrimeSession}
          onLogout={logout}
          updater={updater.status}
          onCheckForUpdates={() => void updater.check()}
          onDownloadUpdate={() => void updater.download()}
          onInstallUpdate={() => void updater.install()}
          onQuit={quitApp}
        />
      )}
      <FirstRunTips hidden={settingsOpen} />
    </div>
  )
}

export default function App() {
  const mode = new URLSearchParams(window.location.search).get('mode')
  if (mode === 'chat') return <ChatPopoutApp />
  if (mode === 'stream') return <StreamPopoutApp />
  return <MainApp />
}
