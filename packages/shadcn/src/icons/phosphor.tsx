import {
  MagnifyingGlass,
  Funnel,
  Palette,
  Columns,
  CaretLeft,
  CaretRight,
  CaretDown,
  Check,
  PushPin,
  Plus,
  FloppyDisk,
  ArrowUUpLeft,
  ArrowUUpRight,
  Rows,
  TreeStructure,
  Gear,
  X,
  Copy,
  Pencil,
} from '@phosphor-icons/react'
import type { BstShadcnIcons } from './types.js'

/**
 * Icon preset backed by `@phosphor-icons/react` (default "regular" weight —
 * the outline style closest to lucide). Install `@phosphor-icons/react`, then:
 * `<BstTableShadcn icons={phosphorIcons} … />`.
 */
export const phosphorIcons: BstShadcnIcons = {
  search: MagnifyingGlass,
  filter: Funnel,
  format: Palette,
  columns: Columns,
  chevronLeft: CaretLeft,
  chevronRight: CaretRight,
  chevronDown: CaretDown,
  check: Check,
  pin: PushPin,
  plus: Plus,
  save: FloppyDisk,
  undo: ArrowUUpLeft,
  redo: ArrowUUpRight,
  density: Rows,
  group: TreeStructure,
  settings: Gear,
  close: X,
  copy: Copy,
  edit: Pencil,
}

export default phosphorIcons
