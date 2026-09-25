import * as Dialog from '@radix-ui/react-dialog'
import * as Tabs from '@radix-ui/react-tabs'
import * as Switch from '@radix-ui/react-switch'
import { useEffect, useMemo, useState } from 'react'
import { defaultHotkeys, formatHotkeyEvent, hotkeyActions, hotkeyLabels, hotkeysConflict, type HotkeyAction } from '../lib/hotkeys'
import { chatFontFamily } from '../lib/storage'
import { builtInTwitchClientId } from '../lib/twitchClientId'
import { ui } from '../lib/uiLabels'
import vesperLogo from '../assets/vesper-desk-logo.png'
import { themeVars, usePortalThemeProps } from './ui/portalTheme'
import { DEFAULT_SETTINGS, type AppSettings, type ChatFont, type ChromeEdge, type ThemeName } from '../types'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: AppSettings
  clientId: string
  onSave: (settings: AppSettings, clientId: string) => void
  onReconnectChat: () => void
  onRefreshPrime: () => void
  onShowTips: () => void
}

const FONT_OPTIONS: Array<{ id: ChatFont; label: string }> = [
  { id: 'system', label: 'System' },
  { id: 'ibm', label: 'IBM Plex Sans' },
  { id: 'inter', label: 'Inter' },
  { id: 'mono', label: 'Mono' },
  { id: 'source', label: 'Source Sans 3' },
  { id: 'roboto', label: 'Roboto' },
  { id: 'geist', label: 'Geist' },
  { id: 'custom', label: ui.custom },
]

