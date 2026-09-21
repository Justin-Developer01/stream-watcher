import { useEffect, useState } from 'react'

const TIP_KEY = 'stream-watcher:onboarding-tip:v1'

export function FirstRunTip() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem(TIP_KEY)) return
      setOpen(true)
    } catch {
      // ignore
    }
  }, [])

  if (!open) return null

  return (
    <div className="first-run-tip" role="status">
      <p>
        Login for Prime and Login for chat are in the top bar. Dismiss this anytime — there is no setup wizard.
      </p>
      <button
        type="button"
        className="ghost"
        onClick={() => {
          try {
            localStorage.setItem(TIP_KEY, '1')
          } catch {
            // ignore
          }
          setOpen(false)
        }}
      >
        Dismiss
      </button>
    </div>
  )
}
