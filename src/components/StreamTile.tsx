import { MessageSquare, PictureInPicture2, Star, Volume2, VolumeX, X } from 'lucide-react'
import { Tip } from './ui/Tip'
import { TwitchPlayer } from './TwitchPlayer'
import { ui } from '../lib/uiLabels'
import type { StreamItem, WatchMode } from '../types'

type Props = {
  stream: StreamItem
  focused: boolean
  interactive: boolean
  isSaved: boolean
  mode: WatchMode
  onFocus: () => void
  onToggleMute: () => void
  onRemove: () => void
  onOpenChat: () => void
  onPopoutChat: () => void
  onPopoutStream: () => void
  onToggleSave: () => void
}

export function StreamTile({
  stream,
  focused,
  interactive,
  isSaved,
  mode,
  onFocus,
  onToggleMute,
  onRemove,
  onOpenChat,
  onPopoutChat,
  onPopoutStream,
  onToggleSave,
}: Props) {
  const low = mode === 'performance' && !focused

  return (
    <article className={`stream-tile${focused ? ' is-focused' : ''}${low ? ' is-low' : ''}`} data-hit>
      <header className={`stream-tile__bar${mode === 'focus' ? '' : ' stream-drag-handle'}`} data-hit>
        <button type="button" className="stream-tile__channel" onClick={onFocus}>
          {stream.channel}
        </button>
        {low && <span className="perf-chip">{ui.low}</span>}
        <div className="stream-tile__actions" onClick={(event) => event.stopPropagation()}>
          <Tip label={isSaved ? ui.saved : 'Star save'}>
            <button type="button" className={`icon-btn${isSaved ? ' is-on' : ''}`} onClick={onToggleSave}>
              <Star size={13} fill={isSaved ? 'currentColor' : 'none'} />
            </button>
          </Tip>
          <Tip label={stream.muted ? ui.unmute : ui.mute}>
            <button type="button" className="icon-btn" onClick={onToggleMute}>
              {stream.muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
            </button>
          </Tip>
          <Tip label={ui.openChat}>
            <button type="button" className="icon-btn" onClick={onOpenChat}>
              <MessageSquare size={13} />
            </button>
          </Tip>
          <Tip label={ui.popOutChat}>
            <button type="button" className="icon-btn" onClick={onPopoutChat}>
              <span className="tiny">#</span>
            </button>
          </Tip>
          <Tip label={ui.popOutStream}>
            <button type="button" className="icon-btn" onClick={onPopoutStream}>
              <PictureInPicture2 size={13} />
            </button>
          </Tip>
          <Tip label="Remove">
            <button type="button" className="icon-btn danger" onClick={onRemove}>
              <X size={13} />
            </button>
          </Tip>
        </div>
      </header>
      <div className="stream-tile__player" onDoubleClick={onFocus}>
        <TwitchPlayer
          channel={stream.channel}
          muted={stream.muted || low}
          interactive={interactive}
          paused={low}
          lowQuality={low}
        />
      </div>
    </article>
  )
}
