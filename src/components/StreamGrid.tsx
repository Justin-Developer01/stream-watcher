import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import GridLayout from 'react-grid-layout'
import type { Layout } from 'react-grid-layout'
import { StreamTile } from './StreamTile'
import { ui } from '../lib/uiLabels'
import type { StreamItem, WatchMode } from '../types'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

const GRID_MARGIN: [number, number] = [8, 8]
const GRID_PADDING: [number, number] = [8, 8]

function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => {
      const next = { width: el.clientWidth, height: el.clientHeight }
      setSize((prev) => (prev.width === next.width && prev.height === next.height ? prev : next))
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return [ref, size] as const
}

function rowSpan(layout: Layout[]) {
  return layout.reduce((max, item) => Math.max(max, item.y + item.h), 1)
}

function layoutsEqual(a: Layout[], b: Layout[]) {
  if (a.length !== b.length) return false
  const byId = new Map(a.map((item) => [item.i, item]))
  return b.every((item) => {
    const prev = byId.get(item.i)
    return !!prev && prev.x === item.x && prev.y === item.y && prev.w === item.w && prev.h === item.h
  })
}

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
    <MeasuredGrid
      layout={layout}
      onLayoutChange={onLayoutChange}
      onDragState={onDragState}
      streams={streams}
      tile={tile}
    />
  )
}

function MeasuredGrid({
  layout,
  onLayoutChange,
  onDragState,
  streams,
  tile,
}: {
  layout: Layout[]
  onLayoutChange: (layout: Layout[]) => void
  onDragState: (active: boolean) => void
  streams: StreamItem[]
  tile: (stream: StreamItem) => ReactNode
}) {
  const [ref, size] = useElementSize<HTMLDivElement>()
  const layoutRef = useRef(layout)
  layoutRef.current = layout
  const rows = rowSpan(layout)
  const vertical = GRID_PADDING[1] * 2 + GRID_MARGIN[1] * Math.max(rows - 1, 0)
  const rowHeight = size.height > vertical ? (size.height - vertical) / rows : 40
  const emitLayout = useCallback((next: Layout[]) => {
    if (layoutsEqual(layoutRef.current, next)) return
    onLayoutChange(next)
  }, [onLayoutChange])

  return (
    <div ref={ref} className="stream-grid-measure">
      {size.width > 0 && (
        <GridLayout
          className="stream-grid"
          width={size.width}
          layout={layout}
          cols={12}
          rowHeight={rowHeight}
          margin={GRID_MARGIN}
          containerPadding={GRID_PADDING}
          draggableHandle=".stream-drag-handle"
          onLayoutChange={emitLayout}
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
        </GridLayout>
      )}
    </div>
  )
}
