import { createContext, useContext, type CSSProperties, type ReactNode } from 'react'
import type { ThemeName } from '../../types'

export type PortalThemeValue = {
  theme: ThemeName
  style: CSSProperties
}

const PortalThemeContext = createContext<PortalThemeValue>({
  theme: 'dark',
  style: {},
})

export function PortalThemeProvider({
  theme,
  style,
  children,
}: PortalThemeValue & { children: ReactNode }) {
  return <PortalThemeContext.Provider value={{ theme, style }}>{children}</PortalThemeContext.Provider>
}

/** data-theme + tokens for Radix content portaled onto document.body, outside .desk. */
export function usePortalThemeProps(): { 'data-theme': ThemeName; style: CSSProperties } {
  const { theme, style } = useContext(PortalThemeContext)
  return { 'data-theme': theme, style }
}

export function themeVars(settings: {
  theme: ThemeName
  accent: string
  surface: string
  text: string
  backgroundColor: string
}): CSSProperties {
  const light = settings.theme === 'light'
  return {
    '--accent': settings.accent,
    '--surface': light && settings.surface.startsWith('#1') ? '#fff7ec' : settings.surface,
    '--text': light && settings.text.startsWith('#f') ? '#2a2118' : settings.text,
    '--page-bg': light && settings.backgroundColor.startsWith('#0') ? '#f3ebe1' : settings.backgroundColor,
  } as CSSProperties
}
