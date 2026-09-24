/**
 * Whether the desk window is out of sight: minimized (reported by main) or hidden per the page
 * visibility API. Both are watched because Windows does not always mark a minimized page hidden.
 */
let minimized = false
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((fn) => fn())

if (typeof window !== 'undefined') {
  window.vesper?.onMinimizedChange?.((value) => {
    minimized = value
    notify()
  })
  document.addEventListener('visibilitychange', notify)
}

export function isWindowHidden() {
  return minimized || document.hidden
}

export function onWindowVisibility(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
