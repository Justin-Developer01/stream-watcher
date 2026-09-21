import { useMemo, useState } from 'react'
import { ChatPanel } from './ChatPanel'
import { useChat } from '../hooks/useChat'
import { useTwitchAuth } from '../hooks/useTwitchAuth'
import { loadState } from '../lib/storage'
import { DEFAULT_CHAT_FLOAT } from '../types'

function getQuery() {
  return new URLSearchParams(window.location.search)
}

export function ChatPopoutApp() {
  const query = useMemo(() => getQuery(), [])
  const initialChannel = (query.get('channel') || '').toLowerCase()
  const saved = useMemo(() => loadState(), [])
  const [channel, setChannel] = useState(initialChannel || saved?.chatChannel || '')
  const clientId = saved?.clientId ?? ''

  const channels = useMemo(() => {
    const fromStreams = (saved?.streams ?? []).map((s) => s.channel)
    const set = new Set(fromStreams)
    if (channel) set.add(channel)
    return [...set]
  }, [saved, channel])

  const { auth, isLoggedIn } = useTwitchAuth(clientId)
  const chat = useChat({
    channels: channel ? [channel] : channels,
    activeChannel: channel || null,
    username: auth.username,
    accessToken: auth.accessToken,
  })

  return (
    <div className="chat-popout-root">
      <ChatPanel
        collapsed={false}
        onToggleCollapsed={() => undefined}
        dock="right"
        onDockChange={() => undefined}
        float={DEFAULT_CHAT_FLOAT}
        onFloatChange={() => undefined}
        channels={channels.length ? channels : channel ? [channel] : []}
        activeChannel={channel || null}
        onChannelChange={setChannel}
        messages={chat.messages}
        status={chat.status}
        error={chat.error}
        canSend={isLoggedIn}
        username={auth.username}
        onSend={chat.sendMessage}
        onPopout={() => undefined}
        compact
      />
    </div>
  )
}
