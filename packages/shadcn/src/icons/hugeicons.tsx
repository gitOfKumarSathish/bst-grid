import * as React from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Search01Icon,
  FilterIcon,
  PaintBoardIcon,
  LayoutThreeColumnIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowDown01Icon,
  Tick01Icon,
  PinIcon,
  Add01Icon,
  FloppyDiskIcon,
  UndoIcon,
  RedoIcon,
  Menu01Icon,
  Layers01Icon,
  Settings01Icon,
  Cancel01Icon,
  Copy01Icon,
  Edit01Icon,
} from '@hugeicons/core-free-icons'
import type { BstShadcnIcons, IconComponent, IconProps } from './types.js'

/**
 * HugeIcons uses a wrapper API: a single `<HugeiconsIcon icon={data} />` renders
 * icon-data objects from `@hugeicons/core-free-icons`. We wrap each so it matches
 * the `{ size, className }` slot contract. Install both
 * `@hugeicons/react` and `@hugeicons/core-free-icons`, then:
 * `<BstTableShadcn icons={hugeiconsIcons} … />`.
 */
type HugeIconData = React.ComponentProps<typeof HugeiconsIcon>['icon']

function wrap(name: string, data: HugeIconData): IconComponent {
  const C = ({ size = 16, className }: IconProps) => (
    <HugeiconsIcon icon={data} size={size} className={className} />
  )
  C.displayName = `HugeIcon(${name})`
  return C
}

export const hugeiconsIcons: BstShadcnIcons = {
  search: wrap('search', Search01Icon),
  filter: wrap('filter', FilterIcon),
  format: wrap('format', PaintBoardIcon),
  columns: wrap('columns', LayoutThreeColumnIcon),
  chevronLeft: wrap('chevronLeft', ArrowLeft01Icon),
  chevronRight: wrap('chevronRight', ArrowRight01Icon),
  chevronDown: wrap('chevronDown', ArrowDown01Icon),
  check: wrap('check', Tick01Icon),
  pin: wrap('pin', PinIcon),
  plus: wrap('plus', Add01Icon),
  save: wrap('save', FloppyDiskIcon),
  undo: wrap('undo', UndoIcon),
  redo: wrap('redo', RedoIcon),
  density: wrap('density', Menu01Icon),
  group: wrap('group', Layers01Icon),
  settings: wrap('settings', Settings01Icon),
  close: wrap('close', Cancel01Icon),
  copy: wrap('copy', Copy01Icon),
  edit: wrap('edit', Edit01Icon),
}

export default hugeiconsIcons
