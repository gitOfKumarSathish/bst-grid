import {
  Search,
  ListFilter,
  Palette,
  Columns3,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  Pin,
  Plus,
  Save,
  Undo2,
  Redo2,
  Rows3,
  Group,
  Settings,
  X,
  Copy,
  Pencil,
} from 'lucide-react'
import type { BstShadcnIcons } from './types.js'

/**
 * Icon preset backed by `lucide-react` — shadcn/ui's default icon set. Install
 * `lucide-react`, then: `<BstTableShadcn icons={lucideIcons} … />`.
 */
export const lucideIcons: BstShadcnIcons = {
  search: Search,
  filter: ListFilter,
  format: Palette,
  columns: Columns3,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  chevronDown: ChevronDown,
  check: Check,
  pin: Pin,
  plus: Plus,
  save: Save,
  undo: Undo2,
  redo: Redo2,
  density: Rows3,
  group: Group,
  settings: Settings,
  close: X,
  copy: Copy,
  edit: Pencil,
}

export default lucideIcons
