import { useEffect, useRef, useState } from 'react'
import {
  APPEARANCE_PRESETS,
  CHAT_DRAWER_WIDTH_MAX,
  CHAT_DRAWER_WIDTH_MIN,
  CHAT_FONTS,
  CHAT_FONT_SIZES,
  DEFAULT_APPEARANCE,
  applyAppearance,
  applyPreset,
  imageFileToDataUrl,
  isHexColor,
  matchingPreset,
  normalizeHex,
  type AppearancePreset,
  type AppearanceTheme,
  type BackgroundMode,
  type ChatFont,
} from '../lib/theme'
import { UI } from '../lib/uiLabels'

type Props = {
  appearance: AppearanceTheme
  onChange: (theme: AppearanceTheme | ((prev: AppearanceTheme) => AppearanceTheme)) => void
}

function ColorField({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
}) {
  const [hex, setHex] = useState(value)
  useEffect(() => {
    setHex(value)
  }, [value])

  return (
    <div className="theme-color-row">
      <label htmlFor={id}>{label}</label>
      <input
        id={`${id}-swatch`}
        type="color"
        value={value}
        onChange={(event) => {
          const next = event.target.value.toLowerCase()
          setHex(next)
          onChange(next)
        }}
        aria-label={`${label} swatch`}
      />
      <input
        id={id}
        className="theme-hex"
        value={hex}
        onChange={(event) => {
          const next = event.target.value
          setHex(next)
          if (isHexColor(next)) onChange(next.toLowerCase())
        }}
        onBlur={() => {
          const next = normalizeHex(hex, value)
          setHex(next)
          onChange(next)
        }}
        spellCheck={false}
        autoComplete="off"
        aria-label={`${label} hex`}
      />
    </div>
  )
}

export function AppearanceSettings({ appearance, onChange }: Props) {
  const [imageError, setImageError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const activePreset = matchingPreset(appearance)

  const patch = (partial: Partial<AppearanceTheme>) => {
    onChange((prev) => ({ ...prev, ...partial }))
  }

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const handleImage = async (file: File | undefined) => {
    if (!file) return
    setImageError(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)
    applyAppearance({ ...appearance, backgroundMode: 'image', backgroundImage: objectUrl })
    try {
      const backgroundImage = await imageFileToDataUrl(file)
      patch({ backgroundMode: 'image', backgroundImage })
      URL.revokeObjectURL(objectUrl)
      setPreviewUrl(null)
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Could not use that image')
      URL.revokeObjectURL(objectUrl)
      setPreviewUrl(null)
    }
  }

  return (
    <section className="popover-section">
      <h2>Appearance</h2>
      <div className="appearance-panel">
        <p className="theme-label">Presets</p>
        <div className="preset-row" role="group" aria-label="Presets">
          {(Object.keys(APPEARANCE_PRESETS) as AppearancePreset[]).map((preset) => (
            <button
              key={preset}
              type="button"
              className={activePreset === preset ? 'is-active' : ''}
              onClick={() => {
                setImageError(null)
                onChange((prev) => applyPreset(preset, prev))
              }}
            >
              {preset === 'dark' ? 'Dark' : preset === 'dim' ? 'Dim' : 'Light'}
            </button>
          ))}
        </div>

        <p className="theme-label">Colors</p>
        <ColorField
          id="theme-accent"
          label="Accent"
          value={appearance.accent}
          onChange={(accent) => patch({ accent })}
        />
        <ColorField
          id="theme-surface"
          label="Surface"
          value={appearance.surface}
          onChange={(surface) => patch({ surface })}
        />
        <ColorField
          id="theme-text"
          label="Text"
          value={appearance.text}
          onChange={(text) => patch({ text })}
        />

        <p className="theme-label">Background</p>
        <div className="preset-row" role="group" aria-label="Background">
          {(['color', 'image'] as const).map((mode: BackgroundMode) => (
            <button
              key={mode}
              type="button"
              className={appearance.backgroundMode === mode ? 'is-active' : ''}
              onClick={() => patch({ backgroundMode: mode })}
            >
              {mode === 'color' ? 'Color' : 'Image'}
            </button>
          ))}
        </div>

        {appearance.backgroundMode === 'color' ? (
          <ColorField
            id="theme-bg"
            label="Color"
            value={appearance.backgroundColor}
            onChange={(backgroundColor) => patch({ backgroundColor })}
          />
        ) : (
          <div className="theme-image-row">
            <div className="settings-actions">
              <button type="button" className="secondary" onClick={() => fileRef.current?.click()}>
                Choose image…
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  setImageError(null)
                  if (previewUrl) URL.revokeObjectURL(previewUrl)
                  setPreviewUrl(null)
                  patch({ backgroundImage: null })
                }}
                disabled={!appearance.backgroundImage}
              >
                Clear
              </button>
            </div>
            <input
              ref={fileRef}
              className="sr-only"
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                void handleImage(file)
              }}
            />
            <label className="theme-overlay" htmlFor="theme-overlay">
              <span>Opacity {appearance.overlayOpacity}%</span>
              <input
                id="theme-overlay"
                type="range"
                min={0}
                max={100}
                value={appearance.overlayOpacity}
                onChange={(event) => patch({ overlayOpacity: Number(event.target.value) })}
              />
            </label>
            {imageError && <p className="field-error">{imageError}</p>}
          </div>
        )}

        <p className="theme-label">Chrome</p>
        <div className="preset-row" role="group" aria-label="Chrome position">
          {(['top', 'left'] as const).map((pos) => (
            <button
              key={pos}
              type="button"
              className={appearance.chrome === pos ? 'is-active' : ''}
              onClick={() => patch({ chrome: pos })}
            >
              {pos === 'top' ? 'Top' : 'Left'}
            </button>
          ))}
        </div>

        <p className="theme-label">Window</p>
        <label className="theme-toggle">
          <input
            type="checkbox"
            checked={appearance.seeDesktop}
            onChange={(event) => patch({ seeDesktop: event.target.checked })}
          />
          See desktop behind app.
        </label>
        <p className="hint">
          Empty stage shows the desktop. The frosted {appearance.chrome === 'left' ? 'left bar' : 'top bar'}, stream
          tiles, and chat stay solid. Windows may need a relaunch if the desktop does not show through after toggling.
        </p>
        <label className="theme-toggle">
          <input
            type="checkbox"
            checked={appearance.ghostOverlay}
            onChange={(event) => patch({ ghostOverlay: event.target.checked })}
          />
          {UI.ghostOverlay}
        </label>
        <p className="hint">{UI.ghostHint}</p>

        <button
          type="button"
          className="ghost"
          onClick={() => {
            setImageError(null)
            if (previewUrl) URL.revokeObjectURL(previewUrl)
            setPreviewUrl(null)
            onChange(DEFAULT_APPEARANCE)
          }}
        >
          Reset
        </button>
      </div>
    </section>
  )
}

