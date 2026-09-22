import { useEffect } from 'react'
import {
  isEditableTarget,
  matchHotkey,
  type HotkeyChord,
  type HotkeyId,
} from '../lib/hotkeys'

type Actions = Partial<Record<HotkeyId, () => void>>

export function useHotkeys(hotkeys: Record<HotkeyId, HotkeyChord>, actions: Actions, paused = false) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (paused && event.code !== 'Escape') return
      if (isEditableTarget(event.target) && event.code !== 'Escape' && event.code !== 'F11') return

      for (const [id, chord] of Object.entries(hotkeys) as [HotkeyId, HotkeyChord][]) {
        if (!matchHotkey(event, chord)) continue
        const action = actions[id]
        if (!action) continue
        event.preventDefault()
        action()
        return
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [actions, hotkeys, paused])
}
