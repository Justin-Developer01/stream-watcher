import { useMemo, useState } from 'react'
import type { Emote } from '../../lib/chat/types'
import { ui } from '../../lib/uiLabels'

const MAX_PER_SECTION = 240

type Props = {
  user: Emote[]
  channel: Emote[]
  global: Emote[]
  onPick: (name: string) => void
}

export function EmotePicker({ user, channel, global, onPick }: Props) {
  const [query, setQuery] = useState('')
  const owned = useMemo(() => new Set(user.map((e) => e.id)), [user])

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase()
    const match = (e: Emote) => !q || e.name.toLowerCase().includes(q)
    // Without user emotes (logged out or no user:read:emotes scope) nothing can be marked locked.
    const lockedCheck = user.length > 0
    return [
      { title: ui.yourEmotes, list: user.filter(match), locked: () => false },
      { title: ui.channelEmotes, list: channel.filter(match), locked: (e: Emote) => lockedCheck && !owned.has(e.id) },
      { title: ui.globalEmotes, list: global.filter(match), locked: () => false },
    ].filter((s) => s.list.length)
  }, [query, user, channel, global, owned])

  return (
    <div className="emote-picker">
      <input
        className="emote-picker__search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={ui.searchEmotes}
        aria-label={ui.searchEmotes}
        autoFocus
      />
      <div className="emote-picker__scroll">
        {!sections.length && <p className="muted">{ui.noEmotes}</p>}
        {sections.map((section) => (
          <section key={section.title}>
            <h4 className="emote-picker__title">{section.title}</h4>
            <div className="emote-picker__grid">
              {section.list.slice(0, MAX_PER_SECTION).map((emote) => {
                const locked = section.locked(emote)
                return (
                  <button
                    key={`${section.title}-${emote.id}`}
                    type="button"
                    className={`emote-picker__item${locked ? ' is-locked' : ''}`}
                    title={locked ? `${emote.name} — ${ui.emoteLocked}` : emote.name}
                    disabled={locked}
                    onClick={() => onPick(emote.name)}
                  >
                    <img src={emote.url} alt={emote.name} loading="lazy" draggable={false} />
                  </button>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
