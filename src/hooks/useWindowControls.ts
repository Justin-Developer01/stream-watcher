import { useCallback, useEffect, useState } from 'react'

export function useWindowControls() {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    if (!window.streamWatcher?.onMaximizedChange) return
    const unsub = window.streamWatcher.onMaximizedChange(setIsMaximized)
    void window.streamWatcher.isWindowMaximized?.().then(setIsMaximized)
    return () => unsub()
  }, [])

  const minimize = useCallback(() => {
    void window.streamWatcher?.minimizeWindow?.()
  }, [])

  const toggleMaximize = useCallback(() => {
    void window.streamWatcher?.toggleMaximizeWindow?.()
  }, [])

  const close = useCallback(() => {
    void window.streamWatcher?.closeWindow?.()
  }, [])

  return { isMaximized, minimize, toggleMaximize, close }
}
