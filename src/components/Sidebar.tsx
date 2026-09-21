import { useState, type FormEvent } from 'react'
import type { SavedStream } from '../types'

type Props = {
  collapsed: boolean
  onToggleCollapsed: () => void
  clientId: string
  onClientIdChange: (value: string) => void
  onAddStream: (value: string) => { ok: boolean; error?: string; channel?: string }
  onSaveStream: (value: string) => { ok: boolean; error?: string; channel?: string }
  onUnsaveStream: (channel: string) => void
  savedStreams: SavedStream[]
  openChannels: string[]
  onPreset: (preset: '1x1' | '1x2' | '2x2' | '1+3') => void
  isLoggedIn: boolean
  displayName: string | null
  authBusy: boolean
  authError: string | null
  onLoginChat: () => void
  onLoginPrime: () => void
  onLogout: () => void
}

export function Sidebar({
  collapsed,
  onToggleCollapsed,
  clientId,
  onClientIdChange,
  onAddStream,
  onSaveStream,
  onUnsaveStream,
  savedStreams,
  openChannels,
  onPreset,
  isLoggedIn,
  displayName,
  authBusy,
  authError,
  onLoginChat,
  onLoginPrime,
  onLogout,
}: Props) {
  const [channelInput, setChannelInput] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(!clientId)

  const handleAdd = (event: FormEvent) => {
    event.preventDefault()
    const result = onAddStream(channelInput)
    if (result.ok) {
      setChannelInput('')
      setAddError(null)
      setSaveMessage(null)
    } else {
      setAddError(result.error ?? 'Could not add stream')
    }
  }

  const handleSaveCurrent = () => {
    const result = onSaveStream(channelInput)
    if (result.ok) {
      setSaveMessage(`Saved #${result.channel}`)
      setAddError(null)
      setChannelInput('')
    } else {
      setAddError(result.error ?? 'Could not save stream')
      setSaveMessage(null)
    }
  }

  if (collapsed) {
    return (
      <aside className="sidebar sidebar--collapsed" aria-label="Sidebar collapsed">
        <button
          type="button"
          className="panel-toggle panel-toggle--expand"
          onClick={onToggleCollapsed}
          title="Expand sidebar"
          aria-label="Expand sidebar"
        >
          ›
        </button>
        <span className="brand__mark brand__mark--mini">SW</span>
      </aside>
    )
  }

  return (
    <aside className="sidebar">
      <div className="panel-header">
        <div className="brand">
          <span className="brand__mark">SW</span>
          <div>
            <h1>Stream Watcher</h1>
            <p>Multi-stream Twitch layouts</p>
          </div>
        </div>
        <button
          type="button"
          className="panel-toggle"
          onClick={onToggleCollapsed}
          title="Collapse sidebar"
          aria-label="Collapse sidebar"
        >
          ‹
        </button>
      </div>

      <form className="add-form" onSubmit={handleAdd}>
        <label htmlFor="channel">Add stream</label>
        <div className="add-form__row">
          <input
            id="channel"
            value={channelInput}
            onChange={(e) => setChannelInput(e.target.value)}
            placeholder="channel or twitch.tv/…"
            autoComplete="off"
          />
          <button type="submit">Add</button>
        </div>
        <div className="add-form__actions">
          <button type="button" className="secondary" onClick={handleSaveCurrent} disabled={!channelInput.trim()}>
            Save for later
          </button>
        </div>
        {addError && <p className="field-error">{addError}</p>}
        {saveMessage && <p className="field-success">{saveMessage}</p>}
      </form>

      <section className="sidebar-section">
        <h2>Saved streams</h2>
        {!savedStreams.length && (
          <p className="hint">Save channels here so you can reopen them without pasting a link.</p>
        )}
        <ul className="saved-list">
          {savedStreams.map((item) => {
            const isOpen = openChannels.includes(item.channel)
            return (
              <li key={item.channel} className="saved-list__item">
                <span className="saved-list__name">#{item.channel}</span>
                <div className="saved-list__actions">
                  <button
                    type="button"
                    disabled={isOpen}
                    onClick={() => onAddStream(item.channel)}
                    title={isOpen ? 'Already open' : 'Open stream'}
                  >
                    {isOpen ? 'Open' : 'Add'}
                  </button>
                  <button
                    type="button"
                    className="ghost danger"
                    onClick={() => onUnsaveStream(item.channel)}
                    title="Remove from saved"
                  >
                    ✕
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="sidebar-section">
        <h2>Layouts</h2>
        <div className="preset-row">
          <button type="button" onClick={() => onPreset('1x1')}>
            1
          </button>
          <button type="button" onClick={() => onPreset('1x2')}>
            1×2
          </button>
          <button type="button" onClick={() => onPreset('2x2')}>
            2×2
          </button>
          <button type="button" onClick={() => onPreset('1+3')}>
            1+3
          </button>
        </div>
        <p className="hint">Drag the ⋮⋮ handle on any tile to rearrange.</p>
      </section>

      <section className="sidebar-section">
        <h2>Twitch account</h2>
        {isLoggedIn ? (
          <p className="auth-status">Signed in as <strong>{displayName}</strong></p>
        ) : (
          <p className="hint">Log in to chat and use Prime/Turbo benefits in embeds.</p>
        )}
        <div className="stack-buttons">
          <button type="button" onClick={onLoginChat} disabled={authBusy}>
            {isLoggedIn ? 'Re-auth for chat' : 'Login for chat'}
          </button>
          <button type="button" className="secondary" onClick={onLoginPrime}>
            Login for Prime / ads
          </button>
          {isLoggedIn && (
            <button type="button" className="ghost" onClick={onLogout}>
              Log out
            </button>
          )}
        </div>
        {authError && <p className="field-error">{authError}</p>}
      </section>

      <section className="sidebar-section">
        <button
          type="button"
          className="ghost settings-toggle"
          onClick={() => setShowSettings((v) => !v)}
        >
          {showSettings ? 'Hide settings' : 'Settings'}
        </button>
        {showSettings && (
          <div className="settings-block">
            <label htmlFor="clientId">Twitch Client ID</label>
            <input
              id="clientId"
              value={clientId}
              onChange={(e) => onClientIdChange(e.target.value.trim())}
              placeholder="from dev.twitch.tv"
              autoComplete="off"
            />
            <p className="hint">
              Create an app at{' '}
              <a href="https://dev.twitch.tv/console" target="_blank" rel="noreferrer">
                Twitch Developer Console
              </a>
              . OAuth redirect: <code>http://localhost:5173/oauth/callback</code>
            </p>
          </div>
        )}
      </section>
    </aside>
  )
}
