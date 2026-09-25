import * as Popover from '@radix-ui/react-popover'
import { PictureInPicture2, Send, Smile, X } from 'lucide-react'
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import { useChat } from '../hooks/useChat'
import { useChatAssets } from '../hooks/useChatAssets'
import { emoteUrl } from '../lib/chat/parse'
import type { Emote } from '../lib/chat/types'
import { ui } from '../lib/uiLabels'
import type { ChatDock } from '../types'
import { ChatRow, type LineContext } from './chat/ChatLine'
import { usePortalThemeProps } from './ui/portalTheme'
import { Tip } from './ui/Tip'

const EmotePicker = lazy(() => import('./chat/EmotePicker').then((m) => ({ default: m.EmotePicker })))

const EMOJI_FONTS = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji"'
const MAX_CHARS = 500

/** Well-known global emotes, shown when Helix cannot list them (e.g. the token is missing a scope). */
const FALLBACK_GLOBAL: Array<[string, string]> = [
  ['25', 'Kappa'],
  ['425618', 'LUL'],
  ['305954156', 'PogChamp'],
  ['41', 'Kreygasm'],
  ['86', 'BibleThump'],
  ['245', 'ResidentSleeper'],
  ['123171', 'CoolStoryBob'],
  ['354', '4Head'],
  ['64138', 'SeemsGood'],
  ['58765', 'NotLikeThis'],
  ['30259', 'HeyGuys'],
  ['81274', 'VoHiYo'],
  ['33', 'DansGame'],
  ['360', 'FailFish'],
  ['22639', 'BabyRage'],
]

type Props = {
  dock: ChatDock
  channels: string[]
  activeChannel: string | null
  onChannelChange: (channel: string) => void
  username: string | null
  accessToken: string | null
  clientId: string
  theme: 'dark' | 'light'
  fontFamily: string
  fontSize: number
  reconnectNonce?: number
  /** Omitted in the chat pop-out window, which has no drawer to move or pop out. */
  onDockChange?: (dock: ChatDock) => void
  onHide: () => void
  onPopout?: () => void
}

