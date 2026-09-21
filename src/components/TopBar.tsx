import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import type { SavedStream } from '../types'
import { IconButton } from './IconButton'
import {
  ChatIcon,
  ExitFullscreenIcon,
  FullscreenIcon,
  LayoutIcon,
  PlusIcon,
  SettingsIcon,
  UserIcon,
} from './icons'

type MenuId = 'add' | 'layout' | 'settings' | 'auth' | null

type Props = {
  hidden?: boolean
  clientId: string
  onClientIdChange: (value: string) => void
  onAddStream: (value: string) => { ok: boolean; error?: string; channel?: string }
  onSaveStream: (value: string) => { ok: boolean; error?: string; channel?: string }
  onUnsaveStream: (channel: string) => void
  savedStreams: SavedStream[]
  openChannels: string[]
  chatChannel: string | null
  onChatChannelChange: (channel: string) => void
  chatOpen: boolean
  onToggleChat: () => void
  onPreset: (preset: '1x1' | '1x2' | '2x2' | '1+3') => void
  isFullscreen: boolean
  onToggleFullscreen: () => void
  isLoggedIn: boolean
  displayName: string | null
  authBusy: boolean
  authError: string | null
  onLoginChat: () => void
  onLoginPrime: () => void
  onLogout: () => void
  onMenuOpenChange?: (open: boolean) => void
}

function Menu({
  id,
  openId,
  setOpenId,
  label,
  icon,
  align = 'start',
  tooltipAlign,
  active,
  children,
}: {
  id: Exclude<MenuId, null>
  openId: MenuId
  setOpenId: (id: MenuId) => void
  label: string
  icon: ReactNode
  align?: 'start' | 'end'
  tooltipAlign?: 'start' | 'center' | 'end'
  active?: boolean
  children: ReactNode
}) {
  const open = openId === id
  return (
    <div className={`topbar-menu topbar-menu--${align}`}>
      <IconButton
        label={label}
        tooltipAlign={tooltipAlign}
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
  clientId,
  onClientIdChange,
  onAddStream,
  onSaveStream,
  onUnsaveStream,
  savedStreams,
  openChannels,
  chatChannel,
  onChatChannelChange,
  chatOpen,
  onToggleChat,
  onPreset,
  isFullscreen,
  onToggleFullscreen,
  isLoggedIn,
  displayName,
  authBusy,
  authError,
  onLoginChat,
  onLoginPrime,
  onLogout,
  onMenuOpenChange,
}: Props) {
  const [openMenu, setOpenMenu] = useState<MenuId>(null)
  const [channelInput, setChannelInput] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const barRef = useRef<HTMLElement>(null)

  useEffect(() => {
    onMenuOpenChange?.(openMenu !== null)
  }, [openMenu, onMenuOpenChange])

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
      <div className="topbar__cluster">
        <span className="brand__mark brand__mark--bar" title="Stream Watcher">
          SW
        </span>

        <Menu
          id="add"
          openId={openMenu}
          setOpenId={setOpenMenu}
          label="Add stream"
          icon={<PlusIcon />}
        >
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
                        className="ghost danger"
                        onClick={() => onUnsaveStream(item.channel)}
                        title="Remove from saved"
                      >
                        x
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        </Menu>

        <Menu
          id="layout"
          openId={openMenu}
          setOpenId={setOpenMenu}
          label="Layouts"
          icon={<LayoutIcon />}
        >
          <section className="popover-section popover-section--flush">
            <h2>Layouts</h2>
            <div className="preset-row">
              <button
                type="button"
                onClick={() => {
                  onPreset('1x1')
                  setOpenMenu(null)
                }}
              >
                1
              </button>
              <button
                type="button"
                onClick={() => {
                  onPreset('1x2')
                  setOpenMenu(null)
                }}
              >
                1x2
              </button>
              <button
                type="button"
                onClick={() => {
                  onPreset('2x2')
                  setOpenMenu(null)
                }}
              >
                2x2
              </button>
              <button
                type="button"
                onClick={() => {
                  onPreset('1+3')
                  setOpenMenu(null)
                }}
              >
                1+3
              </button>
            </div>
            <p className="hint">Drag the handle on any tile to rearrange.</p>
          </section>
        </Menu>

        <IconButton
          label={chatOpen ? 'Hide chat' : 'Show chat'}
          active={chatOpen}
          onClick={() => {
            setOpenMenu(null)
            onToggleChat()
          }}
        >
          <ChatIcon />
        </IconButton>

        {openChannels.length > 0 && (
          <label className="stream-switcher" data-tooltip="Switch chat channel">
            <span className="sr-only">Active chat channel</span>
            <select
              value={chatChannel ?? ''}
              aria-label="Switch chat to a stream"
              onChange={(event) => {
                const channel = event.target.value
                if (!channel) return
                onChatChannelChange(channel)
              }}
            >
              {!chatChannel && <option value="">Chat channel</option>}
              {openChannels.map((channel) => (
                <option key={channel} value={channel}>
                  #{channel}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="topbar__cluster topbar__cluster--end">
        <IconButton
          label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          tooltipAlign="end"
          active={isFullscreen}
          onClick={() => {
            setOpenMenu(null)
            onToggleFullscreen()
          }}
        >
          {isFullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
        </IconButton>

        <Menu
          id="settings"
          openId={openMenu}
          setOpenId={setOpenMenu}
          label="Settings"
          icon={<SettingsIcon />}
          align="end"
          tooltipAlign="end"
        >
          <section className="popover-section popover-section--flush">
            <h2>Settings</h2>
            <div className="settings-block">
              <label htmlFor="clientId">Twitch Client ID</label>
              <input
                id="clientId"
                value={clientId}
                onChange={(e) => onClientIdChange(e.target.value.trim())}
                placeholder="from dev.twitch.tv"
                autoComplete="off"
              />
              <p className="hint">
                Create an app at{' '}
                <a href="https://dev.twitch.tv/console" target="_blank" rel="noreferrer">
                  Twitch Developer Console
                </a>
                . OAuth redirect: <code>http://localhost:5173/oauth/callback</code>
              </p>
            </div>
          </section>
        </Menu>

        <Menu
          id="auth"
          openId={openMenu}
          setOpenId={setOpenMenu}
          label={isLoggedIn ? `Account (${displayName ?? 'signed in'})` : 'Twitch login'}
          icon={<UserIcon />}
          align="end"
          tooltipAlign="end"
          active={isLoggedIn}
        >
          <section className="popover-section popover-section--flush">
            <h2>Twitch account</h2>
            {isLoggedIn ? (
              <p className="auth-status">
                Signed in as <strong>{displayName}</strong>
              </p>
            ) : (
              <p className="hint">Log in to chat and use Prime/Turbo benefits in embeds.</p>
            )}
            <div className="stack-buttons">
              <button type="button" onClick={onLoginChat} disabled={authBusy}>
                {isLoggedIn ? 'Re-auth for chat' : 'Login for chat'}
              </button>
              <button type="button" className="secondary" onClick={onLoginPrime}>
                Login for Prime / ads
              </button>
              {isLoggedIn && (
                <button type="button" className="ghost" onClick={onLogout}>
                  Log out
                </button>
              )}
            </div>
            {authError && <p className="field-error">{authError}</p>}
          </section>
        </Menu>
      </div>
    </header>
  )
}
