import { useCallback, useEffect, useRef, useState } from 'react'
import tmi from 'tmi.js'
import type { ChatBadge, ChatMessage } from '../types'

function parseEmotes(raw?: string) {
  if (!raw) return []
  const list: Array<{ id: string; start: number; end: number }> = []
  for (const part of raw.split('/')) {
    const [id, ranges] = part.split(':')
    if (!id || !ranges) continue
    for (const range of ranges.split(',')) {
      const [start, end] = range.split('-').map(Number)
      if (Number.isFinite(start) && Number.isFinite(end)) list.push({ id, start, end })
    }
  }
  return list.sort((a, b) => a.start - b.start)
}

function parseBadges(raw?: string): ChatBadge[] {
  if (!raw) return []
  return raw
    .split(',')
    .map((entry) => {
      const [set, version] = entry.split('/')
      return set && version ? { set, version } : null
    })
    .filter((b): b is ChatBadge => Boolean(b))
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
  const [nonce, setNonce] = useState(0)
  const clientRef = useRef<tmi.Client | null>(null)
  const channelKey = channels.map((c) => c.toLowerCase()).sort().join(',')

  const reconnect = useCallback(() => setNonce((n) => n + 1), [])

  useEffect(() => {
    const uniqueChannels = channelKey ? channelKey.split(',') : []
    if (!uniqueChannels.length) {
      setStatus('idle')
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
      channels: uniqueChannels,
    })

    clientRef.current = client
    setStatus('connecting')
    setError(null)

    client.on('connected', () => {
      if (!cancelled) setStatus('connected')
    })
    client.on('disconnected', () => {
      if (!cancelled) setStatus('idle')
    })
    client.on('message', (channel, tags, message, self) => {
      if (cancelled || self) return
      const cleanChannel = channel.replace(/^#/, '')
      setMessages((prev) => {
        const next: ChatMessage[] = [
          ...prev,
          {
            id: tags.id ?? `${Date.now()}-${Math.random()}`,
            channel: cleanChannel,
            user: tags['display-name'] || tags.username || 'unknown',
            color: tags.color || undefined,
            text: message,
            timestamp: Number(tags['tmi-sent-ts'] ?? Date.now()),
            badges: parseBadges(
              tags.badges
                ? Object.entries(tags.badges)
                    .map(([k, v]) => `${k}/${v}`)
                    .join(',')
                : undefined,
            ),
            emotes: parseEmotes(tags['emotes-raw'] ?? (tags.emotes
              ? Object.entries(tags.emotes)
                  .map(([id, ranges]) => `${id}:${(ranges ?? []).join(',')}`)
                  .join('/')
              : undefined)),
          },
        ]
        return next.slice(-400)
      })
    })

    void client.connect().catch((err: unknown) => {
      if (cancelled) return
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Chat connection failed')
    })

    return () => {
      cancelled = true
      clientRef.current = null
      void client.disconnect()
    }
  }, [channelKey, username, accessToken, nonce])

  const sendMessage = useCallback(
    async (text: string) => {
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
          [
            ...prev,
            {
              id: `local-${Date.now()}`,
              channel: activeChannel,
              user: username,
              text: body,
              timestamp: Date.now(),
              badges: [],
              emotes: [],
            },
          ].slice(-400),
        )
        return { ok: true as const }
      } catch (err) {
        return { ok: false as const, error: err instanceof Error ? err.message : 'Failed to send' }
      }
    },
    [activeChannel, username, accessToken],
  )

  const visibleMessages = activeChannel
    ? messages.filter((m) => m.channel.toLowerCase() === activeChannel.toLowerCase())
    : messages

  return { messages: visibleMessages, status, error, sendMessage, reconnect }
}
