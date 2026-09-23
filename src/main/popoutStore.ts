import { app, screen, type BrowserWindow } from 'electron'
import { copyFileSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export type SavedPopout = {
  x: number
  y: number
  width: number
  height: number
  alwaysOnTop: boolean
}

function storePath() {
  return join(app.getPath('userData'), 'popout-windows.json')
}

function isSaved(value: unknown): value is SavedPopout {
  if (!value || typeof value !== 'object') return false
  const rec = value as Partial<SavedPopout>
  return [rec.x, rec.y, rec.width, rec.height].every((n) => typeof n === 'number' && Number.isFinite(n))
}

export function readPopoutStore(): Record<string, SavedPopout> {
  try {
    const raw = JSON.parse(readFileSync(storePath(), 'utf8')) as Record<string, unknown>
    const next: Record<string, SavedPopout> = {}
    for (const [key, value] of Object.entries(raw ?? {})) {
      if (!isSaved(value)) continue
      next[key] = { ...value, alwaysOnTop: value.alwaysOnTop === true }
    }
    return next
  } catch {
    return {}
  }
}

export function writePopoutStore(next: Record<string, SavedPopout>) {
  try {
    const dest = storePath()
    const tmp = `${dest}.tmp`
    writeFileSync(tmp, JSON.stringify(next))
    try {
      renameSync(tmp, dest)
    } catch {
      copyFileSync(tmp, dest)
      unlinkSync(tmp)
    }
  } catch {
    // ignore disk errors
  }
}

function onADisplay(bounds: SavedPopout) {
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

/** Keep a remembered window on a display that still exists. */
export function resolvePopoutBounds(saved: SavedPopout | undefined): SavedPopout | null {
  if (!saved) return null
  if (onADisplay(saved)) return saved
  const area = screen.getPrimaryDisplay().workArea
  return {
    ...saved,
    x: area.x + 40,
    y: area.y + 40,
    width: Math.min(saved.width, Math.max(200, area.width - 48)),
    height: Math.min(saved.height, Math.max(200, area.height - 48)),
  }
}

export function recordFromWindow(win: BrowserWindow, alwaysOnTop: boolean): SavedPopout {
  return { ...win.getBounds(), alwaysOnTop }
}
