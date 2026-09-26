import { memo } from 'react'
import * as Slider from '@radix-ui/react-slider'
import { MessageSquare, PictureInPicture2, Star, Volume2, VolumeX, X } from 'lucide-react'
import { Tip } from './ui/Tip'
import { PlayerErrorBoundary } from './PlayerErrorBoundary'
import { StreamPlayer } from './StreamPlayer'
import { getPlatform } from '../lib/platforms/registry'
import type { PlayerTimeApi } from '../lib/platforms/types'
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
  onVolume: (volume: number) => void
  onTimeApi: (api: PlayerTimeApi | null) => void
}

function StreamTileImpl({
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
  onVolume,
  onTimeApi,
}: Props) {
  const low = mode === 'performance' && !focused
  const hasChat = getPlatform(stream.platform).hasChat

  return (
    <article className={`stream-tile${focused ? ' is-focused' : ''}${low ? ' is-low' : ''}`} data-hit>
      {/* Level only, sits above the header (not next to mute) so it reads as the tile's own
          strip rather than a Settings control; the header stays the binary mute toggle. */}
      <div className="stream-tile__volume" data-hit onClick={(event) => event.stopPropagation()}>
        <Slider.Root
          className="volume-slider"
          min={0}
          max={1}
          step={0.05}
          value={[stream.muted ? 0 : stream.volume]}
          onValueChange={([value]) => onVolume(value)}
        >
          <Slider.Track className="volume-slider__track">
            <Slider.Range className="volume-slider__range" />
          </Slider.Track>
          <Slider.Thumb className="volume-slider__thumb" aria-label={ui.volume} />
        </Slider.Root>
      </div>
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
          {hasChat && (
            <Tip label={ui.openChat}>
              <button type="button" className="icon-btn" onClick={onOpenChat}>
                <MessageSquare size={13} />
              </button>
            </Tip>
          )}
          {hasChat && (
            <Tip label={ui.popOutChat}>
              <button type="button" className="icon-btn" onClick={onPopoutChat}>
                <span className="tiny">#</span>
              </button>
            </Tip>
          )}
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
        <PlayerErrorBoundary label={`${stream.platform}:${stream.channel}`}>
          <StreamPlayer
            platform={stream.platform}
            channel={stream.channel}
            muted={stream.muted || low}
            volume={stream.volume}
            interactive={interactive}
            paused={low}
            lowQuality={low}
            onTimeApi={onTimeApi}
          />
        </PlayerErrorBoundary>
      </div>
    </article>
  )
}

/**
 * Tiles hold live players, so skip re-rendering unless what they show changed. The handlers are
 * per-tile closures over the same stream id, so comparing them would only defeat the memo.
 */
export const StreamTile = memo(
  StreamTileImpl,
  (a, b) =>
    a.stream === b.stream &&
    a.focused === b.focused &&
    a.interactive === b.interactive &&
    a.isSaved === b.isSaved &&
    a.mode === b.mode,
)
