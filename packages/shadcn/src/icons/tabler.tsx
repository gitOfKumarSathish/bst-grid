import {
  IconSearch,
  IconFilter,
  IconPalette,
  IconColumns,
  IconChevronLeft,
  IconChevronRight,
  IconChevronDown,
  IconCheck,
  IconPin,
  IconPlus,
  IconDeviceFloppy,
  IconArrowBackUp,
  IconArrowForwardUp,
  IconBaselineDensityMedium,
  IconStack2,
  IconSettings,
  IconX,
  IconCopy,
  IconPencil,
} from '@tabler/icons-react'
import type { BstShadcnIcons } from './types.js'

/**
 * Icon preset backed by `@tabler/icons-react` (outline weight). Install
 * `@tabler/icons-react`, then: `<BstTableShadcn icons={tablerIcons} … />`.
 */
export const tablerIcons: BstShadcnIcons = {
  search: IconSearch,
  filter: IconFilter,
  format: IconPalette,
  columns: IconColumns,
  chevronLeft: IconChevronLeft,
  chevronRight: IconChevronRight,
  chevronDown: IconChevronDown,
  check: IconCheck,
  pin: IconPin,
  plus: IconPlus,
  save: IconDeviceFloppy,
  undo: IconArrowBackUp,
  redo: IconArrowForwardUp,
  density: IconBaselineDensityMedium,
  group: IconStack2,
  settings: IconSettings,
  close: IconX,
  copy: IconCopy,
  edit: IconPencil,
}

export default tablerIcons
