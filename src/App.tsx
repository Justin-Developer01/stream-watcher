import { useCallback, useEffect, useState } from 'react'
import { ChatPanel } from './components/ChatPanel'
import { ChatPopoutApp } from './components/ChatPopoutApp'
import { FirstRunTip } from './components/FirstRunTip'
import { StreamGrid } from './components/StreamGrid'
import { TopBar } from './components/TopBar'
import { useChat } from './hooks/useChat'
import { useChatPopouts } from './hooks/useChatPopouts'
import { useFullscreen } from './hooks/useFullscreen'
import { useStreams } from './hooks/useStreams'
import { useAppUpdater } from './hooks/useAppUpdater'
import { useTwitchAuth } from './hooks/useTwitchAuth'

const FULLSCREEN_IDLE_MS = 2400

function MainApp() {
  const {
    streams,
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
    toggleMute,
    applyPreset,
  } = useStreams()

  const { auth, busy, error, loginToTwitch, reconnectChat, refreshPrimeSession, logout, isLoggedIn } =
    useTwitchAuth(clientId)
  const updater = useAppUpdater()
  const { isFullscreen, toggleFullscreen, setFullscreen } = useFullscreen()
  const { isPopped, markPopped } = useChatPopouts()

  const [chromeHidden, setChromeHidden] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [chromePinned, setChromePinned] = useState(false)

  const channels = streams.map((s) => s.channel)
  const focused = streams.find((s) => s.id === focusedId) ?? streams[0]
  const title = focused?.channel ?? chatChannel ?? 'Stream Watcher'
  const drawerChannels = channels.filter((channel) => !isPopped(channel))
  const chat = useChat({
    channels: drawerChannels,
    activeChannel: chatChannel && !isPopped(chatChannel) ? chatChannel : drawerChannels[0] ?? null,
    username: auth.username,
    accessToken: auth.accessToken,
  })

  const popoutChat = useCallback(
    async (channel: string) => {
      setChatChannel(channel)
      if (window.streamWatcher?.openChatPopout) {
        markPopped(channel)
        await window.streamWatcher.openChatPopout(channel)
        setChatSidebarOpen(false)
        return
      }
      setChatDock('float')
      setChatSidebarOpen(true)
    },
    [markPopped, setChatChannel, setChatDock, setChatSidebarOpen],
  )

  const openChatFor = useCallback(
    (channel: string) => {
      if (isPopped(channel) && window.streamWatcher?.openChatPopout) {
        void popoutChat(channel)
        return
      }
      setChatChannel(channel)
      setChatSidebarOpen(true)
    },
    [isPopped, popoutChat, setChatChannel, setChatSidebarOpen],
  )

  const toggleChatDrawer = useCallback(() => {
    if (chatSidebarOpen) {
      setChatSidebarOpen(false)
      return
    }
    if (chatChannel && isPopped(chatChannel)) {
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
    isPopped,
    popoutChat,
    setChatChannel,
    setChatSidebarOpen,
  ])

  useEffect(() => {
    if (!isFullscreen || menuOpen || chatSidebarOpen || chromePinned) {
      setChromeHidden(false)
      return
    }

    let timer = window.setTimeout(() => setChromeHidden(true), FULLSCREEN_IDLE_MS)
    const onMove = (event: MouseEvent) => {
      if (event.clientY <= 52) {
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
  }, [chromePinned, isFullscreen, menuOpen, chatSidebarOpen])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'F11') {
        event.preventDefault()
        void toggleFullscreen()
      }
      if (event.key === 'Escape') {
        if (isFullscreen) {
          event.preventDefault()
          void setFullscreen(false)
          return
        }
        if (chatSidebarOpen) {
          setChatSidebarOpen(false)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [chatSidebarOpen, isFullscreen, setChatSidebarOpen, setFullscreen, toggleFullscreen])

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
      activeChannel={chatChannel && !isPopped(chatChannel) ? chatChannel : drawerChannels[0] ?? null}
      onChannelChange={setChatChannel}
      messages={chat.messages}
      status={chat.status}
      error={chat.error}
      canSend={isLoggedIn}
      username={auth.username}
      onSend={chat.sendMessage}
      onPopout={() => {
        const target = chatChannel && !isPopped(chatChannel) ? chatChannel : drawerChannels[0]
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
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="topbar-hotzone" aria-hidden />
      <TopBar
        hidden={chromeHidden}
        title={title}
        clientId={clientId}
        onClientIdChange={setClientId}
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
        onReconnectChat={reconnectChat}
        onRefreshPrime={refreshPrimeSession}
        onLogout={logout}
        updater={updater.status}
        onCheckForUpdates={() => void updater.check()}
        onDownloadUpdate={() => void updater.download()}
        onInstallUpdate={() => void updater.install()}
        onMenuOpenChange={setMenuOpen}
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
            onToggleSave={toggleSaveStream}
            savedChannels={savedStreams.map((s) => s.channel)}
          />
        </main>
        {chatPushes && chatDock === 'right' && chatPanel}
        {chatPushes && chatDock === 'bottom' && chatPanel}
      </div>
      {chatVisible && chatDock === 'float' && chatPanel}
      <FirstRunTip />
    </div>
  )
}

export default function App() {
  const mode = new URLSearchParams(window.location.search).get('mode')
  if (mode === 'chat') return <ChatPopoutApp />
  return <MainApp />
}
