import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
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
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  ...props
}: Props) {
  const desktop = isElectronApp()
  const blocked = desktopOnly && !desktop
  const tip = blocked ? DESKTOP_ONLY_TIP : (tooltip ?? label)
  const [showTip, setShowTip] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const tipTimer = useRef<number>(0)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    return () => window.clearTimeout(tipTimer.current)
  }, [])

  const visible = hovered || showTip

  useEffect(() => {
    if (!visible) return
    const measure = () => {
      if (buttonRef.current) setRect(buttonRef.current.getBoundingClientRect())
    }
    measure()
    window.addEventListener('scroll', measure, true)
    window.addEventListener('resize', measure)
    return () => {
      window.removeEventListener('scroll', measure, true)
      window.removeEventListener('resize', measure)
    }
  }, [visible])

  const tooltipStyle = (() => {
    if (!rect) return undefined
    const top = rect.bottom + 7
    if (tooltipAlign === 'start') {
      return { top, left: rect.left, transform: 'translateX(0)' }
    }
    if (tooltipAlign === 'end') {
      return { top, left: rect.right, transform: 'translateX(-100%)' }
    }
    return { top, left: rect.left + rect.width / 2, transform: 'translateX(-50%)' }
  })()

  return (
    <>
      <button
        ref={buttonRef}
        type={type}
        className={[
          'icon-btn',
          active ? 'is-active' : '',
          danger ? 'is-danger' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        aria-label={blocked ? DESKTOP_ONLY_TIP : label}
        aria-pressed={active}
        onMouseEnter={(event) => {
          setHovered(true)
          onMouseEnter?.(event)
        }}
        onMouseLeave={(event) => {
          setHovered(false)
          onMouseLeave?.(event)
        }}
        onFocus={(event) => {
          setHovered(true)
          onFocus?.(event)
        }}
        onBlur={(event) => {
          setHovered(false)
          onBlur?.(event)
        }}
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
      {visible && rect
        ? createPortal(
            <div className="icon-tooltip" style={tooltipStyle}>
              {tip}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
