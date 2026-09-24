import { memo, type CSSProperties, type ReactNode } from 'react'
import { cheerTier, defaultNameColor, emoteUrl, readableColor } from '../../lib/chat/parse'
import type { BadgeLookup, ChatBadge, ChatEvent, ChatLineEvent, CheermoteLookup, Fragment } from '../../lib/chat/types'
import { ui } from '../../lib/uiLabels'

export type LineContext = {
  theme: 'dark' | 'light'
  myLogin: string | null
  badges: Array<BadgeLookup | null | undefined>
  cheermotes: CheermoteLookup
  onName: (displayName: string) => void
}

function badgeInfo(badge: ChatBadge, lookups: LineContext['badges']) {
  for (const lookup of lookups) {
    const hit = lookup?.get(`${badge.set}/${badge.version}`)
    if (hit) {
      const months = badge.set === 'subscriber' && badge.info ? ` (${badge.info} months)` : ''
      return { url: hit.url, title: `${hit.title}${months}` }
    }
  }
  return null
}

function renderFragment(f: Fragment, i: number, ctx: LineContext): ReactNode {
  switch (f.type) {
    case 'emote': {
      const src = f.url ?? emoteUrl(f.id, ctx.theme)
      return (
        <img
          key={i}
          className="chat-emote"
          src={src}
          srcSet={f.url ? undefined : `${src} 1x, ${emoteUrl(f.id, ctx.theme, '2.0')} 2x`}
          alt={f.name}
          title={f.name}
          loading="lazy"
          draggable={false}
        />
      )
    }
    case 'cheer': {
      const tiers = ctx.cheermotes.get(f.prefix)
      if (!tiers?.length) return <span key={i}>{f.name}</span>
      const tier = cheerTier(tiers, f.amount)
      return (
        <span key={i} className="chat-cheer" title={`${f.amount} Bits`}>
          <img className="chat-emote" src={tier.url} alt={f.name} loading="lazy" draggable={false} />
          <strong style={{ color: tier.color }}>{f.amount}</strong>
        </span>
      )
    }
    case 'mention':
      return (
        <span key={i} className={`chat-mention${f.login === ctx.myLogin ? ' is-me' : ''}`}>
          {f.text}
        </span>
      )
    case 'link':
      return (
        <a key={i} className="chat-link" href={f.href} target="_blank" rel="noreferrer noopener">
          {f.text}
        </a>
      )
    default:
      return <span key={i}>{f.text}</span>
  }
}

function time(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function mentionsMe(e: ChatLineEvent, me: string | null) {
  if (!me || e.self) return false
  return e.fragments.some((f) => f.type === 'mention' && f.login === me)
}

export const ChatLine = memo(function ChatLine({ event, ctx }: { event: ChatLineEvent; ctx: LineContext }) {
  const color = readableColor(event.color || defaultNameColor(event.login), ctx.theme)
  const classes = [
    'chat-line',
    event.action ? 'is-action' : '',
    mentionsMe(event, ctx.myLogin) ? 'is-mention' : '',
    event.firstMessage ? 'is-first' : '',
    event.highlighted ? 'is-highlighted' : '',
    event.bits > 0 ? 'is-cheer' : '',
    event.deleted ? 'is-deleted' : '',
    event.self ? 'is-self' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes} data-msg-id={event.id}>
      {event.reply && (
        <div className="chat-line__reply" title={event.reply.text}>
          {ui.replyingTo(event.reply.displayName)} {event.reply.text}
        </div>
      )}
      {event.firstMessage && <div className="chat-line__tag">{ui.firstTimeChat}</div>}
      <time className="chat-line__time">{time(event.timestamp)}</time>
      {event.badges.map((badge) => {
        const info = badgeInfo(badge, ctx.badges)
        return info ? (
          <img key={`${badge.set}/${badge.version}`} className="chat-badge" src={info.url} alt={info.title} title={info.title} loading="lazy" />
        ) : null
      })}
      <button type="button" className="chat-line__user" style={{ color }} onClick={() => ctx.onName(event.displayName)}>
        {event.displayName}
      </button>
      <span className="chat-line__sep">{event.action ? ' ' : ': '}</span>
      <span className="chat-line__text" style={event.action ? ({ color } as CSSProperties) : undefined}>
        {event.deleted ? <em className="muted">{ui.messageDeleted}</em> : event.fragments.map((f, i) => renderFragment(f, i, ctx))}
      </span>
    </div>
  )
})

export const ChatRow = memo(function ChatRow({ event, ctx }: { event: ChatEvent; ctx: LineContext }) {
  if (event.kind === 'message') return <ChatLine event={event} ctx={ctx} />
  if (event.kind === 'status') return <div className="chat-status">{event.text}</div>
  return (
    <div
      className={`chat-notice chat-notice--${event.noticeType}`}
      style={event.color ? ({ '--notice': event.color } as CSSProperties) : undefined}
    >
      <div className="chat-notice__system">{event.systemText}</div>
      {event.message && <ChatLine event={event.message} ctx={ctx} />}
    </div>
  )
})
