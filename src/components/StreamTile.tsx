import { TwitchPlayer } from './TwitchPlayer'
import { IconButton } from './IconButton'
import {
  ChatIcon,
  CloseIcon,
  DragIcon,
  MonitorIcon,
  MuteIcon,
  PopoutIcon,
  StarFilledIcon,
  StarIcon,
  UnmuteIcon,
} from './icons'
import type { StreamItem } from '../types'
import { UI } from '../lib/uiLabels'

type Props = {
  stream: StreamItem
  focused: boolean
  interactive: boolean
  isSaved: boolean
  showHandle?: boolean
  promoteOnClick?: boolean
  economy?: boolean
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
  showHandle = true,
  promoteOnClick = false,
  economy = false,
  onFocus,
  onToggleMute,
  onRemove,
  onOpenChat,
  onPopoutChat,
  onPopoutStream,
  onToggleSave,
}: Props) {
  return (
    <article className={`stream-tile${focused ? ' is-focused' : ''}${promoteOnClick ? ' is-promotable' : ''}${economy ? ' is-economy' : ''}`} data-hit>
      <header className="stream-tile__bar">
        {showHandle && (
          <div className="stream-drag-handle" data-tooltip="Drag to rearrange" role="button" aria-label="Drag to rearrange" tabIndex={0}>
            <DragIcon />
          </div>
        )}
        <button type="button" className="stream-tile__channel" onClick={onFocus} title="Focus and unmute">
          {stream.channel}
        </button>
        <div className="stream-tile__actions">
          <IconButton label={`Open #${stream.channel} chat`} onClick={onOpenChat}>
            <ChatIcon />
          </IconButton>
          <IconButton label={UI.popOutChat} desktopOnly onClick={onPopoutChat}>
            <PopoutIcon />
          </IconButton>
          <IconButton label={UI.popOutStream} desktopOnly onClick={onPopoutStream}>
            <MonitorIcon />
          </IconButton>
          <IconButton
            label={isSaved ? 'Unsave stream' : 'Save stream'}
            active={isSaved}
            onClick={onToggleSave}
          >
            {isSaved ? <StarFilledIcon /> : <StarIcon />}
          </IconButton>
          <IconButton
            label={stream.muted ? 'Unmute stream' : 'Mute stream'}
            onClick={onToggleMute}
          >
            {stream.muted ? <MuteIcon /> : <UnmuteIcon />}
          </IconButton>
          <IconButton label="Remove stream" danger onClick={onRemove}>
            <CloseIcon />
          </IconButton>
        </div>
      </header>
      <div
        className="stream-tile__player"
        onClick={promoteOnClick ? onFocus : undefined}
        onDoubleClick={onFocus}
      >
        {economy && <span className="stream-tile__chip">paused / low</span>}
        <TwitchPlayer
          channel={stream.channel}
          muted={stream.muted || economy}
          interactive={interactive}
          paused={economy}
        />
      </div>
    </article>
  )
}
