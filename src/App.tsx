import * as Tooltip from '@radix-ui/react-tooltip'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChatDrawer } from './components/ChatDrawer'
import { PortalThemeProvider, themeVars } from './components/ui/portalTheme'
import { ChromeBar } from './components/ChromeBar'
import { FirstRunTips } from './components/FirstRunTips'
import { PopoutApp } from './components/PopoutApp'
import { SettingsModal } from './components/SettingsModal'
import { StreamGrid } from './components/StreamGrid'
import { useClickThrough } from './hooks/useClickThrough'
import { useDesk } from './hooks/useDesk'
import { useTwitchAuth } from './hooks/useTwitchAuth'
import { resolveTwitchClientId } from './lib/twitchClientId'
import { formatHotkeyEvent, isEditableTarget, type HotkeyAction } from './lib/hotkeys'
import { chatFontFamily } from './lib/storage'
import type { AppSettings, PopoutInfo } from './types'

const CHROME_IDLE_MS = 2400

function nearChromeEdge(edge: AppSettings['chromeEdge'], x: number, y: number) {
  if (edge === 'bottom') return y >= window.innerHeight - 52
  if (edge === 'left') return x <= 52
  if (edge === 'right') return x >= window.innerWidth - 52
  return y <= 52
}

function DeskApp() {
  const desk = useDesk()
  const twitchClientId = resolveTwitchClientId(desk.clientId)
  const { auth, busy, error, loginToTwitch, loginForPrime, isLoggedIn } = useTwitchAuth(twitchClientId)
  const searchRef = useRef<HTMLInputElement>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [chromeHidden, setChromeHidden] = useState(false)
  const [popped, setPopped] = useState<PopoutInfo[]>([])
  const [fullscreen, setFullscreen] = useState(false)

  const channels = desk.visibleStreams.map((s) => s.channel)
  const poppedChat = useMemo(
    () => new Set(popped.filter((item) => item.kind === 'chat').map((item) => item.channel.toLowerCase())),
    [popped],
  )
  const drawerChannels = channels.filter((channel) => !poppedChat.has(channel.toLowerCase()))
  const drawerActive =
    desk.chatChannel && !poppedChat.has(desk.chatChannel.toLowerCase())
      ? desk.chatChannel
      : (drawerChannels[0] ?? null)
  const [chatNonce, setChatNonce] = useState(0)

  const autoHideChrome =
    (fullscreen || desk.settings.ghostOverlay) &&
    !desk.settings.pinToolbar &&
    !desk.toolbarForced &&
    !desk.chatOpen &&
    !settingsOpen &&
    !menuOpen

  useClickThrough(desk.settings.seeThrough && !desk.windowLocked, desk.settings.chromeEdge)

  useEffect(() => {
    if (!autoHideChrome) {
      setChromeHidden(false)
      return
    }
    let hidden = false
    const setHidden = (next: boolean) => {
      if (hidden === next) return
      hidden = next
      setChromeHidden(next)
    }
    let timer = window.setTimeout(() => setHidden(true), CHROME_IDLE_MS)
    const reveal = (hold: boolean) => {
      setHidden(false)
      window.clearTimeout(timer)
      if (!hold) timer = window.setTimeout(() => setHidden(true), CHROME_IDLE_MS)
    }
    const onMove = (event: MouseEvent) => {
      reveal(nearChromeEdge(desk.settings.chromeEdge, event.clientX, event.clientY))
    }
    const onKey = () => reveal(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('keydown', onKey)
    }
  }, [autoHideChrome, desk.settings.chromeEdge])

  useEffect(() => {
    void window.vesper?.isFullscreen().then((value) => setFullscreen(Boolean(value)))
    return window.vesper?.onFullscreenChange(setFullscreen)
  }, [])

  useEffect(() => {
    void window.vesper?.listPopouts().then(setPopped)
    return window.vesper?.onPopoutsChanged(setPopped)
  }, [])

  const suppressChatReopenRef = useRef(false)

  useEffect(() => {
    return window.vesper?.onDockRequest(({ channel, kind }) => {
      if (kind === 'stream') {
        desk.dockStream(channel)
        return
      }
      // Dock back on a chat pop-out returns it to the drawer (pre.17). Dock all stays quiet.
      if (suppressChatReopenRef.current) return
      desk.setChatChannel(channel)
      desk.setChatOpen(true)
    })
  }, [desk])

  useEffect(() => {
    void window.vesper?.setClickThrough(desk.settings.seeThrough)
    void window.vesper?.setClickThroughLocked(desk.windowLocked)
  }, [desk.settings.seeThrough, desk.windowLocked])

  const popoutChat = async (channel: string) => {
    desk.setChatChannel(channel)
    await window.vesper?.openPopout('chat', channel)
    desk.setChatOpen(false)
  }

  const openChat = (channel?: string) => {
    if (channel && poppedChat.has(channel.toLowerCase())) {
      // Already popped out: bring that window forward instead of an empty drawer.
      void window.vesper?.openPopout('chat', channel)
      return
    }
    if (channel) desk.setChatChannel(channel)
    desk.setChatOpen(true)
    // Only a tile's Open chat slides a floating drawer back in; the menu keeps Float.
    if (channel && desk.chatDock === 'float') desk.setChatDock('right')
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
    suppressChatReopenRef.current = true
    try {
      await window.vesper?.dockAllPopouts()
    } finally {
      suppressChatReopenRef.current = false
    }
    popped.filter((p) => p.kind === 'stream').forEach((p) => desk.dockStream(p.channel))
  }

  const runHotkey = useCallback(
    (action: HotkeyAction) => {
      switch (action) {
        case 'focusMode':
          desk.setMode((m) => (m === 'focus' ? 'standard' : 'focus'))
          break
        case 'fullscreen':
          if (window.vesper?.setFullscreen) {
            void window.vesper.setFullscreen(!fullscreen)
            break
          }
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
          if (!desk.settings.seeThrough) break
          desk.setWindowLocked((v) => !v)
          break
        case 'openSettings':
          setSettingsOpen((open) => !open)
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
          desk.applySettings({ ...desk.settings, pinToolbar: !desk.settings.pinToolbar })
          break
        case 'quitApplication':
          void window.vesper?.quit()
          break
      }
    },
    [desk, fullscreen],
  )

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (settingsOpen) {
          setSettingsOpen(false)
          return
        }
        if (fullscreen) {
          void window.vesper?.setFullscreen(false)
          if (!window.vesper?.setFullscreen && document.fullscreenElement) void document.exitFullscreen()
          setFullscreen(false)
          return
        }
        if (desk.chatOpen) desk.setChatOpen(false)
        return
      }
      if (isEditableTarget(event.target) && event.key !== 'F11') return
      const combo = formatHotkeyEvent(event)
      const match = (Object.entries(desk.settings.hotkeys) as Array<[HotkeyAction, string]>).find(
        ([, value]) => value === combo,
      )
      if (!match) return
      if (settingsOpen && match[0] !== 'openSettings' && match[0] !== 'quitApplication') return
      event.preventDefault()
      runHotkey(match[0])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [desk.chatOpen, desk.settings.hotkeys, fullscreen, runHotkey, settingsOpen])

  const saveSettings = (next: AppSettings, clientId: string) => {
    desk.applySettings(next, clientId)
  }

  const style = useMemo(
    () =>
      ({
        ...themeVars(desk.settings),
        '--bg-image': desk.settings.backgroundImage ? `url(${desk.settings.backgroundImage})` : 'none',
        '--bg-opacity': String(desk.settings.backgroundOpacity),
        '--drawer': `${desk.settings.chat.drawerWidth}px`,
      }) as React.CSSProperties,
    [desk.settings],
  )

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = desk.settings.theme
    for (const [key, value] of Object.entries(style)) {
      if (key.startsWith('--') && value != null) root.style.setProperty(key, String(value))
    }
  }, [desk.settings.theme, style])

  const chatEl = desk.chatOpen ? (
    <ChatDrawer
      dock={desk.chatDock}
      channels={drawerChannels}
      activeChannel={drawerActive}
      onChannelChange={desk.setChatChannel}
      username={auth.username}
      accessToken={auth.accessToken}
      clientId={twitchClientId}
      theme={desk.settings.theme === 'light' ? 'light' : 'dark'}
      fontFamily={chatFontFamily(desk.settings)}
      fontSize={desk.settings.chat.fontSize}
      reconnectNonce={chatNonce}
      onDockChange={desk.setChatDock}
      onHide={() => desk.setChatOpen(false)}
      onPopout={() => {
        if (drawerActive) void popoutChat(drawerActive)
      }}
    />
  ) : null

  return (
    <PortalThemeProvider theme={desk.settings.theme} style={style}>
    <div
      className={[
        'desk',
        `desk--chrome-${desk.settings.chromeEdge}`,
        desk.chatOpen && desk.chatDock !== 'float' ? `desk--chat-${desk.chatDock}` : '',
        desk.settings.seeThrough ? 'desk--see-through' : '',
        desk.mode === 'performance' ? 'desk--performance' : '',
        chromeHidden ? 'desk--ghost' : '',
        fullscreen ? 'desk--fullscreen' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-theme={desk.settings.theme}
      style={style}
    >
      {chromeHidden && <div className="chrome-hotzone" data-hit aria-hidden />}
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
        chromeEdge={desk.settings.chromeEdge}
        onMenuOpen={setMenuOpen}
        onSearchBlur={() => desk.setToolbarForced(false)}
      />

      {/* One mount for every dock: grid areas place it, so moving chat keeps its connection and history. */}
      {chatEl}

      <main className="desk-stage">
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
        {(busy || error) && (
          <p className="toast" data-hit>
            {error ?? 'Signing in…'}
          </p>
        )}
        {desk.windowLocked && desk.settings.seeThrough && (
          <p className="lock-chip" data-hit>
            Window locked
          </p>
        )}
      </main>


      <SettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={desk.settings}
        clientId={desk.clientId}
        onSave={saveSettings}
        onReconnectChat={() => setChatNonce((n) => n + 1)}
        onRefreshPrime={() => void loginForPrime()}
        onShowTips={() => desk.applySettings({ ...desk.settings, dismissedTips: [] })}
      />
    </div>
    </PortalThemeProvider>
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
