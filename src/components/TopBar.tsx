import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import {
  Columns2,
  Copy,
  Eye,
  Focus,
  Gauge,
  Ghost,
  LayoutGrid,
  List,
  LogIn,
  Maximize2,
  Menu as MenuIcon,
  MessageSquare,
  Minimize2,
  Minus,
  MoreHorizontal,
  Pin,
  RotateCcw,
  Settings,
  Square,
  SquareArrowOutUpRight,
  X,
} from 'lucide-react'
import type { LayoutMode, LayoutTemplate, SavedStream } from '../types'
import { IconButton } from './IconButton'
import { MISSING_TWITCH_CLIENT_ID_ERROR } from '../lib/env'
import { UI } from '../lib/uiLabels'

type MenuId = 'streams' | 'templates' | 'overflow' | 'hamburger' | 'redock' | null
type Mode = 'standard' | 'focus' | 'performance'

type Props = {
  hidden?: boolean
  title: string
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
  mode: Mode
  onSetMode: (mode: Mode) => void
  onPreset: (preset: LayoutMode) => void
  isFullscreen: boolean
  onToggleFullscreen: () => void
  chromePinned: boolean
  onTogglePin: () => void
  ghostOverlay: boolean
  onToggleGhostOverlay: () => void
  isLoggedIn: boolean
  displayName: string | null
  authBusy: boolean
  authError: string | null
  onLoginTwitch: () => void
  seeThroughActive: boolean
  onToggleSeeThroughWindows: () => void
  settingsOpen: boolean
  onOpenSettings: () => void
  openStreamsRequest?: number
  onMenuOpenChange?: (open: boolean) => void
  onDockAllPopouts: () => void
  hasPoppedOut: boolean
  poppedStreamChannels: string[]
  onDockStreamChannel: (channel: string) => void
  templates: LayoutTemplate[]
  onApplyTemplate: (template: LayoutTemplate) => void
  onSaveTemplate: (name: string) => { ok: boolean; error?: string }
  onDeleteTemplate: (id: string) => void
  chrome: 'top' | 'left' | 'right' | 'bottom'
  windowControls: {
    isMaximized: boolean
    minimize: () => void
    toggleMaximize: () => void
    close: () => void
  }
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
        <div className="popover" role="dialog" aria-label={label} data-hit>
          {children}
        </div>
      )}
    </div>
  )
}

function MenuRow({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: ReactNode
  label: string
  active?: boolean
  onClick: () => void
}) {
  return (
    <button type="button" className={`menu-row${active ? ' is-active' : ''}`} onClick={onClick}>
      <span aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </button>
  )
}

