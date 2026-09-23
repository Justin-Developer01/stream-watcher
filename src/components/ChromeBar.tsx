import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as ToggleGroup from '@radix-ui/react-toggle-group'
import {
  Eye,
  EyeOff,
  LayoutGrid,
  LogIn,
  Maximize2,
  Menu,
  Minus,
  MoreHorizontal,
  Pin,
  PinOff,
  Square,
  X,
} from 'lucide-react'
import { useState, type FormEvent, type RefObject } from 'react'
import { ui } from '../lib/uiLabels'
import type { ChromeEdge, LayoutTemplate, PopoutInfo, WatchMode } from '../types'
import { outwardSide, Tip } from './ui/Tip'

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
  onDock: (channel: string, kind: 'stream' | 'chat') => void
  seeThrough: boolean
  onSeeThrough: (value: boolean) => void
  ghost: boolean
  onGhost: (value: boolean) => void
  pinned: boolean
  onPinned: (value: boolean) => void
  chatOpen: boolean
  chatChannel: string | null
  onOpenChat: () => void
  onFullscreen: () => void
  onAddStream: (value: string) => { ok: boolean; error?: string }
  onLogin: () => void
  onSettings: () => void
  isLoggedIn: boolean
  displayName: string | null
  searchRef: RefObject<HTMLInputElement | null>
  chromeEdge: ChromeEdge
}

