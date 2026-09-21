import { ChatPanel } from './components/ChatPanel'
import { ChatPopoutApp } from './components/ChatPopoutApp'
import { Sidebar } from './components/Sidebar'
import { StreamGrid } from './components/StreamGrid'
import { useChat } from './hooks/useChat'
import { useStreams } from './hooks/useStreams'
import { useTwitchAuth } from './hooks/useTwitchAuth'

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
    leftSidebarOpen,
    setLeftSidebarOpen,
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

  const channels = streams.map((s) => s.channel)
  const chat = useChat({
    channels,
    activeChannel: chatChannel,
    username: auth.username,
    accessToken: auth.accessToken,
  })

  const popoutChat = async (channel: string) => {
    setChatChannel(channel)
    if (window.streamWatcher?.openChatPopout) {
      await window.streamWatcher.openChatPopout(channel)
      return
    }
    // Browser fallback: float the in-app chat
    setChatDock('float')
    setChatSidebarOpen(true)
  }

  const chatVisible = chatSidebarOpen || chatDock === 'float'
  const dockedChat =
    chatVisible && chatDock !== 'float' ? (
      <ChatPanel
        collapsed={!chatSidebarOpen}
        onToggleCollapsed={() => setChatSidebarOpen((open) => !open)}
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
        'app-shell--thin',
        leftSidebarOpen ? '' : 'app-shell--left-collapsed',
        chatSidebarOpen && chatDock === 'right' ? '' : '',
        !chatSidebarOpen && chatDock !== 'float' ? 'app-shell--chat-collapsed' : '',
        `app-shell--chat-${chatDock}`,
        chatDock === 'float' || !chatSidebarOpen ? 'app-shell--no-chat-column' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {chatDock === 'left' && dockedChat}

      <Sidebar
        collapsed={!leftSidebarOpen}
        onToggleCollapsed={() => setLeftSidebarOpen((open) => !open)}
        clientId={clientId}
        onClientIdChange={setClientId}
        onAddStream={addStream}
        onSaveStream={saveStream}
        onUnsaveStream={unsaveStream}
        savedStreams={savedStreams}
        openChannels={channels}
        onPreset={applyPreset}
        isLoggedIn={isLoggedIn}
        displayName={auth.displayName}
        authBusy={busy}
        authError={error}
        onLoginChat={loginForChat}
        onLoginPrime={loginForPrime}
        onLogout={logout}
      />

      <main className="main-stage">
        <div className="stage-toolbar">
          {!leftSidebarOpen && (
            <button type="button" className="tool-btn" onClick={() => setLeftSidebarOpen(true)}>
              Sidebar
            </button>
          )}
          {(!chatSidebarOpen || chatDock === 'float') && (
            <button
              type="button"
              className="tool-btn"
              onClick={() => {
                setChatDock((d) => (d === 'float' ? 'right' : d))
                setChatSidebarOpen(true)
              }}
            >
              Chat{chatChannel ? ` #${chatChannel}` : ''}
            </button>
          )}
        </div>
        <StreamGrid
          streams={streams}
          layout={layout}
          focusedId={focusedId}
          isDragging={isDragging}
          onLayoutChange={setLayout}
          onDragState={setIsDragging}
          onFocus={focusStream}
          onToggleMute={toggleMute}
          onRemove={removeStream}
          onOpenChat={(channel) => {
            setChatChannel(channel)
            setChatSidebarOpen(true)
            if (chatDock === 'float') setChatDock('right')
          }}
          onPopoutChat={(channel) => {
            void popoutChat(channel)
          }}
          onToggleSave={toggleSaveStream}
          savedChannels={savedStreams.map((s) => s.channel)}
        />
      </main>

      {chatDock === 'right' && dockedChat}
      {chatDock === 'bottom' && dockedChat}

      {chatDock === 'float' && chatSidebarOpen && (
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
      )}
    </div>
  )
}

export default function App() {
  const mode = new URLSearchParams(window.location.search).get('mode')
  if (mode === 'chat') return <ChatPopoutApp />
  return <MainApp />
}