export function TopBar({
  hidden = false,
  title,
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
  mode,
  onSetMode,
  onPreset,
  isFullscreen,
  onToggleFullscreen,
  chromePinned,
  onTogglePin,
  ghostOverlay,
  onToggleGhostOverlay,
  isLoggedIn,
  displayName,
  authBusy,
  authError,
  onLoginTwitch,
  seeThroughActive,
  onToggleSeeThroughWindows,
  settingsOpen,
  onOpenSettings,
  openStreamsRequest = 0,
  onMenuOpenChange,
  onDockAllPopouts,
  hasPoppedOut,
  poppedStreamChannels,
  onDockStreamChannel,
  templates,
  onApplyTemplate,
  onSaveTemplate,
  onDeleteTemplate,
  chrome,
  windowControls,
}: Props) {
  const [openMenu, setOpenMenu] = useState<MenuId>(null)
  const [channelInput, setChannelInput] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [templateNameInput, setTemplateNameInput] = useState('')
  const [templateError, setTemplateError] = useState<string | null>(null)
  const barRef = useRef<HTMLElement>(null)

  useEffect(() => {
    onMenuOpenChange?.(openMenu !== null || settingsOpen)
  }, [openMenu, onMenuOpenChange, settingsOpen])

  useEffect(() => {
    if (authError === MISSING_TWITCH_CLIENT_ID_ERROR) {
      onOpenSettings()
    }
  }, [authError, onOpenSettings])

  useEffect(() => {
    if (openStreamsRequest) setOpenMenu('streams')
  }, [openStreamsRequest])

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

  const handleSaveTemplate = (event: FormEvent) => {
    event.preventDefault()
    const result = onSaveTemplate(templateNameInput)
    if (result.ok) {
      setTemplateNameInput('')
      setTemplateError(null)
    } else {
      setTemplateError(result.error ?? 'Could not save template')
    }
  }

  return (
    <header
      ref={barRef}
      className={`topbar${hidden ? ' topbar--hidden' : ''}`}
      aria-label="Stream Watcher toolbar"
      data-hit
    >
      <button
        type="button"
        className="topbar__title"
        title={title}
        aria-label={chrome === 'left' || chrome === 'right' ? title : undefined}
        onClick={() => setOpenMenu(openMenu === 'streams' ? null : 'streams')}
      >
        {chrome === 'left' || chrome === 'right' ? (
          <List size={16} strokeWidth={1.75} aria-hidden />
        ) : (
          <span className="topbar__title-text">{title}</span>
        )}
      </button>
      {openMenu === 'streams' && (
        <div className="popover popover--title" role="dialog" aria-label="Streams" data-hit>
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
        <div className="mode-segmented" role="group" aria-label={UI.mode} data-hit>
          <IconButton
            label={UI.modeStandard}
            active={mode === 'standard'}
            onClick={() => {
              setOpenMenu(null)
              onSetMode('standard')
            }}
          >
            <LayoutGrid size={16} strokeWidth={1.75} />
          </IconButton>
          <IconButton
            label={UI.modeFocus}
            active={mode === 'focus'}
            onClick={() => {
              setOpenMenu(null)
              onSetMode('focus')
            }}
          >
            <Focus size={16} strokeWidth={1.75} />
          </IconButton>
          <IconButton
            label={UI.modePerformance}
            active={mode === 'performance'}
            onClick={() => {
              setOpenMenu(null)
              onSetMode('performance')
            }}
          >
            <Gauge size={16} strokeWidth={1.75} />
          </IconButton>
        </div>

        <Menu
          id="templates"
          openId={openMenu}
          setOpenId={setOpenMenu}
          label={UI.changeLayout}
          icon={<Columns2 size={16} strokeWidth={1.75} />}
        >
          <section className="popover-section popover-section--flush">
            <h2>{UI.changeLayout}</h2>
            {templates.length > 0 ? (
              <ul className="saved-list">
                {templates.map((item) => (
                  <li key={item.id} className="saved-list__item">
                    <button
                      type="button"
                      className="saved-list__name-btn"
                      onClick={() => {
                        onApplyTemplate(item)
                        setOpenMenu(null)
                      }}
                      title={`Apply "${item.name}"`}
                    >
                      {item.name}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="hint">Save a layout template from the hamburger menu to see it here.</p>
            )}
          </section>
        </Menu>

        {poppedStreamChannels.length > 0 && (
          <Menu
            id="redock"
            openId={openMenu}
            setOpenId={setOpenMenu}
            label={`${poppedStreamChannels.length} stream${poppedStreamChannels.length === 1 ? '' : 's'} on another monitor`}
            icon={
              <span className="redock-trigger">
                <SquareArrowOutUpRight size={16} strokeWidth={1.75} />
                <span className="redock-badge">{poppedStreamChannels.length}</span>
              </span>
            }
          >
            <section className="popover-section popover-section--flush">
              <h2>On another monitor</h2>
              <ul className="saved-list">
                {poppedStreamChannels.map((channel) => (
                  <li key={channel} className="saved-list__item">
                    <span className="saved-list__name">#{channel}</span>
                    <div className="saved-list__actions">
                      <button
                        type="button"
                        className="dock-back-btn"
                        onClick={() => onDockStreamChannel(channel)}
                      >
                        {UI.dockBack}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </Menu>
        )}

        <IconButton
          label={UI.dockAllPopouts}
          tooltip={UI.dockAllPopouts}
          desktopOnly
          disabled={!hasPoppedOut}
          onClick={() => {
            setOpenMenu(null)
            onDockAllPopouts()
          }}
        >
          <RotateCcw size={16} strokeWidth={1.75} />
        </IconButton>

        <IconButton
          label={UI.seeThroughWindows}
          active={seeThroughActive}
          onClick={() => {
            setOpenMenu(null)
            onToggleSeeThroughWindows()
          }}
        >
          <Eye size={16} strokeWidth={1.75} />
        </IconButton>

        <Menu
          id="overflow"
          openId={openMenu}
          setOpenId={setOpenMenu}
          label={UI.more}
          icon={<MoreHorizontal size={16} strokeWidth={1.75} />}
        >
          <section className="popover-section popover-section--flush">
            <MenuRow
              icon={<MessageSquare size={16} strokeWidth={1.75} />}
              label={chatOpen ? UI.hideChat : UI.openChat}
              active={chatOpen}
              onClick={() => {
                setOpenMenu(null)
                onToggleChat()
              }}
            />
            <MenuRow
              icon={
                isFullscreen ? (
                  <Minimize2 size={16} strokeWidth={1.75} />
                ) : (
                  <Maximize2 size={16} strokeWidth={1.75} />
                )
              }
              label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              active={isFullscreen}
              onClick={() => {
                setOpenMenu(null)
                onToggleFullscreen()
              }}
            />
            <MenuRow
              icon={<Ghost size={16} strokeWidth={1.75} />}
              label={UI.ghostOverlay}
              active={ghostOverlay}
              onClick={() => {
                setOpenMenu(null)
                onToggleGhostOverlay()
              }}
            />
            <MenuRow
              icon={<Pin size={16} strokeWidth={1.75} />}
              label={UI.pinToolbar}
              active={chromePinned}
              onClick={() => {
                setOpenMenu(null)
                onTogglePin()
              }}
            />
            <MenuRow
              icon={<SquareArrowOutUpRight size={16} strokeWidth={1.75} />}
              label={UI.popOutChat}
              onClick={() => {
                setOpenMenu(null)
                onPopoutChat()
              }}
            />
          </section>
        </Menu>

        <Menu
          id="hamburger"
          openId={openMenu}
          setOpenId={setOpenMenu}
          label={UI.menu}
          icon={<MenuIcon size={16} strokeWidth={1.75} />}
        >
          <section className="popover-section popover-section--flush">
            <MenuRow
              icon={<LogIn size={16} strokeWidth={1.75} fill={isLoggedIn ? 'currentColor' : 'none'} />}
              label={isLoggedIn ? `Signed in as ${displayName ?? 'you'}` : UI.loginToTwitch}
              active={isLoggedIn}
              onClick={() => {
                setOpenMenu(null)
                if (!isLoggedIn) onLoginTwitch()
              }}
            />
            <MenuRow
              icon={<Settings size={16} strokeWidth={1.75} />}
              label={UI.settings}
              active={settingsOpen}
              onClick={() => {
                setOpenMenu(null)
                onOpenSettings()
              }}
            />
          </section>
          {authBusy && <p className="hint">Signing in…</p>}

          <section className="popover-section">
            <h2>{UI.layoutTemplates}</h2>
            {templates.length > 0 && (
              <ul className="saved-list">
                {templates.map((item) => (
                  <li key={item.id} className="saved-list__item">
                    <span className="saved-list__name">{item.name}</span>
                    <div className="saved-list__actions">
                      <button
                        type="button"
                        className="ghost danger saved-list__remove"
                        onClick={() => onDeleteTemplate(item.id)}
                        title="Delete template"
                        aria-label={`Delete template ${item.name}`}
                      >
                        <X size={14} strokeWidth={2} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <form className="add-form__row" onSubmit={handleSaveTemplate}>
              <input
                value={templateNameInput}
                onChange={(e) => setTemplateNameInput(e.target.value)}
                placeholder="Template name"
                autoComplete="off"
              />
              <button type="submit" disabled={!templateNameInput.trim()} title="Save current layout">
                +
              </button>
            </form>
            {templateError && <p className="field-error">{templateError}</p>}
            <p className="hint">Save the current channels, focus, and chat placement as a template.</p>
          </section>

          <section className="popover-section">
            <h2>{UI.changeLayout}</h2>
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
      </div>

      <div className="topbar__window-controls">
        <IconButton label="Minimize" tooltipAlign="end" onClick={windowControls.minimize}>
          <Minus size={16} strokeWidth={1.75} />
        </IconButton>
        <IconButton
          label={windowControls.isMaximized ? 'Restore' : 'Maximize'}
          tooltipAlign="end"
          onClick={windowControls.toggleMaximize}
        >
          {windowControls.isMaximized ? (
            <Copy size={15} strokeWidth={1.75} />
          ) : (
            <Square size={14} strokeWidth={1.75} />
          )}
        </IconButton>
        <IconButton label="Close" danger tooltipAlign="end" onClick={windowControls.close}>
          <X size={16} strokeWidth={1.75} />
        </IconButton>
      </div>
    </header>
  )
}
