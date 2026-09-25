import { useCallback, useEffect, useRef, useState } from 'react'
import tmi from 'tmi.js'
import { log } from '../lib/log'
import { formatDuration, ircToAction, nextLocalId, buildFragments, type IrcMessage, type ParseOptions } from '../lib/chat/parse'
import {
  DEFAULT_ROOM_STATE,
  type ChatEvent,
  type ChatLineEvent,
  type RoomState,
  type UserState,
} from '../lib/chat/types'

/** Twitch web keeps about this many lines per channel. */
const MAX_LINES = 300
const FLUSH_MS = 80

export type ChatStatus = 'idle' | 'connecting' | 'connected' | 'error'

type Options = {
  channels: string[]
  username: string | null
  accessToken: string | null
  /** Bump to force a fresh connection (Settings → Reconnect chat). */
  reconnectNonce?: number
  /** Parse context for a channel (cheermotes, and emote names for our own echo). Read at receive time. */
  parseOptions: (channel: string, self: boolean) => ParseOptions
}

type Pending =
  | { type: 'event'; event: ChatEvent }
  | { type: 'clearchat'; channel: string; login: string | null; duration: number | null; timestamp: number }
  | { type: 'clearmsg'; channel: string; targetId: string }

function applyPending(store: Map<string, ChatEvent[]>, batch: Pending[]) {
  const changed = new Map<string, ChatEvent[]>()
  const list = (channel: string) => {
    let next = changed.get(channel)
    if (!next) {
      next = [...(store.get(channel) ?? [])]
      changed.set(channel, next)
    }
    return next
  }
  for (const item of batch) {
    if (item.type === 'event') {
      list(item.event.channel).push(item.event)
      continue
    }
    const lines = list(item.channel)
    if (item.type === 'clearmsg') {
      const i = lines.findIndex((e) => e.id === item.targetId)
      if (i >= 0 && lines[i].kind === 'message') lines[i] = { ...(lines[i] as ChatLineEvent), deleted: true }
      continue
    }
    // CLEARCHAT: one user (timeout / ban) or the whole room.
    for (let i = 0; i < lines.length; i++) {
      const e = lines[i]
      if (e.kind === 'message' && !e.deleted && (!item.login || e.login === item.login)) lines[i] = { ...e, deleted: true }
    }
    const text = item.login
      ? item.duration
        ? `${item.login} has been timed out for ${formatDuration(item.duration)}.`
        : `${item.login} has been permanently banned.`
      : 'Chat was cleared by a moderator.'
    lines.push({ kind: 'status', id: nextLocalId('status'), channel: item.channel, text, timestamp: item.timestamp })
  }
  for (const [channel, lines] of changed) {
    store.set(channel, lines.length > MAX_LINES ? lines.slice(-MAX_LINES) : lines)
  }
  return changed.size > 0
}

