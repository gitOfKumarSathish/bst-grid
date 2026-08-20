import type { ComponentType } from 'react'

/**
 * Props every Bst-Table shadcn icon slot is called with. Kept to the intersection
 * every mainstream React icon library accepts (`lucide-react`, `@tabler/icons-react`,
 * `@phosphor-icons/react`, `@remixicon/react`, HugeIcons), so a library's own icon
 * component drops straight into a slot without a wrapper.
 */
export interface IconProps {
  /**
   * Icon size (width = height). Number of px, or a CSS length string. Widened to
   * `number | string` so every mainstream icon library's component (which types
   * `size` that way) is assignable to a slot without a wrapper. Chrome passes 16.
   */
  size?: number | string
  /** Extra class on the rendered `<svg>`. */
  className?: string
}

export type IconComponent = ComponentType<IconProps>

/**
 * The full set of icon "slots" the shadcn chrome renders. Provide any subset via
 * the `icons` prop (or a ready-made preset from `@bloomskill/table-shadcn/icons/*`);
 * unspecified slots fall back to the built-in `defaultIcons` SVGs.
 */
export interface BstShadcnIcons {
  /** Global search box (leading adornment). */
  search: IconComponent
  /** Filter-builder toggle button. */
  filter: IconComponent
  /** Conditional-format builder toggle button. */
  format: IconComponent
  /** Columns menu trigger (with `chevronDown`). */
  columns: IconComponent
  /** Previous page · move column left. */
  chevronLeft: IconComponent
  /** Next page · move column right. */
  chevronRight: IconComponent
  /** Dropdown affordance on the Columns button. */
  chevronDown: IconComponent
  /** Column-visible checkmark in the Columns menu. */
  check: IconComponent
  /** Pin-column control in the Columns menu. */
  pin: IconComponent
  /** Add-row button. */
  plus: IconComponent
  /** Save (commit dirty edits). */
  save: IconComponent
  /** Undo. */
  undo: IconComponent
  /** Redo. */
  redo: IconComponent
  /** Row-height density toggle. */
  density: IconComponent
  /** Group-by-column control in the Columns menu. */
  group: IconComponent
  /** Settings gear. */
  settings: IconComponent
  /** Close (settings sheet, dialogs). */
  close: IconComponent
  /** Copy-column control in the Columns menu. */
  copy: IconComponent
  /** Per-column edit lock/unlock control in the Columns menu. */
  edit: IconComponent
  /** Hide a currently-visible column (Columns menu) — the "eye" glyph. */
  eye: IconComponent
  /** Show a currently-hidden column (Columns menu) — the "eye-off" glyph. */
  eyeOff: IconComponent
}

/** A partial icon map — the shape of the `icons` prop and every preset factory input. */
export type BstShadcnIconOverrides = Partial<BstShadcnIcons>

/** Slot keys, handy for iterating or building presets. */
export const ICON_SLOTS: (keyof BstShadcnIcons)[] = [
  'search',
  'filter',
  'format',
  'columns',
  'chevronLeft',
  'chevronRight',
  'chevronDown',
  'check',
  'pin',
  'plus',
  'save',
  'undo',
  'redo',
  'density',
  'group',
  'settings',
  'close',
  'copy',
  'edit',
  'eye',
  'eyeOff',
]
