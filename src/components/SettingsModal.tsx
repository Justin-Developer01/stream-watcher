import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { AppearanceTheme, UpdaterStatus } from '../types'
import type { HotkeyChord, HotkeyId } from '../lib/hotkeys'
import { DOCS_FEATURES_URL, DOCS_HOME_URL, DOCS_USAGE_URL, TWITCH_OAUTH_REDIRECT } from '../lib/env'
import { AppearanceSettings, ChatTypographySettings } from './AppearanceSettings'
import { HelpGuide } from './HelpGuide'
import { HotkeysSettings } from './HotkeysSettings'
import { IconButton } from './IconButton'
import { UI } from '../lib/uiLabels'

export type SettingsTab = 'appearance' | 'chat' | 'hotkeys' | 'updates' | 'advanced' | 'help'

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'appearance', label: 'Appearance' },
  { id: 'chat', label: 'Chat' },
  { id: 'hotkeys', label: 'Hotkeys' },
  { id: 'updates', label: 'Updates' },
  { id: 'advanced', label: 'Advanced' },
  { id: 'help', label: 'Help' },
]

type Props = {
  tab: SettingsTab
  onTabChange: (tab: SettingsTab) => void
  onClose: () => void
  appearance: AppearanceTheme
  onAppearanceChange: (theme: AppearanceTheme | ((prev: AppearanceTheme) => AppearanceTheme)) => void
  hotkeys: Record<HotkeyId, HotkeyChord>
  onHotkeysChange: (hotkeys: Record<HotkeyId, HotkeyChord>) => void
  clientId: string
  onClientIdChange: (value: string) => void
  hasBuiltInClientId: boolean
  isLoggedIn: boolean
  authBusy: boolean
  authError: string | null
  onReconnectChat: () => void
  onRefreshPrime: () => void
  onLogout: () => void
  updater: UpdaterStatus
  onCheckForUpdates: () => void
  onDownloadUpdate: () => void
  onInstallUpdate: () => void
  onQuit: () => void
}

