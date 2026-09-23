import { useCallback, useEffect, useState } from 'react'
import type { UpdaterStatus } from '../types'

const IDLE: UpdaterStatus = { state: 'idle', currentVersion: '' }

export function useAppUpdater() {
  const [status, setStatus] = useState<UpdaterStatus>(IDLE)

  useEffect(() => {
    if (!window.streamWatcher?.onUpdaterStatus) return
    void window.streamWatcher.getUpdaterStatus().then(setStatus)
    const stop = window.streamWatcher.onUpdaterStatus(setStatus)
    return () => {
      stop()
    }
  }, [])

  const check = useCallback(async () => {
    if (!window.streamWatcher?.checkForUpdates) {
      setStatus((current) => ({
        ...current,
        state: 'unsupported',
        error: 'Desktop app only',
        message: 'Check for Updates is available in the Windows app.',
      }))
      return
    }
    await window.streamWatcher.checkForUpdates()
  }, [])

  const download = useCallback(async () => {
    await window.streamWatcher?.downloadUpdate()
  }, [])

  const install = useCallback(async () => {
    await window.streamWatcher?.installUpdate()
  }, [])

  return { status, check, download, install }
}
