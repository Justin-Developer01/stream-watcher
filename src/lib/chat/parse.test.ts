import { describe, expect, it } from 'vitest'
import {
  buildFragments,
  cheerTier,
  defaultCheermotes,
  ircToAction,
  parseBadges,
  parseEmoteTag,
  readableColor,
  unescapeTag,
  type IrcMessage,
} from './parse'
import type { ChatLineEvent, ChatNoticeEvent } from './types'

function irc(command: string, params: string[], tags: Record<string, string> = {}, prefix = 'alice!alice@alice.tmi.twitch.tv'): IrcMessage {
  return { command, params, tags, prefix }
}

describe('tags', () => {
  it('unescapes IRCv3 tag values', () => {
    expect(unescapeTag('a\\sb\\:c\\\\d')).toBe('a b;c\\d')
    expect(unescapeTag('trailing\\')).toBe('trailing')
  })

  it('parses badges with badge-info', () => {
    expect(parseBadges('subscriber/12,bits/1000', 'subscriber/14')).toEqual([
      { set: 'subscriber', version: '12', info: '14' },
      { set: 'bits', version: '1000', info: undefined },
    ])
  })

  it('parses and sorts emote ranges', () => {
    expect(parseEmoteTag('25:6-10/1902:0-4,12-16')).toEqual([
      { id: '1902', start: 0, end: 4 },
      { id: '25', start: 6, end: 10 },
      { id: '1902', start: 12, end: 16 },
    ])
  })
})

describe('buildFragments', () => {
  it('uses code-point indices, so emoji before an emote do not shift it', () => {
    // "😀 Kappa": the emoji is 1 code point but 2 UTF-16 units.
    const f = buildFragments('😀 Kappa', [{ id: '25', start: 2, end: 6 }])
    expect(f).toEqual([
      { type: 'text', text: '😀 ' },
      { type: 'emote', id: '25', name: 'Kappa' },
    ])
  })

  it('renders cheermotes only when the message carries bits', () => {
    const lookup = defaultCheermotes()
    expect(buildFragments('Cheer100 gg', [], 100, { cheermotes: lookup })[0]).toEqual({
      type: 'cheer',
      prefix: 'cheer',
      amount: 100,
      name: 'Cheer100',
    })
    expect(buildFragments('Cheer100 gg', [], 0, { cheermotes: lookup })[0]).toEqual({ type: 'text', text: 'Cheer100 gg' })
  })

  it('matches cheer prefixes that contain digits', () => {
    const lookup = new Map([['4head', [{ minBits: 1, color: '#fff', url: 'x' }]]])
    expect(buildFragments('4Head500', [], 500, { cheermotes: lookup })[0]).toMatchObject({ type: 'cheer', prefix: '4head', amount: 500 })
  })

  it('finds mentions and links, keeping trailing punctuation as text', () => {
    expect(buildFragments('hi @Bob, see www.twitch.tv.', [])).toEqual([
      { type: 'text', text: 'hi ' },
      { type: 'mention', text: '@Bob', login: 'bob' },
      { type: 'text', text: ', see ' },
      { type: 'link', text: 'www.twitch.tv', href: 'https://www.twitch.tv' },
      { type: 'text', text: '.' },
    ])
  })

  it('resolves typed emote names for our own echoed messages', () => {
    const names = new Map([['LUL', { id: '425618', name: 'LUL', url: 'u', source: 'global' as const }]])
    expect(buildFragments('so LUL', [], 0, { emoteNames: names })[1]).toEqual({ type: 'emote', id: '425618', name: 'LUL', url: 'u' })
  })

  it('ignores out-of-range emote positions instead of throwing', () => {
    expect(buildFragments('hey', [{ id: '1', start: 5, end: 9 }])).toEqual([{ type: 'text', text: 'hey' }])
  })
})

