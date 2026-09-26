import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  cleanSavedName,
  DEFAULT_EDIT_DESK_SPACING,
  loadState,
  normalizeChannel,
  normalizeEditDeskSpacing,
  normalizeVolume,
  SAVED_NAME_MAX,
  savedStream,
} from './storage'

describe('normalizeVolume', () => {
  it('keeps a level in (0, 1]', () => {
    expect(normalizeVolume(0.35)).toBe(0.35)
    expect(normalizeVolume(1)).toBe(1)
  })

  it('caps above 1', () => {
    expect(normalizeVolume(3)).toBe(1)
  })

  it('loads missing, malformed, or non-positive values at full volume', () => {
    for (const bad of [undefined, null, '0.5', Number.NaN, Number.POSITIVE_INFINITY, 0, -0.2]) {
      expect(normalizeVolume(bad)).toBe(1)
    }
  })
})

describe('loadState streams', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('gives pre-volume streams full volume and keeps a stored level and mute separately', () => {
    const store = new Map([
      [
        'vesper-desk:v1',
        JSON.stringify({
          streams: [
            { id: 'a', channel: 'xqc', muted: false },
            { id: 'b', platform: 'kick', channel: 'xqcow', muted: true, volume: 0.4 },
            { id: 'c', platform: 'twitch', channel: 'shroud', muted: false, volume: 'loud' },
          ],
        }),
      ],
    ])
    vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null })
    expect(loadState()?.streams).toEqual([
      { id: 'a', platform: 'twitch', channel: 'xqc', muted: false, volume: 1 },
      { id: 'b', platform: 'kick', channel: 'xqcow', muted: true, volume: 0.4 },
      { id: 'c', platform: 'twitch', channel: 'shroud', muted: false, volume: 1 },
    ])
  })
})

describe('loadState syncEnabled', () => {
  afterEach(() => vi.unstubAllGlobals())

  const load = (state: unknown) => {
    const store = new Map([['vesper-desk:v1', JSON.stringify(state)]])
    vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null })
    return loadState()?.syncEnabled
  }

  it('is opt-in: a save from before Stream Sync existed loads with it off', () => {
    expect(load({ streams: [] })).toBe(false)
  })

  it('keeps a stored true, and normalizes a malformed value to false', () => {
    expect(load({ streams: [], syncEnabled: true })).toBe(true)
    expect(load({ streams: [], syncEnabled: 'yes' })).toBe(false)
  })
})

describe('normalizeEditDeskSpacing', () => {
  it('keeps an in-range value, rounded', () => {
    expect(normalizeEditDeskSpacing(12)).toBe(12)
    expect(normalizeEditDeskSpacing(12.6)).toBe(13)
  })

  it('clamps to the [2, 32] range', () => {
    expect(normalizeEditDeskSpacing(0)).toBe(2)
    expect(normalizeEditDeskSpacing(100)).toBe(32)
  })

  it('loads missing or malformed values at the default (matches the grid\'s old hardcoded margin)', () => {
    for (const bad of [undefined, null, '8', Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(normalizeEditDeskSpacing(bad)).toBe(DEFAULT_EDIT_DESK_SPACING)
    }
  })
})

describe('loadState editDesk', () => {
  afterEach(() => vi.unstubAllGlobals())

  const load = (state: unknown) => {
    const store = new Map([['vesper-desk:v1', JSON.stringify(state)]])
    vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null })
    return loadState()
  }

  it('gives a save from before Edit Desk existed the old hardcoded spacing and Snap (today\'s behavior)', () => {
    const state = load({ streams: [] })
    expect(state?.editDeskSpacing).toBe(DEFAULT_EDIT_DESK_SPACING)
    expect(state?.editDeskSnap).toBe(true)
  })

  it('keeps a stored spacing and an explicit Drag (false) choice', () => {
    const state = load({ streams: [], editDeskSpacing: 16, editDeskSnap: false })
    expect(state?.editDeskSpacing).toBe(16)
    expect(state?.editDeskSnap).toBe(false)
  })
})

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
