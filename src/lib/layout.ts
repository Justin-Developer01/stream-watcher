import type { Layout } from 'react-grid-layout'
import type { LayoutMode, StreamItem } from '../types'

const BASE = { minW: 3, minH: 4 }

function packExtras(placed: Layout[], extraIds: string[], size = { w: 4, h: 6 }): Layout[] {
  if (!extraIds.length) return placed
  const maxY = Math.max(0, ...placed.map((item) => item.y + item.h))
  const perRow = Math.max(1, Math.floor(12 / size.w))
  const extras = extraIds.map((id, index) => ({
    i: id,
    x: (index % perRow) * size.w,
    y: maxY + Math.floor(index / perRow) * size.h,
    w: size.w,
    h: size.h,
    ...BASE,
  }))
  return [...placed, ...extras]
}

export function layoutRows(layout: Layout[]) {
  return Math.max(1, ...layout.map((item) => item.y + item.h), 1)
}

export function buildPresetLayout(streams: StreamItem[], preset: LayoutMode): Layout[] {
  if (!streams.length) return []
  const ids = streams.map((stream) => stream.id)

  if (preset === '1x1') {
    const [main, ...rest] = ids
    return packExtras(
      [{ i: main, x: 0, y: 0, w: 12, h: 12, minW: 4, minH: 4 }],
      rest,
      { w: 4, h: 4 },
    )
  }

  if (preset === '1x2') {
    const [left, right, ...rest] = ids
    const placed: Layout[] = [
      { i: left, x: 0, y: 0, w: right ? 6 : 12, h: 12, ...BASE },
    ]
    if (right) placed.push({ i: right, x: 6, y: 0, w: 6, h: 12, ...BASE })
    return packExtras(placed, rest, { w: 4, h: 6 })
  }

  if (preset === '2x2') {
    const visible = ids.slice(0, 4)
    const rest = ids.slice(4)
    const placed = visible.map((id, index) => ({
      i: id,
      x: (index % 2) * 6,
      y: Math.floor(index / 2) * 6,
      w: 6,
      h: 6,
      ...BASE,
    }))
    return packExtras(placed, rest, { w: 4, h: 6 })
  }

  const [main, ...rest] = ids
  const side = rest.slice(0, 3)
  const overflow = rest.slice(3)
  const sideH = side.length ? Math.max(4, Math.floor(12 / side.length)) : 12
  const placed: Layout[] = [
    { i: main, x: 0, y: 0, w: side.length ? 8 : 12, h: 12, minW: 4, minH: 6 },
    ...side.map((id, index) => ({
      i: id,
      x: 8,
      y: index * sideH,
      w: 4,
      h: sideH,
      ...BASE,
    })),
  ]
  return packExtras(placed, overflow, { w: 4, h: 4 })
}

export function reconcileLayout(streams: StreamItem[], layout: Layout[], mode: LayoutMode): Layout[] {
  const ids = new Set(streams.map((stream) => stream.id))
  const filtered = layout.filter((item) => ids.has(item.i))
  const missing = streams.filter((stream) => !filtered.some((item) => item.i === stream.id))
  const tall = layoutRows(filtered) > 24
  if (!filtered.length || tall || missing.length) {
    return buildPresetLayout(streams, mode)
  }
  return filtered
}
