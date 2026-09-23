export type AppearancePreset = 'dark' | 'dim' | 'light'
export type BackgroundMode = 'color' | 'image'
export type ChatFont = 'system' | 'plex' | 'inter' | 'mono' | 'sourceSans' | 'roboto' | 'geist' | 'custom'
export type RealChatFont = Exclude<ChatFont, 'custom'>
export type ChromePosition = 'top' | 'left' | 'right' | 'bottom'

export type AppearanceTheme = {
  preset: AppearancePreset
  accent: string
  surface: string
  text: string
  backgroundMode: BackgroundMode
  backgroundColor: string
  backgroundImage: string | null
  overlayOpacity: number
  seeDesktop: boolean
  chatFont: ChatFont
  chatFontSize: number
  chatDrawerWidth: number
  chatCustomFont: string | null
  chrome: ChromePosition
}

export const CHAT_FONTS: Record<RealChatFont, { label: string; stack: string }> = {
  system: {
    label: 'System',
    stack: 'system-ui, -apple-system, "Segoe UI", sans-serif',
  },
  plex: {
    label: 'IBM Plex Sans',
    stack: '"IBM Plex Sans", sans-serif',
  },
  inter: {
    label: 'Inter',
    stack: 'Inter, "IBM Plex Sans", sans-serif',
  },
  mono: {
    label: 'Mono',
    stack: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  },
  sourceSans: {
    label: 'Source Sans 3',
    stack: '"Source Sans 3", sans-serif',
  },
  roboto: {
    label: 'Roboto',
    stack: 'Roboto, sans-serif',
  },
  geist: {
    label: 'Geist',
    stack: 'Geist, sans-serif',
  },
}

export const CHAT_FONT_SIZES = [12, 13, 14, 16] as const
export type ChatFontSize = (typeof CHAT_FONT_SIZES)[number]
export const CHAT_FONT_SIZE_DEFAULT: ChatFontSize = 13

export const CHAT_DRAWER_WIDTH_MIN = 280
export const CHAT_DRAWER_WIDTH_MAX = 480
export const CHAT_DRAWER_WIDTH_DEFAULT = 320

type PresetColors = Pick<AppearanceTheme, 'preset' | 'accent' | 'surface' | 'text' | 'backgroundColor'>

export const APPEARANCE_PRESETS: Record<AppearancePreset, PresetColors> = {
  dark: {
    preset: 'dark',
    accent: '#2bb7ef',
    surface: '#0c1016',
    text: '#e6edf5',
    backgroundColor: '#090b0f',
  },
  dim: {
    preset: 'dim',
    accent: '#5aa7c8',
    surface: '#1a222c',
    text: '#d0d7e0',
    backgroundColor: '#12171e',
  },
  light: {
    preset: 'light',
    accent: '#0b7ab8',
    surface: '#ffffff',
    text: '#1a2130',
    backgroundColor: '#e8edf3',
  },
}

