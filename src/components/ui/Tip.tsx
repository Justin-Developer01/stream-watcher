import * as Tooltip from '@radix-ui/react-tooltip'
import type { ReactNode } from 'react'

export function Tip({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content className="vd-tooltip" sideOffset={8}>
          {label}
          <Tooltip.Arrow className="vd-tooltip__arrow" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}
