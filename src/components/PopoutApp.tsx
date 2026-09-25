import { Pin, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { ChatDrawer } from './ChatDrawer'
import { PortalThemeProvider, themeVars } from './ui/portalTheme'
import { PlayerErrorBoundary } from './PlayerErrorBoundary'
import { StreamPlayer } from './StreamPlayer'
import { useTwitchAuth } from '../hooks/useTwitchAuth'
import { chatFontFamily, loadState } from '../lib/storage'
import { resolveTwitchClientId } from '../lib/twitchClientId'
import { ui } from '../lib/uiLabels'
import { DEFAULT_SETTINGS, type PlatformId } from '../types'

export function PopoutApp({
  mode,
  channel,
  platform,
}: {
  mode: 'stream' | 'chat'
  channel: string
  platform: PlatformId
}) {
  const saved = useMemo(() => loadState(), [])
  const settings = saved?.settings ?? DEFAULT_SETTINGS
  const clientId = resolveTwitchClientId(saved?.clientId)
  const { auth } = useTwitchAuth(clientId)
  const channels = useMemo(() => [channel], [channel])
  const [alwaysOnTop, setAlwaysOnTop] = useState(false)

  useEffect(() => {
    void window.vesper?.getThisPopoutAlwaysOnTop().then((value) => setAlwaysOnTop(Boolean(value)))
  }, [])

  const dock = async () => {
    await window.vesper?.dockPopout(mode, channel, platform)
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
          className={`text-btn${alwaysOnTop ? ' is-on' : ''}`}
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
          <PlayerErrorBoundary label={`${platform}:${channel}`}>
            <StreamPlayer platform={platform} channel={channel} muted={false} interactive />
          </PlayerErrorBoundary>
        </div>
      ) : (
        <ChatDrawer
          dock="right"
          platform={platform}
          channels={channels}
          activeChannel={channel}
          onChannelChange={() => undefined}
          username={auth.username}
          accessToken={auth.accessToken}
          clientId={clientId}
          theme={settings.theme === 'light' ? 'light' : 'dark'}
          fontFamily={chatFontFamily(settings)}
          fontSize={settings.chat.fontSize}
          onHide={() => void dock()}
        />
      )}
    </div>
    </PortalThemeProvider>
  )
}
