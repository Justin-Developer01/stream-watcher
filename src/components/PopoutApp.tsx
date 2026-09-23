import { Pin, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ChatDrawer } from './ChatDrawer'
import { TwitchPlayer } from './TwitchPlayer'
import { useChat } from '../hooks/useChat'
import { useTwitchAuth } from '../hooks/useTwitchAuth'
import { chatFontFamily, loadState } from '../lib/storage'
import { ui } from '../lib/uiLabels'
import { DEFAULT_SETTINGS } from '../types'

export function PopoutApp({ mode, channel }: { mode: 'stream' | 'chat'; channel: string }) {
  const saved = useMemo(() => loadState(), [])
  const settings = saved?.settings ?? DEFAULT_SETTINGS
  const clientId = saved?.clientId ?? ''
  const { auth, isLoggedIn } = useTwitchAuth(clientId)
  const [alwaysOnTop, setAlwaysOnTop] = useState(false)
  const chat = useChat({
    channels: [channel],
    activeChannel: channel,
    username: auth.username,
    accessToken: auth.accessToken,
  })

  const dock = async () => {
    await window.vesper?.dockPopout(mode, channel)
  }

  return (
    <div className="popout-root" data-theme={settings.theme}>
      <header className="popout-bar">
        <span>{mode === 'chat' ? `#${channel}` : channel}</span>
        <button
          type="button"
          className={`icon-btn${alwaysOnTop ? ' is-on' : ''}`}
          onClick={async () => {
            const next = !alwaysOnTop
            setAlwaysOnTop(next)
            await window.vesper?.setAlwaysOnTop(next)
          }}
        >
          <Pin size={13} /> {ui.alwaysOnTop}
        </button>
        <button type="button" className="text-btn" onClick={() => void dock()}>
          {ui.dockBack}
        </button>
        <button type="button" className="icon-btn" onClick={() => void dock()}>
          <X size={13} />
        </button>
      </header>
      {mode === 'stream' ? (
        <div className="popout-player">
          <TwitchPlayer channel={channel} muted={false} interactive />
        </div>
      ) : (
        <ChatDrawer
          dock="right"
          channels={[channel]}
          activeChannel={channel}
          onChannelChange={() => undefined}
          messages={chat.messages}
          status={chat.status}
          error={chat.error}
          canSend={isLoggedIn}
          username={auth.username}
          fontFamily={chatFontFamily(settings)}
          fontSize={settings.chat.fontSize}
          onSend={chat.sendMessage}
          onDockChange={() => undefined}
          onHide={() => void dock()}
          onPopout={() => undefined}
        />
      )}
    </div>
  )
}
