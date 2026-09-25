import * as Tooltip from '@radix-ui/react-tooltip'
import type { ReactNode } from 'react'
import type { ChromeEdge } from '../../types'
import { usePortalThemeProps } from './portalTheme'

let lastInputWasPointer = false
if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', () => (lastInputWasPointer = true), true)
  window.addEventListener('keydown', () => (lastInputWasPointer = false), true)
}

/**
 * For Radix menu `onCloseAutoFocus`: when a menu was used with the mouse, do not hand focus back
 * to its trigger (that re-opens the trigger's tooltip and leaves it stuck). Keyboard users keep
 * the standard focus return.
 */
export function skipFocusReturnAfterPointer(event: Event) {
  if (lastInputWasPointer) event.preventDefault()
}

export type FlyoutSide = 'top' | 'right' | 'bottom' | 'left'

export function outwardSide(edge: ChromeEdge | undefined): FlyoutSide {
  switch (edge) {
    case 'bottom':
      return 'top'
    case 'left':
      return 'right'
    case 'right':
      return 'left'
    default:
      return 'bottom'
  }
}

export function Tip({
  label,
  side = 'bottom',
  children,
}: {
  label: string
  side?: FlyoutSide
  children: ReactNode
}) {
  const portal = usePortalThemeProps()
  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        asChild
        // Menus hand focus back to their trigger when they close; open on focus only for keyboard
        // focus, so a mouse user is not left with a stuck tooltip on the last menu button.
        onFocus={(event) => {
          if (!event.currentTarget.matches(':focus-visible')) event.preventDefault()
        }}
      >
        {children}
      </Tooltip.Trigger>
      <Tooltip.Portal container={document.body}>
        <Tooltip.Content
          className="vd-tooltip"
          {...portal}
          side={side}
          align="center"
          sideOffset={8}
          collisionPadding={12}
          avoidCollisions
        >
          {label}
          <Tooltip.Arrow className="vd-tooltip__arrow" width={10} height={5} />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}
