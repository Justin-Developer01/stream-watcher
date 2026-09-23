import { useEffect, useMemo } from 'react'
import { ChatPanel } from './ChatPanel'
import { useChat } from '../hooks/useChat'
import { useGlobalEmotes } from '../hooks/useGlobalEmotes'
import { usePopoutChrome } from '../hooks/usePopoutChrome'
import { useTwitchAuth } from '../hooks/useTwitchAuth'
import { loadState } from '../lib/storage'
import { resolveTwitchClientId } from '../lib/env'
import { applyAppearance, normalizeAppearance } from '../lib/theme'
import { DEFAULT_CHAT_FLOAT } from '../types'

export function ChatPopoutApp() {
  const channel = useMemo(() => {
    const raw = new URLSearchParams(window.location.search).get('channel') || ''
    return raw.replace(/^#/, '').trim().toLowerCase()
  }, [])
  const saved = useMemo(() => loadState(), [])
  const clientId = resolveTwitchClientId(saved?.clientId)
  const { alwaysOnTop, toggleAlwaysOnTop, dockBack } = usePopoutChrome()

  useEffect(() => {
    applyAppearance(normalizeAppearance(saved?.appearance), { windowChrome: false })
  }, [saved])
  const channels = channel ? [channel] : []

  useEffect(() => {
    if (channel) document.title = `#${channel}`
  }, [channel])

  const { auth, isLoggedIn } = useTwitchAuth(clientId)
  const globalEmotes = useGlobalEmotes(clientId, auth.accessToken)
  const chat = useChat({
    channels,
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
        channels={channels}
        activeChannel={channel || null}
        onChannelChange={() => undefined}
        messages={chat.messages}
        status={chat.status}
        error={chat.error}
        canSend={isLoggedIn}
        username={auth.username}
        onSend={chat.sendMessage}
        onPopout={() => undefined}
        emotes={globalEmotes}
        compact
        alwaysOnTop={alwaysOnTop}
        onToggleAlwaysOnTop={() => void toggleAlwaysOnTop()}
        onDockBack={dockBack}
      />
    </div>
  )
}
