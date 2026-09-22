import { DOCS_FEATURES_URL, DOCS_HOME_URL, DOCS_USAGE_URL } from '../lib/env'
import { requestFirstRunTips } from './FirstRunTips'
import { UI } from '../lib/uiLabels'

type Props = {
  onCloseSettings?: () => void
}

const STEPS: { title: string; body: string }[] = [
  { title: 'Add streams', body: 'Click the title (list icon if Chrome is Left). Paste a channel name or twitch.tv URL.' },
  { title: UI.loginToTwitch, body: `${UI.loginTooltip} One button for Prime and chat.` },
  {
    title: UI.focusMode,
    body: `One stream large, others in the bottom strip. Click a strip tile to promote it. ${UI.switchFocus} (hotkey) promotes the next strip tile.`,
  },
  {
    title: UI.openChat,
    body: 'Opens the in-app drawer. It pushes the grid (Slide right / left, Dock bottom, or Float). Not another window.',
  },
  {
    title: `${UI.popOutChat} · ${UI.popOutStream}`,
    body: 'Separate windows for another monitor. The stream tile then reads On another monitor.',
  },
  {
    title: `${UI.dockBack} · ${UI.alwaysOnTop}`,
    body: 'Both live on the pop-out only. Dock back returns chat or the player to the main desk.',
  },
  {
    title: UI.lockWindow,
    body: 'After See desktop behind app, empty stage clicks through. Lock window when you need the UI.',
  },
  {
    title: UI.settings,
    body: `Gear. Tabs: Appearance · Chat · Hotkeys · Updates · Advanced · Help. Appearance → Chrome: Top | Left. ${UI.layoutTemplates} and ${UI.dockAllPopouts} live on the thin bar.`,
  },
]

export function HelpGuide({ onCloseSettings }: Props) {
  return (
    <section className="popover-section help-guide">
      <h2>Help</h2>
      <p className="hint">
        Add a channel → {UI.loginToTwitch} → {UI.focusMode}. Then park on another monitor → {UI.lockWindow} when you
        need the UI → {UI.dockBack} to the main desk.
      </p>
      <ol className="help-guide__steps">
        {STEPS.map((step) => (
          <li key={step.title}>
            <strong>{step.title}</strong>
            <span>{step.body}</span>
          </li>
        ))}
      </ol>
      <div className="settings-actions">
        <button
          type="button"
          className="secondary"
          onClick={() => {
            requestFirstRunTips()
            onCloseSettings?.()
          }}
        >
          Show tips
        </button>
      </div>
      <p className="hint">
        <a href={DOCS_HOME_URL} target="_blank" rel="noreferrer">
          Full docs
        </a>
        {' · '}
        <a href={DOCS_USAGE_URL} target="_blank" rel="noreferrer">
          How to use
        </a>
        {' · '}
        <a href={DOCS_FEATURES_URL} target="_blank" rel="noreferrer">
          Features
        </a>
      </p>
    </section>
  )
}
