import { TwitchPlayer } from './TwitchPlayer'
import { IconButton } from './IconButton'
import {
  ChatIcon,
  CloseIcon,
  DragIcon,
  MuteIcon,
  PopoutIcon,
  StarFilledIcon,
  StarIcon,
  UnmuteIcon,
} from './icons'
import type { StreamItem } from '../types'

type Props = {
  stream: StreamItem
  focused: boolean
  interactive: boolean
  isSaved: boolean
  showHandle?: boolean
  promoteOnClick?: boolean
  onFocus: () => void
  onToggleMute: () => void
  onRemove: () => void
  onOpenChat: () => void
  onPopoutChat: () => void
  onToggleSave: () => void
}

export function StreamTile({
  stream,
  focused,
  interactive,
  isSaved,
  showHandle = true,
  promoteOnClick = false,
  onFocus,
  onToggleMute,
  onRemove,
  onOpenChat,
  onPopoutChat,
  onToggleSave,
}: Props) {
  return (
    <article className={`stream-tile${focused ? ' is-focused' : ''}${promoteOnClick ? ' is-promotable' : ''}`}>
      <header className="stream-tile__bar">
        {showHandle && (
          <button type="button" className="stream-drag-handle" data-tooltip="Drag to rearrange" aria-label="Drag to rearrange">
            <DragIcon />
          </button>
        )}
        <button type="button" className="stream-tile__channel" onClick={onFocus} title="Focus and unmute">
          {stream.channel}
        </button>
        <div className="stream-tile__actions">
          <IconButton label={`Open #${stream.channel} chat`} onClick={onOpenChat}>
            <ChatIcon />
          </IconButton>
          <IconButton label="Pop out chat" desktopOnly onClick={onPopoutChat}>
            <PopoutIcon />
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
        <TwitchPlayer
          channel={stream.channel}
          muted={stream.muted}
          interactive={interactive}
        />
      </div>
    </article>
  )
}
