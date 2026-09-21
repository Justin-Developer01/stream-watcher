import { useEffect, useMemo, useRef, useState } from 'react'
import GridLayout from 'react-grid-layout'
import type { Layout } from 'react-grid-layout'
import { layoutRows } from '../lib/layout'
import { DEFAULT_LAYOUT_COLS } from '../types'
import type { StreamItem } from '../types'
import { StreamTile } from './StreamTile'

type Props = {
  streams: StreamItem[]
  layout: Layout[]
  onLayoutChange: (layout: Layout[]) => void
  focusedId: string | null
  focusMode: boolean
  isDragging: boolean
  onDraggingChange: (dragging: boolean) => void
  savedChannels: string[]
  onFocus: (id: string) => void
  onToggleMute: (id: string) => void
  onRemove: (id: string) => void
  onOpenChat: (channel: string) => void
  onPopoutChat: (channel: string) => void
  onToggleSave: (channel: string) => void
}

const MARGIN: [number, number] = [4, 4]
const PADDING: [number, number] = [4, 4]

function EmptyGrid() {
  return (
    <div className="empty-grid">
      <h2>No streams yet</h2>
      <p>Click the title in the top bar to add a Twitch channel.</p>
    </div>
  )
}

export function StreamGrid({
  streams,
  layout,
  onLayoutChange,
  focusedId,
  focusMode,
  isDragging,
  onDraggingChange,
  savedChannels,
  onFocus,
  onToggleMute,
  onRemove,
  onOpenChat,
  onPopoutChat,
  onToggleSave,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const measure = () => {
      setSize({ width: Math.floor(el.clientWidth), height: Math.floor(el.clientHeight) })
    }
    measure()

    const observer = new ResizeObserver(() => measure())
    observer.observe(el)
    return () => observer.disconnect()
  }, [focusMode, streams.length])

  const rows = useMemo(() => layoutRows(layout), [layout])
  const rowHeight = useMemo(() => {
    if (size.height <= 0) return 24
    const available = size.height - PADDING[1] * 2 - MARGIN[1] * (rows + 1)
    return Math.max(12, Math.floor(available / rows))
  }, [rows, size.height])

  if (!streams.length) return <EmptyGrid />

  const renderTile = (stream: StreamItem, options?: { promoteOnClick?: boolean; showHandle?: boolean }) => (
    <StreamTile
      stream={stream}
      focused={focusedId === stream.id}
      interactive={!isDragging && !options?.promoteOnClick}
      showHandle={options?.showHandle ?? !focusMode}
      isSaved={savedChannels.includes(stream.channel)}
      promoteOnClick={options?.promoteOnClick}
      onFocus={() => onFocus(stream.id)}
      onToggleMute={() => onToggleMute(stream.id)}
      onRemove={() => onRemove(stream.id)}
      onOpenChat={() => onOpenChat(stream.channel)}
      onPopoutChat={() => onPopoutChat(stream.channel)}
      onToggleSave={() => onToggleSave(stream.channel)}
    />
  )

  if (focusMode) {
    const hero = streams.find((stream) => stream.id === focusedId) ?? streams[0]
    const others = streams.filter((stream) => stream.id !== hero.id)
    return (
      <div className="focus-layout" ref={containerRef}>
        <div className="focus-layout__hero">{renderTile(hero, { showHandle: false })}</div>
        {others.length > 0 && (
          <div className="focus-layout__strip" aria-label="Other streams">
            {others.map((stream) => (
              <div key={stream.id} className="focus-layout__strip-item">
                {renderTile(stream, { promoteOnClick: true, showHandle: false })}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={`stream-grid${isDragging ? ' is-interacting' : ''}`}
      ref={containerRef}
    >
      {size.width > 0 && size.height > 0 && (
        <GridLayout
          className="stream-grid__layout"
          layout={layout}
          cols={DEFAULT_LAYOUT_COLS}
          rowHeight={rowHeight}
          width={size.width}
          margin={MARGIN}
          containerPadding={PADDING}
          autoSize={false}
          compactType="vertical"
          useCSSTransforms
          draggableHandle=".stream-drag-handle"
          draggableCancel=".icon-btn, .stream-tile__channel, .stream-tile__actions, button, input, select"
          isDraggable
          isResizable
          resizeHandles={['se']}
          onLayoutChange={onLayoutChange}
          onDragStart={() => onDraggingChange(true)}
          onDragStop={() => onDraggingChange(false)}
          onResizeStart={() => onDraggingChange(true)}
          onResizeStop={() => onDraggingChange(false)}
        >
          {streams.map((stream) => (
            <div key={stream.id} className="stream-grid__item">
              {renderTile(stream)}
            </div>
          ))}
        </GridLayout>
      )}
    </div>
  )
}
