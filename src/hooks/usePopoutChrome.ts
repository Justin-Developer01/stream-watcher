import { useCallback, useEffect, useState } from 'react'

export function usePopoutChrome() {
  const [alwaysOnTop, setAlwaysOnTop] = useState(false)

  useEffect(() => {
    const api = window.streamWatcher
    if (!api?.getThisPopoutAlwaysOnTop) return
    void api.getThisPopoutAlwaysOnTop().then((value) => setAlwaysOnTop(Boolean(value)))
  }, [])

  const toggleAlwaysOnTop = useCallback(async () => {
    const api = window.streamWatcher
    if (!api?.setThisPopoutAlwaysOnTop) return
    const next = await api.setThisPopoutAlwaysOnTop(!alwaysOnTop)
    setAlwaysOnTop(Boolean(next))
  }, [alwaysOnTop])

  const dockBack = useCallback(() => {
    void window.streamWatcher?.dockThisPopout?.()
  }, [])

  return { alwaysOnTop, toggleAlwaysOnTop, dockBack }
}
