import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import {
  ChevronDown,
  Columns2,
  Focus,
  LogIn,
  Maximize2,
  MessageSquare,
  Minimize2,
  Pin,
  Settings,
  SquareArrowOutUpRight,
  X,
} from 'lucide-react'
import type { AppearanceTheme, LayoutMode, SavedStream, UpdaterStatus } from '../types'
import { AppearanceSettings } from './AppearanceSettings'
import { IconButton } from './IconButton'
import { MISSING_TWITCH_CLIENT_ID_ERROR, TWITCH_OAUTH_REDIRECT } from '../lib/env'

type MenuId = 'streams' | 'layout' | 'settings' | null

type Props = {
  hidden?: boolean
  title: string
  clientId: string
  onClientIdChange: (value: string) => void
  hasBuiltInClientId: boolean
  onAddStream: (value: string) => { ok: boolean; error?: string; channel?: string }
  onSaveStream: (value: string) => { ok: boolean; error?: string; channel?: string }
  onUnsaveStream: (channel: string) => void
  savedStreams: SavedStream[]
  openChannels: string[]
  chatChannel: string | null
  onChatChannelChange: (channel: string) => void
  chatOpen: boolean
  onToggleChat: () => void
  onPopoutChat: () => void
  layoutMode: LayoutMode
  focusMode: boolean
  onToggleFocusMode: () => void
  onPreset: (preset: LayoutMode) => void
  isFullscreen: boolean
  onToggleFullscreen: () => void
  chromePinned: boolean
  onTogglePin: () => void
  isLoggedIn: boolean
  displayName: string | null
  authBusy: boolean
  authError: string | null
  onLoginTwitch: () => void
  onReconnectChat: () => void
  onRefreshPrime: () => void
  onLogout: () => void
  updater: UpdaterStatus
  onCheckForUpdates: () => void
  onDownloadUpdate: () => void
  onInstallUpdate: () => void
  appearance: AppearanceTheme
  onAppearanceChange: (theme: AppearanceTheme) => void
  onMenuOpenChange?: (open: boolean) => void
}

function Menu({
  id,
  openId,
  setOpenId,
  label,
  icon,
  align = 'end',
  active,
  children,
}: {
  id: Exclude<MenuId, null>
  openId: MenuId
  setOpenId: (id: MenuId) => void
  label: string
  icon: ReactNode
  align?: 'start' | 'end'
  active?: boolean
  children: ReactNode
}) {
  const open = openId === id
  return (
    <div className={`topbar-menu topbar-menu--${align}`}>
      <IconButton
        label={label}
        tooltipAlign={align === 'end' ? 'end' : 'center'}
        active={active || open}
        onClick={() => setOpenId(open ? null : id)}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        {icon}
      </IconButton>
      {open && (
        <div className="popover" role="dialog" aria-label={label}>
          {children}
        </div>
      )}
    </div>
  )
}

