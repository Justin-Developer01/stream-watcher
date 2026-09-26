import { describe, expect, it } from 'vitest'
import { defaultHotkeys, formatHotkeyEvent, hotkeyActions, hotkeyLabels, hotkeysConflict } from './hotkeys'

const keyEvent = (key: string, mods: { ctrl?: boolean; alt?: boolean; shift?: boolean } = {}) =>
  ({ key, ctrlKey: !!mods.ctrl, metaKey: false, altKey: !!mods.alt, shiftKey: !!mods.shift }) as KeyboardEvent

describe('default hotkeys', () => {
  it('have no conflicts', () => {
    expect(hotkeysConflict(defaultHotkeys)).toEqual({})
  })

  it('give every action a label and a chord', () => {
    for (const action of hotkeyActions) {
      expect(hotkeyLabels[action]).toBeTruthy()
      expect(defaultHotkeys[action]).toBeTruthy()
    }
  })

  it('bind Unmute all to Ctrl+Alt+M, apart from Mute all and Mute focus', () => {
    expect(hotkeyLabels.unmuteAll).toBe('Unmute all')
    expect(defaultHotkeys.unmuteAll).toBe('Ctrl+Alt+M')
    expect(defaultHotkeys.muteAll).toBe('Ctrl+Shift+M')
    expect(defaultHotkeys.muteFocus).toBe('Ctrl+M')
  })

  it('match what a Ctrl+Alt+M keypress formats to', () => {
    expect(formatHotkeyEvent(keyEvent('m', { ctrl: true, alt: true }))).toBe(defaultHotkeys.unmuteAll)
    expect(formatHotkeyEvent(keyEvent('M', { ctrl: true, shift: true }))).toBe(defaultHotkeys.muteAll)
  })
})

describe('hotkeysConflict', () => {
  it('flags both actions when a chord is reused', () => {
    expect(hotkeysConflict({ ...defaultHotkeys, unmuteAll: 'Ctrl+Shift+M' })).toEqual({
      muteAll: 'unmuteAll',
      unmuteAll: 'muteAll',
    })
  })
})
