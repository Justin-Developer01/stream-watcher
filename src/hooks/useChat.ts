import { useCallback, useEffect, useRef, useState } from 'react'
import tmi from 'tmi.js'
import type { ChatEmoteRange, ChatMessage } from '../types'

function parseEmoteTag(raw: unknown): ChatEmoteRange[] | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const ranges: ChatEmoteRange[] = []
  for (const [id, positions] of Object.entries(raw as Record<string, string[]>)) {
    if (!Array.isArray(positions)) continue
    for (const position of positions) {
      const [startStr, endStr] = position.split('-')
      const start = Number(startStr)
      const end = Number(endStr)
      if (Number.isInteger(start) && Number.isInteger(end) && start >= 0 && end >= start) {
        ranges.push({ id, start, end })
      }
    }
  }
  return ranges.length ? ranges : undefined
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

  const channelKey = channels.map((c) => c.toLowerCase()).sort().join(',')

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
            timestamp: Date.now(),
            emotes: parseEmoteTag(tags.emotes),
          },
        ]
        return next.slice(-300)
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
  }, [channelKey, username, accessToken])

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
        setMessages((prev) => [
          ...prev,
          {
            id: `local-${Date.now()}`,
            channel: activeChannel,
            user: username,
            text: body,
            timestamp: Date.now(),
          },
        ].slice(-300))
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
    ? messages.filter((m) => m.channel.toLowerCase() === activeChannel.toLowerCase())
    : messages

  return { messages: visibleMessages, status, error, sendMessage }
}
