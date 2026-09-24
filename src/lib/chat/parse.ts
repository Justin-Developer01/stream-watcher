import type {
  ChatBadge,
  ChatEvent,
  ChatLineEvent,
  CheermoteLookup,
  CheermoteTier,
  Emote,
  Fragment,
  RoomState,
  UserNoticeType,
  UserState,
} from './types'

/** A raw IRC message as tmi.js emits it on `raw_message` (tags still IRC-escaped). */
export type IrcMessage = {
  tags: Record<string, string | boolean>
  prefix: string | null
  command: string | null
  params: string[]
}

export type IrcAction =
  | { type: 'event'; event: ChatEvent }
  | { type: 'clearchat'; channel: string; login: string | null; duration: number | null; timestamp: number }
  | { type: 'clearmsg'; channel: string; targetId: string }
  | { type: 'roomstate'; channel: string; patch: Partial<RoomState> }
  | { type: 'userstate'; channel: string | null; state: Partial<UserState>; userId?: string }

export type ParseOptions = {
  cheermotes?: CheermoteLookup | null
  /** Names the sender can type as emotes; used for our own echoed messages, which carry no emote tags. */
  emoteNames?: Map<string, Emote> | null
  theme?: 'dark' | 'light'
}

const TAG_UNESCAPE: Record<string, string> = { s: ' ', ':': ';', '\\': '\\', r: '\r', n: '\n' }

export function unescapeTag(value: string) {
  return value.replace(/\\(.)?/g, (_m, c: string | undefined) => (c ? (TAG_UNESCAPE[c] ?? c) : ''))
}

function tag(msg: IrcMessage, key: string): string {
  const raw = msg.tags[key]
  return typeof raw === 'string' ? unescapeTag(raw) : ''
}

export function parseBadges(raw: string, rawInfo = ''): ChatBadge[] {
  if (!raw) return []
  const info = new Map(
    rawInfo
      .split(',')
      .map((entry) => entry.split('/'))
      .filter((pair) => pair[0])
      .map(([set, ...rest]) => [set, rest.join('/')] as const),
  )
  return raw
    .split(',')
    .map((entry): ChatBadge | null => {
      const [set, version] = entry.split('/')
      return set && version ? { set, version, info: info.get(set) } : null
    })
    .filter((b): b is ChatBadge => b !== null)
}

/** `25:0-4,12-16/1902:6-10` → ranges. Indices count Unicode code points, not UTF-16 units. */
export function parseEmoteTag(raw: string) {
  const list: Array<{ id: string; start: number; end: number }> = []
  if (!raw) return list
  for (const part of raw.split('/')) {
    const [id, ranges] = part.split(':')
    if (!id || !ranges) continue
    for (const range of ranges.split(',')) {
      const [start, end] = range.split('-').map(Number)
      if (Number.isInteger(start) && Number.isInteger(end) && end >= start) list.push({ id, start, end })
    }
  }
  return list.sort((a, b) => a.start - b.start)
}

export function emoteUrl(id: string, theme: 'dark' | 'light' = 'dark', scale: '1.0' | '2.0' | '3.0' = '1.0') {
  return `https://static-cdn.jtvnw.net/emoticons/v2/${encodeURIComponent(id)}/default/${theme}/${scale}`
}

/** The standard "Cheer" tiers, used when Helix cheermotes are not loaded (logged out). */
const DEFAULT_CHEER_TIERS: Array<[number, string]> = [
  [1, '#979797'],
  [100, '#9c3ee8'],
  [1000, '#1db2a5'],
  [5000, '#0099fe'],
  [10000, '#f43021'],
]

export function defaultCheermotes(theme: 'dark' | 'light' = 'dark'): CheermoteLookup {
  const tiers: CheermoteTier[] = DEFAULT_CHEER_TIERS.map(([minBits, color]) => ({
    minBits,
    color,
    url: `https://d3aqoihi2n8ty8.cloudfront.net/actions/cheer/${theme}/animated/${minBits}/1.gif`,
  }))
  return new Map([['cheer', tiers]])
}