export function SettingsModal({
  open,
  onOpenChange,
  settings,
  clientId,
  onSave,
  onReconnectChat,
  onRefreshPrime,
  onShowTips,
}: Props) {
  const [draft, setDraft] = useState(settings)
  const [draftClientId, setDraftClientId] = useState(clientId)
  const [updateNote, setUpdateNote] = useState<string | null>(null)
  const [recording, setRecording] = useState<HotkeyAction | null>(null)

  useEffect(() => {
    if (open) {
      setDraft(settings)
      setDraftClientId(clientId)
      setUpdateNote(null)
    }
  }, [open, settings, clientId])

  const conflicts = useMemo(() => hotkeysConflict(draft.hotkeys), [draft.hotkeys])
  const portal = usePortalThemeProps()
  const dialogStyle = { ...portal.style, ...themeVars(draft) }

  const setAppearance = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" data-theme={draft.theme} data-hit />
        <Dialog.Content
          className="modal-card"
          data-theme={draft.theme}
          style={dialogStyle}
          data-hit
          onEscapeKeyDown={() => onOpenChange(false)}
        >
          <Dialog.Title className="modal-title">{ui.settings}</Dialog.Title>
          <Tabs.Root defaultValue="appearance" className="settings-tabs">
            <Tabs.List className="settings-tabs__list">
              <Tabs.Trigger value="appearance">{ui.appearance}</Tabs.Trigger>
              <Tabs.Trigger value="chat">{ui.chat}</Tabs.Trigger>
              <Tabs.Trigger value="hotkeys">{ui.hotkeys}</Tabs.Trigger>
              <Tabs.Trigger value="updates">{ui.updates}</Tabs.Trigger>
              <Tabs.Trigger value="advanced">{ui.advanced}</Tabs.Trigger>
              <Tabs.Trigger value="help">{ui.help}</Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content value="appearance" className="settings-pane">
              <fieldset>
                <legend>Theme</legend>
                {(['dark', 'dim', 'light'] as ThemeName[]).map((theme) => (
                  <label key={theme} className="choice">
                    <input
                      type="radio"
                      name="theme"
                      checked={draft.theme === theme}
                      onChange={() => {
                        const preset =
                          theme === 'light'
                            ? { surface: '#fff7ec', text: '#2a2118', backgroundColor: '#f3ebe1' }
                            : theme === 'dim'
                              ? { surface: '#1a1620', text: '#efe6db', backgroundColor: '#121018' }
                              : { surface: '#141018', text: '#f4ece2', backgroundColor: '#0c0a10' }
                        setDraft((prev) => ({ ...prev, theme, ...preset }))
                      }}
                    />
                    {ui[theme]}
                  </label>
                ))}
              </fieldset>
              <label>
                {ui.accent}
                <input type="color" value={draft.accent} onChange={(e) => setAppearance('accent', e.target.value)} />
              </label>
              <label>
                {ui.surface}
                <input type="color" value={draft.surface} onChange={(e) => setAppearance('surface', e.target.value)} />
              </label>
              <label>
                {ui.text}
                <input type="color" value={draft.text} onChange={(e) => setAppearance('text', e.target.value)} />
              </label>
              <label>
                {ui.backgroundColor}
                <input
                  type="color"
                  value={draft.backgroundColor}
                  onChange={(e) => setAppearance('backgroundColor', e.target.value)}
                />
              </label>
              <label>
                {ui.backgroundImage}
                <input
                  value={draft.backgroundImage}
                  onChange={(e) => setAppearance('backgroundImage', e.target.value)}
                  placeholder="https://…"
                />
              </label>
              <label>
                {ui.opacity} {Math.round(draft.backgroundOpacity * 100)}%
                <input
                  type="range"
                  min={0.15}
                  max={1}
                  step={0.05}
                  value={draft.backgroundOpacity}
                  onChange={(e) => setAppearance('backgroundOpacity', Number(e.target.value))}
                />
              </label>
              <fieldset>
                <legend>{ui.chrome}</legend>
                {(['top', 'left', 'right', 'bottom'] as ChromeEdge[]).map((edge) => (
                  <label key={edge} className="choice">
                    <input
                      type="radio"
                      name="chrome"
                      checked={draft.chromeEdge === edge}
                      onChange={() => setAppearance('chromeEdge', edge)}
                    />
                    {edge === 'top' ? ui.chromeTop : edge === 'left' ? ui.chromeLeft : edge === 'right' ? ui.chromeRight : ui.chromeBottom}
                  </label>
                ))}
              </fieldset>
              <label className="switch-row">
                <span>{ui.seeThroughWindows}</span>
                <Switch.Root
                  className="switch"
                  checked={draft.seeThrough}
                  onCheckedChange={(v) => setAppearance('seeThrough', v)}
                >
                  <Switch.Thumb className="switch__thumb" />
                </Switch.Root>
              </label>
              <label className="switch-row">
                <span>{ui.ghostOverlay}</span>
                <Switch.Root
                  className="switch"
                  checked={draft.ghostOverlay}
                  onCheckedChange={(v) => setAppearance('ghostOverlay', v)}
                >
                  <Switch.Thumb className="switch__thumb" />
                </Switch.Root>
              </label>
              <div className="settings-actions">
              <button
                type="button"
                className="text-btn"
                onClick={() =>
                  setDraft((prev) => ({
                    ...prev,
                    theme: DEFAULT_SETTINGS.theme,
                    accent: DEFAULT_SETTINGS.accent,
                    surface: DEFAULT_SETTINGS.surface,
                    text: DEFAULT_SETTINGS.text,
                    backgroundColor: DEFAULT_SETTINGS.backgroundColor,
                    backgroundImage: DEFAULT_SETTINGS.backgroundImage,
                    backgroundOpacity: DEFAULT_SETTINGS.backgroundOpacity,
                    chromeEdge: DEFAULT_SETTINGS.chromeEdge,
                    seeThrough: DEFAULT_SETTINGS.seeThrough,
                    ghostOverlay: DEFAULT_SETTINGS.ghostOverlay,
                  }))
                }
              >
                {ui.reset}
              </button>
              </div>
            </Tabs.Content>

            <Tabs.Content value="chat" className="settings-pane">
              <label>
                {ui.font}
                <select
                  value={draft.chat.font}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, chat: { ...p.chat, font: e.target.value as ChatFont } }))
                  }
                >
                  {FONT_OPTIONS.map((font) => (
                    <option key={font.id} value={font.id}>
                      {font.label}
                    </option>
                  ))}
                </select>
              </label>
              {draft.chat.font === 'custom' && (
                <label>
                  Windows-installed family
                  <input
                    value={draft.chat.customFont}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, chat: { ...p.chat, customFont: e.target.value } }))
                    }
                    placeholder="Segoe UI"
                  />
                </label>
              )}
              <label>
                {ui.size} {draft.chat.fontSize}
                <input
                  type="range"
                  min={12}
                  max={16}
                  value={draft.chat.fontSize}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, chat: { ...p.chat, fontSize: Number(e.target.value) } }))
                  }
                />
              </label>
              <label>
                {ui.drawerWidth} {draft.chat.drawerWidth}
                <input
                  type="range"
                  min={280}
                  max={480}
                  value={draft.chat.drawerWidth}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, chat: { ...p.chat, drawerWidth: Number(e.target.value) } }))
                  }
                />
              </label>
              <p className="chat-preview" style={{ fontFamily: chatFontFamily(draft), fontSize: draft.chat.fontSize }}>
                Preview — dusk light on the desk. #{`vesper`}
              </p>
            </Tabs.Content>

            <Tabs.Content value="hotkeys" className="settings-pane">
              {hotkeyActions.map((action) => (
                <label key={action} className="hotkey-row">
                  <span>{hotkeyLabels[action]}</span>
                  <button
                    type="button"
                    className={`hotkey-btn${conflicts[action] ? ' is-conflict' : ''}`}
                    onClick={() => setRecording(action)}
                  >
                    {recording === action ? 'Press keys…' : draft.hotkeys[action]}
                  </button>
                  {conflicts[action] && <small className="field-error">Conflicts with {hotkeyLabels[conflicts[action]]}</small>}
                </label>
              ))}
              {recording && (
                <HotkeyCapture
                  onCancel={() => setRecording(null)}
                  onBind={(combo) => {
                    setDraft((p) => ({ ...p, hotkeys: { ...p.hotkeys, [recording]: combo } }))
                    setRecording(null)
                  }}
                />
              )}
              <div className="settings-actions">
                <button
                  type="button"
                  className="text-btn"
                  onClick={() => setDraft((p) => ({ ...p, hotkeys: { ...defaultHotkeys } }))}
                >
                  {ui.reset}
                </button>
              </div>
            </Tabs.Content>

            <Tabs.Content value="updates" className="settings-pane">
              <p>Checks GitHub Releases including pre-releases. Portable builds open the Releases page.</p>
              <p className="muted">Unsigned builds may show a SmartScreen warning on Windows.</p>
              <button
                type="button"
                className="text-btn"
                onClick={async () => {
                  setUpdateNote('Opening GitHub Releases…')
                  await window.vesper?.openExternal(
                    'https://github.com/Justin-Developer01/vesper-desk/releases',
                  )
                }}
              >
                {ui.checkUpdates}
              </button>
              {updateNote && <p className="muted">{updateNote}</p>}
            </Tabs.Content>

            <Tabs.Content value="advanced" className="settings-pane">
              <button type="button" className="text-btn" onClick={onReconnectChat}>
                {ui.reconnectChat}
              </button>
              <button type="button" className="text-btn" onClick={onRefreshPrime}>
                {ui.refreshPrimeSession}
              </button>
              <button type="button" className="text-btn" onClick={() => void window.vesper?.openLogFolder()}>
                {ui.openLogFolder}
              </button>
              <label>
                {ui.developerClientId}
                <input
                  value={draftClientId}
                  onChange={(e) => setDraftClientId(e.target.value.trim())}
                  placeholder={builtInTwitchClientId()}
                />
              </label>
            </Tabs.Content>

            <Tabs.Content value="help" className="settings-pane">
              <img className="help-logo" src={vesperLogo} alt={ui.appName} draggable={false} />
              <p>
                Vesper Desk is a thin multi-stream desk. Use {ui.standard}, {ui.focus}, and {ui.performance} from the
                chrome. {ui.openChat} is a drawer. {ui.popOutChat} is a separate window.
              </p>
              <button type="button" className="text-btn" onClick={onShowTips}>
                {ui.showTips}
              </button>
              <button type="button" className="text-btn" onClick={() => void window.vesper?.openLogFolder()}>
                {ui.openLogFolder}
              </button>
              <button
                type="button"
                className="text-btn"
                onClick={() => window.vesper?.openExternal('https://dev.twitch.tv/docs')}
              >
                Twitch developer docs
              </button>
            </Tabs.Content>
          </Tabs.Root>

          <footer className="modal-footer">
            <button type="button" className="ghost-btn" onClick={() => onOpenChange(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="primary-btn"
              onClick={() => {
                onSave(draft, draftClientId)
                onOpenChange(false)
              }}
            >
              {ui.save}
            </button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function HotkeyCapture({
  onBind,
  onCancel,
}: {
  onBind: (combo: string) => void
  onCancel: () => void
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      event.preventDefault()
      if (event.key === 'Escape') {
        onCancel()
        return
      }
      const combo = formatHotkeyEvent(event)
      if (combo && !['Ctrl', 'Alt', 'Shift'].includes(combo)) onBind(combo)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onBind, onCancel])
  return <p className="muted">Listening for a shortcut. Esc cancels.</p>
}
