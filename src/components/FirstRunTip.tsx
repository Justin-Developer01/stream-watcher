import { useEffect, useState } from 'react'

const TIP_KEY = 'stream-watcher:onboarding-tip:v2'

function readDismissed() {
  try {
    return localStorage.getItem(TIP_KEY) === '1'
  } catch {
    return true
  }
}

export function FirstRunTip() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!readDismissed()) setOpen(true)
  }, [])

  if (!open) return null

  const dismiss = () => {
    try {
      localStorage.setItem(TIP_KEY, '1')
    } catch {
      // ignore quota / private mode
    }
    setOpen(false)
  }

  return (
    <div className="first-run-tip" role="status">
      <p>Login for Prime and Login for chat are in the top bar.</p>
      <button type="button" className="ghost" onClick={dismiss}>
        Dismiss
      </button>
    </div>
  )
}
