export const hotkeyActions = [
  'focusMode',
  'fullscreen',
  'toggleChat',
  'lockWindow',
  'openSettings',
  'focusSearch',
  'muteFocus',
  'cycleStreams',
  'switchFocus',
  'muteAll',
  'toggleToolbar',
  'quitApplication',
] as const

export type HotkeyAction = (typeof hotkeyActions)[number]

export const hotkeyLabels: Record<HotkeyAction, string> = {
  focusMode: 'Focus mode',
  fullscreen: 'Fullscreen',
  toggleChat: 'Toggle chat',
  lockWindow: 'Lock window',
  openSettings: 'Open Settings',
  focusSearch: 'Focus search/add stream',
  muteFocus: 'Mute focus',
  cycleStreams: 'Cycle streams',
  switchFocus: 'Switch Focus',
  muteAll: 'Mute all',
  toggleToolbar: 'Toggle toolbar',
  quitApplication: 'Quit application',
}

export const defaultHotkeys: Record<HotkeyAction, string> = {
  focusMode: 'Ctrl+Shift+F',
  fullscreen: 'F11',
  toggleChat: 'Ctrl+Shift+C',
  lockWindow: 'Ctrl+Shift+L',
  openSettings: 'Ctrl+,',
  focusSearch: 'Ctrl+K',
  muteFocus: 'Ctrl+M',
  cycleStreams: 'Ctrl+Tab',
  switchFocus: 'Ctrl+Shift+S',
  muteAll: 'Ctrl+Shift+M',
  toggleToolbar: 'Ctrl+\\',
  quitApplication: 'Ctrl+Q',
}

export function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

export function formatHotkeyEvent(event: KeyboardEvent): string {
  const parts: string[] = []
  if (event.ctrlKey || event.metaKey) parts.push('Ctrl')
  if (event.altKey) parts.push('Alt')
  if (event.shiftKey) parts.push('Shift')
  const key = event.key.length === 1 ? event.key.toUpperCase() : event.key
  if (!['Control', 'Meta', 'Alt', 'Shift'].includes(event.key)) parts.push(key)
  return parts.join('+')
}

export function hotkeysConflict(
  map: Record<HotkeyAction, string>,
): Partial<Record<HotkeyAction, HotkeyAction>> {
  const inverse = new Map<string, HotkeyAction>()
  const conflicts: Partial<Record<HotkeyAction, HotkeyAction>> = {}
  for (const action of hotkeyActions) {
    const combo = map[action]
    const existing = inverse.get(combo)
    if (existing) {
      conflicts[action] = existing
      conflicts[existing] = action
    } else {
      inverse.set(combo, action)
    }
  }
  return conflicts
}