export function useChat({ channels, username, accessToken, reconnectNonce = 0, parseOptions }: Options) {
  const [status, setStatus] = useState<ChatStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const clientRef = useRef<tmi.Client | null>(null)
  const storeRef = useRef(new Map<string, ChatEvent[]>())
  const roomRef = useRef(new Map<string, RoomState>())
  const userStateRef = useRef(new Map<string, UserState>())
  const globalUserRef = useRef<{ userId: string | null; state: Partial<UserState> }>({ userId: null, state: {} })
  const lastSentRef = useRef(new Map<string, number>())
  const pendingRef = useRef<Pending[]>([])
  const flushTimer = useRef<number | null>(null)
  const syncRef = useRef<() => void>(() => undefined)
  const parseRef = useRef(parseOptions)
  parseRef.current = parseOptions

  const wanted = [...new Set(channels.map((c) => c.toLowerCase()).filter(Boolean))].sort()
  const channelKey = wanted.join(',')
  const wantedRef = useRef(wanted)
  wantedRef.current = wanted

  const queue = useCallback((item: Pending) => {
    pendingRef.current.push(item)
    if (flushTimer.current != null) return
    flushTimer.current = window.setTimeout(() => {
      flushTimer.current = null
      const batch = pendingRef.current
      pendingRef.current = []
      if (applyPending(storeRef.current, batch)) setVersion((v) => v + 1)
    }, FLUSH_MS)
  }, [])

  // One connection per identity. Channel changes join/part on it instead of reconnecting.
  useEffect(() => {
    const client = new tmi.Client({
      options: { skipUpdatingEmotesets: true, skipMembership: true },
      connection: { reconnect: true, secure: true },
      identity: username && accessToken ? { username, password: `oauth:${accessToken}` } : undefined,
      channels: [],
    })
    clientRef.current = client
    let disposed = false

    const sync = () => {
      if (disposed || client.readyState() !== 'OPEN') return
      const joined = new Set(client.getChannels().map((c) => c.replace(/^#/, '').toLowerCase()))
      const want = new Set(wantedRef.current)
      for (const c of joined) if (!want.has(c)) void client.part(c).catch(() => undefined)
      for (const c of want) if (!joined.has(c)) void client.join(c).catch(() => undefined)
    }

    client.on('raw_message', (_clone: unknown, raw: unknown) => {
      const message = raw as IrcMessage
      if (disposed) return
      const channel = (message.params?.[0] ?? '').replace(/^#/, '').toLowerCase()
      const action = ircToAction(message, parseRef.current(channel, false))
      if (!action) return
      switch (action.type) {
        case 'roomstate':
          roomRef.current.set(action.channel, { ...(roomRef.current.get(action.channel) ?? DEFAULT_ROOM_STATE), ...action.patch })
          setVersion((v) => v + 1)
          return
        case 'userstate':
          if (action.channel) {
            userStateRef.current.set(action.channel, {
              ...(userStateRef.current.get(action.channel) ?? { displayName: null, color: null, badges: [], emoteSets: [], mod: false }),
              ...action.state,
            } as UserState)
          } else {
            globalUserRef.current = { userId: action.userId ?? null, state: action.state }
          }
          return
        default:
          queue(action)
      }
    })
    client.on('connected', () => {
      if (disposed) return
      setStatus('connected')
      setError(null)
      log.info(`chat connected (${username ? 'logged in' : 'anonymous'})`)
      sync()
    })
    client.on('disconnected', (reason: string) => {
      if (disposed) return
      setStatus('connecting')
      if (reason) setError(reason)
      log.warn(`chat disconnected: ${reason || 'no reason given'}`)
    })
    client.on('reconnect', () => {
      if (!disposed) setStatus('connecting')
    })

    setStatus('connecting')
    setError(null)
    void client.connect().catch((err: unknown) => {
      if (disposed) return
      setStatus('error')
      log.error('chat connection failed:', err)
      setError(err instanceof Error ? err.message : typeof err === 'string' ? err : 'Chat connection failed')
    })
    syncRef.current = sync

    return () => {
      disposed = true
      clientRef.current = null
      syncRef.current = () => undefined
      if (flushTimer.current != null) window.clearTimeout(flushTimer.current)
      flushTimer.current = null
      pendingRef.current = []
      void client.disconnect().catch(() => undefined)
    }
  }, [username, accessToken, reconnectNonce, queue])

  useEffect(() => {
    syncRef.current()
  }, [channelKey])

  const sendMessage = useCallback(
    async (rawText: string, channel: string | null) => {
      const text = rawText.trim()
      if (!text || !channel) return { ok: false as const, error: 'No active channel' }
      if (!username || !accessToken) return { ok: false as const, error: 'Log in with Twitch to send chat' }
      const client = clientRef.current
      if (!client || client.readyState() !== 'OPEN') return { ok: false as const, error: 'Chat is not connected' }
      const key = channel.toLowerCase()
      const isAction = /^\/me\s+/i.test(text)
      if (text.startsWith('/') && !isAction) {
        return { ok: false as const, error: 'Only /me works here. Use twitch.tv for other chat commands.' }
      }
      const room = roomRef.current.get(key)
      const me = userStateRef.current.get(key)
      const privileged = me?.mod || me?.badges.some((b) => b.set === 'broadcaster')
      if (room?.slow && !privileged) {
        const wait = Math.ceil(room.slow - (Date.now() - (lastSentRef.current.get(key) ?? 0)) / 1000)
        if (wait > 0) return { ok: false as const, error: `Slow mode: wait ${wait}s` }
      }
      const body = isAction ? text.replace(/^\/me\s+/i, '') : text
      try {
        if (isAction) await client.action(key, body)
        else await client.say(key, body)
      } catch (err) {
        log.warn(`chat send failed in #${key}:`, err)
        return { ok: false as const, error: typeof err === 'string' ? err : err instanceof Error ? err.message : 'Failed to send' }
      }
      lastSentRef.current.set(key, Date.now())
      // Twitch does not echo our own PRIVMSG; show it from USERSTATE like twitch.tv does.
      const global = globalUserRef.current
      const opts = parseRef.current(key, true)
      queue({
        type: 'event',
        event: {
          kind: 'message',
          id: nextLocalId('self'),
          channel: key,
          userId: global.userId,
          login: username.toLowerCase(),
          displayName: me?.displayName || global.state.displayName || username,
          color: me?.color || global.state.color || null,
          badges: me?.badges ?? [],
          text: body,
          fragments: buildFragments(body, [], 0, opts),
          action: isAction,
          bits: 0,
          firstMessage: false,
          highlighted: false,
          reply: null,
          timestamp: Date.now(),
          self: true,
          deleted: false,
        },
      })
      return { ok: true as const }
    },
    [username, accessToken, queue],
  )

  const eventsFor = useCallback((channel: string | null) => (channel ? (storeRef.current.get(channel.toLowerCase()) ?? []) : []), [])
  const roomStateFor = useCallback(
    (channel: string | null) => (channel ? (roomRef.current.get(channel.toLowerCase()) ?? DEFAULT_ROOM_STATE) : DEFAULT_ROOM_STATE),
    [],
  )
  const recentChatters = useCallback((channel: string | null) => {
    const seen = new Map<string, string>()
    for (const e of eventsFor(channel)) if (e.kind === 'message') seen.set(e.login, e.displayName)
    return [...seen.values()].reverse()
  }, [eventsFor])

  return { version, status, error, sendMessage, eventsFor, roomStateFor, recentChatters }
}
