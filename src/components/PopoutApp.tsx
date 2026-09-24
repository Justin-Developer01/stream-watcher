import { Pin, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { ChatDrawer } from './ChatDrawer'
import { PortalThemeProvider, themeVars } from './ui/portalTheme'
import { TwitchPlayer } from './TwitchPlayer'
import { useChat } from '../hooks/useChat'
import { useTwitchAuth } from '../hooks/useTwitchAuth'
import { chatFontFamily, loadState } from '../lib/storage'
import { resolveTwitchClientId } from '../lib/twitchClientId'
import { ui } from '../lib/uiLabels'
import { DEFAULT_SETTINGS } from '../types'

export function PopoutApp({ mode, channel }: { mode: 'stream' | 'chat'; channel: string }) {
  const saved = useMemo(() => loadState(), [])
  const settings = saved?.settings ?? DEFAULT_SETTINGS
  const clientId = resolveTwitchClientId(saved?.clientId)
  const { auth, isLoggedIn } = useTwitchAuth(clientId)
  const [alwaysOnTop, setAlwaysOnTop] = useState(false)

  useEffect(() => {
    void window.vesper?.getThisPopoutAlwaysOnTop().then((value) => setAlwaysOnTop(Boolean(value)))
  }, [])
  const chat = useChat({
    channels: [channel],
    activeChannel: channel,
    username: auth.username,
    accessToken: auth.accessToken,
  })

  const dock = async () => {
    await window.vesper?.dockPopout(mode, channel)
  }

  const style = useMemo(() => themeVars(settings), [settings])

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = settings.theme
    for (const [key, value] of Object.entries(style)) {
      if (key.startsWith('--') && value != null) root.style.setProperty(key, String(value))
    }
  }, [settings.theme, style])

  return (
    <PortalThemeProvider theme={settings.theme} style={style}>
    <div className="popout-root" data-theme={settings.theme} style={style}>
      <header className="popout-bar" data-hit>
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
        <div className="popout-player" data-hit>
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
    </PortalThemeProvider>
  )
}
