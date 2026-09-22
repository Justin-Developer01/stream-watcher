import { BrowserWindow, screen } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'

export type PopoutKind = 'chat' | 'stream'

export type PopoutRecord = {
  x: number
  y: number
  width: number
  height: number
  alwaysOnTop?: boolean
  displayId?: number
}

const DEFAULT_SIZE: Record<PopoutKind, { width: number; height: number }> = {
  chat: { width: 320, height: 520 },
  stream: { width: 640, height: 400 },
}

function storePath() {
  return path.join(app.getPath('userData'), 'popout-windows.json')
}

function legacyChatPath() {
  return path.join(app.getPath('userData'), 'chat-popout-bounds.json')
}

function keyFor(kind: PopoutKind, channel: string) {
  return `${kind}:${channel.toLowerCase()}`
}

function isRecord(value: unknown): value is PopoutRecord {
  if (!value || typeof value !== 'object') return false
  const rec = value as PopoutRecord
  return [rec.x, rec.y, rec.width, rec.height].every((n) => typeof n === 'number' && Number.isFinite(n))
}

export function readPopoutStore(): Record<string, PopoutRecord> {
  try {
    const raw = JSON.parse(fs.readFileSync(storePath(), 'utf8')) as Record<string, PopoutRecord>
    if (raw && typeof raw === 'object') return raw
  } catch {
    // migrate older chat-only file
  }
  try {
    const legacy = JSON.parse(fs.readFileSync(legacyChatPath(), 'utf8')) as Record<string, PopoutRecord>
    const next: Record<string, PopoutRecord> = {}
    for (const [channel, bounds] of Object.entries(legacy ?? {})) {
      if (isRecord(bounds)) next[keyFor('chat', channel)] = bounds
    }
    if (Object.keys(next).length) writePopoutStore(next)
    return next
  } catch {
    return {}
  }
}

export function writePopoutStore(next: Record<string, PopoutRecord>) {
  try {
    const dest = storePath()
    const tmp = `${dest}.tmp`
    fs.writeFileSync(tmp, JSON.stringify(next))
    try {
      fs.renameSync(tmp, dest)
    } catch {
      fs.copyFileSync(tmp, dest)
      fs.unlinkSync(tmp)
    }
  } catch {
    // ignore disk errors
  }
}

export function readPopout(kind: PopoutKind, channel: string): PopoutRecord | null {
  const rec = readPopoutStore()[keyFor(kind, channel)]
  return isRecord(rec) ? rec : null
}

export function writePopout(kind: PopoutKind, channel: string, patch: Partial<PopoutRecord>) {
  const key = keyFor(kind, channel)
  const store = readPopoutStore()
  const prev = store[key]
  const size = DEFAULT_SIZE[kind]
  const next: PopoutRecord = {
    x: patch.x ?? prev?.x ?? 80,
    y: patch.y ?? prev?.y ?? 80,
    width: patch.width ?? prev?.width ?? size.width,
    height: patch.height ?? prev?.height ?? size.height,
    alwaysOnTop: patch.alwaysOnTop ?? prev?.alwaysOnTop ?? false,
    displayId: patch.displayId ?? prev?.displayId,
  }
  writePopoutStore({ ...store, [key]: next })
  return next
}

export function boundsOnADisplay(bounds: Pick<PopoutRecord, 'x' | 'y' | 'width' | 'height'>) {
  return screen.getAllDisplays().some((display) => {
    const area = display.workArea
    return (
      bounds.x < area.x + area.width &&
      bounds.x + Math.min(48, bounds.width) > area.x &&
      bounds.y < area.y + area.height &&
      bounds.y + Math.min(48, bounds.height) > area.y
    )
  })
}

function fitToArea(bounds: PopoutRecord, area: { x: number; y: number; width: number; height: number }): PopoutRecord {
  return {
    ...bounds,
    x: area.x + 40,
    y: area.y + 40,
    width: Math.min(bounds.width, Math.max(200, area.width - 48)),
    height: Math.min(bounds.height, Math.max(200, area.height - 48)),
  }
}

export function clampToDisplays(bounds: PopoutRecord): PopoutRecord {
  if (boundsOnADisplay(bounds)) return bounds
  return fitToArea(bounds, screen.getPrimaryDisplay().workArea)
}

export function recordFromWindow(win: BrowserWindow): PopoutRecord {
  const bounds = win.getBounds()
  const display = screen.getDisplayMatching(bounds)
  return {
    ...bounds,
    alwaysOnTop: win.isAlwaysOnTop(),
    displayId: display?.id,
  }
}

export function resolvePopoutBounds(
  kind: PopoutKind,
  saved: PopoutRecord | null,
  main: BrowserWindow | null,
  openCount = 0,
): PopoutRecord {
  if (!saved) return defaultPopoutBounds(kind, main, openCount)
  if (typeof saved.displayId === 'number') {
    const display = screen.getAllDisplays().find((item) => item.id === saved.displayId)
    if (display) {
      if (boundsOnADisplay(saved)) return saved
      return { ...fitToArea(saved, display.workArea), displayId: display.id }
    }
  }
  return clampToDisplays(saved)
}

export function debounce(fn: () => void, ms: number) {
  let timer: ReturnType<typeof setTimeout> | null = null
  return () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(fn, ms)
  }
}

export function defaultPopoutBounds(
  kind: PopoutKind,
  main: BrowserWindow | null,
  openCount = 0,
): PopoutRecord {
  const size = DEFAULT_SIZE[kind]
  const stack = (openCount % 6) * 28
  const primary = screen.getPrimaryDisplay()
  const secondary = screen.getAllDisplays().find((display) => display.id !== primary.id)
  if (secondary) {
    return {
      x: secondary.workArea.x + 40 + stack,
      y: secondary.workArea.y + 40 + stack,
      ...size,
      alwaysOnTop: false,
    }
  }
  if (main && !main.isDestroyed()) {
    const bounds = main.getBounds()
    return {
      x: bounds.x + Math.max(48, bounds.width - size.width - 24) + stack,
      y: bounds.y + 72 + stack,
      ...size,
      alwaysOnTop: false,
    }
  }
  return {
    x: primary.workArea.x + 80 + stack,
    y: primary.workArea.y + 80 + stack,
    ...size,
    alwaysOnTop: false,
  }
}

export function primaryWorkAreaBounds(width = 1440, height = 900) {
  const area = screen.getPrimaryDisplay().workArea
  const w = Math.min(width, area.width)
  const h = Math.min(height, area.height)
  return {
    x: area.x + Math.round((area.width - w) / 2),
    y: area.y + Math.round((area.height - h) / 2),
    width: w,
    height: h,
  }
}
