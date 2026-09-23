import { useEffect, useState } from 'react'
import { UI } from '../lib/uiLabels'

const TIP_KEY = 'stream-watcher:first-run-tips:v1'
const SHOW_EVENT = 'stream-watcher:show-first-run-tips'

const TIPS = [
  `${UI.focusMode} — one stream large, others in the strip.`,
  `${UI.openChat} pushes the grid. ${UI.popOutChat} is a separate window.`,
  `${UI.seeThroughWindows} — freeze it with the Lock window hotkey (L) when you need the UI.`,
  `${UI.dockBack} returns a pop-out to the main desk.`,
]

function readDismissed() {
  try {
    return localStorage.getItem(TIP_KEY) === '1'
  } catch {
    return true
  }
}

function writeDismissed() {
  try {
    localStorage.setItem(TIP_KEY, '1')
  } catch {
    // ignore quota / private mode
  }
}

export function requestFirstRunTips() {
  window.dispatchEvent(new Event(SHOW_EVENT))
}

export function FirstRunTips({ hidden = false }: { hidden?: boolean }) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!readDismissed()) setOpen(true)
    const show = () => {
      setStep(0)
      setOpen(true)
    }
    window.addEventListener(SHOW_EVENT, show)
    return () => window.removeEventListener(SHOW_EVENT, show)
  }, [])

  if (!open || hidden) return null

  const last = step >= TIPS.length - 1
  const dismiss = () => {
    writeDismissed()
    setOpen(false)
  }

  return (
    <div className="first-run-tip" role="status" data-hit>
      <p>
        <span className="first-run-tip__index">
          {step + 1}/{TIPS.length}
        </span>{' '}
        {TIPS[step]}
      </p>
      <div className="first-run-tip__actions">
        <button type="button" className="ghost" onClick={dismiss}>
          Skip
        </button>
        {last ? (
          <button type="button" onClick={dismiss}>
            Done
          </button>
        ) : (
          <button type="button" onClick={() => setStep((value) => value + 1)}>
            Next
          </button>
        )}
      </div>
    </div>
  )
}
