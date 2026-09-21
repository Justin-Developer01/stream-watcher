import { useEffect, useRef, useState, type FormEvent, type MouseEvent as ReactMouseEvent } from 'react'
import type { ChatDock, ChatFloatPosition, ChatMessage } from '../types'

type Props = {
  collapsed: boolean
  onToggleCollapsed: () => void
  dock: ChatDock
  onDockChange: (dock: ChatDock) => void
  float: ChatFloatPosition
  onFloatChange: (float: ChatFloatPosition) => void
  channels: string[]
  activeChannel: string | null
  onChannelChange: (channel: string) => void
  messages: ChatMessage[]
  status: 'idle' | 'connecting' | 'connected' | 'error'
  error: string | null
  canSend: boolean
  username: string | null
  onSend: (text: string) => Promise<{ ok: boolean; error?: string }>
  onPopout: () => void
  compact?: boolean
}

export function ChatPanel({
  collapsed,
  onToggleCollapsed,
  dock,
  onDockChange,
  float,
  onFloatChange,
  channels,
  activeChannel,
  onChannelChange,
  messages,
  status,
  error,
  canSend,
  username,
  onSend,
  onPopout,
  compact = false,
}: Props) {
  const [draft, setDraft] = useState('')
  const [sendError, setSendError] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    ox: number
    oy: number
    sx: number
    sy: number
  } | null>(null)

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages.length, activeChannel])

  useEffect(() => {
    if (!channels.length) return
    if (!activeChannel || !channels.includes(activeChannel)) {
      onChannelChange(channels[0])
    }
  }, [channels, activeChannel, onChannelChange])

  const floatRef = useRef(float)
  floatRef.current = float

  useEffect(() => {
    const onMove = (event: globalThis.MouseEvent) => {
      const drag = dragRef.current
      if (!drag) return
      onFloatChange({
        ...floatRef.current,
        x: Math.max(8, drag.sx + (event.clientX - drag.ox)),
        y: Math.max(8, drag.sy + (event.clientY - drag.oy)),
      })
    }
    const onUp = () => {
      dragRef.current = null
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [onFloatChange])

  const startFloatDrag = (event: ReactMouseEvent) => {
    if (dock !== 'float') return
    dragRef.current = {
      ox: event.clientX,
      oy: event.clientY,
      sx: float.x,
      sy: float.y,
    }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSendError(null)
    const result = await onSend(draft)
    if (result.ok) {
      setDraft('')
    } else {
      setSendError(result.error ?? 'Could not send')
    }
  }

  if (collapsed && !compact) {
    return (
      <aside className="chat-panel chat-panel--collapsed" aria-label="Chat collapsed">
        <button
          type="button"
          className="panel-toggle panel-toggle--expand"
          onClick={onToggleCollapsed}
          title="Expand chat"
          aria-label="Expand chat"
        >
          ‹
        </button>
        <span className="collapsed-label">Chat</span>
        {activeChannel && <span className="collapsed-channel">#{activeChannel}</span>}
      </aside>
    )
  }

  const panelClass = [
    'chat-panel',
    'chat-panel--thin',
    compact ? 'chat-panel--popout' : '',
    dock === 'float' && !compact ? 'chat-panel--float' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const style =
    dock === 'float' && !compact
      ? {
          left: float.x,
          top: float.y,
          width: float.width,
          height: float.height,
        }
      : undefined

  return (
    <aside className={panelClass} style={style}>
      <header className="chat-panel__header">
        <div
          className={`chat-panel__heading${dock === 'float' && !compact ? ' is-draggable' : ''}`}
          onMouseDown={startFloatDrag}
        >
          <div className="chat-panel__title-row">
            <h2>Chat</h2>
            <span className="chat-status-dot" data-status={status} title={status} />
            {username && <span className="chat-user-tag">{username}</span>}
          </div>
          <div className="chat-panel__tools">
            {!compact && (
              <>
                <select
                  className="dock-select"
                  value={dock}
                  onChange={(e) => onDockChange(e.target.value as ChatDock)}
                  title="Move chat"
                  aria-label="Move chat"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <option value="right">Right</option>
                  <option value="left">Left</option>
                  <option value="bottom">Bottom</option>
                  <option value="float">Float</option>
                </select>
                <button
                  type="button"
                  className="tool-btn"
                  onClick={onPopout}
                  title="Pop out chat"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  ↗
                </button>
                <button
                  type="button"
                  className="panel-toggle"
                  onClick={onToggleCollapsed}
                  title="Collapse chat"
                  aria-label="Collapse chat"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  ›
                </button>
              </>
            )}
          </div>
        </div>

        <div className="chat-channel-picker" role="tablist" aria-label="Chat channel">
          {!channels.length && <p className="hint">Open a stream to choose a chat.</p>}
          {channels.map((channel) => {
            const selected = channel === activeChannel
            return (
              <button
                key={channel}
                type="button"
                role="tab"
                aria-selected={selected}
                className={`chat-channel-chip${selected ? ' is-active' : ''}`}
                onClick={() => onChannelChange(channel)}
              >
                #{channel}
              </button>
            )
          })}
        </div>
      </header>

      <div className="chat-panel__messages" ref={listRef}>
        {messages.map((message) => (
          <div key={message.id} className="chat-line">
            <span className="chat-line__user" style={{ color: message.color || '#8fd3ff' }}>
              {message.user}
            </span>
            <span className="chat-line__text">{message.text}</span>
          </div>
        ))}
        {!messages.length && <p className="muted chat-empty">No messages yet.</p>}
      </div>

      {(error || sendError) && <p className="chat-error">{sendError || error}</p>}

      <form className="chat-panel__composer" onSubmit={handleSubmit}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={
            canSend
              ? activeChannel
                ? `#${activeChannel}`
                : 'Select channel'
              : 'Login to chat'
          }
          disabled={!canSend || !activeChannel}
          maxLength={500}
        />
        <button type="submit" disabled={!canSend || !activeChannel || !draft.trim()}>
          Send
        </button>
      </form>
    </aside>
  )
}