export const DEFAULT_APPEARANCE: AppearanceTheme = {
  ...APPEARANCE_PRESETS.dark,
  backgroundMode: 'color',
  backgroundImage: null,
  overlayOpacity: 40,
  seeDesktop: false,
  chatFont: 'system',
  chatFontSize: CHAT_FONT_SIZE_DEFAULT,
  chatDrawerWidth: CHAT_DRAWER_WIDTH_DEFAULT,
  chatCustomFont: null,
  chrome: 'top',
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

function clampOpacity(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return DEFAULT_APPEARANCE.overlayOpacity
  return Math.min(100, Math.max(0, Math.round(n)))
}

function clampChatFontSize(value: unknown): ChatFontSize {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return CHAT_FONT_SIZE_DEFAULT
  let best: ChatFontSize = CHAT_FONT_SIZE_DEFAULT
  let bestDist = Number.POSITIVE_INFINITY
  for (const size of CHAT_FONT_SIZES) {
    const dist = Math.abs(size - n)
    if (dist < bestDist) {
      best = size
      bestDist = dist
    }
  }
  return best
}

function normalizeChatFont(value: unknown): ChatFont {
  if (
    value === 'plex' ||
    value === 'inter' ||
    value === 'mono' ||
    value === 'system' ||
    value === 'sourceSans' ||
    value === 'roboto' ||
    value === 'geist' ||
    value === 'custom'
  ) {
    return value
  }
  if (value === 'sans') return 'inter'
  if (value === 'serif') return 'system'
  return 'system'
}

function clampDrawerWidth(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return CHAT_DRAWER_WIDTH_DEFAULT
  return Math.min(CHAT_DRAWER_WIDTH_MAX, Math.max(CHAT_DRAWER_WIDTH_MIN, Math.round(n)))
}

function normalizeCustomFont(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim().slice(0, 120)
  return trimmed || null
}

export function matchingPreset(theme: Pick<AppearanceTheme, 'accent' | 'surface' | 'text' | 'backgroundColor'>): AppearancePreset | null {
  for (const key of Object.keys(APPEARANCE_PRESETS) as AppearancePreset[]) {
    const preset = APPEARANCE_PRESETS[key]
    if (
      preset.accent === theme.accent &&
      preset.surface === theme.surface &&
      preset.text === theme.text &&
      preset.backgroundColor === theme.backgroundColor
    ) {
      return key
    }
  }
  return null
}

export function applyPreset(preset: AppearancePreset, current?: AppearanceTheme): AppearanceTheme {
  return {
    backgroundMode: current?.backgroundMode ?? 'color',
    backgroundImage: current?.backgroundImage ?? null,
    overlayOpacity: current?.overlayOpacity ?? DEFAULT_APPEARANCE.overlayOpacity,
    seeDesktop: current?.seeDesktop ?? DEFAULT_APPEARANCE.seeDesktop,
    chatFont: current?.chatFont ?? DEFAULT_APPEARANCE.chatFont,
    chatFontSize: current?.chatFontSize ?? DEFAULT_APPEARANCE.chatFontSize,
    chatDrawerWidth: current?.chatDrawerWidth ?? DEFAULT_APPEARANCE.chatDrawerWidth,
    chatCustomFont: current?.chatCustomFont ?? DEFAULT_APPEARANCE.chatCustomFont,
    chrome: current?.chrome ?? DEFAULT_APPEARANCE.chrome,
    ...APPEARANCE_PRESETS[preset],
  }
}

export function normalizeAppearance(raw?: Partial<AppearanceTheme> & { bar?: string } | null): AppearanceTheme {
  const presetKey =
    raw?.preset === 'dim' || raw?.preset === 'light' || raw?.preset === 'dark' ? raw.preset : 'dark'
  const base = APPEARANCE_PRESETS[presetKey]
  const backgroundImage =
    typeof raw?.backgroundImage === 'string' && raw.backgroundImage.startsWith('data:image/')
      ? raw.backgroundImage
      : null
  const backgroundMode: BackgroundMode =
    raw?.backgroundMode === 'image' || raw?.backgroundMode === 'color'
      ? raw.backgroundMode
      : backgroundImage
        ? 'image'
        : 'color'
  const next: AppearanceTheme = {
    accent: normalizeHex(raw?.accent ?? '', base.accent),
    surface: normalizeHex(raw?.surface ?? '', base.surface),
    text: normalizeHex(raw?.text ?? '', base.text),
    backgroundColor: normalizeHex(raw?.backgroundColor ?? '', base.backgroundColor),
    backgroundMode,
    backgroundImage,
    overlayOpacity: clampOpacity(raw?.overlayOpacity),
    seeDesktop: raw?.seeDesktop === true,
    chatFont: normalizeChatFont(raw?.chatFont),
    chatFontSize: clampChatFontSize(raw?.chatFontSize),
    chatDrawerWidth: clampDrawerWidth(raw?.chatDrawerWidth),
    chatCustomFont: normalizeCustomFont(raw?.chatCustomFont),
    chrome:
      raw?.chrome === 'left' || raw?.chrome === 'right' || raw?.chrome === 'bottom'
        ? raw.chrome
        : 'top',
    preset: presetKey,
  }
  next.preset = matchingPreset(next) ?? presetKey
  return next
}

function isLightChrome(theme: AppearanceTheme) {
  if (theme.preset === 'light') return true
  const n = Number.parseInt(theme.text.slice(1), 16)
  if (!Number.isFinite(n)) return false
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return (r * 299 + g * 587 + b * 114) / 1000 < 140
}

export function applyAppearance(theme: AppearanceTheme, options?: { windowChrome?: boolean }) {
  const root = document.documentElement
  const light = isLightChrome(theme)
  const muted = light ? '#5c6b7a' : '#7d8b9c'
  const iconMuted = light ? '#3d4c5c' : `color-mix(in srgb, ${muted} 70%, transparent)`
  const border = light ? '#d5dde6' : '#1b2430'
  const scrim = light ? 'rgba(255, 255, 255, 0.58)' : 'rgba(0, 0, 0, 0.48)'
  const windowChrome = options?.windowChrome !== false
  const seeDesktop = windowChrome && theme.seeDesktop

  root.style.colorScheme = light ? 'light' : 'dark'
  root.style.setProperty('--accent', theme.accent)
  root.style.setProperty('--bg-panel', theme.surface)
  root.style.setProperty('--bg-elevated', theme.surface)
  root.style.setProperty('--bg-bar', theme.surface)
  root.style.setProperty('--text', theme.text)
  root.style.setProperty('--muted', muted)
  root.style.setProperty('--icon-muted', iconMuted)
  root.style.setProperty('--border', border)
  root.classList.toggle('see-desktop', seeDesktop)
  root.classList.toggle('chrome-left', theme.chrome === 'left')
  root.classList.toggle('chrome-right', theme.chrome === 'right')
  root.classList.toggle('chrome-bottom', theme.chrome === 'bottom')
  root.style.setProperty('--bg', seeDesktop ? 'transparent' : theme.backgroundColor)
  root.style.setProperty('--bar-scrim', scrim)
  root.style.setProperty(
    '--bg-image',
    !seeDesktop && theme.backgroundMode === 'image' && theme.backgroundImage
      ? `url("${theme.backgroundImage}")`
      : 'none',
  )
  root.style.setProperty('--bg-overlay', String(seeDesktop ? 0 : theme.overlayOpacity))
  const fontStack =
    theme.chatFont === 'custom' && theme.chatCustomFont
      ? `"${theme.chatCustomFont}", system-ui, -apple-system, "Segoe UI", sans-serif`
      : CHAT_FONTS[theme.chatFont as RealChatFont]?.stack ?? CHAT_FONTS.system.stack
  root.style.setProperty('--chat-font', fontStack)
  root.style.setProperty('--chat-font-size', `${theme.chatFontSize}px`)
  root.style.setProperty('--chat-drawer-width', `${theme.chatDrawerWidth}px`)
  if (windowChrome) {
    void window.streamWatcher?.setWindowTransparent?.(theme.seeDesktop, theme.backgroundColor)
  }
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
