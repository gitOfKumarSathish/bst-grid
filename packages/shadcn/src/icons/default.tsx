import * as React from 'react'
import type { IconProps, IconComponent, BstShadcnIcons } from './types.js'

/**
 * Built-in icon set — dependency-free inline SVGs drawn in the lucide idiom
 * (24×24 viewBox, `currentColor`, 2px round strokes) so a bare `<BstTableShadcn/>`
 * looks crisp with nothing installed. Path data is lucide (ISC/MIT). Swap any slot
 * (or all) via the `icons` prop, or a preset from `@bloomskill/table-shadcn/icons/*`.
 */
function icon(name: string, children: React.ReactNode): IconComponent {
  const C = ({ size = 16, className }: IconProps) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
  C.displayName = `BstIcon(${name})`
  return C
}

export const defaultIcons: BstShadcnIcons = {
  search: icon(
    'search',
    <>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </>,
  ),
  filter: icon('filter', <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />),
  format: icon(
    'format',
    <>
      <path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z" />
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
    </>,
  ),
  columns: icon(
    'columns',
    <>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M9 3v18" />
      <path d="M15 3v18" />
    </>,
  ),
  chevronLeft: icon('chevron-left', <path d="m15 18-6-6 6-6" />),
  chevronRight: icon('chevron-right', <path d="m9 18 6-6-6-6" />),
  chevronDown: icon('chevron-down', <path d="m6 9 6 6 6-6" />),
  check: icon('check', <path d="M20 6 9 17l-5-5" />),
  pin: icon(
    'pin',
    <>
      <path d="M12 17v5" />
      <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
    </>,
  ),
  plus: icon(
    'plus',
    <>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </>,
  ),
  save: icon(
    'save',
    <>
      <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" />
      <path d="M7 3v4a1 1 0 0 0 1 1h7" />
    </>,
  ),
  undo: icon(
    'undo',
    <>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5 5.5 5.5 0 0 1-5.5 5.5H11" />
    </>,
  ),
  redo: icon(
    'redo',
    <>
      <path d="m15 14 5-5-5-5" />
      <path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5 5.5 5.5 0 0 0 9.5 20H13" />
    </>,
  ),
  density: icon(
    'density',
    <>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M3 9h18" />
      <path d="M3 15h18" />
    </>,
  ),
  group: icon(
    'group',
    <>
      <path d="M21 12h-8" />
      <path d="M21 6H8" />
      <path d="M21 18h-8" />
      <path d="M3 6v4c0 1.1.9 2 2 2h3" />
      <path d="M3 10v6c0 1.1.9 2 2 2h3" />
    </>,
  ),
  settings: icon(
    'settings',
    <>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </>,
  ),
  close: icon(
    'close',
    <>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </>,
  ),
  copy: icon(
    'copy',
    <>
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </>,
  ),
  edit: icon(
    'edit',
    <>
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </>,
  ),
}

/**
 * Merge a caller's `icons` overrides onto the defaults. Skips `undefined`/`null`
 * so a preset whose library renamed one export (→ `undefined`) degrades to the
 * built-in SVG for that single slot instead of throwing.
 */
export function resolveIcons(overrides?: Partial<BstShadcnIcons>): BstShadcnIcons {
  if (!overrides) return defaultIcons
  const out: BstShadcnIcons = { ...defaultIcons }
  ;(Object.keys(overrides) as (keyof BstShadcnIcons)[]).forEach((k) => {
    const v = overrides[k]
    if (v) out[k] = v
  })
  return out
}
