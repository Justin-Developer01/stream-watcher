import { describe, expect, it } from 'vitest'
import { pickQuality, qualityHeight } from './quality'

const Q = [
  { group: 'auto', name: 'Auto' },
  { group: 'chunked', name: '1080p60 (source)' },
  { group: '720p60', name: '720p60' },
  { group: '480p30', name: '480p' },
  { group: '360p30', name: '360p' },
  { group: '160p30', name: '160p' },
]

describe('pickQuality', () => {
  it('parses heights from Twitch quality groups', () => {
    expect(qualityHeight('720p60')).toBe(720)
    expect(qualityHeight('chunked')).toBeNull()
  })

  it('uses the lowest real quality for Performance tiles (not the invalid "160p")', () => {
    expect(pickQuality(Q, 900, true)).toBe('160p30')
  })

  it('picks the smallest quality that covers the tile', () => {
    expect(pickQuality(Q, 300)).toBe('360p30')
    expect(pickQuality(Q, 400)).toBe('480p30')
    expect(pickQuality(Q, 700)).toBe('720p60')
  })

  it('goes back to auto for large tiles or when nothing covers it', () => {
    expect(pickQuality(Q, 1000)).toBe('auto')
    expect(pickQuality([{ group: '360p30' }, { group: 'chunked' }], 500)).toBe('chunked')
  })

  it('waits until the player reports qualities', () => {
    expect(pickQuality([], 300)).toBeNull()
  })
})
