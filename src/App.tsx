import { useCallback, useEffect, useState } from 'react'
import { ChatPanel } from './components/ChatPanel'
import { ChatPopoutApp } from './components/ChatPopoutApp'
import { StreamGrid } from './components/StreamGrid'
import { TopBar } from './components/TopBar'
import { useChat } from './hooks/useChat'
import { useFullscreen } from './hooks/useFullscreen'
import { useStreams } from './hooks/useStreams'
import { useTwitchAuth } from './hooks/useTwitchAuth'

const FULLSCREEN_IDLE_MS = 2400

function MainApp() {
  const {
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
  } = useStreams()

  const { auth, busy, error, loginForChat, loginForPrime, logout, isLoggedIn } =
    useTwitchAuth(clientId)
  const { isFullscreen, toggleFullscreen, setFullscreen } = useFullscreen()

  const [chromeHidden, setChromeHidden] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const channels = streams.map((s) => s.channel)
  const chat = useChat({
    channels,
    activeChannel: chatChannel,
    username: auth.username,
    accessToken: auth.accessToken,
  })

  const openChatFor = useCallback(
    (channel: string) => {
      setChatChannel(channel)
      setChatSidebarOpen(true)
    },
    [setChatChannel, setChatSidebarOpen],
  )

  const popoutChat = useCallback(
    async (channel: string) => {
      setChatChannel(channel)
      if (window.streamWatcher?.openChatPopout) {
        await window.streamWatcher.openChatPopout(channel)
        return
      }
      setChatDock('float')
      setChatSidebarOpen(true)
    },
    [setChatChannel, setChatDock, setChatSidebarOpen],
  )

  useEffect(() => {
    if (!isFullscreen || menuOpen || chatSidebarOpen) {
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
  }, [isFullscreen, menuOpen, chatSidebarOpen])

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
  const overlayChat = chatVisible ? (
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
      channels={channels}
      activeChannel={chatChannel}
      onChannelChange={setChatChannel}
      messages={chat.messages}
      status={chat.status}
      error={chat.error}
      canSend={isLoggedIn}
      username={auth.username}
      onSend={chat.sendMessage}
      onPopout={() => {
        if (chatChannel) void popoutChat(chatChannel)
      }}
    />
  ) : null

  return (
    <div
      className={[
        'app-shell',
        isFullscreen ? 'app-shell--fullscreen' : '',
        chromeHidden ? 'app-shell--chrome-hidden' : '',
        chatVisible && chatDock !== 'float' ? `app-shell--chat-${chatDock}` : '',
        chatDock === 'float' && chatVisible ? 'app-shell--chat-float' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="topbar-hotzone" aria-hidden />
      <TopBar
        hidden={chromeHidden}
        clientId={clientId}
        onClientIdChange={setClientId}
        onAddStream={addStream}
        onSaveStream={saveStream}
        onUnsaveStream={unsaveStream}
        savedStreams={savedStreams}
        openChannels={channels}
        chatChannel={chatChannel}
        onChatChannelChange={openChatFor}
        chatOpen={chatSidebarOpen}
        onToggleChat={() => setChatSidebarOpen((open) => !open)}
        onPreset={applyPreset}
        isFullscreen={isFullscreen}
        onToggleFullscreen={() => void toggleFullscreen()}
        isLoggedIn={isLoggedIn}
        displayName={auth.displayName}
        authBusy={busy}
        authError={error}
        onLoginChat={loginForChat}
        onLoginPrime={loginForPrime}
        onLogout={logout}
        onMenuOpenChange={setMenuOpen}
      />

      <main className="main-stage">
        <StreamGrid
          streams={streams}
          layout={layout}
          focusedId={focusedId}
          isDragging={isDragging}
          compact={isFullscreen}
          onLayoutChange={setLayout}
          onDragState={setIsDragging}
          onFocus={focusStream}
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

      {overlayChat}
    </div>
  )
}

export default function App() {
  const mode = new URLSearchParams(window.location.search).get('mode')
  if (mode === 'chat') return <ChatPopoutApp />
  return <MainApp />
}
