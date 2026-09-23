import GridLayout, { WidthProvider } from 'react-grid-layout'
import type { Layout } from 'react-grid-layout'
import { StreamTile } from './StreamTile'
import { ui } from '../lib/uiLabels'
import type { StreamItem, WatchMode } from '../types'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

const ResponsiveGrid = WidthProvider(GridLayout)

type Props = {
  streams: StreamItem[]
  layout: Layout[]
  focusedId: string | null
  isDragging: boolean
  savedChannels: string[]
  mode: WatchMode
  poppedCount: number
  onLayoutChange: (layout: Layout[]) => void
  onDragState: (active: boolean) => void
  onFocus: (id: string) => void
  onToggleMute: (id: string) => void
  onRemove: (id: string) => void
  onOpenChat: (channel: string) => void
  onPopoutChat: (channel: string) => void
  onPopoutStream: (channel: string) => void
  onToggleSave: (channel: string) => void
  onSwitchFocus: () => void
}

export function StreamGrid({
  streams,
  layout,
  focusedId,
  isDragging,
  savedChannels,
  mode,
  poppedCount,
  onLayoutChange,
  onDragState,
  onFocus,
  onToggleMute,
  onRemove,
  onOpenChat,
  onPopoutChat,
  onPopoutStream,
  onToggleSave,
  onSwitchFocus,
}: Props) {
  if (!streams.length) {
    return (
      <div className="empty-grid">
        {poppedCount > 0 ? (
          <p>Streams are popped out. Use {ui.dockBack} or {ui.dockAllPopouts}.</p>
        ) : (
          <p>Add a channel from the toolbar to fill the desk.</p>
        )}
      </div>
    )
  }

  const tile = (stream: StreamItem) => (
    <StreamTile
      stream={stream}
      focused={focusedId === stream.id}
      interactive={!isDragging}
      isSaved={savedChannels.includes(stream.channel)}
      mode={mode}
      onFocus={() => onFocus(stream.id)}
      onToggleMute={() => onToggleMute(stream.id)}
      onRemove={() => onRemove(stream.id)}
      onOpenChat={() => onOpenChat(stream.channel)}
      onPopoutChat={() => onPopoutChat(stream.channel)}
      onPopoutStream={() => onPopoutStream(stream.channel)}
      onToggleSave={() => onToggleSave(stream.channel)}
    />
  )

  if (mode === 'focus') {
    const hero = streams.find((s) => s.id === focusedId) ?? streams[0]
    const strip = streams.filter((s) => s.id !== hero.id)
    return (
      <div className="focus-stage">
        <div className="focus-hero">{tile(hero)}</div>
        <aside className="focus-strip">
          <button type="button" className="text-btn" onClick={onSwitchFocus}>
            {ui.switchFocus}
          </button>
          {strip.map((stream) => (
            <button
              key={stream.id}
              type="button"
              className="focus-strip__item"
              onClick={() => onFocus(stream.id)}
            >
              {tile(stream)}
            </button>
          ))}
        </aside>
      </div>
    )
  }

  return (
    <ResponsiveGrid
      className="stream-grid"
      layout={layout}
      cols={12}
      rowHeight={40}
      margin={[8, 8]}
      containerPadding={[8, 8]}
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
          {tile(stream)}
        </div>
      ))}
    </ResponsiveGrid>
  )
}
