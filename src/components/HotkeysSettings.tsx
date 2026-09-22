import { useEffect, useState } from 'react'
import {
  DEFAULT_HOTKEYS,
  HOTKEY_LABELS,
  HOTKEY_ORDER,
  eventToChord,
  findHotkeyConflict,
  formatChord,
  type HotkeyChord,
  type HotkeyId,
} from '../lib/hotkeys'

type Props = {
  hotkeys: Record<HotkeyId, HotkeyChord>
  onChange: (hotkeys: Record<HotkeyId, HotkeyChord>) => void
}

export function HotkeysSettings({ hotkeys, onChange }: Props) {
  const [listening, setListening] = useState<HotkeyId | null>(null)
  const [conflict, setConflict] = useState<string | null>(null)

  useEffect(() => {
    if (!listening) return
    const onKey = (event: KeyboardEvent) => {
      event.preventDefault()
      event.stopPropagation()
      if (event.key === 'Escape') {
        setListening(null)
        return
      }
      const chord = eventToChord(event)
      if (!chord) return
      const taken = findHotkeyConflict(hotkeys, listening, chord)
      if (taken) {
        setConflict(`${formatChord(chord)} is already used by ${HOTKEY_LABELS[taken]}`)
        return
      }
      setConflict(null)
      onChange({ ...hotkeys, [listening]: chord })
      setListening(null)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [hotkeys, listening, onChange])

  return (
    <section className="popover-section">
      <h2>Hotkeys</h2>
      <div className="hotkey-list">
        {HOTKEY_ORDER.map((id) => (
          <div key={id} className="hotkey-row">
            <span>{HOTKEY_LABELS[id]}</span>
            <button
              type="button"
              className={`hotkey-chip${listening === id ? ' is-listening' : ''}`}
              onClick={() => {
                setConflict(null)
                setListening((current) => (current === id ? null : id))
              }}
            >
              {listening === id ? 'Press a key' : formatChord(hotkeys[id])}
            </button>
          </div>
        ))}
      </div>
      <p className="hint">{listening ? 'Click to rebind — press a key, Esc cancels.' : 'Click a keychip to rebind.'}</p>
      {conflict && <p className="field-error">{conflict}</p>}
      <button
        type="button"
        className="ghost"
        onClick={() => {
          setConflict(null)
          setListening(null)
          onChange({ ...DEFAULT_HOTKEYS })
        }}
      >
        Reset defaults
      </button>
    </section>
  )
}
