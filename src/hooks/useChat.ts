import { useCallback, useEffect, useRef, useState } from 'react'
import tmi from 'tmi.js'
import type { ChatMessage } from '../types'

const PER_CHANNEL_CAP = 300

function normChannel(channel: string) {
  return channel.replace(/^#/, '').trim().toLowerCase()
}

function uniqueChannels(channels: string[]) {
  return [...new Set(channels.map(normChannel).filter(Boolean))]
}

function normalizeBadges(raw: tmi.ChatUserstate['badges']): Record<string, string> | undefined {
  if (!raw) return undefined
  const next: Record<string, string> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'string' && value) next[key] = value
  }
  return Object.keys(next).length ? next : undefined
}

function appendCapped(prev: ChatMessage[], incoming: ChatMessage) {
  const key = normChannel(incoming.channel)
  const kept: ChatMessage[] = []
  const forChannel: ChatMessage[] = []
  for (const message of prev) {
    if (normChannel(message.channel) === key) forChannel.push(message)
    else kept.push(message)
  }
  forChannel.push(incoming)
  return [...kept, ...forChannel.slice(-PER_CHANNEL_CAP)]
}

export function useChat(options: {
  channels: string[]
  activeChannel: string | null
  username: string | null
  accessToken: string | null
}) {
  const { channels, activeChannel, username, accessToken } = options
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const clientRef = useRef<tmi.Client | null>(null)
  const wantedRef = useRef<string[]>([])
  const syncGen = useRef(0)

  const identityKey = `${username ?? ''}\0${accessToken ?? ''}`
  const channelKey = uniqueChannels(channels).join(',')
  const hasChannels = Boolean(channelKey)
  wantedRef.current = uniqueChannels(channels)

  useEffect(() => {
    if (!hasChannels) {
      const existing = clientRef.current
      clientRef.current = null
      if (existing) void existing.disconnect()
      setStatus('idle')
      setError(null)
      return
    }

    let cancelled = false
    const client = new tmi.Client({
      options: { skipUpdatingEmotesets: true },
      connection: { reconnect: true, secure: true },
      identity:
        username && accessToken
          ? { username, password: `oauth:${accessToken}` }
          : undefined,
      channels: [],
    })

    clientRef.current = client
    setStatus('connecting')
    setError(null)

    const syncJoins = async () => {
      const gen = ++syncGen.current
      const want = new Set(wantedRef.current)
      const current = new Set(client.getChannels().map(normChannel))
      for (const channel of current) {
        if (cancelled || syncGen.current !== gen) return
        if (want.has(channel)) continue
        try {
          await client.part(channel)
        } catch {
          // ignore part races during reconnect
        }
      }
      for (const channel of want) {
        if (cancelled || syncGen.current !== gen) return
        if (current.has(channel)) continue
        try {
          await client.join(channel)
        } catch {
          // ignore join races; reconnect will retry
        }
      }
    }

    client.on('connected', () => {
      if (cancelled) return
      setStatus('connected')
      void syncJoins()
    })

    client.on('disconnected', () => {
      if (!cancelled && clientRef.current === client) setStatus('idle')
    })

    client.on('message', (channel, tags, message, self) => {
      if (cancelled || self) return
      const cleanChannel = normChannel(channel)
      setMessages((prev) =>
        appendCapped(prev, {
          id: tags.id ?? `${Date.now()}-${Math.random()}`,
          channel: cleanChannel,
          user: tags['display-name'] || tags.username || 'unknown',
          color: tags.color || undefined,
          text: message,
          timestamp: Date.now(),
          emotes: tags.emotes ?? undefined,
          badges: normalizeBadges(tags.badges),
        }),
      )
    })

    void client.connect().catch((err: unknown) => {
      if (cancelled) return
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Chat connection failed')
    })

    return () => {
      cancelled = true
      if (clientRef.current === client) clientRef.current = null
      void client.disconnect()
    }
  }, [hasChannels, identityKey, username, accessToken])

  useEffect(() => {
    const client = clientRef.current
    if (!client || !hasChannels) return
    let open = false
    try {
      open = client.readyState() === 'OPEN'
    } catch {
      open = false
    }
    if (!open) return

    const gen = ++syncGen.current
    const wanted = channelKey ? channelKey.split(',') : []
    const current = new Set(client.getChannels().map(normChannel))
    const want = new Set(wanted)

    const run = async () => {
      for (const channel of current) {
        if (syncGen.current !== gen) return
        if (want.has(channel)) continue
        try {
          await client.part(channel)
        } catch {
          // ignore part races during reconnect
        }
      }
      for (const channel of want) {
        if (syncGen.current !== gen) return
        if (current.has(channel)) continue
        try {
          await client.join(channel)
        } catch {
          // ignore join races; reconnect will retry
        }
      }
    }

    void run()
  }, [channelKey, hasChannels, identityKey])

  const sendMessage = useCallback(
    async (text: string, emotes?: Record<string, string[]>) => {
      const body = text.trim()
      if (!body || !activeChannel) return { ok: false as const, error: 'No active channel' }
      if (!username || !accessToken) {
        return { ok: false as const, error: 'Log in with Twitch to send chat' }
      }
      const client = clientRef.current
      if (!client) return { ok: false as const, error: 'Chat is not connected' }

      try {
        await client.say(activeChannel, body)
        setMessages((prev) =>
          appendCapped(prev, {
            id: `local-${Date.now()}`,
            channel: activeChannel,
            user: username,
            text: body,
            timestamp: Date.now(),
            emotes,
          }),
        )
        return { ok: true as const }
      } catch (err) {
        return {
          ok: false as const,
          error: err instanceof Error ? err.message : 'Failed to send',
        }
      }
    },
    [activeChannel, username, accessToken],
  )

  const visibleMessages = activeChannel
    ? messages.filter((m) => normChannel(m.channel) === normChannel(activeChannel))
    : messages

  return { messages: visibleMessages, status, error, sendMessage }
}
