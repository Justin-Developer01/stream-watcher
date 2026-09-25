import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as ToggleGroup from '@radix-ui/react-toggle-group'
import {
  Expand,
  Eye,
  EyeOff,
  Focus,
  FolderOpen,
  Gauge,
  PanelsTopLeft,
  LayoutGrid,
  Menu,
  MessageSquare,
  Minus,
  Pin,
  PinOff,
  Settings,
  Shrink,
  Square,
  Maximize2,
  Pencil,
  Star,
  Undo2,
  X,
} from 'lucide-react'
import { memo, useEffect, useRef, useState, type FormEvent, type ReactNode, type RefObject } from 'react'
import { getPlatform } from '../lib/platforms/registry'
import { SAVED_NAME_MAX } from '../lib/storage'
import { ui } from '../lib/uiLabels'
import { usePortalThemeProps } from './ui/portalTheme'
import type { ChromeEdge, LayoutTemplate, PlatformId, PopoutInfo, SavedStream, WatchMode } from '../types'
import { outwardSide, skipFocusReturnAfterPointer, Tip } from './ui/Tip'

type Props = {
  mode: WatchMode
  onMode: (mode: WatchMode) => void
  templates: LayoutTemplate[]
  onApplyTemplate: (id: string) => void
  onSaveTemplate: (name: string) => void
  onDeleteTemplate: (id: string) => void
  onPreset: (preset: '1x1' | '1x2' | '2x2' | '1+3') => void
  popped: PopoutInfo[]
  onDockAll: () => void
  onDock: (channel: string, kind: 'stream' | 'chat', platform: PlatformId) => void
  savedStreams: SavedStream[]
  onOpenSaved: (platform: PlatformId, channel: string) => void
  onUnsaveStream: (platform: PlatformId, channel: string) => void
  /** Empty or undefined `name` restores the default `Platform · channel` label. */
  onRenameSaved: (platform: PlatformId, channel: string, name?: string) => void
  seeThrough: boolean
  onSeeThrough: (value: boolean) => void
  windowLocked: boolean
  onWindowLocked: (value: boolean) => void
  ghost: boolean
  onGhost: (value: boolean) => void
  pinned: boolean
  onPinned: (value: boolean) => void
  /** Fullscreen or Ghost overlay can hide the bar, so Pin toolbar has an effect. */
  autoHideMode: boolean
  fullscreen: boolean
  chatOpen: boolean
  onToggleChat: () => void
  onFullscreen: () => void
  onAddStream: (value: string) => { ok: boolean; error?: string }
  onSettings: () => void
  searchRef: RefObject<HTMLInputElement | null>
  chromeEdge: ChromeEdge
  onMenuOpen: (open: boolean) => void
  onSearchBlur: () => void
}

const PRESETS: Array<['1x1' | '1x2' | '2x2' | '1+3', string]> = [
  ['1x1', '1'],
  ['1x2', '1×2'],
  ['2x2', '2×2'],
  ['1+3', '1+3'],
]

const savedKey = (item: SavedStream) => `${item.platform}:${item.channel}`
const savedDefaultLabel = (item: SavedStream) => `${getPlatform(item.platform).label} · ${item.channel}`

const MODES: Array<{ value: WatchMode; label: string; icon: ReactNode }> = [
  { value: 'standard', label: ui.standard, icon: <LayoutGrid size={14} /> },
  { value: 'focus', label: ui.focus, icon: <Focus size={14} /> },
  { value: 'performance', label: ui.performance, icon: <Gauge size={14} /> },
]

/**
 * The desk chrome. Buttons on the bar do something immediately; everything else lives in the
 * Layout, Redock, and ☰ menus. Left/Right chrome shows the same controls as icons.
 */