export function TopBar({
  hidden = false,
  title,
  clientId,
  onClientIdChange,
  hasBuiltInClientId,
  onAddStream,
  onSaveStream,
  onUnsaveStream,
  savedStreams,
  openChannels,
  chatChannel,
  onChatChannelChange,
  chatOpen,
  onToggleChat,
  onPopoutChat,
  layoutMode,
  focusMode,
  onToggleFocusMode,
  onPreset,
  isFullscreen,
  onToggleFullscreen,
  chromePinned,
  onTogglePin,
  isLoggedIn,
  displayName,
  authBusy,
  authError,
  onLoginTwitch,
  onReconnectChat,
  onRefreshPrime,
  onLogout,
  updater,
  onCheckForUpdates,
  onDownloadUpdate,
  onInstallUpdate,
  appearance,
  onAppearanceChange,
  onMenuOpenChange,
}: Props) {
  const [openMenu, setOpenMenu] = useState<MenuId>(null)
  const [channelInput, setChannelInput] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [developerOpen, setDeveloperOpen] = useState(!hasBuiltInClientId)
  const barRef = useRef<HTMLElement>(null)

  useEffect(() => {
    onMenuOpenChange?.(openMenu !== null)
  }, [openMenu, onMenuOpenChange])

  useEffect(() => {
    if (openMenu === 'settings' && !hasBuiltInClientId) {
      setDeveloperOpen(true)
    }
  }, [openMenu, hasBuiltInClientId])

  useEffect(() => {
    if (authError === MISSING_TWITCH_CLIENT_ID_ERROR) {
      setDeveloperOpen(true)
      setOpenMenu('settings')
    }
  }, [authError])

  useEffect(() => {
    if (!openMenu) return
    const onPointer = (event: MouseEvent) => {
      if (!barRef.current?.contains(event.target as Node)) {
        setOpenMenu(null)
      }
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenMenu(null)
    }
    window.addEventListener('mousedown', onPointer)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onPointer)
      window.removeEventListener('keydown', onKey)
    }
  }, [openMenu])

  const handleAdd = (event: FormEvent) => {
    event.preventDefault()
    const result = onAddStream(channelInput)
    if (result.ok) {
      setChannelInput('')
      setAddError(null)
      setSaveMessage(null)
      setOpenMenu(null)
    } else {
      setAddError(result.error ?? 'Could not add stream')
      setSaveMessage(null)
    }
  }

  const handleSaveCurrent = () => {
    const result = onSaveStream(channelInput)
    if (result.ok) {
      setSaveMessage(`Saved #${result.channel}`)
      setAddError(null)
      setChannelInput('')
    } else {
      setAddError(result.error ?? 'Could not save stream')
      setSaveMessage(null)
    }
  }

  return (
    <header
      ref={barRef}
      className={`topbar${hidden ? ' topbar--hidden' : ''}`}
      aria-label="Stream Watcher toolbar"
    >
      <button
        type="button"
        className="topbar__title"
        title={title}
        onClick={() => setOpenMenu(openMenu === 'streams' ? null : 'streams')}
      >
        <span className="topbar__title-text">{title}</span>
      </button>
      {openMenu === 'streams' && (
        <div className="popover popover--title" role="dialog" aria-label="Streams">
          <form className="add-form" onSubmit={handleAdd}>
            <label htmlFor="channel">Add a Twitch channel</label>
            <div className="add-form__row">
              <input
                id="channel"
                value={channelInput}
                onChange={(e) => setChannelInput(e.target.value)}
                placeholder="channel or twitch.tv/..."
                autoComplete="off"
                autoFocus
              />
              <button type="submit">Add</button>
            </div>
            <div className="add-form__actions">
              <button
                type="button"
                className="secondary"
                onClick={handleSaveCurrent}
                disabled={!channelInput.trim()}
              >
                Save for later
              </button>
            </div>
            {addError && <p className="field-error">{addError}</p>}
            {saveMessage && <p className="field-success">{saveMessage}</p>}
          </form>

          {openChannels.length > 0 && (
            <section className="popover-section">
              <h2>Open streams</h2>
              <div className="channel-list">
                {openChannels.map((channel) => (
                  <button
                    key={channel}
                    type="button"
                    className={channel === chatChannel ? 'is-active' : ''}
                    onClick={() => {
                      onChatChannelChange(channel)
                      setOpenMenu(null)
                    }}
                  >
                    #{channel}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="popover-section">
            <h2>Saved streams</h2>
            {!savedStreams.length && (
              <p className="hint">Save channels here so you can reopen them without pasting a link.</p>
            )}
            <ul className="saved-list">
              {savedStreams.map((item) => {
                const isOpen = openChannels.includes(item.channel)
                return (
                  <li key={item.channel} className="saved-list__item">
                    <span className="saved-list__name">#{item.channel}</span>
                    <div className="saved-list__actions">
                      <button
                        type="button"
                        disabled={isOpen}
                        onClick={() => {
                          onAddStream(item.channel)
                          setOpenMenu(null)
                        }}
                        title={isOpen ? 'Already open' : 'Open stream'}
                      >
                        {isOpen ? 'Open' : 'Add'}
                      </button>
                      <button
                        type="button"
                        className="ghost danger saved-list__remove"
                        onClick={() => onUnsaveStream(item.channel)}
                        title="Remove from saved"
                        aria-label={`Remove #${item.channel} from saved`}
                      >
                        <X size={14} strokeWidth={2} />
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        </div>
      )}

      <div className="topbar__controls">
        <IconButton
          label={chatOpen ? 'Hide chat' : 'Open chat'}
          active={chatOpen}
          onClick={() => {
            setOpenMenu(null)
            onToggleChat()
          }}
        >
          <MessageSquare size={16} strokeWidth={1.75} fill={chatOpen ? 'currentColor' : 'none'} />
        </IconButton>

        <IconButton
          label="Focus mode"
          active={focusMode}
          onClick={() => {
            setOpenMenu(null)
            onToggleFocusMode()
          }}
        >
          <Focus size={16} strokeWidth={1.75} />
        </IconButton>

        <Menu
          id="layout"
          openId={openMenu}
          setOpenId={setOpenMenu}
          label="Change layout"
          icon={<Columns2 size={16} strokeWidth={1.75} />}
        >
          <section className="popover-section popover-section--flush">
            <h2>Layouts</h2>
            <div className="preset-row">
              {(['1x1', '1x2', '2x2', '1+3'] as const).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={layoutMode === preset ? 'is-active' : ''}
                  onClick={() => {
                    onPreset(preset)
                    setOpenMenu(null)
                  }}
                >
                  {preset === '1x1' ? '1' : preset}
                </button>
              ))}
            </div>
            <p className="hint">Tiles always fill the window. No page scroll.</p>
          </section>
        </Menu>

        <IconButton
          label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          active={isFullscreen}
          onClick={() => {
            setOpenMenu(null)
            onToggleFullscreen()
          }}
        >
          {isFullscreen ? (
            <Minimize2 size={16} strokeWidth={1.75} />
          ) : (
            <Maximize2 size={16} strokeWidth={1.75} />
          )}
        </IconButton>

        <IconButton
          label={chromePinned ? 'Unpin toolbar' : 'Pin toolbar'}
          active={chromePinned}
          onClick={() => {
            setOpenMenu(null)
            onTogglePin()
          }}
        >
          <Pin size={16} strokeWidth={1.75} fill={chromePinned ? 'currentColor' : 'none'} />
        </IconButton>

        <IconButton
          label="Open chat on another monitor"
          desktopOnly
          tooltipAlign="end"
          onClick={() => {
            setOpenMenu(null)
            onPopoutChat()
          }}
        >
          <SquareArrowOutUpRight size={16} strokeWidth={1.75} />
        </IconButton>

        <IconButton
          label={isLoggedIn ? `Signed in as ${displayName ?? 'you'}` : 'Login to Twitch'}
          tooltip={isLoggedIn ? `Signed in as ${displayName ?? 'you'}` : 'Login for Prime + chat.'}
          tooltipAlign="end"
          active={isLoggedIn}
          disabled={authBusy}
          onClick={() => {
            setOpenMenu(null)
            if (!isLoggedIn) onLoginTwitch()
          }}
        >
          <LogIn size={16} strokeWidth={1.75} fill={isLoggedIn ? 'currentColor' : 'none'} />
        </IconButton>

        <Menu
          id="settings"
          openId={openMenu}
          setOpenId={setOpenMenu}
          label="Settings"
          icon={<Settings size={16} strokeWidth={1.75} />}
        >
          <section className="popover-section popover-section--flush">
            <h2>Settings</h2>
            <div className="settings-block">
              <button
                type="button"
                className={`developer-toggle${developerOpen ? ' is-open' : ''}`}
                aria-expanded={developerOpen}
                onClick={() => setDeveloperOpen((open) => !open)}
              >
                <span>Developer</span>
                <ChevronDown size={14} strokeWidth={2} />
              </button>
              {developerOpen && (
                <div className="developer-panel">
                  <label htmlFor="clientId">Twitch Client ID</label>
                  <input
                    id="clientId"
                    value={clientId}
                    onChange={(e) => onClientIdChange(e.target.value.trim())}
                    placeholder={hasBuiltInClientId ? 'leave blank to use the baked-in ID' : 'from dev.twitch.tv'}
                    autoComplete="off"
                  />
                  <p className="hint">
                    {hasBuiltInClientId
                      ? (
                        <>
                          Optional override. Leave blank to use the Client ID baked into this build.
                          OAuth redirect: <code>{TWITCH_OAUTH_REDIRECT}</code>
                        </>
                      )
                      : (
                        <>
                          Create an app at{' '}
                          <a href="https://dev.twitch.tv/console" target="_blank" rel="noreferrer">
                            Twitch Developer Console
                          </a>
                          . OAuth redirect: <code>{TWITCH_OAUTH_REDIRECT}</code>
                        </>
                      )}
                  </p>
                </div>
              )}
              <div className="settings-actions">
                <button type="button" className="secondary" onClick={onReconnectChat} disabled={authBusy}>
                  Reconnect chat
                </button>
                <button type="button" className="secondary" onClick={onRefreshPrime} disabled={authBusy}>
                  Refresh Prime session
                </button>
              </div>
              <p className="hint">Use these if the top-bar login only half-worked (chat token vs Prime/ads).</p>
              {isLoggedIn && (
                <button type="button" className="ghost" onClick={onLogout}>
                  Log out
                </button>
              )}
              {authError && <p className="field-error">{authError}</p>}
            </div>
          </section>
          <AppearanceSettings appearance={appearance} onChange={onAppearanceChange} />
          <section className="popover-section">
            <h2>Updates</h2>
            <p className="hint">
              App version {updater.currentVersion || 'dev'}. Checks GitHub Releases, including pre-releases.
            </p>
            {updater.message && <p className="hint">{updater.message}</p>}
            {updater.state === 'available' && updater.availableVersion && (
              <p>Version {updater.availableVersion} is available.</p>
            )}
            {updater.state === 'downloading' && (
              <p className="hint">Downloading… {Math.round(updater.percent ?? 0)}%</p>
            )}
            {updater.state === 'ready' && updater.availableVersion && (
              <p>Version {updater.availableVersion} is ready. Install restarts the app.</p>
            )}
            {updater.error && <p className="field-error">{updater.error}</p>}
            <div className="settings-actions">
              <button
                type="button"
                className="secondary"
                title="Check for Updates"
                onClick={onCheckForUpdates}
                disabled={updater.state === 'checking' || updater.state === 'downloading'}
              >
                Check for Updates
              </button>
              {updater.state === 'available' && (
                <button type="button" onClick={onDownloadUpdate}>
                  Download
                </button>
              )}
              {updater.state === 'ready' && (
                <button type="button" onClick={onInstallUpdate}>
                  Install and restart
                </button>
              )}
            </div>
            <p className="hint">
              Unsigned builds still update from GitHub. Windows SmartScreen may warn — More info → Run anyway.
              Portable EXEs are not auto-updated; download a new file from the Release.
            </p>
          </section>
        </Menu>
      </div>
    </header>
  )
}
