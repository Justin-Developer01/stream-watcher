import type { ChatEmote } from './twitch'
import { emoteCdnUrl } from './twitch'

export type ChatEmoteMap = Record<string, string[]>

export type ChatTextPart =
  | { type: 'text'; value: string }
  | { type: 'emote'; id: string; name: string; url: string }

export function parseEmoteRanges(emotes?: ChatEmoteMap | null): Array<{ start: number; end: number; id: string }> {
  if (!emotes) return []
  const ranges: Array<{ start: number; end: number; id: string }> = []
  for (const [id, spots] of Object.entries(emotes)) {
    if (!id || !Array.isArray(spots)) continue
    for (const spot of spots) {
      const [startRaw, endRaw] = String(spot).split('-')
      const start = Number(startRaw)
      const end = Number(endRaw)
      if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) continue
      ranges.push({ start, end, id })
    }
  }
  ranges.sort((a, b) => a.start - b.start)
  return ranges
}

export function splitMessageParts(text: string, emotes?: ChatEmoteMap | null): ChatTextPart[] {
  const ranges = parseEmoteRanges(emotes)
  if (!ranges.length) return text ? [{ type: 'text', value: text }] : []

  const parts: ChatTextPart[] = []
  let cursor = 0
  for (const range of ranges) {
    if (range.start < cursor || range.start > text.length) continue
    if (range.start > cursor) {
      parts.push({ type: 'text', value: text.slice(cursor, range.start) })
    }
    const name = text.slice(range.start, range.end + 1)
    parts.push({
      type: 'emote',
      id: range.id,
      name,
      url: emoteCdnUrl(range.id, '1.0'),
    })
    cursor = range.end + 1
  }
  if (cursor < text.length) {
    parts.push({ type: 'text', value: text.slice(cursor) })
  }
  return parts
}

export function inferEmotesFromCatalog(text: string, catalog: ChatEmote[]): ChatEmoteMap | undefined {
  if (!text.trim() || !catalog.length) return undefined
  const byName = new Map(catalog.map((emote) => [emote.name, emote.id]))
  const found: ChatEmoteMap = {}
  const re = /[^\s]+/g
  let match: RegExpExecArray | null
  while ((match = re.exec(text))) {
    const id = byName.get(match[0])
    if (!id) continue
    const start = match.index
    const end = start + match[0].length - 1
    if (!found[id]) found[id] = []
    found[id].push(`${start}-${end}`)
  }
  return Object.keys(found).length ? found : undefined
}

export function formatChatTime(timestamp: number) {
  try {
    return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(timestamp)
  } catch {
    const date = new Date(timestamp)
    return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
  }
}
