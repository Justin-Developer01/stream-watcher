import * as Popover from '@radix-ui/react-popover'
import { PictureInPicture2, Send, Smile, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { badgeUrl, emoteUrl } from '../lib/twitch'
import { ui } from '../lib/uiLabels'
import type { ChatDock, ChatMessage } from '../types'
import { usePortalThemeProps } from './ui/portalTheme'
import { Tip } from './ui/Tip'

const QUICK_EMOTES = ['Kappa', 'LUL', 'PogChamp', 'Kreygasm', 'BibleThump', 'ResidentSleeper', 'CoolStoryBob']

type Props = {
  dock: ChatDock
  channels: string[]
  activeChannel: string | null
  onChannelChange: (channel: string) => void
  messages: ChatMessage[]
  status: string
  error: string | null
  canSend: boolean
  username: string | null
  fontFamily: string
  fontSize: number
  onSend: (text: string) => Promise<{ ok: boolean; error?: string }>
  /** Omitted in the chat pop-out window, which has no drawer to move or pop out. */
  onDockChange?: (dock: ChatDock) => void
  onHide: () => void
  onPopout?: () => void
}

function renderText(message: ChatMessage) {
  if (!message.emotes.length) return message.text
  const parts: Array<{ key: string; node: ReactNode }> = []
  let cursor = 0
  message.emotes.forEach((emote, i) => {
    if (emote.start > cursor) {
      parts.push({ key: `t${i}`, node: message.text.slice(cursor, emote.start) })
    }
    parts.push({
      key: `e${emote.id}${i}`,
      node: (
        <img
          className="chat-emote"
          src={emoteUrl(emote.id)}
          alt={message.text.slice(emote.start, emote.end + 1)}
        />
      ),
    })
    cursor = emote.end + 1
  })
  if (cursor < message.text.length) parts.push({ key: 'tail', node: message.text.slice(cursor) })
  return parts.map((p) => <span key={p.key}>{p.node}</span>)
}

export function ChatDrawer({
  dock,
  channels,
  activeChannel,
  onChannelChange,
  messages,
  status,
  error,
  canSend,
  username,
  fontFamily,
  fontSize,
  onSend,
  onDockChange,
  onHide,
  onPopout,
}: Props) {
  const portal = usePortalThemeProps()
  const [draft, setDraft] = useState('')
  const [sendError, setSendError] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length, activeChannel])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const result = await onSend(draft)
    if (result.ok) setDraft('')
    else setSendError(result.error ?? 'Could not send')
  }

  return (
    <aside className={`chat-drawer chat-drawer--${dock}`} style={{ fontFamily, fontSize }} data-hit>
      <header className="chat-drawer__bar">
        <strong>{ui.chat}</strong>
        <span className={`dot dot--${status}`} />
        {username && <span className="muted tiny">{username}</span>}
        <div className="chat-drawer__tools">
          {onDockChange && (
            <select
              className="chrome-select"
              value={dock}
              onChange={(e) => onDockChange(e.target.value as ChatDock)}
              aria-label="Move chat"
            >
              <option value="left">{ui.slideLeft}</option>
              <option value="right">{ui.slideRight}</option>
              <option value="bottom">{ui.dockBottom}</option>
              <option value="float">{ui.float}</option>
            </select>
          )}
          {onPopout && (
            <Tip label={ui.popOutChat}>
              <button type="button" className="icon-btn" onClick={onPopout}>
                <PictureInPicture2 size={13} />
              </button>
            </Tip>
          )}
          <Tip label={ui.hideChat}>
            <button type="button" className="icon-btn" onClick={onHide}>
              <X size={13} />
            </button>
          </Tip>
        </div>
      </header>

      <div className="chat-chips">
        {channels.map((channel) => (
          <button
            key={channel}
            type="button"
            className={`chip${channel === activeChannel ? ' is-on' : ''}`}
            onClick={() => onChannelChange(channel)}
          >
            #{channel}
          </button>
        ))}
      </div>

      <div className="chat-lines" ref={listRef}>
        {messages.map((message) => (
          <div key={message.id} className="chat-line">
            <span className="chat-line__badges">
              {message.badges.map((badge) => (
                <img
                  key={`${badge.set}-${badge.version}`}
                  className="chat-badge"
                  src={badgeUrl(badge.set, badge.version)}
                  alt={badge.set}
                />
              ))}
            </span>
            <span className="chat-line__user" style={{ color: message.color || 'var(--accent)' }}>
              {message.user}
            </span>
            <span className="chat-line__text">{renderText(message)}</span>
            <time className="chat-line__time">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </time>
          </div>
        ))}
        {!messages.length && <p className="muted">Messages will appear here.</p>}
      </div>

      {(error || sendError) && <p className="field-error">{sendError || error}</p>}

      <form className="chat-composer" onSubmit={submit}>
        {canSend && (
          <Popover.Root>
            <Popover.Trigger asChild>
              <button type="button" className="icon-btn" aria-label={ui.emotes}>
                <Smile size={14} />
              </button>
            </Popover.Trigger>
            <Popover.Portal container={document.body}>
              <Popover.Content className="emote-pop" {...portal} data-hit side="top" sideOffset={6} collisionPadding={12} avoidCollisions>
                {QUICK_EMOTES.map((emote) => (
                  <button key={emote} type="button" onClick={() => setDraft((d) => `${d}${d ? ' ' : ''}${emote}`)}>
                    {emote}
                  </button>
                ))}
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        )}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={canSend ? (activeChannel ? `#${activeChannel}` : ui.openChat) : ui.loginToTwitch}
          disabled={!canSend || !activeChannel}
          maxLength={500}
        />
        <button type="submit" className="text-btn" disabled={!canSend || !draft.trim()}>
          <Send size={13} /> {ui.send}
        </button>
      </form>
    </aside>
  )
}
