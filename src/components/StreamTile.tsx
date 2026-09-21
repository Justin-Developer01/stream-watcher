import { TwitchPlayer } from './TwitchPlayer'
import type { StreamItem } from '../types'

type Props = {
  stream: StreamItem
  focused: boolean
  interactive: boolean
  isSaved: boolean
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
  onFocus,
  onToggleMute,
  onRemove,
  onOpenChat,
  onPopoutChat,
  onToggleSave,
}: Props) {
  return (
    <article className={`stream-tile${focused ? ' is-focused' : ''}`}>
      <header className="stream-tile__bar">
        <button type="button" className="stream-drag-handle" title="Drag">
          ⋮⋮
        </button>
        <button type="button" className="stream-tile__channel" onClick={onFocus}>
          {stream.channel}
        </button>
        <div className="stream-tile__actions">
          <button
            type="button"
            className="tool-btn"
            onClick={onPopoutChat}
            title="Pop out chat"
          >
            Chat
          </button>
          <button
            type="button"
            className={`tool-btn${isSaved ? ' is-saved' : ''}`}
            onClick={onToggleSave}
            title={isSaved ? 'Unsave' : 'Save'}
          >
            {isSaved ? '★' : '☆'}
          </button>
          <button
            type="button"
            className="tool-btn"
            onClick={onToggleMute}
            title={stream.muted ? 'Unmute' : 'Mute'}
          >
            {stream.muted ? 'M' : 'U'}
          </button>
          <button type="button" className="tool-btn" onClick={onOpenChat} title="Focus chat panel">
            #
          </button>
          <button type="button" className="tool-btn danger" onClick={onRemove} title="Remove">
            ✕
          </button>
        </div>
      </header>
      <div className="stream-tile__player" onDoubleClick={onFocus}>
        <TwitchPlayer
          channel={stream.channel}
          muted={stream.muted}
          interactive={interactive}
        />
      </div>
    </article>
  )
}
