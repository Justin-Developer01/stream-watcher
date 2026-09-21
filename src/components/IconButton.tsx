import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { isElectronApp } from '../lib/env'

type Props = {
  label: string
  active?: boolean
  danger?: boolean
  tooltipAlign?: 'start' | 'center' | 'end'
  desktopOnly?: boolean
  children: ReactNode
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'title'>

export function IconButton({
  label,
  active = false,
  danger = false,
  tooltipAlign = 'center',
  desktopOnly = false,
  className,
  children,
  type = 'button',
  onClick,
  ...props
}: Props) {
  const desktop = isElectronApp()
  const blocked = desktopOnly && !desktop
  const tooltip = blocked ? 'Desktop app only' : label

  return (
    <button
      type={type}
      className={['icon-btn', active ? 'is-active' : '', danger ? 'is-danger' : '', className]
        .filter(Boolean)
        .join(' ')}
      title={tooltip}
      data-tooltip={tooltip}
      data-tooltip-align={tooltipAlign}
      aria-label={tooltip}
      aria-pressed={active}
      onClick={(event) => {
        if (blocked) {
          event.preventDefault()
          return
        }
        onClick?.(event)
      }}
      {...props}
    >
      {children}
    </button>
  )
}
