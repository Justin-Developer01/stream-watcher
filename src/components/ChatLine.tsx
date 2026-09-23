import type { ChatMessage } from '../types'
import { formatChatTime, splitMessageParts } from '../lib/chatMarkup'
import type { BadgeLookup } from '../lib/twitch'

type Props = {
  message: ChatMessage
  badges: BadgeLookup
}

export function ChatLine({ message, badges }: Props) {
  const parts = splitMessageParts(message.text, message.emotes)
  const badgeEntries = Object.entries(message.badges ?? {})

  return (
    <div className="chat-line">
      <span className="chat-line__time">{formatChatTime(message.timestamp)}</span>
      {badgeEntries.map(([set, version]) => {
        const url = badges[`${set}/${version}`]
        if (!url) return null
        return (
          <img
            key={`${set}-${version}`}
            className="chat-line__badge"
            src={url}
            alt=""
            title={set}
            width={18}
            height={18}
          />
        )
      })}
      <span className="chat-line__user" style={{ color: message.color || '#8fd3ff' }}>
        {message.user}
      </span>
      <span className="chat-line__sep">:</span>
      <span className="chat-line__text">
        {parts.map((part, index) =>
          part.type === 'emote' ? (
            <img
              key={`${part.id}-${index}`}
              className="chat-emote"
              src={part.url}
              alt={part.name}
              title={part.name}
            />
          ) : (
            <span key={`t-${index}`}>{part.value}</span>
          ),
        )}
      </span>
    </div>
  )
}
