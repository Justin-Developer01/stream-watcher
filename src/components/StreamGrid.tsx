import { StreamTile } from './StreamTile'
import type { LayoutMode, StreamItem } from '../types'

type Props = {
  streams: StreamItem[]
  layoutMode: LayoutMode
  focusedId: string | null
  savedChannels: string[]
  onFocus: (id: string) => void
  onToggleMute: (id: string) => void
  onRemove: (id: string) => void
  onOpenChat: (channel: string) => void
  onPopoutChat: (channel: string) => void
  onToggleSave: (channel: string) => void
}

function visibleStreams(streams: StreamItem[], mode: LayoutMode, focusedId: string | null) {
  if (!streams.length) return []
  const focused = streams.find((s) => s.id === focusedId) ?? streams[0]
  const rest = streams.filter((s) => s.id !== focused.id)

  if (mode === '1x1') return [focused]
  if (mode === '1x2') return [focused, ...rest].slice(0, 2)
  return [focused, ...rest].slice(0, 4)
}

export function StreamGrid({
  streams,
  layoutMode,
  focusedId,
  savedChannels,
  onFocus,
  onToggleMute,
  onRemove,
  onOpenChat,
  onPopoutChat,
  onToggleSave,
}: Props) {
  if (!streams.length) {
    return (
      <div className="empty-grid">
        <h2>No streams yet</h2>
        <p>Click the title in the top bar to add a Twitch channel.</p>
      </div>
    )
  }

  const tiles = visibleStreams(streams, layoutMode, focusedId)
  const modeClass =
    layoutMode === '1+3' ? 'fit-grid--plus' : `fit-grid--${layoutMode.replace('+', 'p')}`

  return (
    <div className={`fit-grid ${modeClass}`}>
      {tiles.map((stream) => (
        <div key={stream.id} className="fit-grid__item">
          <StreamTile
            stream={stream}
            focused={focusedId === stream.id}
            interactive
            isSaved={savedChannels.includes(stream.channel)}
            onFocus={() => onFocus(stream.id)}
            onToggleMute={() => onToggleMute(stream.id)}
            onRemove={() => onRemove(stream.id)}
            onOpenChat={() => onOpenChat(stream.channel)}
            onPopoutChat={() => onPopoutChat(stream.channel)}
            onToggleSave={() => onToggleSave(stream.channel)}
          />
        </div>
      ))}
    </div>
  )
}
