import { Component, type ReactNode } from 'react'
import { log } from '../lib/log'
import { ui } from '../lib/uiLabels'

type Props = { label: string; children: ReactNode }
type State = { failed: boolean }

/** Keeps one player's error inside its tile instead of unmounting the whole desk. */
export class PlayerErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    log.error(`player ${this.props.label} crashed:`, error)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="player-error">
        <p>{ui.playerStopped}</p>
        <button type="button" className="text-btn" onClick={() => this.setState({ failed: false })}>
          {ui.reloadPlayer}
        </button>
      </div>
    )
  }
}
