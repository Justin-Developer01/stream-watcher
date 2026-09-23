import { useEffect } from 'react'

export function useClickThrough(enabled: boolean) {
  useEffect(() => {
    const api = window.streamWatcher
    if (!api?.setIgnoreMouseEvents) return

    if (!enabled) {
      void api.setIgnoreMouseEvents(false)
      return
    }

    let ignoring = false
    const setIgnore = (next: boolean) => {
      if (ignoring === next) return
      ignoring = next
      void api.setIgnoreMouseEvents(next)
    }

    const onMove = (event: MouseEvent) => {
      const el = document.elementFromPoint(event.clientX, event.clientY)
      const hit = Boolean(el?.closest('[data-hit]'))
      setIgnore(!hit)
    }

    window.addEventListener('mousemove', onMove)
    return () => {
      window.removeEventListener('mousemove', onMove)
      void api.setIgnoreMouseEvents(false)
    }
  }, [enabled])
}