export function ChatDrawer({
  dock,
  channels,
  activeChannel,
  onChannelChange,
  username,
  accessToken,
  clientId,
  theme,
  fontFamily,
  fontSize,
  reconnectNonce,
  onDockChange,
  onHide,
  onPopout,
}: Props) {
  const portal = usePortalThemeProps()
  const canSend = Boolean(username && accessToken)
  const assets = useChatAssets({ clientId, accessToken, channels, theme })
  const assetsRef = useRef(assets)
  assetsRef.current = assets
  const parseOptions = useCallback(
    (channel: string, self: boolean) => ({
      cheermotes: assetsRef.current.cheermotesFor(channel),
      emoteNames: self ? assetsRef.current.emoteNamesFor(channel) : null,
      theme,
    }),
    [theme],
  )
  const chat = useChat({ channels, username, accessToken, reconnectNonce, parseOptions })
  const events = chat.eventsFor(activeChannel)
  const room = chat.roomStateFor(activeChannel)

  const [draft, setDraft] = useState('')
  const [sendError, setSendError] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const historyRef = useRef<string[]>([])
  const historyIndex = useRef(-1)
  const completion = useRef<{ start: number; matches: string[]; index: number } | null>(null)

  const insert = useCallback((word: string) => {
    setDraft((d) => `${d}${d && !d.endsWith(' ') ? ' ' : ''}${word} `)
    inputRef.current?.focus()
  }, [])

  const ctx = useMemo<LineContext>(
    () => ({
      theme,
      myLogin: username?.toLowerCase() ?? null,
      badges: assets.badgesFor(activeChannel),
      cheermotes: assets.cheermotesFor(activeChannel),
      onName: (name) => insert(`@${name}`),
    }),
    [theme, username, assets, activeChannel, insert],
  )

  const emotes = useMemo(() => {
    const sets = assets.emotesFor(activeChannel)
    const global: Emote[] = sets.global.length
      ? sets.global
      : FALLBACK_GLOBAL.map(([id, name]) => ({ id, name, url: emoteUrl(id, theme), source: 'global' }))
    return { ...sets, global }
  }, [assets, activeChannel, theme])

  // Scroll: stick to the bottom unless the reader scrolled up (Twitch pauses chat then).
  const listRef = useRef<HTMLDivElement>(null)
  const [paused, setPaused] = useState(false)
  const pausedRef = useRef(false)
  const onScroll = () => {
    const el = listRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 32
    if (pausedRef.current === !atBottom) return
    pausedRef.current = !atBottom
    setPaused(!atBottom)
  }
  const toBottom = () => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
    pausedRef.current = false
    setPaused(false)
  }
  useLayoutEffect(() => {
    if (!pausedRef.current && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [events, activeChannel])
  useEffect(() => {
    toBottom()
  }, [activeChannel])

  useEffect(() => {
    if (!sendError) return
    const t = window.setTimeout(() => setSendError(null), 5000)
    return () => window.clearTimeout(t)
  }, [sendError])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const text = draft
    if (!text.trim()) return
    const result = await chat.sendMessage(text, activeChannel)
    if (result.ok) {
      historyRef.current = [text, ...historyRef.current.filter((h) => h !== text)].slice(0, 30)
      historyIndex.current = -1
      setDraft('')
      setSendError(null)
      toBottom()
    } else setSendError(result.error ?? 'Could not send')
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const input = event.currentTarget
    if (event.key === 'Tab') {
      // Tab completes emote names and @chatters, cycling on repeat presses.
      event.preventDefault()
      const caret = input.selectionStart ?? draft.length
      let state = completion.current
      if (!state) {
        const start = draft.lastIndexOf(' ', caret - 1) + 1
        const word = draft.slice(start, caret)
        if (!word) return
        const lower = word.replace(/^@/, '').toLowerCase()
        const matches = word.startsWith('@')
          ? chat.recentChatters(activeChannel).filter((n) => n.toLowerCase().startsWith(lower)).map((n) => `@${n}`)
          : [...new Set([...emotes.user, ...emotes.channel, ...emotes.global].map((e) => e.name))]
              .filter((n) => n.toLowerCase().startsWith(lower))
              .sort((a, b) => a.length - b.length || a.localeCompare(b))
        if (!matches.length) return
        state = { start, matches, index: -1 }
      }
      state.index = (state.index + (event.shiftKey ? -1 : 1) + state.matches.length) % state.matches.length
      completion.current = state
      const end = draft.indexOf(' ', state.start)
      const rest = end === -1 ? '' : draft.slice(end)
      const next = `${draft.slice(0, state.start)}${state.matches[state.index]}${rest || ' '}`
      setDraft(next)
      return
    }
    completion.current = null
    if (event.key === 'ArrowUp' && historyRef.current.length && (!draft || historyIndex.current >= 0)) {
      event.preventDefault()
      historyIndex.current = Math.min(historyIndex.current + 1, historyRef.current.length - 1)
      setDraft(historyRef.current[historyIndex.current])
    } else if (event.key === 'ArrowDown' && historyIndex.current >= 0) {
      event.preventDefault()
      historyIndex.current -= 1
      setDraft(historyIndex.current >= 0 ? historyRef.current[historyIndex.current] : '')
    }
  }

  const modes = [
    room.slow > 0 ? ui.slowMode(room.slow) : null,
    room.subsOnly ? ui.subsOnly : null,
    room.emoteOnly ? ui.emoteOnly : null,
    room.followersOnly >= 0 ? ui.followersOnly : null,
    room.r9k ? ui.uniqueChat : null,
  ].filter(Boolean)

  return (
    <aside
      className={`chat-drawer chat-drawer--${dock}`}
      style={{ fontFamily: `${fontFamily}, ${EMOJI_FONTS}`, fontSize }}
      data-hit
    >
      <header className="chat-drawer__bar">
        <strong>{ui.chat}</strong>
        <span className={`dot dot--${chat.status}`} title={chat.status} />
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

      {channels.length > 1 && (
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
      )}

      {modes.length > 0 && <div className="chat-modes muted tiny">{modes.join(' · ')}</div>}

      <div className="chat-lines-wrap">
        <div className="chat-lines" ref={listRef} onScroll={onScroll} role="log" aria-live="polite">
          {events.map((event) => (
            <ChatRow key={event.id} event={event} ctx={ctx} />
          ))}
          {!events.length && <p className="muted">Messages will appear here.</p>}
        </div>
        {paused && (
          <button type="button" className="chat-paused" onClick={toBottom}>
            {ui.chatPaused} · {ui.moreMessages}
          </button>
        )}
      </div>

      {(sendError || (chat.status === 'error' && chat.error)) && <p className="field-error">{sendError || chat.error}</p>}

      <form className="chat-composer" onSubmit={submit}>
        {canSend && (
          <Popover.Root open={pickerOpen} onOpenChange={setPickerOpen}>
            <Popover.Trigger asChild>
              <button type="button" className="icon-btn" aria-label={ui.emotes}>
                <Smile size={14} />
              </button>
            </Popover.Trigger>
            <Popover.Portal container={document.body}>
              <Popover.Content
                className="emote-pop"
                {...portal}
                data-hit
                side="top"
                align="start"
                sideOffset={6}
                collisionPadding={12}
                avoidCollisions
              >
                <Suspense fallback={<p className="muted">…</p>}>
                  <EmotePicker
                    user={emotes.user}
                    channel={emotes.channel}
                    global={emotes.global}
                    onPick={(name) => insert(name)}
                  />
                </Suspense>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        )}
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => {
            completion.current = null
            setDraft(e.target.value)
          }}
          onKeyDown={onKeyDown}
          placeholder={canSend ? (activeChannel ? ui.sendMessage : ui.openChat) : ui.loginToTwitch}
          disabled={!canSend || !activeChannel}
          maxLength={MAX_CHARS}
          aria-label={ui.sendMessage}
        />
        {draft.length > MAX_CHARS - 50 && <span className="chat-count tiny muted">{MAX_CHARS - draft.length}</span>}
        <button type="submit" className="text-btn" disabled={!canSend || !draft.trim()}>
          <Send size={13} /> {ui.send}
        </button>
      </form>
    </aside>
  )
}
