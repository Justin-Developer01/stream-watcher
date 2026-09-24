import rendererLog from 'electron-log/renderer'

/**
 * Renderer logger. In Electron, electron-log forwards to main, which writes
 * %APPDATA%\vesper-desk\logs\main.log (the app name is the package name) (tokens redacted there). Elsewhere it is the console.
 */
export const log = rendererLog

let started = false
/** Record uncaught errors and unhandled rejections from this window in the log file. */
export function startRendererLogging(windowName: string) {
  if (started) return
  started = true
  log.errorHandler.startCatching({ showDialog: false })
  log.info(`${windowName} window loaded`)
}
