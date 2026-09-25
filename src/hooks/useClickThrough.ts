import { useEffect } from 'react'
import type { ChromeEdge } from '../types'

const CHROME_BAND = 48
const PASSING_CLASS = 'is-passing-clicks'

function nearChrome(edge: ChromeEdge, x: number, y: number) {
  switch (edge) {
    case 'bottom':
      return y > window.innerHeight - CHROME_BAND
    case 'left':
      return x < CHROME_BAND
    case 'right':
      return x > window.innerWidth - CHROME_BAND
    default:
      return y < CHROME_BAND
  }
}

/** Click-through hits the stage only. The chrome band and [data-hit] UI stay interactive. */
export function useClickThrough(enabled: boolean, chromeEdge: ChromeEdge) {
  useEffect(() => {
    const api = window.vesper
    if (!api?.setIgnoreMouseEvents) return

    if (!enabled) {
      void api.setIgnoreMouseEvents(false)
      return
    }

    let ignoring = false
    const setIgnore = (next: boolean) => {
      if (ignoring === next) return
      ignoring = next
      // Embed iframes swallow mousemove; while clicks pass through anyway, let the desk see the pointer.
      document.documentElement.classList.toggle(PASSING_CLASS, next)
      void api.setIgnoreMouseEvents(next)
    }

    // Leave the bar clickable until the pointer moves onto the stage.
    setIgnore(false)

    const onMove = (event: MouseEvent) => {
      const el = document.elementFromPoint(event.clientX, event.clientY)
      const hit = Boolean(el?.closest('[data-hit]'))
      const near = nearChrome(chromeEdge, event.clientX, event.clientY)
      setIgnore(!(hit || near))
    }

    window.addEventListener('mousemove', onMove)
    return () => {
      window.removeEventListener('mousemove', onMove)
      document.documentElement.classList.remove(PASSING_CLASS)
      void api.setIgnoreMouseEvents(false)
    }
  }, [enabled, chromeEdge])
}
