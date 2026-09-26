import * as Tooltip from '@radix-ui/react-tooltip'
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PortalThemeProvider, themeVars } from './components/ui/portalTheme'
import { ChromeBar } from './components/ChromeBar'
import { FirstRunTips } from './components/FirstRunTips'
import { StreamGrid } from './components/StreamGrid'
import { useChatCredentials } from './hooks/useChatCredentials'
import { useClickThrough } from './hooks/useClickThrough'
import { useDesk } from './hooks/useDesk'
import { useTwitchAuth } from './hooks/useTwitchAuth'
import { resolveTwitchClientId } from './lib/twitchClientId'
import { formatHotkeyEvent, isEditableTarget, type HotkeyAction } from './lib/hotkeys'
import { getPlatform, platforms } from './lib/platforms/registry'
import { chatFontFamily, streamKey } from './lib/storage'
import type { AppSettings, PlatformId, PopoutInfo } from './types'

const CHROME_IDLE_MS = 2400

// Loaded on first use: chat (tmi.js, Helix, emote picker), Settings, and the pop-out window UI are
// not needed to show the desk, so they stay out of the startup bundle.
const ChatDrawer = lazy(() => import('./components/ChatDrawer').then((m) => ({ default: m.ChatDrawer })))
const SettingsModal = lazy(() => import('./components/SettingsModal').then((m) => ({ default: m.SettingsModal })))
const PopoutApp = lazy(() => import('./components/PopoutApp').then((m) => ({ default: m.PopoutApp })))

function nearChromeEdge(edge: AppSettings['chromeEdge'], x: number, y: number) {
  if (edge === 'bottom') return y >= window.innerHeight - 52
  if (edge === 'left') return x <= 52
  if (edge === 'right') return x >= window.innerWidth - 52
  return y <= 52
}

