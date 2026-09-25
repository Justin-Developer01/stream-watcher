import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanSavedName, loadState, normalizeChannel, SAVED_NAME_MAX, savedStream } from './storage'

describe('cleanSavedName', () => {
  it('trims and keeps a real name', () => {
    expect(cleanSavedName('  Main desk  ')).toBe('Main desk')
  })

  it('treats empty, whitespace, and non-strings as no name', () => {
    expect(cleanSavedName('')).toBeUndefined()
    expect(cleanSavedName('   ')).toBeUndefined()
    expect(cleanSavedName(undefined)).toBeUndefined()
    expect(cleanSavedName(null)).toBeUndefined()
    expect(cleanSavedName(42)).toBeUndefined()
  })

  it('caps the length', () => {
    expect(cleanSavedName('x'.repeat(SAVED_NAME_MAX + 20))).toHaveLength(SAVED_NAME_MAX)
  })
})

describe('savedStream', () => {
  it('omits the name key entirely when there is no name', () => {
    expect(savedStream('twitch', 'xqc', 1)).toEqual({ platform: 'twitch', channel: 'xqc', savedAt: 1 })
    expect('name' in savedStream('twitch', 'xqc', 1, '   ')).toBe(false)
  })

  it('never changes the channel slug', () => {
    expect(savedStream('kick', 'xqcow', 1, 'Late night')).toEqual({ platform: 'kick', channel: 'xqcow', savedAt: 1, name: 'Late night' })
  })
})

describe('loadState saved streams', () => {
  afterEach(() => vi.unstubAllGlobals())

  const load = (state: unknown) => {
    const store = new Map([['vesper-desk:v1', JSON.stringify(state)]])
    vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null })
    return loadState()?.savedStreams
  }

  it('loads pre-rename entries with no name key, defaulting platform to twitch', () => {
    expect(load({ savedStreams: [{ channel: 'xqc', savedAt: 1 }] })).toEqual([{ platform: 'twitch', channel: 'xqc', savedAt: 1 }])
  })

  it('keeps a stored name and drops an empty or malformed one', () => {
    expect(
      load({
        savedStreams: [
          { platform: 'kick', channel: 'xqcow', savedAt: 1, name: ' Late night ' },
          { platform: 'twitch', channel: 'shroud', savedAt: 2, name: '' },
          { platform: 'youtube', channel: 'dQw4w9WgXcQ', savedAt: 3, name: 7 },
        ],
      }),
    ).toEqual([
      { platform: 'kick', channel: 'xqcow', savedAt: 1, name: 'Late night' },
      { platform: 'twitch', channel: 'shroud', savedAt: 2 },
      { platform: 'youtube', channel: 'dQw4w9WgXcQ', savedAt: 3 },
    ])
  })
})

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
