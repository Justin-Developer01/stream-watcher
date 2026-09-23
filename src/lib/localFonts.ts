const SYSTEM_STACK = 'system-ui, -apple-system, "Segoe UI", sans-serif'
const SAMPLE = 'mmmmmmmmlliWw@123Gg'
const MAX_FAMILY_CHARS = 80

export function sanitizeFontFamily(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  return raw.replace(/["';{}\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, MAX_FAMILY_CHARS)
}

export function cssFontFamily(family: string): string {
  const clean = sanitizeFontFamily(family)
  if (!clean) return ''
  return /[^A-Za-z0-9_-]/.test(clean) ? `"${clean}"` : clean
}

export function isLocalFontAvailable(family: string): boolean {
  const clean = sanitizeFontFamily(family)
  if (!clean || typeof document === 'undefined') return false
  try {
    if (document.fonts?.check?.(`16px ${cssFontFamily(clean)}`)) return true
  } catch {
    // ignore FontFaceSet errors
  }
  try {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return false
    ctx.font = `72px ${SYSTEM_STACK}`
    const fallback = ctx.measureText(SAMPLE).width
    ctx.font = `72px ${cssFontFamily(clean)}, ${SYSTEM_STACK}`
    return ctx.measureText(SAMPLE).width !== fallback
  } catch {
    return false
  }
}

export function customFontStack(family: string): string | null {
  const quoted = cssFontFamily(family)
  if (!quoted || !isLocalFontAvailable(family)) return null
  return `${quoted}, ${SYSTEM_STACK}`
}

export async function listLocalFontFamilies(): Promise<string[]> {
  const query = (window as Window & { queryLocalFonts?: () => Promise<Array<{ family: string }>> }).queryLocalFonts
  if (typeof query !== 'function') return []
  try {
    const fonts = await query()
    return [...new Set(fonts.map((font) => font.family).filter(Boolean))].sort((a, b) => a.localeCompare(b))
  } catch {
    return []
  }
}
