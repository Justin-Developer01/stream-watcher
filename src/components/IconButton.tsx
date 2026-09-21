import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Props = {
  label: string
  active?: boolean
  danger?: boolean
  tooltipAlign?: 'start' | 'center' | 'end'
  children: ReactNode
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>

export function IconButton({
  label,
  active = false,
  danger = false,
  tooltipAlign = 'center',
  className,
  children,
  type = 'button',
  ...props
}: Props) {
  return (
    <button
      type={type}
      className={['icon-btn', active ? 'is-active' : '', danger ? 'is-danger' : '', className]
        .filter(Boolean)
        .join(' ')}
      data-tooltip={label}
      data-tooltip-align={tooltipAlign}
      aria-label={label}
      aria-pressed={active}
      {...props}
    >
      {children}
    </button>
  )
}