export function cheerTier(tiers: CheermoteTier[], amount: number) {
  let pick = tiers[0]
  for (const tier of tiers) if (amount >= tier.minBits) pick = tier
  return pick
}

const MENTION = /^@([a-zA-Z0-9_]{1,25})([.,!?:;)]*)$/
const LINK = /^(https?:\/\/[^\s<>"]+|www\.[^\s<>"]+\.[a-z]{2,}[^\s<>"]*)$/i
const CHEER = /^([a-zA-Z0-9_]*?[a-zA-Z_])(\d+)$/

function tokenizeText(segment: string, bits: number, opts: ParseOptions, out: Fragment[]) {
  const cheermotes = bits > 0 ? (opts.cheermotes ?? defaultCheermotes(opts.theme)) : null
  for (const word of segment.split(/(\s+)/)) {
    if (!word) continue
    if (/^\s+$/.test(word)) {
      pushText(out, word)
      continue
    }
    const cheer = cheermotes ? CHEER.exec(word) : null
    if (cheer && cheermotes?.has(cheer[1].toLowerCase())) {
      out.push({ type: 'cheer', prefix: cheer[1].toLowerCase(), amount: Number(cheer[2]), name: word })
      continue
    }
    const emote = opts.emoteNames?.get(word)
    if (emote) {
      out.push({ type: 'emote', id: emote.id, name: word, url: emote.url })
      continue
    }
    const mention = MENTION.exec(word)
    if (mention) {
      out.push({ type: 'mention', text: `@${mention[1]}`, login: mention[1].toLowerCase() })
      if (mention[2]) pushText(out, mention[2])
      continue
    }
    if (LINK.test(word)) {
      const trimmed = word.replace(/[.,!?:;)]+$/, '')
      const href = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
      out.push({ type: 'link', text: trimmed, href })
      if (trimmed.length < word.length) pushText(out, word.slice(trimmed.length))
      continue
    }
    pushText(out, word)
  }
}

function pushText(out: Fragment[], text: string) {
  const last = out[out.length - 1]
  if (last?.type === 'text') last.text += text
  else out.push({ type: 'text', text })
}

/** Split a chat message into text, emote, cheer, mention, and link fragments. */
export function buildFragments(
  text: string,
  emoteRanges: Array<{ id: string; start: number; end: number }>,
  bits = 0,
  opts: ParseOptions = {},
): Fragment[] {
  const chars = Array.from(text)
  const out: Fragment[] = []
  let cursor = 0
  for (const range of emoteRanges) {
    if (range.start < cursor || range.end >= chars.length) continue // overlapping or out of bounds
    if (range.start > cursor) tokenizeText(chars.slice(cursor, range.start).join(''), bits, opts, out)
    out.push({ type: 'emote', id: range.id, name: chars.slice(range.start, range.end + 1).join('') })
    cursor = range.end + 1
  }
  if (cursor < chars.length) tokenizeText(chars.slice(cursor).join(''), bits, opts, out)
  return out
}

const TWITCH_DEFAULT_COLORS = [
  '#FF0000', '#0000FF', '#008000', '#B22222', '#FF7F50', '#9ACD32', '#FF4500', '#2E8B57',
  '#DAA520', '#D2691E', '#5F9EA0', '#1E90FF', '#FF69B4', '#8A2BE2', '#00FF7F',
]

export function defaultNameColor(login: string) {
  let hash = 0
  for (const ch of login) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return TWITCH_DEFAULT_COLORS[hash % TWITCH_DEFAULT_COLORS.length]
}

/** Nudge a chatter's color so it stays readable on the current theme, as Twitch does. */
export function readableColor(hex: string, theme: 'dark' | 'light') {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return hex
  const n = parseInt(m[1], 16)
  let [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  let l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
    h /= 6
  }
  if (theme === 'dark' && l < 0.55) l = 0.55 + (l / 0.55) * 0.1
  else if (theme === 'light' && l > 0.42) l = 0.32 + ((l - 0.42) / 0.58) * 0.1
  else return `#${m[1]}`
  const hue = (p: number, q: number, t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  if (s === 0) r = g = b = l
  else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue(p, q, h + 1 / 3)
    g = hue(p, q, h)
    b = hue(p, q, h - 1 / 3)
  }
  return `#${[r, g, b].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('')}`
}

function loginFromPrefix(prefix: string | null) {
  return prefix?.split('!')[0]?.toLowerCase() ?? ''
}

function channelOf(msg: IrcMessage) {
  return (msg.params[0] ?? '').replace(/^#/, '').toLowerCase()
}

function timestampOf(msg: IrcMessage) {
  const ts = Number(tag(msg, 'tmi-sent-ts'))
  return Number.isFinite(ts) && ts > 0 ? ts : Date.now()
}

let localId = 0
export function nextLocalId(prefix = 'local') {
  localId += 1
  return `${prefix}-${Date.now()}-${localId}`
}

const ACTION = /^\u0001ACTION (.*)\u0001$/s

/** Build a chat line from a PRIVMSG (or the user message attached to a USERNOTICE). */
export function lineFromIrc(msg: IrcMessage, text: string, opts: ParseOptions = {}): ChatLineEvent {
  const action = ACTION.exec(text)
  const body = action ? action[1] : text
  const bits = Number(tag(msg, 'bits')) || 0
  let fragments = buildFragments(body, parseEmoteTag(tag(msg, 'emotes')), bits, opts)
  const replyLogin = tag(msg, 'reply-parent-user-login').toLowerCase()
  const replyName = tag(msg, 'reply-parent-display-name')
  // Twitch prepends "@parent " to replies; its own chat hides it behind the "Replying to" line.
  if (replyLogin && fragments[0]?.type === 'mention' && fragments[0].login === replyLogin) {
    fragments = fragments.slice(1)
    const first = fragments[0]
    if (first?.type === 'text') {
      const trimmed = first.text.replace(/^\s+/, '')
      fragments = trimmed ? [{ type: 'text', text: trimmed }, ...fragments.slice(1)] : fragments.slice(1)
    }
  }
  const login = tag(msg, 'login') || loginFromPrefix(msg.prefix)
  return {
    kind: 'message',
    id: tag(msg, 'id') || nextLocalId(),
    channel: channelOf(msg),
    userId: tag(msg, 'user-id') || null,
    login,
    displayName: tag(msg, 'display-name') || login,
    color: tag(msg, 'color') || null,
    badges: parseBadges(tag(msg, 'badges'), tag(msg, 'badge-info')),
    text: body,
    fragments,
    action: Boolean(action),
    bits,
    firstMessage: tag(msg, 'first-msg') === '1',
    highlighted: tag(msg, 'msg-id') === 'highlighted-message',
    reply: replyLogin ? { displayName: replyName || replyLogin, text: tag(msg, 'reply-parent-msg-body') } : null,
    timestamp: timestampOf(msg),
    self: false,
    deleted: false,
  }
}

const NOTICE_TYPES: Record<string, UserNoticeType> = {
  sub: 'sub',
  resub: 'resub',
  subgift: 'subgift',
  anonsubgift: 'subgift',
  submysterygift: 'submysterygift',
  anonsubmysterygift: 'submysterygift',
  giftpaidupgrade: 'giftpaidupgrade',
  anongiftpaidupgrade: 'giftpaidupgrade',
  primepaidupgrade: 'giftpaidupgrade',
  raid: 'raid',
  announcement: 'announcement',
  bitsbadgetier: 'bitsbadgetier',
}

const ANNOUNCEMENT_COLORS: Record<string, string> = {
  PRIMARY: '#7ec8d8',
  BLUE: '#00d6d6',
  GREEN: '#00db84',
  ORANGE: '#ffb31a',
  PURPLE: '#9147ff',
}

/** Turn one server IRC message into a desk action, or null for messages chat does not show. */
export function ircToAction(msg: IrcMessage, opts: ParseOptions = {}): IrcAction | null {
  switch (msg.command) {
    case 'PRIVMSG': {
      const text = msg.params[1] ?? ''
      return { type: 'event', event: lineFromIrc(msg, text, opts) }
    }
    case 'USERNOTICE': {
      const msgId = tag(msg, 'msg-id')
      const noticeType = NOTICE_TYPES[msgId] ?? 'other'
      const userText = msg.params[1]
      const line = userText ? lineFromIrc(msg, userText, opts) : null
      const systemText =
        tag(msg, 'system-msg') ||
        (noticeType === 'announcement' ? 'Announcement' : `${tag(msg, 'display-name') || 'Someone'}: ${msgId}`)
      const color =
        noticeType === 'announcement' ? (ANNOUNCEMENT_COLORS[tag(msg, 'msg-param-color')] ?? ANNOUNCEMENT_COLORS.PRIMARY) : null
      return {
        type: 'event',
        event: {
          kind: 'notice',
          id: tag(msg, 'id') || nextLocalId('notice'),
          channel: channelOf(msg),
          noticeType,
          systemText,
          message: line,
          color,
          timestamp: timestampOf(msg),
        },
      }
    }
    case 'CLEARCHAT': {
      const duration = Number(tag(msg, 'ban-duration'))
      return {
        type: 'clearchat',
        channel: channelOf(msg),
        login: msg.params[1]?.toLowerCase() || null,
        duration: Number.isFinite(duration) && duration > 0 ? duration : null,
        timestamp: timestampOf(msg),
      }
    }
    case 'CLEARMSG': {
      const targetId = tag(msg, 'target-msg-id')
      return targetId ? { type: 'clearmsg', channel: channelOf(msg), targetId } : null
    }
    case 'ROOMSTATE': {
      const patch: Partial<RoomState> = {}
      const has = (key: string) => typeof msg.tags[key] === 'string'
      if (has('slow')) patch.slow = Number(tag(msg, 'slow')) || 0
      if (has('subs-only')) patch.subsOnly = tag(msg, 'subs-only') === '1'
      if (has('emote-only')) patch.emoteOnly = tag(msg, 'emote-only') === '1'
      if (has('followers-only')) patch.followersOnly = Number(tag(msg, 'followers-only'))
      if (has('r9k')) patch.r9k = tag(msg, 'r9k') === '1'
      if (has('room-id')) patch.roomId = tag(msg, 'room-id')
      return { type: 'roomstate', channel: channelOf(msg), patch }
    }
    case 'USERSTATE':
    case 'GLOBALUSERSTATE': {
      const state: Partial<UserState> = {
        displayName: tag(msg, 'display-name') || null,
        color: tag(msg, 'color') || null,
        badges: parseBadges(tag(msg, 'badges'), tag(msg, 'badge-info')),
        emoteSets: tag(msg, 'emote-sets').split(',').filter(Boolean),
        mod: tag(msg, 'mod') === '1',
      }
      return {
        type: 'userstate',
        channel: msg.command === 'USERSTATE' ? channelOf(msg) : null,
        state,
        userId: tag(msg, 'user-id') || undefined,
      }
    }
    case 'NOTICE': {
      const channel = channelOf(msg)
      const text = msg.params[1]
      if (!text || !channel || channel === '*') return null
      return { type: 'event', event: { kind: 'status', id: nextLocalId('status'), channel, text, timestamp: Date.now() } }
    }
    default:
      return null
  }
}

export function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds} second${seconds === 1 ? '' : 's'}`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`
  const hours = Math.round(minutes / 60)
  if (hours < 48) return `${hours} hour${hours === 1 ? '' : 's'}`
  const days = Math.round(hours / 24)
  return `${days} day${days === 1 ? '' : 's'}`
}
