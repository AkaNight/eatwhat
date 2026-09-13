import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const baseProps: IconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

export function SparkIcon(props: IconProps) {
  return <svg {...baseProps} {...props}><path d="M12 3.5 13.8 9l5.7 1.8-5.7 1.8-1.8 5.7-1.8-5.7-5.7-1.8L10.2 9 12 3.5Z" /><path d="m18 3 .6 1.8L20.5 5.5l-1.9.6L18 8l-.6-1.9-1.9-.6 1.9-.7L18 3Z" /></svg>
}

export function NoteIcon(props: IconProps) {
  return <svg {...baseProps} {...props}><path d="M6 3.5h9l3 3V20H6Z" /><path d="M14.5 3.5V7H18M9 11h6M9 15h6" /></svg>
}

export function LibraryIcon(props: IconProps) {
  return <svg {...baseProps} {...props}><path d="M4 7.5h16V20H4Z" /><path d="M3 4h18v3.5H3ZM8 11h8" /></svg>
}

export function UserIcon(props: IconProps) {
  return <svg {...baseProps} {...props}><circle cx="12" cy="8" r="3.5" /><path d="M5.5 20c.8-4 3-6 6.5-6s5.7 2 6.5 6" /></svg>
}

export function PlusIcon(props: IconProps) {
  return <svg {...baseProps} {...props}><path d="M12 5v14M5 12h14" /></svg>
}

export function SearchIcon(props: IconProps) {
  return <svg {...baseProps} {...props}><circle cx="10.5" cy="10.5" r="6" /><path d="m15 15 4.5 4.5" /></svg>
}
