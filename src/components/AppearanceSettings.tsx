import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import {
  DEFAULT_APPEARANCE,
  imageFileToDataUrl,
  isHexColor,
  normalizeHex,
  type AppearanceTheme,
  type BackgroundFit,
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
  const [open, setOpen] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const patch = (partial: Partial<AppearanceTheme>) => {
    onChange({ ...appearance, ...partial })
  }

  const handleImage = async (file: File | undefined) => {
    if (!file) return
    setImageError(null)
    try {
      const backgroundImage = await imageFileToDataUrl(file)
      patch({ backgroundImage })
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Could not use that image')
    }
  }

  return (
    <section className="popover-section">
      <h2>Appearance</h2>
      <button
        type="button"
        className={`developer-toggle${open ? ' is-open' : ''}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span>Theme</span>
        <ChevronDown size={14} strokeWidth={2} />
      </button>
      {open && (
        <div className="developer-panel appearance-panel">
          <ColorField
            id="theme-accent"
            label="Accent"
            value={appearance.accent}
            onChange={(accent) => patch({ accent })}
          />
          <ColorField
            id="theme-bar"
            label="Bar"
            value={appearance.bar}
            onChange={(bar) => patch({ bar })}
          />
          <ColorField
            id="theme-surface"
            label="Surface"
            value={appearance.surface}
            onChange={(surface) => patch({ surface })}
          />
          <ColorField
            id="theme-bg"
            label="Background"
            value={appearance.backgroundColor}
            onChange={(backgroundColor) => patch({ backgroundColor })}
          />
          <div className="theme-image-row">
            <span className="theme-image-row__label">Background image</span>
            <div className="settings-actions">
              <button type="button" className="secondary" onClick={() => fileRef.current?.click()}>
                Choose image
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  setImageError(null)
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
            <label className="theme-fit" htmlFor="theme-fit">
              Fit
              <select
                id="theme-fit"
                value={appearance.backgroundFit}
                onChange={(event) => patch({ backgroundFit: event.target.value as BackgroundFit })}
                disabled={!appearance.backgroundImage}
              >
                <option value="cover">Cover</option>
                <option value="contain">Contain</option>
              </select>
            </label>
            {appearance.backgroundImage && <p className="hint">Custom image saved with your layout.</p>}
            {imageError && <p className="field-error">{imageError}</p>}
          </div>
          <button
            type="button"
            className="ghost"
            onClick={() => {
              setImageError(null)
              onChange(DEFAULT_APPEARANCE)
            }}
          >
            Reset theme
          </button>
        </div>
      )}
    </section>
  )
}
