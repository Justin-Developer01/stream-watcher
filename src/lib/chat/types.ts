export type ChatBadge = { set: string; version: string; info?: string | undefined }

export type Fragment =
  | { type: 'text'; text: string }
  | { type: 'emote'; id: string; name: string; url?: string }
  | { type: 'cheer'; prefix: string; amount: number; name: string }
  | { type: 'mention'; text: string; login: string }
  | { type: 'link'; text: string; href: string }

export type ChatLineEvent = {
  kind: 'message'
  id: string
  channel: string
  userId: string | null
  login: string
  displayName: string
  color: string | null
  badges: ChatBadge[]
  text: string
  fragments: Fragment[]
  action: boolean
  bits: number
  firstMessage: boolean
  highlighted: boolean
  reply: { displayName: string; text: string } | null
  timestamp: number
  self: boolean
  deleted: boolean
}

export type UserNoticeType =
  | 'sub'
  | 'resub'
  | 'subgift'
  | 'submysterygift'
  | 'giftpaidupgrade'
  | 'raid'
  | 'announcement'
  | 'bitsbadgetier'
  | 'other'

export type ChatNoticeEvent = {
  kind: 'notice'
  id: string
  channel: string
  noticeType: UserNoticeType
  systemText: string
  /** The chatter's own attached message (resub message, announcement body), if any. */
  message: ChatLineEvent | null
  color: string | null
  timestamp: number
}

export type ChatStatusEvent = {
  kind: 'status'
  id: string
  channel: string
  text: string
  timestamp: number
}

export type ChatEvent = ChatLineEvent | ChatNoticeEvent | ChatStatusEvent

export type RoomState = {
  slow: number
  subsOnly: boolean
  emoteOnly: boolean
  /** -1 off, 0 any follower, N minutes followed. */
  followersOnly: number
  r9k: boolean
  roomId: string | null
}

export const DEFAULT_ROOM_STATE: RoomState = {
  slow: 0,
  subsOnly: false,
  emoteOnly: false,
  followersOnly: -1,
  r9k: false,
  roomId: null,
}

export type UserState = {
  displayName: string | null
  color: string | null
  badges: ChatBadge[]
  emoteSets: string[]
  mod: boolean
}

/** A picker/autocomplete emote. */
export type Emote = {
  id: string
  name: string
  url: string
  source: 'user' | 'channel' | 'global'
  owner?: string
}

export type CheermoteTier = { minBits: number; color: string; url: string }
/** Keyed by lowercase prefix ("cheer", "kappa", …). Tiers sorted ascending by minBits. */
export type CheermoteLookup = Map<string, CheermoteTier[]>
/** Keyed by "set/version". */
export type BadgeLookup = Map<string, { url: string; title: string }>
