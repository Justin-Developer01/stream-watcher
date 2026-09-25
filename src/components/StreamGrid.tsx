import { memo, useCallback, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import GridLayout from 'react-grid-layout'
import type { Layout } from 'react-grid-layout'
import { StreamTile } from './StreamTile'
import { ui } from '../lib/uiLabels'
import { streamKey } from '../lib/storage'
import type { PlatformId, StreamItem, WatchMode } from '../types'
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
  savedKeys: Set<string>
  mode: WatchMode
  poppedCount: number
  onLayoutChange: (layout: Layout[]) => void
  onDragState: (active: boolean) => void
  onFocus: (id: string) => void
  onToggleMute: (id: string) => void
  onRemove: (id: string) => void
  onOpenChat: (channel: string) => void
  onPopoutChat: (channel: string, platform: PlatformId) => void
  onPopoutStream: (channel: string, platform: PlatformId) => void
  onToggleSave: (platform: PlatformId, channel: string) => void
  onSwitchFocus: () => void
}

export const StreamGrid = memo(function StreamGrid({
  streams,
  layout,
  focusedId,
  isDragging,
  savedKeys,
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
  // Tiles are memoized and keep the closures from their last render; route them through a ref so
  // they always call the grid's current handlers (focusStream depends on the stream list).
  const handlers = useRef({ onFocus, onToggleMute, onRemove, onOpenChat, onPopoutChat, onPopoutStream, onToggleSave })
  handlers.current = { onFocus, onToggleMute, onRemove, onOpenChat, onPopoutChat, onPopoutStream, onToggleSave }

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

  // Strip tiles promote on click, so their players must not swallow the click (pre.17 promoteOnClick).
  const tile = (stream: StreamItem, promoteOnClick = false) => (
    <StreamTile
      stream={stream}
      focused={focusedId === stream.id}
      interactive={!isDragging && !promoteOnClick}
      isSaved={savedKeys.has(streamKey(stream.platform, stream.channel))}
      mode={mode}
      onFocus={() => handlers.current.onFocus(stream.id)}
      onToggleMute={() => handlers.current.onToggleMute(stream.id)}
      onRemove={() => handlers.current.onRemove(stream.id)}
      onOpenChat={() => handlers.current.onOpenChat(stream.channel)}
      onPopoutChat={() => handlers.current.onPopoutChat(stream.channel, stream.platform)}
      onPopoutStream={() => handlers.current.onPopoutStream(stream.channel, stream.platform)}
      onToggleSave={() => handlers.current.onToggleSave(stream.platform, stream.channel)}
    />
  )

  if (mode === 'focus') {
    const hero = streams.find((s) => s.id === focusedId) ?? streams[0]
    const strip = streams.filter((s) => s.id !== hero.id)
    // Every tile stays a keyed child of .focus-stage, in desk order; promoting only changes its class
    // and grid slot. Split across a hero box and a strip box, a promote moved both streams to a new
    // parent, which React can only do by remounting them, and a re-attached iframe always reloads.
    const stageStyle = {
      '--focus-span': streams.length,
      '--focus-rows': strip.length ? `auto repeat(${strip.length}, minmax(0, 28%)) 1fr` : 'auto 1fr',
    } as CSSProperties
    return (
      <div className="focus-stage" style={stageStyle}>
        <button type="button" className="text-btn focus-switch" data-hit onClick={onSwitchFocus}>
          {ui.switchFocus}
        </button>
        {streams.map((stream) => {
          if (stream.id === hero.id) {
            return (
              <div key={stream.id} className="focus-hero">
                {tile(stream)}
              </div>
            )
          }
          return (
            <div
              key={stream.id}
              className="focus-strip__item"
              style={{ '--focus-slot': strip.indexOf(stream) + 2 } as CSSProperties}
              role="button"
              tabIndex={0}
              onClick={() => onFocus(stream.id)}
              onKeyDown={(event) => {
                if (event.target !== event.currentTarget) return
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onFocus(stream.id)
                }
              }}
            >
              {tile(stream, true)}
            </div>
          )
        })}
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
})

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
  tile: (stream: StreamItem, promoteOnClick?: boolean) => ReactNode
}) {
  const [ref, size] = useElementSize<HTMLDivElement>()
  const layoutRef = useRef(layout)
  layoutRef.current = layout
  // A popped-out stream has no rendered tile, so react-grid-layout must never see its layout
  // entry: handed a layout item with no matching child, it "corrects" that item down to 1x1 on
  // the next layout event, corrupting the size it should be restored to on dock-back.
  const visibleIds = useMemo(() => new Set(streams.map((s) => s.id)), [streams])
  const visibleLayout = useMemo(() => layout.filter((l) => visibleIds.has(l.i)), [layout, visibleIds])
  const rows = rowSpan(visibleLayout)
  const vertical = GRID_PADDING[1] * 2 + GRID_MARGIN[1] * Math.max(rows - 1, 0)
  const rowHeight = size.height > vertical ? (size.height - vertical) / rows : 40
  const emitLayout = useCallback((next: Layout[]) => {
    // next only covers currently-visible items; merge into the full layout so a popped
    // stream's own remembered position is untouched rather than dropped or corrupted.
    const merged = layoutRef.current.map((l) => next.find((n) => n.i === l.i) ?? l)
    for (const n of next) if (!merged.some((m) => m.i === n.i)) merged.push(n)
    if (layoutsEqual(layoutRef.current, merged)) return
    onLayoutChange(merged)
  }, [onLayoutChange])

  return (
    <div ref={ref} className="stream-grid-measure">
      {size.width > 0 && (
        <GridLayout
          className="stream-grid"
          width={size.width}
          layout={visibleLayout}
          cols={12}
          rowHeight={rowHeight}
          margin={GRID_MARGIN}
          containerPadding={GRID_PADDING}
          draggableHandle=".stream-drag-handle"
          draggableCancel=".stream-tile__actions, .stream-tile__actions *, .icon-btn"
          isDraggable
          isResizable
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
