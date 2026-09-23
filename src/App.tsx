import * as Tooltip from '@radix-ui/react-tooltip'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChatDrawer } from './components/ChatDrawer'
import { ChromeBar } from './components/ChromeBar'
import { FirstRunTips } from './components/FirstRunTips'
import { PopoutApp } from './components/PopoutApp'
import { SettingsModal } from './components/SettingsModal'
import { StreamGrid } from './components/StreamGrid'
import { useChat } from './hooks/useChat'
import { useDesk } from './hooks/useDesk'
import { useTwitchAuth } from './hooks/useTwitchAuth'
import { formatHotkeyEvent, type HotkeyAction } from './lib/hotkeys'
import { chatFontFamily } from './lib/storage'
import type { AppSettings, PopoutInfo } from './types'

function DeskApp() {
  const desk = useDesk()
  const { auth, busy, error, loginToTwitch, loginForPrime, isLoggedIn } = useTwitchAuth(desk.clientId)
  const searchRef = useRef<HTMLInputElement>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [hoverChrome, setHoverChrome] = useState(false)
  const [popped, setPopped] = useState<PopoutInfo[]>([])
  const [fullscreen, setFullscreen] = useState(false)

  const channels = desk.visibleStreams.map((s) => s.channel)
  const chat = useChat({
    channels,
    activeChannel: desk.chatChannel,
    username: auth.username,
    accessToken: auth.accessToken,
  })

  const ghostHidden =
    desk.settings.ghostOverlay && !desk.settings.pinToolbar && !desk.toolbarForced && !hoverChrome && !settingsOpen

  useEffect(() => {
    void window.vesper?.listPopouts().then(setPopped)
    return window.vesper?.onPopoutsChanged(setPopped)
  }, [])

  useEffect(() => {
    return window.vesper?.onDockRequest(({ channel, kind }) => {
      if (kind === 'stream') desk.dockStream(channel)
    })
  }, [desk])

  useEffect(() => {
    void window.vesper?.setClickThrough(desk.settings.seeThrough)
    void window.vesper?.setClickThroughLocked(desk.windowLocked)
  }, [desk.settings.seeThrough, desk.windowLocked])

  const openChat = (channel?: string) => {
    if (channel) desk.setChatChannel(channel)
    desk.setChatOpen(true)
    if (desk.chatDock === 'float') desk.setChatDock('right')
  }

  const popoutChat = async (channel: string) => {
    desk.setChatChannel(channel)
    await window.vesper?.openPopout('chat', channel)
  }

  const popoutStream = async (channel: string) => {
    desk.popStream(channel)
    await window.vesper?.openPopout('stream', channel)
  }

  const dockPop = async (channel: string, kind: 'stream' | 'chat') => {
    await window.vesper?.dockPopout(kind, channel)
    if (kind === 'stream') desk.dockStream(channel)
  }

  const dockAll = async () => {
    await window.vesper?.dockAllPopouts()
    popped.filter((p) => p.kind === 'stream').forEach((p) => desk.dockStream(p.channel))
  }

  const runHotkey = useCallback(
    (action: HotkeyAction) => {
      switch (action) {
        case 'focusMode':
          desk.setMode((m) => (m === 'focus' ? 'standard' : 'focus'))
          break
        case 'fullscreen':
          if (document.fullscreenElement) {
            void document.exitFullscreen()
            setFullscreen(false)
          } else {
            void document.documentElement.requestFullscreen?.()
            setFullscreen(true)
          }
          break
        case 'toggleChat':
          desk.setChatOpen((v) => !v)
          break
        case 'lockWindow':
          desk.setWindowLocked((v) => !v)
          break
        case 'openSettings':
          setSettingsOpen(true)
          break
        case 'focusSearch':
          desk.setToolbarForced(true)
          searchRef.current?.focus()
          break
        case 'muteFocus':
          desk.muteFocus()
          break
        case 'cycleStreams':
          desk.cycleStreams()
          break
        case 'switchFocus':
          desk.switchFocus()
          break
        case 'muteAll':
          desk.muteAll()
          break
        case 'toggleToolbar':
          desk.setToolbarForced((v) => !v)
          break
        case 'quitApplication':
          void window.vesper?.quit()
          break
      }
    },
    [desk],
  )

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSettingsOpen(false)
        return
      }
      const combo = formatHotkeyEvent(event)
      const match = (Object.entries(desk.settings.hotkeys) as Array<[HotkeyAction, string]>).find(
        ([, value]) => value === combo,
      )
      if (!match) return
      event.preventDefault()
      runHotkey(match[0])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [desk.settings.hotkeys, runHotkey])

  const saveSettings = (next: AppSettings, clientId: string) => {
    desk.applySettings(next)
    desk.setClientId(clientId)
  }

  const style = useMemo(() => {
    const lightFallback = desk.settings.theme === 'light'
    const surface = lightFallback && desk.settings.surface.startsWith('#1') ? '#fff7ec' : desk.settings.surface
    const text = lightFallback && desk.settings.text.startsWith('#f') ? '#2a2118' : desk.settings.text
    const page = lightFallback && desk.settings.backgroundColor.startsWith('#0') ? '#f3ebe1' : desk.settings.backgroundColor
    return {
      '--accent': desk.settings.accent,
      '--surface': surface,
      '--text': text,
      '--page-bg': page,
      '--bg-image': desk.settings.backgroundImage ? `url(${desk.settings.backgroundImage})` : 'none',
      '--bg-opacity': String(desk.settings.backgroundOpacity),
      '--drawer': `${desk.settings.chat.drawerWidth}px`,
    } as React.CSSProperties
  }, [desk.settings])

  const chatEl = desk.chatOpen ? (
    <ChatDrawer
      dock={desk.chatDock}
      channels={channels}
      activeChannel={desk.chatChannel}
      onChannelChange={desk.setChatChannel}
      messages={chat.messages}
      status={chat.status}
      error={chat.error}
      canSend={isLoggedIn}
      username={auth.username}
      fontFamily={chatFontFamily(desk.settings)}
      fontSize={desk.settings.chat.fontSize}
      onSend={chat.sendMessage}
      onDockChange={desk.setChatDock}
      onHide={() => desk.setChatOpen(false)}
      onPopout={() => {
        if (desk.chatChannel) void popoutChat(desk.chatChannel)
      }}
    />
  ) : null

  return (
    <div
      className={[
        'desk',
        `desk--chrome-${desk.settings.chromeEdge}`,
        desk.chatOpen && desk.chatDock !== 'float' ? `desk--chat-${desk.chatDock}` : '',
        desk.settings.seeThrough ? 'desk--see-through' : '',
        desk.mode === 'performance' ? 'desk--performance' : '',
        ghostHidden ? 'desk--ghost' : '',
        fullscreen ? 'desk--fullscreen' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-theme={desk.settings.theme}
      style={style}
      onMouseMove={(e) => {
        const edge = desk.settings.chromeEdge
        const near =
          (edge === 'top' && e.clientY < 48) ||
          (edge === 'bottom' && e.clientY > window.innerHeight - 48) ||
          (edge === 'left' && e.clientX < 48) ||
          (edge === 'right' && e.clientX > window.innerWidth - 48)
        setHoverChrome(near)
      }}
    >
      <ChromeBar
        mode={desk.mode}
        onMode={desk.setMode}
        templates={desk.templates}
        onApplyTemplate={desk.applyTemplate}
        onSaveTemplate={desk.saveTemplate}
        onDeleteTemplate={desk.deleteTemplate}
        onPreset={desk.applyPreset}
        popped={popped}
        onDockAll={() => void dockAll()}
        onDock={(channel, kind) => void dockPop(channel, kind)}
        seeThrough={desk.settings.seeThrough}
        onSeeThrough={(value) => desk.applySettings({ ...desk.settings, seeThrough: value })}
        ghost={desk.settings.ghostOverlay}
        onGhost={(value) => desk.applySettings({ ...desk.settings, ghostOverlay: value })}
        pinned={desk.settings.pinToolbar}
        onPinned={(value) => desk.applySettings({ ...desk.settings, pinToolbar: value })}
        chatOpen={desk.chatOpen}
        chatChannel={desk.chatChannel}
        onOpenChat={() => (desk.chatOpen ? desk.setChatOpen(false) : openChat())}
        onFullscreen={() => runHotkey('fullscreen')}
        onAddStream={desk.addStream}
        onLogin={() => void loginToTwitch()}
        onSettings={() => setSettingsOpen(true)}
        isLoggedIn={isLoggedIn}
        displayName={auth.displayName}
        searchRef={searchRef}
      />

      {desk.chatOpen && desk.chatDock === 'left' && chatEl}

      <main className="desk-stage">
        {desk.chatOpen && desk.chatDock === 'float' && chatEl}
        <StreamGrid
          streams={desk.visibleStreams}
          layout={desk.layout}
          focusedId={desk.focusedId}
          isDragging={desk.isDragging}
          savedChannels={desk.savedStreams.map((s) => s.channel)}
          mode={desk.mode}
          poppedCount={popped.filter((p) => p.kind === 'stream').length}
          onLayoutChange={desk.setLayout}
          onDragState={desk.setIsDragging}
          onFocus={desk.focusStream}
          onToggleMute={desk.toggleMute}
          onRemove={desk.removeStream}
          onOpenChat={(channel) => openChat(channel)}
          onPopoutChat={(channel) => void popoutChat(channel)}
          onPopoutStream={(channel) => void popoutStream(channel)}
          onToggleSave={desk.toggleSaveStream}
          onSwitchFocus={desk.switchFocus}
        />
        <FirstRunTips
          dismissed={desk.settings.dismissedTips}
          onDismiss={(id) =>
            desk.applySettings({
              ...desk.settings,
              dismissedTips: [...desk.settings.dismissedTips, id],
            })
          }
        />
        {(busy || error) && <p className="toast">{error ?? 'Signing in…'}</p>}
        {desk.windowLocked && desk.settings.seeThrough && <p className="lock-chip">Window locked</p>}
      </main>

      {desk.chatOpen && desk.chatDock === 'right' && chatEl}
      {desk.chatOpen && desk.chatDock === 'bottom' && chatEl}

      <SettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={desk.settings}
        clientId={desk.clientId}
        onSave={saveSettings}
        onReconnectChat={chat.reconnect}
        onRefreshPrime={() => void loginForPrime()}
        onShowTips={() => desk.applySettings({ ...desk.settings, dismissedTips: [] })}
      />
    </div>
  )
}

export default function App() {
  const params = new URLSearchParams(window.location.search)
  const mode = params.get('mode')
  const channel = params.get('channel') ?? ''

  return (
    <Tooltip.Provider delayDuration={250} skipDelayDuration={80}>
      {mode === 'chat' || mode === 'stream' ? (
        <PopoutApp mode={mode} channel={channel} />
      ) : (
        <DeskApp />
      )}
    </Tooltip.Provider>
  )
}
