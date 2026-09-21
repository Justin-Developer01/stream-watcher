export function isElectronApp() {
  return Boolean(typeof window !== 'undefined' && window.streamWatcher)
}
