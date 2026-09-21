import type { CSSProperties } from 'react'
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

function orderedStreams(streams: StreamItem[], focusedId: string | null) {
  if (!streams.length) return []
  const focused = streams.find((s) => s.id === focusedId) ?? streams[0]
  return [focused, ...streams.filter((s) => s.id !== focused.id)]
}

function fitGridStyle(mode: LayoutMode, count: number): CSSProperties {
  if (count <= 1 || mode === '1x1') {
    return { gridTemplateColumns: '1fr', gridTemplateRows: '1fr' }
  }

  if (mode === '1x2') {
    const rows = Math.ceil(count / 2)
    return {
      gridTemplateColumns: '1fr 1fr',
      gridTemplateRows: `repeat(${rows}, 1fr)`,
    }
  }

  if (mode === '1+3') {
    const side = Math.max(count - 1, 1)
    return {
      gridTemplateColumns: '2fr 1fr',
      gridTemplateRows: `repeat(${side}, 1fr)`,
    }
  }

  const cols = count <= 4 ? 2 : 3
  const rows = Math.ceil(count / cols)
  return {
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gridTemplateRows: `repeat(${rows}, 1fr)`,
  }
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

  const tiles = layoutMode === '1x1'
    ? orderedStreams(streams, focusedId).slice(0, 1)
    : orderedStreams(streams, focusedId)

  const plus = layoutMode === '1+3' && tiles.length > 1

  return (
    <div
      className={`fit-grid${plus ? ' fit-grid--plus' : ''}`}
      style={fitGridStyle(layoutMode, tiles.length)}
    >
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