export function ChromeBar({
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
  seeThrough,
  onSeeThrough,
  ghost,
  onGhost,
  pinned,
  onPinned,
  chatOpen,
  chatChannel,
  onOpenChat,
  onFullscreen,
  onAddStream,
  onLogin,
  onSettings,
  isLoggedIn,
  displayName,
  searchRef,
  chromeEdge,
}: Props) {
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [maximized, setMaximized] = useState(true)
  const [layoutName, setLayoutName] = useState('')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const result = onAddStream(query)
    if (result.ok) {
      setQuery('')
      setError(null)
    } else setError(result.error ?? 'Could not add')
  }

  const streamPops = popped.filter((p) => p.kind === 'stream')
  const flyoutSide = outwardSide(chromeEdge)

  return (
    <header className="chrome-bar" data-hit>
      <div className="chrome-bar__drag">
        <span className="chrome-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M3 16c3.2-.8 5.5-3.6 9-3.6S17.8 15.2 21 16"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path d="M4 19h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            <path
              d="M12 4.2l.72 2.2h2.32l-1.88 1.36.72 2.2L12 8.6l-1.88 1.36.72-2.2-1.88-1.36h2.32L12 4.2z"
              fill="currentColor"
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
          placeholder={ui.searchAdd}
          aria-label={ui.addStream}
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
        <Tip label={ui.standard} side={flyoutSide}>
          <ToggleGroup.Item className={`mode-btn${mode === 'standard' ? ' is-on' : ''}`} value="standard">
            {ui.standard}
          </ToggleGroup.Item>
        </Tip>
        <Tip label={ui.focus} side={flyoutSide}>
          <ToggleGroup.Item className={`mode-btn${mode === 'focus' ? ' is-on' : ''}`} value="focus">
            {ui.focus}
          </ToggleGroup.Item>
        </Tip>
        <Tip label={ui.performance} side={flyoutSide}>
          <ToggleGroup.Item className={`mode-btn${mode === 'performance' ? ' is-on' : ''}`} value="performance">
            {ui.performance}
          </ToggleGroup.Item>
        </Tip>
      </ToggleGroup.Root>

      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button type="button" className="text-btn">
            <LayoutGrid size={13} /> {ui.changeLayout}
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content className="menu" data-hit side={flyoutSide} sideOffset={8} collisionPadding={12}>
            {templates.length === 0 && <DropdownMenu.Item className="menu__item muted" disabled>No saved layouts</DropdownMenu.Item>}
            {templates.map((template) => (
              <DropdownMenu.Item key={template.id} className="menu__item" onSelect={() => onApplyTemplate(template.id)}>
                {template.name}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <Tip label={ui.dockAllPopouts} side={flyoutSide}>
        <button type="button" className="text-btn" onClick={onDockAll} disabled={!popped.length}>
          {ui.dockAllPopouts}
        </button>
      </Tip>

      <Tip label={ui.seeThroughWindows} side={flyoutSide}>
        <button
          type="button"
          className={`icon-btn${seeThrough ? ' is-on' : ''}`}
          onClick={() => onSeeThrough(!seeThrough)}
        >
          {seeThrough ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>
      </Tip>

      {streamPops.length > 0 && (
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button type="button" className="text-btn">
              {ui.redock} <span className="badge">{streamPops.length}</span>
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className="menu" data-hit side={flyoutSide} sideOffset={8} collisionPadding={12}>
              {streamPops.map((item) => (
                <DropdownMenu.Item
                  key={`${item.kind}-${item.channel}`}
                  className="menu__item"
                  onSelect={() => onDock(item.channel, item.kind)}
                >
                  {ui.dockBack} #{item.channel}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      )}

      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button type="button" className="icon-btn" aria-label={ui.more}>
            <MoreHorizontal size={15} />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content className="menu" data-hit side={flyoutSide} sideOffset={8} collisionPadding={12}>
            <DropdownMenu.Item className="menu__item" onSelect={onFullscreen}>
              {ui.fullscreen}
            </DropdownMenu.Item>
            <DropdownMenu.Item className="menu__item" onSelect={onOpenChat}>
              {chatOpen ? ui.hideChat : chatChannel ? ui.openChannelChat(chatChannel) : ui.openChat}
            </DropdownMenu.Item>
            <DropdownMenu.Item className="menu__item" onSelect={() => onGhost(!ghost)}>
              {ui.ghostOverlay}
            </DropdownMenu.Item>
            <DropdownMenu.Item className="menu__item" onSelect={() => onPinned(!pinned)}>
              {ui.pinToolbar}
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button type="button" className="icon-btn" aria-label={ui.menu}>
            <Menu size={15} />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content className="menu" data-hit side={flyoutSide} sideOffset={8} collisionPadding={12}>
            <DropdownMenu.Item className="menu__item" onSelect={onLogin}>
              <LogIn size={13} /> {isLoggedIn ? displayName : ui.loginToTwitch}
            </DropdownMenu.Item>
            <DropdownMenu.Item className="menu__item" onSelect={onSettings}>
              {ui.settings}
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="menu__sep" />
            <DropdownMenu.Label className="menu__label">{ui.layoutTemplates}</DropdownMenu.Label>
            <div className="menu-inline" onPointerDown={(e) => e.stopPropagation()}>
              <input
                value={layoutName}
                onChange={(e) => setLayoutName(e.target.value)}
                placeholder={ui.layoutName}
              />
              <button
                type="button"
                className="text-btn"
                onClick={() => {
                  onSaveTemplate(layoutName)
                  setLayoutName('')
                }}
              >
                {ui.save}
              </button>
            </div>
            {templates.map((template) => (
              <DropdownMenu.Item
                key={template.id}
                className="menu__item"
                onSelect={() => onDeleteTemplate(template.id)}
              >
                {ui.deleteLayout} {template.name}
              </DropdownMenu.Item>
            ))}
            <DropdownMenu.Separator className="menu__sep" />
            <DropdownMenu.Label className="menu__label">{ui.changeLayout}</DropdownMenu.Label>
            <DropdownMenu.Item className="menu__item" onSelect={() => onPreset('1x1')}>
              1
            </DropdownMenu.Item>
            <DropdownMenu.Item className="menu__item" onSelect={() => onPreset('1x2')}>
              1×2
            </DropdownMenu.Item>
            <DropdownMenu.Item className="menu__item" onSelect={() => onPreset('2x2')}>
              2×2
            </DropdownMenu.Item>
            <DropdownMenu.Item className="menu__item" onSelect={() => onPreset('1+3')}>
              1+3
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <Tip label={pinned ? 'Unpin toolbar' : ui.pinToolbar} side={flyoutSide}>
        <button type="button" className={`icon-btn${pinned ? ' is-on' : ''}`} onClick={() => onPinned(!pinned)}>
          {pinned ? <Pin size={13} /> : <PinOff size={13} />}
        </button>
      </Tip>
      </div>

      <div className="window-controls">
        <Tip label={ui.minimize} side={flyoutSide}>
          <button type="button" className="win-btn" onClick={() => window.vesper?.minimize()}>
            <Minus size={13} />
          </button>
        </Tip>
        <Tip label={maximized ? ui.restore : ui.maximize} side={flyoutSide}>
          <button
            type="button"
            className="win-btn"
            onClick={async () => {
              const next = await window.vesper?.maximize()
              setMaximized(Boolean(next))
            }}
          >
            {maximized ? <Square size={11} /> : <Maximize2 size={12} />}
          </button>
        </Tip>
        <Tip label={ui.close} side={flyoutSide}>
          <button type="button" className="win-btn win-btn--close" onClick={() => window.vesper?.close()}>
            <X size={13} />
          </button>
        </Tip>
      </div>
    </header>
  )
}