export const ChromeBar = memo(function ChromeBar({
  mode,
  onMode,
  templates,
  onApplyTemplate,
  onSaveTemplate,
  onDeleteTemplate,
  onPreset,
  popped,
  onDockAll,
  onDock,
  savedStreams,
  onOpenSaved,
  onUnsaveStream,
  onRenameSaved,
  seeThrough,
  onSeeThrough,
  windowLocked,
  onWindowLocked,
  ghost,
  onGhost,
  pinned,
  onPinned,
  autoHideMode,
  fullscreen,
  chatOpen,
  onToggleChat,
  onFullscreen,
  onAddStream,
  onSettings,
  searchRef,
  chromeEdge,
  onMenuOpen,
  onSearchBlur,
}: Props) {
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [maximized, setMaximized] = useState(true)
  const [layoutName, setLayoutName] = useState('')
  const [savedMenuOpen, setSavedMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState<{ key: string; draft: string } | null>(null)
  // Mirrors `renaming` but is cleared synchronously, so a blur fired while the field unmounts
  // (after Esc, ×, or a save) can never commit a stale draft a second time.
  const renamingRef = useRef(renaming)
  renamingRef.current = renaming
  const vertical = chromeEdge === 'left' || chromeEdge === 'right'
  const flyoutSide = outwardSide(chromeEdge)
  const portal = usePortalThemeProps()
  const menuProps = {
    className: 'menu',
    ...portal,
    'data-hit': true,
    side: flyoutSide,
    sideOffset: 8,
    collisionPadding: 12,
    onCloseAutoFocus: skipFocusReturnAfterPointer,
  }

  const startRename = (item: SavedStream) => {
    setRenaming({ key: savedKey(item), draft: item.name ?? '' })
  }

  const endRename = (save: boolean) => {
    const current = renamingRef.current
    renamingRef.current = null
    if (!current) return
    const item = savedStreams.find((s) => savedKey(s) === current.key)
    if (save && item) onRenameSaved(item.platform, item.channel, current.draft)
    setRenaming(null)
  }

  const setSavedOpen = (open: boolean) => {
    // Closing (click away, trigger, or opening a stream) keeps whatever was typed, like a blur.
    if (!open) endRename(true)
    setSavedMenuOpen(open)
    onMenuOpen(open)
  }

  useEffect(() => {
    // Keep the Maximize/Restore icon honest after OS snaps and double-clicks on the bar.
    const sync = () => void window.vesper?.isMaximized().then((value) => setMaximized(Boolean(value)))
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const result = onAddStream(query)
    if (result.ok) {
      setQuery('')
      setError(null)
    } else setError(result.error ?? 'Could not add')
  }

  return (
    <header className="chrome-bar" data-hit>
      <div className="chrome-bar__drag">
        <span className="chrome-mark" aria-hidden="true">
          <svg
            viewBox="0 0 64 64"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* V/A monogram under a crescent and star (src/assets/vesper-mark.svg). */}
            <path d="M12 16 25.5 32M10 32h44M22 32 11.5 58M24.5 32 32 58 51.5 16M44.1 32 52.5 58" />
            <path
              d="M31.20 12.91A6.6 6.6 0 1 0 37.81 21.44A5.4 5.4 0 0 1 31.20 12.91Z"
              fill="currentColor"
              stroke="none"
            />
            <path
              d="M42.50 3.90 L43.35 7.65 L47.10 8.50 L43.35 9.35 L42.50 13.10 L41.65 9.35 L37.90 8.50 L41.65 7.65Z"
              fill="currentColor"
              stroke="none"
            />
          </svg>
        </span>
        <span className="chrome-wordmark">{ui.appName}</span>
      </div>

      <form className="chrome-search" onSubmit={submit}>
        <input
          ref={searchRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={vertical ? '+' : ui.searchAdd}
          aria-label={ui.addStream}
          onBlur={onSearchBlur}
        />
        {error && <span className="chrome-error">{error}</span>}
      </form>

      <div className="chrome-actions">
        <ToggleGroup.Root
          className="mode-group"
          type="single"
          value={mode}
          onValueChange={(value) => {
            if (value) onMode(value as WatchMode)
          }}
        >
          {MODES.map((m) => (
            <Tip key={m.value} label={m.label} side={flyoutSide}>
              <ToggleGroup.Item
                className={`mode-btn${vertical ? ' mode-btn--icon' : ''}${mode === m.value ? ' is-on' : ''}`}
                value={m.value}
                aria-label={m.label}
              >
                {vertical ? m.icon : m.label}
              </ToggleGroup.Item>
            </Tip>
          ))}
        </ToggleGroup.Root>

        <DropdownMenu.Root onOpenChange={onMenuOpen}>
          <Tip label={ui.changeLayout} side={flyoutSide}>
            <DropdownMenu.Trigger asChild>
              <button type="button" className={vertical ? 'icon-btn' : 'text-btn'} aria-label={ui.changeLayout}>
                <PanelsTopLeft size={13} />
                {!vertical && ui.changeLayout}
              </button>
            </DropdownMenu.Trigger>
          </Tip>
          <DropdownMenu.Portal>
            <DropdownMenu.Content {...menuProps}>
              <DropdownMenu.Label className="menu__label">{ui.changeLayout}</DropdownMenu.Label>
              <div className="menu-presets">
                {PRESETS.map(([id, label]) => (
                  <DropdownMenu.Item key={id} className="menu__item menu__item--preset" onSelect={() => onPreset(id)}>
                    {label}
                  </DropdownMenu.Item>
                ))}
              </div>
              <DropdownMenu.Separator className="menu__sep" />
              <DropdownMenu.Label className="menu__label">{ui.layoutTemplates}</DropdownMenu.Label>
              {templates.length === 0 && (
                <DropdownMenu.Item className="menu__item muted" disabled>
                  No saved layouts
                </DropdownMenu.Item>
              )}
              {templates.map((template) => (
                <DropdownMenu.Item key={template.id} className="menu__item" onSelect={() => onApplyTemplate(template.id)}>
                  {template.name}
                </DropdownMenu.Item>
              ))}
              <div className="menu-inline" onPointerDown={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                <input value={layoutName} onChange={(e) => setLayoutName(e.target.value)} placeholder={ui.layoutName} />
                <button
                  type="button"
                  className="text-btn"
                  disabled={!layoutName.trim()}
                  onClick={() => {
                    onSaveTemplate(layoutName)
                    setLayoutName('')
                  }}
                >
                  {ui.save}
                </button>
              </div>
              {templates.map((template) => (
                <DropdownMenu.Item key={`del-${template.id}`} className="menu__item danger" onSelect={() => onDeleteTemplate(template.id)}>
                  {ui.deleteLayout} {template.name}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        <Tip label={chatOpen ? ui.hideChat : ui.openChat} side={flyoutSide}>
          <button
            type="button"
            className={`icon-btn${chatOpen ? ' is-on' : ''}`}
            aria-label={chatOpen ? ui.hideChat : ui.openChat}
            aria-pressed={chatOpen}
            onClick={onToggleChat}
          >
            <MessageSquare size={14} />
          </button>
        </Tip>

        <Tip label={ui.seeThroughWindows} side={flyoutSide}>
          <button
            type="button"
            className={`icon-btn${seeThrough ? ' is-on' : ''}`}
            aria-label={ui.seeThroughWindows}
            aria-pressed={seeThrough}
            onClick={() => onSeeThrough(!seeThrough)}
          >
            {seeThrough ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
        </Tip>

        <Tip label={ui.fullscreen} side={flyoutSide}>
          <button
            type="button"
            className={`icon-btn${fullscreen ? ' is-on' : ''}`}
            aria-label={ui.fullscreen}
            aria-pressed={fullscreen}
            onClick={onFullscreen}
          >
            {fullscreen ? <Shrink size={14} /> : <Expand size={14} />}
          </button>
        </Tip>

        {popped.length > 0 && (
          <DropdownMenu.Root onOpenChange={onMenuOpen}>
            <Tip label={ui.redock} side={flyoutSide}>
              <DropdownMenu.Trigger asChild>
                <button type="button" className={vertical ? 'icon-btn' : 'text-btn'} aria-label={ui.redock}>
                  <Undo2 size={13} />
                  {!vertical && ui.redock} <span className="badge">{popped.length}</span>
                </button>
              </DropdownMenu.Trigger>
            </Tip>
            <DropdownMenu.Portal>
              <DropdownMenu.Content {...menuProps}>
                <DropdownMenu.Item className="menu__item" onSelect={onDockAll}>
                  {ui.dockAllPopouts}
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="menu__sep" />
                {popped.map((item) => (
                  <DropdownMenu.Item
                    key={`${item.kind}-${item.platform}-${item.channel}`}
                    className="menu__item"
                    onSelect={() => onDock(item.channel, item.kind, item.platform)}
                  >
                    {ui.dockBack} #{item.channel}
                    {item.kind === 'chat' && <span className="muted"> · {ui.chat}</span>}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        )}

        {savedStreams.length > 0 && (
          <DropdownMenu.Root open={savedMenuOpen} onOpenChange={setSavedOpen}>
            <Tip label={ui.saved} side={flyoutSide}>
              <DropdownMenu.Trigger asChild>
                <button type="button" className={vertical ? 'icon-btn' : 'text-btn'} aria-label={ui.saved}>
                  <Star size={13} />
                  {!vertical && ui.saved} <span className="badge">{savedStreams.length}</span>
                </button>
              </DropdownMenu.Trigger>
            </Tip>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                {...menuProps}
                onEscapeKeyDown={(event) => {
                  // Esc cancels an open rename without closing the whole menu.
                  if (!renamingRef.current) return
                  event.preventDefault()
                  endRename(false)
                }}
              >
                {savedStreams.map((item) => {
                  const key = savedKey(item)
                  const fallback = savedDefaultLabel(item)
                  if (renaming?.key === key) {
                    return (
                      // A plain row, not a menu item: Radix must not select it or eat its keystrokes.
                      <div
                        key={key}
                        className="menu-inline menu__saved-edit"
                        onPointerDown={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <input
                          autoFocus
                          value={renaming.draft}
                          maxLength={SAVED_NAME_MAX}
                          placeholder={fallback}
                          aria-label={`${ui.renameSaved} ${fallback}`}
                          onChange={(e) => setRenaming({ key, draft: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              endRename(true)
                            }
                          }}
                          onBlur={() => endRename(true)}
                        />
                        <button
                          type="button"
                          className="icon-btn"
                          aria-label={ui.clearSavedName}
                          // Keep focus in the field, so its blur doesn't save the draft before this clears it.
                          onPointerDown={(e) => e.preventDefault()}
                          onClick={() => {
                            renamingRef.current = null
                            onRenameSaved(item.platform, item.channel, undefined)
                            setRenaming(null)
                          }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )
                  }
                  return (
                    <DropdownMenu.Item
                      key={key}
                      className="menu__item menu__item--saved"
                      // While a row is being renamed, hovering the others must not pull focus out of its field.
                      onPointerMove={(e) => renaming && e.preventDefault()}
                      onPointerLeave={(e) => renaming && e.preventDefault()}
                      onKeyDown={(e) => {
                        if (e.key === 'F2') {
                          e.preventDefault()
                          startRename(item)
                        }
                      }}
                      onSelect={() => onOpenSaved(item.platform, item.channel)}
                    >
                      <span className="menu__saved-name">{item.name ?? fallback}</span>
                      <span className="menu__saved-actions">
                        <button
                          type="button"
                          className="icon-btn"
                          aria-label={`${ui.renameSaved} ${fallback}`}
                          onClick={(event) => {
                            event.stopPropagation()
                            startRename(item)
                          }}
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          aria-label={ui.removeSaved}
                          onClick={(event) => {
                            event.stopPropagation()
                            onUnsaveStream(item.platform, item.channel)
                            setSavedOpen(false)
                          }}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    </DropdownMenu.Item>
                  )
                })}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        )}

        {autoHideMode && (
          <Tip label={pinned ? 'Unpin toolbar' : ui.pinToolbar} side={flyoutSide}>
            <button
              type="button"
              className={`icon-btn${pinned ? ' is-on' : ''}`}
              aria-label={pinned ? 'Unpin toolbar' : ui.pinToolbar}
              aria-pressed={pinned}
              onClick={() => onPinned(!pinned)}
            >
              {pinned ? <Pin size={13} /> : <PinOff size={13} />}
            </button>
          </Tip>
        )}

        <DropdownMenu.Root onOpenChange={onMenuOpen}>
          <Tip label={ui.menu} side={flyoutSide}>
            <DropdownMenu.Trigger asChild>
              <button type="button" className="icon-btn chrome-menu-btn" aria-label={ui.menu}>
                <Menu size={15} />
              </button>
            </DropdownMenu.Trigger>
          </Tip>
          <DropdownMenu.Portal>
            <DropdownMenu.Content {...menuProps}>
              <DropdownMenu.Item className="menu__item" onSelect={onSettings}>
                <Settings size={13} /> {ui.settings}
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="menu__sep" />
              <DropdownMenu.CheckboxItem className="menu__item" checked={ghost} onCheckedChange={(v) => onGhost(Boolean(v))}>
                {ui.ghostOverlay}
              </DropdownMenu.CheckboxItem>
              <DropdownMenu.CheckboxItem className="menu__item" checked={pinned} onCheckedChange={(v) => onPinned(Boolean(v))}>
                {ui.pinToolbar}
              </DropdownMenu.CheckboxItem>
              {seeThrough && (
                <DropdownMenu.CheckboxItem
                  className="menu__item"
                  checked={windowLocked}
                  onCheckedChange={(v) => onWindowLocked(Boolean(v))}
                >
                  {ui.lockWindow}
                </DropdownMenu.CheckboxItem>
              )}
              <DropdownMenu.Separator className="menu__sep" />
              <DropdownMenu.Item className="menu__item" onSelect={() => void window.vesper?.openLogFolder()}>
                <FolderOpen size={13} /> {ui.openLogFolder}
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      <div className="window-controls">
        <Tip label={ui.minimize} side={flyoutSide}>
          <button type="button" className="win-btn" aria-label={ui.minimize} onClick={() => window.vesper?.minimize()}>
            <Minus size={13} />
          </button>
        </Tip>
        <Tip label={maximized ? ui.restore : ui.maximize} side={flyoutSide}>
          <button
            type="button"
            className="win-btn"
            aria-label={maximized ? ui.restore : ui.maximize}
            onClick={async () => {
              const next = await window.vesper?.maximize()
              setMaximized(Boolean(next))
            }}
          >
            {maximized ? <Square size={11} /> : <Maximize2 size={12} />}
          </button>
        </Tip>
        <Tip label={ui.close} side={flyoutSide}>
          <button type="button" className="win-btn win-btn--close" aria-label={ui.close} onClick={() => window.vesper?.close()}>
            <X size={13} />
          </button>
        </Tip>
      </div>
    </header>
  )
})
