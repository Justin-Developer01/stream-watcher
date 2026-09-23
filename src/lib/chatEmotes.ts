import type { ChatEmoteRange } from '../types'

export type MessageSegment =
  | { type: 'text'; text: string }
  | { type: 'emote'; id: string; alt: string }

export function emoteImageUrl(id: string): string {
  return `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/1.0`
}

export function renderMessageWithEmotes(
  text: string,
  emotes?: ChatEmoteRange[],
): MessageSegment[] {
  if (!emotes?.length) return [{ type: 'text', text }]

  const sorted = [...emotes]
    .filter((e) => e.start >= 0 && e.end >= e.start && e.end < text.length)
    .sort((a, b) => a.start - b.start)

  const segments: MessageSegment[] = []
  let cursor = 0
  for (const emote of sorted) {
    if (emote.start < cursor) continue // overlapping/out-of-order, skip
    if (emote.start > cursor) {
      segments.push({ type: 'text', text: text.slice(cursor, emote.start) })
    }
    const alt = text.slice(emote.start, emote.end + 1)
    segments.push({ type: 'emote', id: emote.id, alt })
    cursor = emote.end + 1
  }
  if (cursor < text.length) {
    segments.push({ type: 'text', text: text.slice(cursor) })
  }
  return segments.length ? segments : [{ type: 'text', text }]
}