function DeskApp() {
  const desk = useDesk()
  const twitchClientId = resolveTwitchClientId(desk.clientId)
  const { auth, busy, error, loginToTwitch, loginForPrime, logout, isLoggedIn } = useTwitchAuth(twitchClientId)
  // The desk always hosts ChatDrawer (mounted once, just repositioned — see
  // CLAUDE.md), so it always needs chat credentials ready for when it opens.
  // auth.accessToken is always null now (see useTwitchAuth) — the raw token
  // only ever reaches this window through useChatCredentials.
  const chatCredentials = useChatCredentials(true)
  const searchRef = useRef<HTMLInputElement>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [chromeHidden, setChromeHidden] = useState(false)
  const [popped, setPopped] = useState<PopoutInfo[]>([])
  const [fullscreen, setFullscreen] = useState(false)

  // Chat is Twitch-only for now (Kick's chat transport is deferred) — streams on a
  // platform without chat never reach the drawer or its tmi.js connection.
  const channels = desk.visibleStreams.filter((s) => getPlatform(s.platform).hasChat).map((s) => s.channel)
  const poppedChat = useMemo(
    () => new Set(popped.filter((item) => item.kind === 'chat').map((item) => item.channel.toLowerCase())),
    [popped],
  )
  const drawerChannels = channels.filter((channel) => !poppedChat.has(channel.toLowerCase()))
  const activeLower = desk.chatChannel?.toLowerCase()
  const drawerActive = drawerChannels.find((c) => c.toLowerCase() === activeLower) ?? drawerChannels[0] ?? null
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
    return window.vesper?.onDockRequest(({ channel, kind, platform }) => {
      if (kind === 'stream') {
        desk.dockStream(platform, channel)
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

  // Chat pop-outs are Twitch-only — Kick's chat transport is deferred (see the
  // StreamPlatform plan), so no other platform's tiles ever offer a chat toggle.
  const popoutChat = async (channel: string) => {
    desk.setChatChannel(channel)
    await window.vesper?.openPopout('chat', channel, 'twitch')
    desk.setChatOpen(false)
  }

  const openChat = (channel?: string) => {
    if (channel && poppedChat.has(channel.toLowerCase())) {
      // Already popped out: bring that window forward instead of an empty drawer.
      void window.vesper?.openPopout('chat', channel, 'twitch')
      return
    }
    if (channel) desk.setChatChannel(channel)
    desk.setChatOpen(true)
    // Only a tile's Open chat slides a floating drawer back in; the menu keeps Float.
    if (channel && desk.chatDock === 'float') desk.setChatDock('right')
  }

  const popoutStream = async (channel: string, platform: PlatformId) => {
    desk.popStream(platform, channel)
    await window.vesper?.openPopout('stream', channel, platform)
  }

  // Stable tile callbacks, so chrome, menu, and chat state changes do not re-render StreamGrid
  // (and every player tile) — it is memoized on its props.
  const tileActions = useRef({ openChat, popoutChat, popoutStream })
  tileActions.current = { openChat, popoutChat, popoutStream }
  const onTileOpenChat = useCallback((channel: string) => tileActions.current.openChat(channel), [])
  const onTilePopoutChat = useCallback((channel: string) => void tileActions.current.popoutChat(channel), [])
  const onTilePopoutStream = useCallback(
    (channel: string, platform: PlatformId) => void tileActions.current.popoutStream(channel, platform),
    [],
  )
  const savedKeys = useMemo(
    () => new Set(desk.savedStreams.map((s) => streamKey(s.platform, s.channel))),
    [desk.savedStreams],
  )
  const poppedStreamCount = popped.filter((p) => p.kind === 'stream').length

  const dockPop = async (channel: string, kind: 'stream' | 'chat', platform: PlatformId) => {
    await window.vesper?.dockPopout(kind, channel, platform)
    if (kind === 'stream') desk.dockStream(platform, channel)
  }

  const dockAll = async () => {
    suppressChatReopenRef.current = true
    try {
      await window.vesper?.dockAllPopouts()
    } finally {
      suppressChatReopenRef.current = false
    }
    popped.filter((p) => p.kind === 'stream').forEach((p) => desk.dockStream(p.platform, p.channel))
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
        case 'unmuteAll':
          desk.unmuteAll()
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
        // Escape belongs to an open menu, popover, or tooltip first (Radix closes it), and to
        // whatever is being typed; it must not also close fullscreen or the chat drawer.
        if (event.defaultPrevented || document.querySelector('[data-radix-popper-content-wrapper]')) return
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
        if (desk.chatOpen && !isEditableTarget(event.target)) desk.setChatOpen(false)
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
    <Suspense fallback={<aside className={`chat-drawer chat-drawer--${desk.chatDock}`} data-hit />}>
    <ChatDrawer
      dock={desk.chatDock}
      // Chat is Twitch-only until Kick's chat transport is built — see the
      // StreamPlatform plan's Phase 3 scope note.
      platform="twitch"
      channels={drawerChannels}
      activeChannel={drawerActive}
      onChannelChange={desk.setChatChannel}
      username={chatCredentials?.username ?? null}
      accessToken={chatCredentials?.accessToken ?? null}
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
    </Suspense>
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
        onDock={(channel, kind, platform) => void dockPop(channel, kind, platform)}
        savedStreams={desk.savedStreams}
        onOpenSaved={desk.openSaved}
        onUnsaveStream={desk.unsaveStream}
        onRenameSaved={desk.renameSavedStream}
        seeThrough={desk.settings.seeThrough}
        onSeeThrough={(value) => desk.applySettings({ ...desk.settings, seeThrough: value })}
        windowLocked={desk.windowLocked}
        onWindowLocked={desk.setWindowLocked}
        ghost={desk.settings.ghostOverlay}
        onGhost={(value) => desk.applySettings({ ...desk.settings, ghostOverlay: value })}
        pinned={desk.settings.pinToolbar}
        onPinned={(value) => desk.applySettings({ ...desk.settings, pinToolbar: value })}
        autoHideMode={fullscreen || desk.settings.ghostOverlay}
        fullscreen={fullscreen}
        chatOpen={desk.chatOpen}
        onToggleChat={() => (desk.chatOpen ? desk.setChatOpen(false) : openChat())}
        onFullscreen={() => runHotkey('fullscreen')}
        onAddStream={desk.addStream}
        onSettings={() => setSettingsOpen(true)}
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
          savedKeys={savedKeys}
          mode={desk.mode}
          poppedCount={poppedStreamCount}
          onLayoutChange={desk.setLayout}
          onDragState={desk.setIsDragging}
          onFocus={desk.focusStream}
          onToggleMute={desk.toggleMute}
          onRemove={desk.removeStream}
          onOpenChat={onTileOpenChat}
          onPopoutChat={onTilePopoutChat}
          onPopoutStream={onTilePopoutStream}
          onToggleSave={desk.toggleSaveStream}
          onVolume={desk.setStreamVolume}
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


      {settingsOpen && (
      <Suspense fallback={null}>
      <SettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={desk.settings}
        clientId={desk.clientId}
        onSave={saveSettings}
        onReconnectChat={() => setChatNonce((n) => n + 1)}
        onRefreshPrime={() => void loginForPrime()}
        onShowTips={() => desk.applySettings({ ...desk.settings, dismissedTips: [] })}
        isLoggedIn={isLoggedIn}
        displayName={auth.displayName}
        onLogin={() => void loginToTwitch()}
        onLogout={() => void logout()}
      />
      </Suspense>
      )}
    </div>
    </PortalThemeProvider>
  )
}

export default function App() {
  const params = new URLSearchParams(window.location.search)
  const mode = params.get('mode')
  const channel = params.get('channel') ?? ''
  const rawPlatform = params.get('platform') ?? ''
  const platform: PlatformId = Object.hasOwn(platforms, rawPlatform) ? (rawPlatform as PlatformId) : 'twitch'

  return (
    <Tooltip.Provider delayDuration={250} skipDelayDuration={80}>
      {mode === 'chat' || mode === 'stream' ? (
        <Suspense fallback={null}>
          <PopoutApp mode={mode} channel={channel} platform={platform} />
        </Suspense>
      ) : (
        <DeskApp />
      )}
    </Tooltip.Provider>
  )
}
