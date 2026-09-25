import { afterEach, describe, expect, it, vi } from 'vitest'
import { revokeTwitchToken, validateTwitchToken } from './twitchAuthApi'

describe('validateTwitchToken', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns invalid only on a real 401', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })))
    expect(await validateTwitchToken('tok')).toBe('invalid')
  })

  it('returns valid on 200', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })))
    expect(await validateTwitchToken('tok')).toBe('valid')
  })

  it.each([429, 500, 502, 503])('treats %i as indeterminate, not invalid', async (status) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status })))
    expect(await validateTwitchToken('tok')).toBe('indeterminate')
  })

  it('treats a network error (offline/DNS/timeout) as indeterminate', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')))
    expect(await validateTwitchToken('tok')).toBe('indeterminate')
  })

  it('treats an abort (timeout) as indeterminate', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('The operation was aborted', 'AbortError')))
    expect(await validateTwitchToken('tok')).toBe('indeterminate')
  })
})

describe('revokeTwitchToken', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('resolves even when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
    await expect(revokeTwitchToken('client', 'tok')).resolves.toBeUndefined()
  })

  it('resolves when the request succeeds', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await revokeTwitchToken('client', 'tok')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://id.twitch.tv/oauth2/revoke',
      expect.objectContaining({ method: 'POST' }),
    )
  })
})
