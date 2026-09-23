import { useEffect, useMemo, useState } from 'react'
import {
  fetchChannelChatBadges,
  fetchChannelChatEmotes,
  fetchGlobalChatBadges,
  fetchGlobalChatEmotes,
  fetchUsersByLogin,
  type BadgeLookup,
  type ChatEmote,
} from '../lib/twitch'

type ChannelAssets = {
  emotes: ChatEmote[]
  badges: BadgeLookup
}

const emptyChannel: ChannelAssets = { emotes: [], badges: {} }

export function useTwitchChatAssets(options: {
  clientId: string
  accessToken: string | null
  channels: string[]
  activeChannel: string | null
}) {
  const { clientId, accessToken, channels, activeChannel } = options
  const [globalEmotes, setGlobalEmotes] = useState<ChatEmote[]>([])
  const [globalBadges, setGlobalBadges] = useState<BadgeLookup>({})
  const [byChannel, setByChannel] = useState<Record<string, ChannelAssets>>({})

  const channelKey = channels
    .map((channel) => channel.replace(/^#/, '').trim().toLowerCase())
    .filter(Boolean)
    .sort()
    .join(',')

  useEffect(() => {
    if (!clientId.trim() || !accessToken) {
      setGlobalEmotes([])
      setGlobalBadges({})
      return
    }
    let cancelled = false
    void Promise.all([
      fetchGlobalChatEmotes(clientId, accessToken),
      fetchGlobalChatBadges(clientId, accessToken),
    ]).then(([emotes, badges]) => {
      if (cancelled) return
      setGlobalEmotes(emotes)
      setGlobalBadges(badges)
    })
    return () => {
      cancelled = true
    }
  }, [accessToken, clientId])

  useEffect(() => {
    if (!clientId.trim() || !accessToken || !channelKey) {
      setByChannel({})
      return
    }
    let cancelled = false
    const logins = channelKey.split(',')
    void (async () => {
      const users = await fetchUsersByLogin(clientId, accessToken, logins)
      if (cancelled) return
      const next: Record<string, ChannelAssets> = {}
      await Promise.all(
        users.map(async (user) => {
          const login = user.login.toLowerCase()
          const [emotes, badges] = await Promise.all([
            fetchChannelChatEmotes(clientId, accessToken, user.id),
            fetchChannelChatBadges(clientId, accessToken, user.id),
          ])
          next[login] = { emotes, badges }
        }),
      )
      if (!cancelled) setByChannel(next)
    })()
    return () => {
      cancelled = true
    }
  }, [accessToken, channelKey, clientId])

  const active = (activeChannel ?? '').replace(/^#/, '').trim().toLowerCase()
  const channelAssets = byChannel[active] ?? emptyChannel

  const pickerEmotes = useMemo(() => {
    const seen = new Set<string>()
    const list: ChatEmote[] = []
    for (const emote of [...channelAssets.emotes, ...globalEmotes]) {
      if (seen.has(emote.id)) continue
      seen.add(emote.id)
      list.push(emote)
    }
    return list
  }, [channelAssets.emotes, globalEmotes])

  const badgeLookup = useMemo(
    () => ({ ...globalBadges, ...channelAssets.badges }),
    [channelAssets.badges, globalBadges],
  )

  return { pickerEmotes, badgeLookup, globalEmotes }
}
