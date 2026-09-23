import { X } from 'lucide-react'
import { firstRunTips } from '../lib/uiLabels'

export function FirstRunTips({
  dismissed,
  onDismiss,
}: {
  dismissed: string[]
  onDismiss: (id: string) => void
}) {
  const remaining = firstRunTips.filter((tip) => !dismissed.includes(tip.id))
  if (!remaining.length) return null

  return (
    <div className="tips-stack" data-hit>
      {remaining.map((tip) => (
        <article key={tip.id} className="tip-card">
          <header>
            <h3>{tip.title}</h3>
            <button type="button" className="icon-btn" onClick={() => onDismiss(tip.id)} aria-label="Dismiss">
              <X size={13} />
            </button>
          </header>
          <p>{tip.body}</p>
        </article>
      ))}
    </div>
  )
}
