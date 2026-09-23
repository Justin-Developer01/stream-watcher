import * as Tooltip from '@radix-ui/react-tooltip'
import type { ReactNode } from 'react'
import type { ChromeEdge } from '../../types'

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
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal container={document.body}>
        <Tooltip.Content
          className="vd-tooltip"
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