export function SettingsModal({
  tab,
  onTabChange,
  onClose,
  appearance,
  onAppearanceChange,
  hotkeys,
  onHotkeysChange,
  clientId,
  onClientIdChange,
  hasBuiltInClientId,
  isLoggedIn,
  authBusy,
  authError,
  onReconnectChat,
  onRefreshPrime,
  onLogout,
  updater,
  onCheckForUpdates,
  onDownloadUpdate,
  onInstallUpdate,
  onQuit,
}: Props) {
  const [developerOpen, setDeveloperOpen] = useState(!hasBuiltInClientId || Boolean(authError))

  useEffect(() => {
    if (!hasBuiltInClientId || authError) setDeveloperOpen(true)
  }, [authError, hasBuiltInClientId])

  return (
    <div className="settings-modal-backdrop" data-hit onMouseDown={onClose}>
      <div
        className="settings-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        data-hit
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="settings-modal__header">
          <h1>Settings</h1>
          <IconButton label="Close settings" onClick={onClose}>
            <X size={16} strokeWidth={1.75} />
          </IconButton>
        </header>
        <div className="settings-modal__body">
          <nav className="settings-modal__nav" aria-label="Settings sections">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={tab === item.id ? 'is-active' : ''}
                onClick={() => onTabChange(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <div className="settings-modal__panel">
            {tab === 'appearance' && (
              <AppearanceSettings appearance={appearance} onChange={onAppearanceChange} />
            )}
            {tab === 'chat' && (
              <ChatTypographySettings appearance={appearance} onChange={onAppearanceChange} />
            )}
            {tab === 'hotkeys' && <HotkeysSettings hotkeys={hotkeys} onChange={onHotkeysChange} />}
            {tab === 'updates' && (
              <section className="popover-section">
                <h2>Updates</h2>
                <p className="hint">
                  App version {updater.currentVersion || 'dev'}. Checks GitHub Releases, including pre-releases.
                </p>
                {updater.message && <p className="hint">{updater.message}</p>}
                {updater.state === 'available' && updater.availableVersion && (
                  <p>Version {updater.availableVersion} is available.</p>
                )}
                {updater.state === 'downloading' && (
                  <p className="hint">Downloading… {Math.round(updater.percent ?? 0)}%</p>
                )}
                {updater.state === 'ready' && updater.availableVersion && (
                  <p>Version {updater.availableVersion} is ready. Install restarts the app.</p>
                )}
                {updater.error && <p className="field-error">{updater.error}</p>}
                <div className="settings-actions">
                  <button
                    type="button"
                    className="secondary"
                    title="Check for Updates"
                    onClick={onCheckForUpdates}
                    disabled={updater.state === 'checking' || updater.state === 'downloading'}
                  >
                    Check for Updates
                  </button>
                  {updater.state === 'available' && (
                    <button type="button" onClick={onDownloadUpdate}>
                      Download
                    </button>
                  )}
                  {updater.state === 'ready' && (
                    <button type="button" onClick={onInstallUpdate}>
                      Install and restart
                    </button>
                  )}
                </div>
                <p className="hint">
                  Unsigned builds still update from GitHub. Windows SmartScreen may warn — More info → Run anyway.
                  Portable builds can’t auto-update. Check for Updates opens the GitHub Releases page in your browser
                  so you can download a new Setup or Portable EXE.
                </p>
              </section>
            )}
            {tab === 'advanced' && (
              <section className="popover-section">
                <h2>Advanced</h2>
                <div className="settings-block">
                  <button
                    type="button"
                    className={`developer-toggle${developerOpen ? ' is-open' : ''}`}
                    aria-expanded={developerOpen}
                    onClick={() => setDeveloperOpen((open) => !open)}
                  >
                    <span>Developer</span>
                  </button>
                  {developerOpen && (
                    <div className="developer-panel">
                      <label htmlFor="clientId">Twitch Client ID</label>
                      <input
                        id="clientId"
                        value={clientId}
                        onChange={(e) => onClientIdChange(e.target.value.trim())}
                        placeholder={
                          hasBuiltInClientId ? 'leave blank to use the baked-in ID' : 'from dev.twitch.tv'
                        }
                        autoComplete="off"
                      />
                      <p className="hint">
                        {hasBuiltInClientId ? (
                          <>
                            Optional override. Leave blank to use the Client ID baked into this build. OAuth
                            redirect: <code>{TWITCH_OAUTH_REDIRECT}</code>
                          </>
                        ) : (
                          <>
                            Create an app at{' '}
                            <a href="https://dev.twitch.tv/console" target="_blank" rel="noreferrer">
                              Twitch Developer Console
                            </a>
                            . OAuth redirect: <code>{TWITCH_OAUTH_REDIRECT}</code>
                          </>
                        )}
                      </p>
                    </div>
                  )}
                  <div className="settings-actions">
                    <button type="button" className="secondary" onClick={onReconnectChat} disabled={authBusy}>
                      Reconnect chat
                    </button>
                    <button type="button" className="secondary" onClick={onRefreshPrime} disabled={authBusy}>
                      Refresh Prime session
                    </button>
                  </div>
                  <p className="hint">
                    Use these if the top-bar login only half-worked (chat token vs Prime/ads).
                  </p>
                  {isLoggedIn && (
                    <button type="button" className="ghost" onClick={onLogout}>
                      Log out
                    </button>
                  )}
                  {authError && <p className="field-error">{authError}</p>}
                  <p className="hint">
                    Short steps live on the <strong>Help</strong> tab. Full write-up:{' '}
                    <a href={DOCS_HOME_URL} target="_blank" rel="noreferrer">
                      Docs
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
                </div>
              </section>
            )}
            {tab === 'help' && <HelpGuide onCloseSettings={onClose} />}
          </div>
        </div>
        <footer className="settings-modal__footer">
          <button type="button" className="danger settings-exit" onClick={onQuit}>
            {UI.exit}
          </button>
        </footer>
      </div>
    </div>
  )
}
