import { useEffect } from 'react'
import {
  isEditableTarget,
  matchHotkey,
  type HotkeyChord,
  type HotkeyId,
} from '../lib/hotkeys'

type Actions = Partial<Record<HotkeyId, () => void>>

export function useHotkeys(
  hotkeys: Record<HotkeyId, HotkeyChord>,
  actions: Actions,
  options: { paused?: boolean; allowWhenPaused?: readonly HotkeyId[] } = {},
) {
  const { paused = false, allowWhenPaused = [] } = options
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target) && event.code !== 'Escape' && event.code !== 'F11') return

      for (const [id, chord] of Object.entries(hotkeys) as [HotkeyId, HotkeyChord][]) {
        if (!matchHotkey(event, chord)) continue
        if (paused && !allowWhenPaused.includes(id)) return
        const action = actions[id]
        if (!action) continue
        event.preventDefault()
        action()
        return
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [actions, allowWhenPaused, hotkeys, paused])
}
