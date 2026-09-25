import { describe, expect, it } from 'vitest'
import { matchKickInput } from './match'

describe('matchKickInput', () => {
  it('takes the channel from kick.com URLs', () => {
    expect(matchKickInput('https://kick.com/xQcOW')).toBe('xqcow')
    expect(matchKickInput('kick.com/adin-ross')).toBe('adin-ross')
    expect(matchKickInput('https://www.kick.com/spreen/videos')).toBe('spreen')
    expect(matchKickInput('  https://kick.com/spreen?tab=about  ')).toBe('spreen')
  })

  it('rejects site pages, bare names, and look-alike hosts', () => {
    expect(matchKickInput('https://kick.com/categories')).toBeNull()
    expect(matchKickInput('https://kick.com/video/0f9c')).toBeNull()
    expect(matchKickInput('spreen')).toBeNull()
    expect(matchKickInput('https://notkick.com/spreen')).toBeNull()
    expect(matchKickInput('')).toBeNull()
  })
})
