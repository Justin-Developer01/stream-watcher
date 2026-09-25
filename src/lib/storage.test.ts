import { describe, expect, it } from 'vitest'
import { normalizeChannel } from './storage'

describe('normalizeChannel', () => {
  it('takes the channel from twitch.tv URLs and bare names', () => {
    expect(normalizeChannel('https://www.twitch.tv/XQC')).toBe('xqc')
    expect(normalizeChannel('twitch.tv/shroud/videos')).toBe('shroud')
    expect(normalizeChannel('https://m.twitch.tv/zackrawrr?sr=a')).toBe('zackrawrr')
    expect(normalizeChannel('@Shroud')).toBe('shroud')
  })

  it('rejects site pages and look-alike hosts', () => {
    expect(normalizeChannel('https://www.twitch.tv/videos/2233445566')).toBeNull()
    expect(normalizeChannel('twitch.tv/directory/category/just-chatting')).toBeNull()
    expect(normalizeChannel('https://clips.twitch.tv/SomeClipSlug')).toBeNull()
    expect(normalizeChannel('https://nottwitch.tv/xqc')).toBeNull()
    expect(normalizeChannel('   ')).toBeNull()
  })
})
