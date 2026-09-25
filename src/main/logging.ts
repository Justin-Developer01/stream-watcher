import { app, shell } from 'electron'
import log from 'electron-log/main'
import { dirname } from 'node:path'

const MB = 1024 * 1024

/** Masks OAuth tokens anywhere in a log message (IRC PASS, redirect URLs, Authorization headers). */
export function redact(value: unknown): unknown {
  if (typeof value === 'string') {
    return value
      .replace(/oauth:[a-z0-9]+/gi, 'oauth:[redacted]')
      .replace(/(access_token=)[^&\s#"']+/gi, '$1[redacted]')
      .replace(/(Bearer\s+)[a-z0-9]+/gi, '$1[redacted]')
  }
  if (value instanceof Error) {
    const copy = new Error(redact(value.message) as string)
    copy.name = value.name
    copy.stack = redact(value.stack ?? '') as string
    return copy
  }
  if (Array.isArray(value)) return value.map(redact)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, redact(v)]))
  }
  return value
}

/**
 * File log at %APPDATA%\vesper-desk\logs\main.log (the app name is the package name) (5 MB, then main.old.log). Captures uncaught
 * errors in main and every renderer, crashed/unresponsive processes, and failed loads.
 */
export function setupLogging() {
  log.initialize()
  log.transports.file.level = 'info'
  log.transports.file.maxSize = 5 * MB
  log.transports.console.level = app.isPackaged ? 'warn' : 'info'
  log.hooks.push((message) => ({ ...message, data: message.data.map(redact) }))
  log.errorHandler.startCatching({ showDialog: false })
  log.eventLogger.startLogging({
    level: 'warn',
    // electron-log's defaults minus certificate-error, which dumps whole PEM certificates; a TLS
    // failure still shows up as did-fail-load with the URL and error.
    events: {
      app: { 'certificate-error': false, 'child-process-gone': true, 'render-process-gone': true },
      webContents: {
        'did-fail-load': true,
        'did-fail-provisional-load': true,
        'plugin-crashed': true,
        'preload-error': true,
        unresponsive: true,
      },
    },
  })
  log.info(`Vesper Desk ${app.getVersion()} starting (Electron ${process.versions.electron}, ${process.platform} ${process.arch})`)
  return log
}

export function logFilePath() {
  return log.transports.file.getFile().path
}

export function openLogFolder() {
  return shell.openPath(dirname(logFilePath()))
}

/** One line of memory use per process type, so Windows numbers show up in the log. */
export function logMemory(reason: string) {
  const byType = new Map<string, number>()
  for (const metric of app.getAppMetrics()) {
    byType.set(metric.type, (byType.get(metric.type) ?? 0) + metric.memory.workingSetSize)
  }
  const total = [...byType.values()].reduce((a, b) => a + b, 0)
  const parts = [...byType].map(([type, kb]) => `${type}=${Math.round(kb / 1024)}MB`).join(' ')
  log.info(`memory (${reason}): total=${Math.round(total / 1024)}MB ${parts}`)
}

export { log }
