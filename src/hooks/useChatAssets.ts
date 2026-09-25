import { useEffect, useMemo, useState } from 'react'
import { loadChannelAssets, loadGlobalAssets, loadSelf, loadUserEmotes, type ChannelAssets, type GlobalAssets } from '../lib/chat/assets'
import { defaultCheermotes } from '../lib/chat/parse'
import type { BadgeLookup, CheermoteLookup, Emote } from '../lib/chat/types'

type Options = {
  clientId: string
  accessToken: string | null
  channels: string[]
  theme: 'dark' | 'light'
}

/** Helix badges, emotes, and cheermotes for the joined channels. Logged out, only the default Cheer set resolves. */
export function useChatAssets({ clientId, accessToken, channels, theme }: Options) {
  const auth = useMemo(() => ({ clientId, accessToken }), [clientId, accessToken])
  const [global, setGlobal] = useState<GlobalAssets | null>(null)
  const [byChannel, setByChannel] = useState<Record<string, ChannelAssets>>({})
  const [userEmotes, setUserEmotes] = useState<Emote[]>([])
  const channelKey = [...new Set(channels.map((c) => c.toLowerCase()))].sort().join(',')

  useEffect(() => {
    let live = true
    setGlobal(null)
    setUserEmotes([])
    if (!accessToken) return
    loadGlobalAssets(auth, theme).then((g) => live && setGlobal(g), () => undefined)
    loadSelf(auth)
      .then((self) => (self ? loadUserEmotes(self.id, auth, theme) : null))
      .then((list) => live && list && setUserEmotes(list), () => undefined)
    return () => {
      live = false
    }
  }, [auth, accessToken, theme])

  useEffect(() => {
    let live = true
    if (!accessToken) {
      setByChannel({})
      return
    }
    for (const login of channelKey ? channelKey.split(',') : []) {
      loadChannelAssets(login, null, auth, theme).then(
        (assets) => live && setByChannel((prev) => ({ ...prev, [login]: assets })),
        () => undefined,
      )
    }
    return () => {
      live = false
    }
  }, [auth, accessToken, channelKey, theme])

  return useMemo(() => {
    const fallbackCheer = defaultCheermotes(theme)
    const badgesFor = (channel: string | null): Array<BadgeLookup | null | undefined> => [
      channel ? byChannel[channel.toLowerCase()]?.badges : null,
      global?.badges,
    ]
    const cheermotesFor = (channel: string | null): CheermoteLookup =>
      (channel ? byChannel[channel.toLowerCase()]?.cheermotes : null) ?? fallbackCheer
    const emotesFor = (channel: string | null) => ({
      user: userEmotes,
      channel: (channel ? byChannel[channel.toLowerCase()]?.emotes : null) ?? [],
      global: global?.emotes ?? [],
    })
    const emoteNamesFor = (channel: string | null) => {
      const { user, channel: ch, global: gl } = emotesFor(channel)
      const map = new Map<string, Emote>()
      // Only emotes the user can send render as emotes in their own echo. Without the
      // user:read:emotes scope we cannot tell, so channel emotes are assumed usable.
      for (const e of [...gl, ...(user.length ? [] : ch), ...user]) map.set(e.name, e)
      return map
    }
    return { badgesFor, cheermotesFor, emotesFor, emoteNamesFor }
  }, [byChannel, global, userEmotes, theme])
}
