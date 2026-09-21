type IconProps = {
  size?: number
}

const svgProps = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
})

export function PlusIcon({ size = 15 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M8 3v10M3 8h10" />
    </svg>
  )
}

export function LayoutIcon({ size = 15 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <rect x="2.5" y="2.5" width="5" height="5" rx="0.8" />
      <rect x="8.5" y="2.5" width="5" height="5" rx="0.8" />
      <rect x="2.5" y="8.5" width="5" height="5" rx="0.8" />
      <rect x="8.5" y="8.5" width="5" height="5" rx="0.8" />
    </svg>
  )
}

export function ChatIcon({ size = 15 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M3 3.5h10a1 1 0 0 1 1 1V10a1 1 0 0 1-1 1H7l-3 2v-2H3a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z" />
    </svg>
  )
}

export function FullscreenIcon({ size = 15 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M3 6V3.5H6M10 3.5h3V6M13 10v2.5H10M6 12.5H3V10" />
    </svg>
  )
}

export function ExitFullscreenIcon({ size = 15 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M6 3.5V6H3.5M12.5 6H10V3.5M10 12.5V10h2.5M3.5 10H6v2.5" />
    </svg>
  )
}

export function SettingsIcon({ size = 15 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <circle cx="8" cy="8" r="2.1" />
      <path d="M8 2.5v1.4M8 12.1V13.5M2.5 8h1.4M12.1 8H13.5M4.1 4.1l1 1M10.9 10.9l1 1M11.9 4.1l-1 1M5.1 10.9l-1 1" />
    </svg>
  )
}

export function UserIcon({ size = 15 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <circle cx="8" cy="5.5" r="2.2" />
      <path d="M3.5 13c.6-2.4 2.3-3.6 4.5-3.6S11.9 10.6 12.5 13" />
    </svg>
  )
}

export function PopoutIcon({ size = 15 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M6.5 3.5H3.5v9h9V9.5M8.5 3.5H12.5V7.5M12.5 3.5 7 9" />
    </svg>
  )
}

export function CloseIcon({ size = 15 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  )
}

export function StarIcon({ size = 15 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M8 2.6 9.6 6l3.6.3-2.8 2.4.9 3.5L8 10.4 4.7 12.2l.9-3.5L2.8 6.3 6.4 6z" />
    </svg>
  )
}

export function StarFilledIcon({ size = 15 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      <path
        fill="currentColor"
        d="M8 2.4 9.7 6.1l4 .3-3.1 2.6 1 3.8L8 10.7 4.4 12.8l1-3.8-3.1-2.6 4-.3z"
      />
    </svg>
  )
}

export function MuteIcon({ size = 15 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M3 6.5h2L8 4v8L5 9.5H3zM10.5 6.5l3 3M13.5 6.5l-3 3" />
    </svg>
  )
}

export function UnmuteIcon({ size = 15 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M3 6.5h2L8 4v8L5 9.5H3zM10.2 6.2a2.4 2.4 0 0 1 0 3.6M11.8 4.6a4.6 4.6 0 0 1 0 6.8" />
    </svg>
  )
}

export function DragIcon({ size = 15 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M6 3.5v9M10 3.5v9" />
    </svg>
  )
}

export function LogoutIcon({ size = 15 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M7 3.5H3.5v9H7M7 8h5.5M10.5 5.5 13 8l-2.5 2.5" />
    </svg>
  )
}
