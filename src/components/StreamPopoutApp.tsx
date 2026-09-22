import { useEffect, useMemo, useState } from 'react'
import { usePopoutChrome } from '../hooks/usePopoutChrome'
import { loadState } from '../lib/storage'
import { applyAppearance, normalizeAppearance } from '../lib/theme'
import { IconButton } from './IconButton'
import { MuteIcon, PinIcon, UnmuteIcon } from './icons'
import { TwitchPlayer } from './TwitchPlayer'

export function StreamPopoutApp() {
  const channel = useMemo(() => {
    const raw = new URLSearchParams(window.location.search).get('channel') || ''
    return raw.replace(/^#/, '').trim().toLowerCase()
  }, [])
  const saved = useMemo(() => loadState(), [])
  const { alwaysOnTop, toggleAlwaysOnTop, dockBack } = usePopoutChrome()
  const [muted, setMuted] = useState(false)

  useEffect(() => {
    applyAppearance(normalizeAppearance(saved?.appearance), { windowChrome: false })
  }, [saved])

  useEffect(() => {
    if (channel) document.title = channel
  }, [channel])

  return (
    <div className="stream-popout-root">
      <header className="popout-chrome" data-hit>
        <span className="popout-chrome__title">{channel || 'stream'}</span>
        <div className="popout-chrome__actions">
          <IconButton label={muted ? 'Unmute stream' : 'Mute stream'} onClick={() => setMuted((value) => !value)}>
            {muted ? <MuteIcon /> : <UnmuteIcon />}
          </IconButton>
          <IconButton
            label={alwaysOnTop ? 'Disable always on top' : 'Always on top'}
            active={alwaysOnTop}
            onClick={() => void toggleAlwaysOnTop()}
          >
            <PinIcon />
          </IconButton>
          <button type="button" className="dock-back-btn" onClick={dockBack}>
            Dock back
          </button>
        </div>
      </header>
      <div className="stream-popout-player" data-hit>
        {channel ? <TwitchPlayer channel={channel} muted={muted} interactive /> : null}
      </div>
    </div>
  )
}
