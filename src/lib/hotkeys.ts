export type HotkeyId =
  | 'focusMode'
  | 'fullscreen'
  | 'toggleChat'
  | 'lockWindow'
  | 'openSettings'
  | 'addStream'
  | 'muteFocus'
  | 'cycleFocus'
  | 'switchFocus'
  | 'muteAll'

export type HotkeyChord = {
  key: string
  alt?: boolean
  ctrl?: boolean
  shift?: boolean
  meta?: boolean
}

export const HOTKEY_ORDER: HotkeyId[] = [
  'focusMode',
  'fullscreen',
  'toggleChat',
  'lockWindow',
  'openSettings',
  'addStream',
  'muteFocus',
  'cycleFocus',
  'switchFocus',
  'muteAll',
]

export const HOTKEY_LABELS: Record<HotkeyId, string> = {
  focusMode: 'Focus mode',
  fullscreen: 'Fullscreen',
  toggleChat: 'Toggle chat',
  lockWindow: 'Lock window',
  openSettings: 'Open Settings',
  addStream: 'Focus search/add stream',
  muteFocus: 'Mute focus stream',
  cycleFocus: 'Cycle streams',
  switchFocus: 'Switch Focus',
  muteAll: 'Mute all',
}

export const DEFAULT_HOTKEYS: Record<HotkeyId, HotkeyChord> = {
  focusMode: { key: 'KeyF' },
  fullscreen: { key: 'F11' },
  toggleChat: { key: 'KeyC' },
  lockWindow: { key: 'KeyL' },
  openSettings: { key: 'Comma', ctrl: true },
  addStream: { key: 'KeyN' },
  muteFocus: { key: 'KeyM' },
  cycleFocus: { key: 'KeyG' },
  switchFocus: { key: 'KeyS' },
  muteAll: { key: 'KeyM', shift: true },
}

function isHotkeyId(value: string): value is HotkeyId {
  return value in DEFAULT_HOTKEYS
}

function normalizeChord(raw: unknown): HotkeyChord | null {
  if (!raw || typeof raw !== 'object') return null
  const chord = raw as Partial<HotkeyChord>
  if (typeof chord.key !== 'string' || !chord.key.trim()) return null
  return {
    key: chord.key,
    alt: chord.alt === true,
    ctrl: chord.ctrl === true,
    shift: chord.shift === true,
    meta: chord.meta === true,
  }
}

export function normalizeHotkeys(raw?: Partial<Record<HotkeyId, HotkeyChord>> | null): Record<HotkeyId, HotkeyChord> {
  const next = { ...DEFAULT_HOTKEYS }
  if (!raw || typeof raw !== 'object') return next
  for (const [id, value] of Object.entries(raw)) {
    if (!isHotkeyId(id)) continue
    const chord = normalizeChord(value)
    if (chord) next[id] = chord
  }
  return next
}

export function chordsEqual(a: HotkeyChord, b: HotkeyChord) {
  return (
    a.key === b.key &&
    Boolean(a.alt) === Boolean(b.alt) &&
    Boolean(a.ctrl) === Boolean(b.ctrl) &&
    Boolean(a.shift) === Boolean(b.shift) &&
    Boolean(a.meta) === Boolean(b.meta)
  )
}

export function formatChord(chord: HotkeyChord) {
  const parts: string[] = []
  if (chord.ctrl) parts.push('Ctrl')
  if (chord.alt) parts.push('Alt')
  if (chord.shift) parts.push('Shift')
  if (chord.meta) parts.push('⌘')
  parts.push(displayKey(chord.key))
  return parts.join('+')
}

function displayKey(code: string) {
  if (code.startsWith('Key')) return code.slice(3)
  if (code.startsWith('Digit')) return code.slice(5)
  if (code === 'Comma') return ','
  if (code === 'Period') return '.'
  if (code === 'Slash') return '/'
  if (code === 'Space') return 'Space'
  if (code === 'Escape') return 'Esc'
  return code
}

export function eventToChord(event: KeyboardEvent): HotkeyChord | null {
  if (event.key === 'Escape') return null
  if (event.repeat) return null
  if (['Control', 'Shift', 'Alt', 'Meta'].includes(event.key)) return null
  return {
    key: event.code,
    alt: event.altKey,
    ctrl: event.ctrlKey || event.metaKey,
    shift: event.shiftKey,
    meta: event.metaKey && !event.ctrlKey ? true : false,
  }
}

export function matchHotkey(event: KeyboardEvent, chord: HotkeyChord) {
  const ctrl = event.ctrlKey || event.metaKey
  return (
    event.code === chord.key &&
    Boolean(chord.alt) === event.altKey &&
    Boolean(chord.ctrl) === ctrl &&
    Boolean(chord.shift) === event.shiftKey
  )
}

export function findHotkeyConflict(
  hotkeys: Record<HotkeyId, HotkeyChord>,
  id: HotkeyId,
  chord: HotkeyChord,
): HotkeyId | null {
  for (const other of HOTKEY_ORDER) {
    if (other === id) continue
    if (chordsEqual(hotkeys[other], chord)) return other
  }
  return null
}

export function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}