export function ChatTypographySettings({ appearance, onChange }: Props) {
  const patch = (partial: Partial<AppearanceTheme>) => {
    onChange((prev) => ({ ...prev, ...partial }))
  }

  return (
    <section className="popover-section">
      <h2>Chat</h2>
      <div className="appearance-panel">
        <p className="theme-label">Font</p>
        <div className="preset-row" role="group" aria-label="Font">
          {(Object.keys(CHAT_FONTS) as ChatFont[]).map((font) => (
            <button
              key={font}
              type="button"
              className={appearance.chatFont === font ? 'is-active' : ''}
              onClick={() => patch({ chatFont: font })}
            >
              {CHAT_FONTS[font].label}
            </button>
          ))}
        </div>
        <p className="theme-label">Size</p>
        <div className="preset-row" role="group" aria-label="Size">
          {CHAT_FONT_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              className={appearance.chatFontSize === size ? 'is-active' : ''}
              onClick={() => patch({ chatFontSize: size })}
            >
              {size}
            </button>
          ))}
        </div>
        <p className="hint">Applies to chat lines and the composer. An open chat drawer updates live.</p>
        <p className="theme-label">{UI.drawerWidth}</p>
        <label className="theme-overlay" htmlFor="chat-drawer-width">
          <span>
            {appearance.chatDrawerWidth}px (docked left / right)
          </span>
          <input
            id="chat-drawer-width"
            type="range"
            min={CHAT_DRAWER_WIDTH_MIN}
            max={CHAT_DRAWER_WIDTH_MAX}
            value={appearance.chatDrawerWidth}
            onChange={(event) => patch({ chatDrawerWidth: Number(event.target.value) })}
          />
        </label>
        <p className="hint">
          Wider docked chat without Float. {CHAT_DRAWER_WIDTH_MIN}–{CHAT_DRAWER_WIDTH_MAX}px. Bottom and Float are
          unchanged.
        </p>
      </div>
    </section>
  )
}
