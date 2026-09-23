import { useMemo, useState } from 'react'
import type { ChatEmote } from '../lib/twitch'
import { UI } from '../lib/uiLabels'

type Props = {
  emotes: ChatEmote[]
  onPick: (name: string) => void
  onClose: () => void
}

export function EmotePicker({ emotes, onPick, onClose }: Props) {
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return emotes
    return emotes.filter((emote) => emote.name.toLowerCase().includes(q))
  }, [emotes, query])

  const channel = filtered.filter((emote) => emote.source === 'channel')
  const global = filtered.filter((emote) => emote.source === 'global')

  return (
    <div className="emote-picker" role="dialog" aria-label={UI.emotePicker} data-hit>
      <div className="emote-picker__bar">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search emotes"
          aria-label="Search emotes"
          autoComplete="off"
        />
        <button type="button" className="ghost" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="emote-picker__body">
        {!filtered.length && <p className="hint">No emotes to show.</p>}
        {channel.length > 0 && (
          <section>
            <p className="theme-label">Channel</p>
            <EmoteGrid emotes={channel} onPick={onPick} />
          </section>
        )}
        {global.length > 0 && (
          <section>
            <p className="theme-label">Global</p>
            <EmoteGrid emotes={global} onPick={onPick} />
          </section>
        )}
      </div>
    </div>
  )
}

function EmoteGrid({ emotes, onPick }: { emotes: ChatEmote[]; onPick: (name: string) => void }) {
  return (
    <div className="emote-picker__grid">
      {emotes.map((emote) => (
        <button
          key={`${emote.source}-${emote.id}`}
          type="button"
          className="emote-picker__item"
          title={emote.name}
          onClick={() => onPick(emote.name)}
        >
          <img src={emote.url} alt={emote.name} />
        </button>
      ))}
    </div>
  )
}