describe('ircToAction', () => {
  it('builds a chat line from PRIVMSG with /me, bits, first message, and a reply', () => {
    const action = ircToAction(
      irc('PRIVMSG', ['#Chan', '\u0001ACTION @bob Cheer100 Kappa\u0001'], {
        id: 'm1',
        'display-name': 'Alice',
        color: '#1E90FF',
        badges: 'moderator/1',
        bits: '100',
        emotes: '25:14-18', // indices are relative to the /me body
        'first-msg': '1',
        'reply-parent-user-login': 'bob',
        'reply-parent-display-name': 'Bob',
        'reply-parent-msg-body': 'hello\\sthere',
        'tmi-sent-ts': '1700000000000',
      }),
    )
    expect(action?.type).toBe('event')
    const line = (action as { event: ChatLineEvent }).event
    expect(line).toMatchObject({
      kind: 'message',
      id: 'm1',
      channel: 'chan',
      login: 'alice',
      displayName: 'Alice',
      action: true,
      bits: 100,
      firstMessage: true,
      reply: { displayName: 'Bob', text: 'hello there' },
      timestamp: 1700000000000,
    })
    // The "@bob " reply prefix is hidden, like Twitch.
    expect(line.fragments[0]).toMatchObject({ type: 'cheer', amount: 100 })
    expect(line.fragments.at(-1)).toEqual({ type: 'emote', id: '25', name: 'Kappa' })
  })

  it('builds sub, raid, and announcement notices', () => {
    const resub = ircToAction(
      irc('USERNOTICE', ['#chan', 'great stream'], { 'msg-id': 'resub', 'system-msg': 'Alice\\ssubscribed\\sfor\\s3\\smonths!', id: 'n1' }),
    ) as { event: ChatNoticeEvent }
    expect(resub.event).toMatchObject({ kind: 'notice', noticeType: 'resub', systemText: 'Alice subscribed for 3 months!' })
    expect(resub.event.message?.text).toBe('great stream')

    const ann = ircToAction(irc('USERNOTICE', ['#chan', 'hi all'], { 'msg-id': 'announcement', 'msg-param-color': 'PURPLE' })) as {
      event: ChatNoticeEvent
    }
    expect(ann.event).toMatchObject({ noticeType: 'announcement', color: '#9147ff' })

    const raid = ircToAction(irc('USERNOTICE', ['#chan'], { 'msg-id': 'raid', 'system-msg': '5\\sraiders' })) as { event: ChatNoticeEvent }
    expect(raid.event).toMatchObject({ noticeType: 'raid', systemText: '5 raiders', message: null })
  })

  it('maps moderation and room state', () => {
    expect(ircToAction(irc('CLEARCHAT', ['#chan', 'troll'], { 'ban-duration': '600' }))).toMatchObject({
      type: 'clearchat',
      login: 'troll',
      duration: 600,
    })
    expect(ircToAction(irc('CLEARCHAT', ['#chan']))).toMatchObject({ type: 'clearchat', login: null, duration: null })
    expect(ircToAction(irc('CLEARMSG', ['#chan', 'x'], { 'target-msg-id': 'm1' }))).toEqual({
      type: 'clearmsg',
      channel: 'chan',
      targetId: 'm1',
    })
    expect(ircToAction(irc('ROOMSTATE', ['#chan'], { slow: '30' }))).toEqual({
      type: 'roomstate',
      channel: 'chan',
      patch: { slow: 30 },
    })
  })

  it('ignores commands chat does not show', () => {
    expect(ircToAction(irc('PING', ['tmi.twitch.tv']))).toBeNull()
    expect(ircToAction(irc('NOTICE', ['*', 'Login authentication failed']))).toBeNull()
  })
})

describe('colors and tiers', () => {
  it('lightens dark names on Dark and darkens light names on Light', () => {
    expect(readableColor('#0000FF', 'dark')).not.toBe('#0000FF')
    expect(readableColor('#00FF7F', 'light')).not.toBe('#00FF7F')
    expect(readableColor('#1E90FF', 'dark')).toBe('#1E90FF')
  })

  it('picks the highest cheer tier at or under the amount', () => {
    const tiers = defaultCheermotes().get('cheer')!
    expect(cheerTier(tiers, 1).minBits).toBe(1)
    expect(cheerTier(tiers, 999).minBits).toBe(100)
    expect(cheerTier(tiers, 25000).minBits).toBe(10000)
  })
})
