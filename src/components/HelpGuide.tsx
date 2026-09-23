import { DOCS_FEATURES_URL, DOCS_HOME_URL, DOCS_USAGE_URL } from '../lib/env'
import { requestFirstRunTips } from './FirstRunTips'
import { UI } from '../lib/uiLabels'

type Props = {
  onCloseSettings?: () => void
}

const STEPS: { title: string; body: string }[] = [
  {
    title: 'Add streams',
    body: 'Click the title (list icon when Chrome is Left or Right). Paste a channel name or twitch.tv URL.',
  },
  { title: UI.loginToTwitch, body: `${UI.loginTooltip} One button for Prime and chat, in the ${UI.menu} (☰).` },
  {
    title: UI.mode,
    body: `${UI.modeStandard} · ${UI.modeFocus} · ${UI.modePerformance} — one at a time. Focus: one stream large, others in the bottom strip; click a strip tile to promote it. ${UI.switchFocus} (hotkey) promotes the next strip tile.`,
  },
  {
    title: UI.openChat,
    body: `In the ${UI.more} (…) menu. Opens the in-app drawer; it pushes the grid (Slide right / left, Dock bottom, or Float). Settings → Chat sets Font (including Custom… for a Windows-installed family), Size, and Drawer width. After Login to Twitch, emotes render in the list and the composer picker.`,
  },
  {
    title: `${UI.popOutChat} · ${UI.popOutStream}`,
    body: `Separate windows for another monitor. A popped stream leaves the grid; a redock menu with a count appears on the bar. ${UI.dockAllPopouts} brings everything back.`,
  },
  {
    title: `${UI.dockBack} · ${UI.alwaysOnTop}`,
    body: 'Both live on the pop-out only. Dock back returns chat or the player to the main desk.',
  },
  {
    title: UI.seeThroughWindows,
    body: 'Empty stage clicks through to the desktop. Use the Lock window hotkey (L) to freeze it while you need the UI.',
  },
  {
    title: UI.settings,
    body: `In the ${UI.menu} (☰). Tabs: Appearance · Chat · Hotkeys · Updates · Advanced · Help. Appearance → Chrome: Top | Left | Right | Bottom. ${UI.ghostOverlay} auto-hides the thin bar only (frameless is always on). ${UI.exit} in the footer quits; ${UI.quitApplication} is Ctrl+Q.`,
  },
]

export function HelpGuide({ onCloseSettings }: Props) {
  return (
    <section className="popover-section help-guide">
      <h2>Help</h2>
      <p className="hint">
        Add a channel → {UI.loginToTwitch} → {UI.modeFocus}. The main window is frameless — drag the thin bar. Then
        park on another monitor → {UI.seeThroughWindows} when you need the UI → {UI.dockBack} to the main desk.
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
