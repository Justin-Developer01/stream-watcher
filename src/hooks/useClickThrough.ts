import { useEffect } from 'react'

export function useClickThrough(enabled: boolean) {
  useEffect(() => {
    const api = window.streamWatcher
    if (!api?.setIgnoreMouseEvents) return

    if (!enabled) {
      void api.setIgnoreMouseEvents(false)
      return
    }

    const onMove = (event: MouseEvent) => {
      const el = document.elementFromPoint(event.clientX, event.clientY)
      const hit = Boolean(el?.closest('[data-hit]'))
      void api.setIgnoreMouseEvents(!hit)
    }

    window.addEventListener('mousemove', onMove)
    return () => {
      window.removeEventListener('mousemove', onMove)
      void api.setIgnoreMouseEvents(false)
    }
  }, [enabled])
}
