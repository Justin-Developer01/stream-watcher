import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { isElectronApp } from '../lib/env'

const DESKTOP_ONLY_TIP = 'Desktop app only'

type Props = {
  label: string
  tooltip?: string
  active?: boolean
  danger?: boolean
  tooltipAlign?: 'start' | 'center' | 'end'
  desktopOnly?: boolean
  children: ReactNode
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'title'>

export function IconButton({
  label,
  tooltip,
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
  const tip = blocked ? DESKTOP_ONLY_TIP : (tooltip ?? label)
  const [showTip, setShowTip] = useState(false)
  const tipTimer = useRef<number>(0)

  useEffect(() => {
    return () => window.clearTimeout(tipTimer.current)
  }, [])

  return (
    <button
      type={type}
      className={[
        'icon-btn',
        active ? 'is-active' : '',
        danger ? 'is-danger' : '',
        showTip ? 'is-tip' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      title={tip}
      data-tooltip={tip}
      data-tooltip-align={tooltipAlign}
      aria-label={blocked ? DESKTOP_ONLY_TIP : label}
      aria-pressed={active}
      onClick={(event) => {
        if (blocked) {
          event.preventDefault()
          setShowTip(true)
          window.clearTimeout(tipTimer.current)
          tipTimer.current = window.setTimeout(() => setShowTip(false), 1600)
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
