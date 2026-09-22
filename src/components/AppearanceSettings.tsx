import { useEffect, useRef, useState } from 'react'
import {
  APPEARANCE_PRESETS,
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
} from '../lib/theme'

type Props = {
  appearance: AppearanceTheme
  onChange: (theme: AppearanceTheme) => void
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
    onChange({ ...appearance, ...partial })
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
                onChange(applyPreset(preset, appearance))
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
