import { useCallback, useEffect, useState } from 'react'

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    if (window.streamWatcher?.onFullscreenChange) {
      const unsub = window.streamWatcher.onFullscreenChange(setIsFullscreen)
      void window.streamWatcher.isFullscreen().then(setIsFullscreen)
      return () => unsub()
    }

    const syncDom = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', syncDom)
    return () => document.removeEventListener('fullscreenchange', syncDom)
  }, [])

  const setFullscreen = useCallback(async (next: boolean) => {
    if (window.streamWatcher?.setFullscreen) {
      await window.streamWatcher.setFullscreen(next)
      setIsFullscreen(next)
      return
    }

    if (next && !document.fullscreenElement) {
      await document.documentElement.requestFullscreen()
    } else if (!next && document.fullscreenElement) {
      await document.exitFullscreen()
    }
  }, [])

  const toggleFullscreen = useCallback(async () => {
    await setFullscreen(!isFullscreen)
  }, [isFullscreen, setFullscreen])

  return { isFullscreen, setFullscreen, toggleFullscreen }
}
