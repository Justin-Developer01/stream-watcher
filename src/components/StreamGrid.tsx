import GridLayout, { WidthProvider } from 'react-grid-layout'
import type { Layout } from 'react-grid-layout'
import { StreamTile } from './StreamTile'
import type { StreamItem } from '../types'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

const ResponsiveGrid = WidthProvider(GridLayout)

type Props = {
  streams: StreamItem[]
  layout: Layout[]
  focusedId: string | null
  isDragging: boolean
  savedChannels: string[]
  compact?: boolean
  onLayoutChange: (layout: Layout[]) => void
  onDragState: (active: boolean) => void
  onFocus: (id: string) => void
  onToggleMute: (id: string) => void
  onRemove: (id: string) => void
  onOpenChat: (channel: string) => void
  onPopoutChat: (channel: string) => void
  onToggleSave: (channel: string) => void
}

export function StreamGrid({
  streams,
  layout,
  focusedId,
  isDragging,
  savedChannels,
  compact = false,
  onLayoutChange,
  onDragState,
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
        <p>Add a Twitch channel from the top bar to start building your layout.</p>
      </div>
    )
  }

  return (
    <ResponsiveGrid
      className="stream-grid"
      layout={layout}
      cols={12}
      rowHeight={compact ? 52 : 48}
      margin={compact ? [4, 4] : [8, 8]}
      containerPadding={compact ? [4, 4] : [8, 8]}
      draggableHandle=".stream-drag-handle"
      onLayoutChange={onLayoutChange}
      onDragStart={() => onDragState(true)}
      onDragStop={() => onDragState(false)}
      onResizeStart={() => onDragState(true)}
      onResizeStop={() => onDragState(false)}
      compactType="vertical"
      useCSSTransforms
    >
      {streams.map((stream) => (
        <div key={stream.id} className="stream-grid__item">
          <StreamTile
            stream={stream}
            focused={focusedId === stream.id}
            interactive={!isDragging}
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
    </ResponsiveGrid>
  )
}
