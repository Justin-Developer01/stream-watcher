export type BackgroundFit = 'cover' | 'contain'

export type AppearanceTheme = {
  accent: string
  bar: string
  surface: string
  backgroundColor: string
  backgroundImage: string | null
  backgroundFit: BackgroundFit
}

export const DEFAULT_APPEARANCE: AppearanceTheme = {
  accent: '#2bb7ef',
  bar: '#0b0e13',
  surface: '#0c1016',
  backgroundColor: '#090b0f',
  backgroundImage: null,
  backgroundFit: 'cover',
}

const HEX = /^#([0-9a-fA-F]{6})$/
const MAX_IMAGE_EDGE = 1920
const MAX_DATA_URL_CHARS = 1_800_000

export function isHexColor(value: string): boolean {
  return HEX.test(value)
}

export function normalizeHex(value: string, fallback: string): string {
  const trimmed = value.trim()
  if (HEX.test(trimmed)) return trimmed.toLowerCase()
  if (/^#([0-9a-fA-F]{3})$/.test(trimmed)) {
    const [, short] = trimmed.match(/^#([0-9a-fA-F]{3})$/) ?? []
    if (!short) return fallback
    return `#${short[0]}${short[0]}${short[1]}${short[1]}${short[2]}${short[2]}`.toLowerCase()
  }
  return fallback
}

export function normalizeAppearance(raw?: Partial<AppearanceTheme> | null): AppearanceTheme {
  return {
    accent: normalizeHex(raw?.accent ?? '', DEFAULT_APPEARANCE.accent),
    bar: normalizeHex(raw?.bar ?? '', DEFAULT_APPEARANCE.bar),
    surface: normalizeHex(raw?.surface ?? '', DEFAULT_APPEARANCE.surface),
    backgroundColor: normalizeHex(raw?.backgroundColor ?? '', DEFAULT_APPEARANCE.backgroundColor),
    backgroundImage:
      typeof raw?.backgroundImage === 'string' && raw.backgroundImage.startsWith('data:image/')
        ? raw.backgroundImage
        : null,
    backgroundFit: raw?.backgroundFit === 'contain' ? 'contain' : 'cover',
  }
}

export function applyAppearance(theme: AppearanceTheme) {
  const root = document.documentElement
  root.style.setProperty('--accent', theme.accent)
  root.style.setProperty('--bg-bar', theme.bar)
  root.style.setProperty('--bg', theme.backgroundColor)
  root.style.setProperty('--bg-panel', theme.surface)
  root.style.setProperty('--bg-elevated', theme.surface)
  root.style.setProperty('--bg-image', theme.backgroundImage ? `url("${theme.backgroundImage}")` : 'none')
  root.style.setProperty('--bg-fit', theme.backgroundFit)
}

export async function imageFileToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Choose an image file')
  }

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    throw new Error('Could not read that image')
  }
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const dataUrl = canvas.toDataURL('image/jpeg', 0.78)
  if (dataUrl.length > MAX_DATA_URL_CHARS) {
    throw new Error('Image is too large. Try a smaller file.')
  }
  return dataUrl
}
