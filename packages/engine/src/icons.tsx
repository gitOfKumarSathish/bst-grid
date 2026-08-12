import * as React from 'react'

/**
 * Engine-body icon system. The neutral `<BstTable>` body, the filter / format
 * builders and the file & boolean cells render **injectable** icons instead of
 * emoji/Unicode glyphs. Defaults are dependency-free inline SVGs drawn in the
 * lucide idiom (24×24 viewBox, `currentColor`, 2px round strokes), skin-neutral
 * so both the MUI and shadcn adapters can override any slot with their own set.
 */

export interface IconProps {
  /** Icon size (width = height): px number or a CSS length. Body call-sites pass a number. */
  size?: number | string
  /** Extra class on the rendered `<svg>`. */
  className?: string
}

export type IconComponent = React.ComponentType<IconProps>

/** The body-icon slots the engine renders (distinct from an adapter's chrome icons). */
export interface BstIcons {
  /** Header: column sorted ascending. */
  sortAsc: IconComponent
  /** Header: column sorted descending. */
  sortDesc: IconComponent
  /** Header: sortable but unsorted. */
  sortNone: IconComponent
  /** Expander / group row: expanded (points down). */
  expandExpanded: IconComponent
  /** Expander / group row: collapsed (points right). */
  expandCollapsed: IconComponent
  /** Row-pinning control. */
  pin: IconComponent
  /** Boolean cell — true. */
  booleanTrue: IconComponent
  /** Builder remove-rule button (filter / conditional-format). */
  remove: IconComponent
  /** KPI cell — positive delta (trend up). */
  trendUp: IconComponent
  /** KPI cell — negative delta (trend down). */
  trendDown: IconComponent
  /** File cell — generic / unknown type. */
  fileGeneric: IconComponent
  /** File cell — PDF. */
  filePdf: IconComponent
  /** File cell — Word / rich text. */
  fileDoc: IconComponent
  /** File cell — spreadsheet. */
  fileSheet: IconComponent
  /** File cell — presentation. */
  fileSlides: IconComponent
  /** File cell — archive. */
  fileArchive: IconComponent
  /** File cell — audio. */
  fileAudio: IconComponent
  /** File cell — video. */
  fileVideo: IconComponent
}

export type BstIconOverrides = Partial<BstIcons>

/** Slot keys, for iterating / testing. */
export const BST_ICON_SLOTS: (keyof BstIcons)[] = [
  'sortAsc',
  'sortDesc',
  'sortNone',
  'expandExpanded',
  'expandCollapsed',
  'pin',
  'booleanTrue',
  'remove',
  'trendUp',
  'trendDown',
  'fileGeneric',
  'filePdf',
  'fileDoc',
  'fileSheet',
  'fileSlides',
  'fileArchive',
  'fileAudio',
  'fileVideo',
]

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
  C.displayName = `BstBodyIcon(${name})`
  return C
}

// A file glyph = the lucide File body + a small type mark.
const FILE_BODY = (
  <>
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
  </>
)
function fileIcon(name: string, mark?: React.ReactNode): IconComponent {
  return icon(name, mark ? <>{FILE_BODY}{mark}</> : FILE_BODY)
}

export const defaultBstIcons: BstIcons = {
  sortAsc: icon('sort-asc', <path d="m6 15 6-6 6 6" />),
  sortDesc: icon('sort-desc', <path d="m6 9 6 6 6-6" />),
  sortNone: icon(
    'sort-none',
    <>
      <path d="m8 9 4-4 4 4" />
      <path d="m16 15-4 4-4-4" />
    </>,
  ),
  expandExpanded: icon('expand-open', <path d="m6 9 6 6 6-6" />),
  expandCollapsed: icon('expand-closed', <path d="m9 18 6-6-6-6" />),
  pin: icon(
    'pin',
    <>
      <path d="M12 17v5" />
      <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
    </>,
  ),
  booleanTrue: icon('check', <path d="M20 6 9 17l-5-5" />),
  remove: icon(
    'remove',
    <>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </>,
  ),
  trendUp: icon('trend-up', <path d="M12 6 20 18H4Z" fill="currentColor" stroke="none" />),
  trendDown: icon('trend-down', <path d="M12 18 4 6h16Z" fill="currentColor" stroke="none" />),
  fileGeneric: fileIcon('file'),
  filePdf: fileIcon(
    'file-pdf',
    <>
      <path d="M8 13h4" />
      <path d="M8 17h6" />
    </>,
  ),
  fileDoc: fileIcon(
    'file-doc',
    <>
      <path d="M8 13h4" />
      <path d="M8 17h6" />
    </>,
  ),
  fileSheet: fileIcon(
    'file-sheet',
    <>
      <path d="M8 13h8" />
      <path d="M8 17h8" />
      <path d="M12 13v4" />
    </>,
  ),
  fileSlides: fileIcon('file-slides', <rect x="8" y="12" width="8" height="5" rx="1" />),
  fileArchive: fileIcon(
    'file-archive',
    <>
      <path d="M11 12v.5" />
      <path d="M11 15v.5" />
      <path d="M11 18v.5" />
    </>,
  ),
  fileAudio: fileIcon(
    'file-audio',
    <>
      <path d="M9 18v-4l5-1.5V16" />
      <circle cx="8" cy="18" r="1" />
      <circle cx="13" cy="16" r="1" />
    </>,
  ),
  fileVideo: fileIcon('file-video', <path d="m10 12 5 3-5 3z" />),
}

/**
 * Merge overrides onto the defaults, skipping `undefined`/`null` so a partial map
 * (e.g. an adapter forwarding only the slots its icon set covers) keeps the
 * built-in SVG for every unspecified slot.
 */
export function resolveBstIcons(overrides?: BstIconOverrides): BstIcons {
  if (!overrides) return defaultBstIcons
  const out: BstIcons = { ...defaultBstIcons }
  ;(Object.keys(overrides) as (keyof BstIcons)[]).forEach((k) => {
    const v = overrides[k]
    if (v) out[k] = v
  })
  return out
}

/**
 * Icon context so deeply-nested cell renderers (file / boolean, rendered via the
 * cell-type registry, not as `<Component/>`) can read the resolved set. `<BstTable>`
 * provides it; the default is `defaultBstIcons`, so cells work with no provider.
 */
export const BstIconsContext = React.createContext<BstIcons>(defaultBstIcons)

/** Read the active body-icon set (defaults when no `<BstTable>` provider is above). */
export function useBstIcons(): BstIcons {
  return React.useContext(BstIconsContext)
}
