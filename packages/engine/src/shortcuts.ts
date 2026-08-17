// Keyboard-shortcut registry (headless) — the single source of truth for the
// in-UI shortcuts overlay (`<BstShortcuts>` / adapters' `showShortcuts`). Each
// entry declares the engine flags it needs, so the overlay shows ONLY the
// shortcuts that actually work on a given grid (resolved via the same flag model
// as the settings sheet). Mirrors the real key handling in `BstTable.tsx`'s
// `onKeyDown` — keep the two in sync (guarded by `shortcuts.test.tsx`).

export type ShortcutCategory = 'Navigate' | 'Edit' | 'Clipboard' | 'History'

export interface BstShortcut {
  /** Key tokens for one chord. `'Mod'` → ⌘ on Mac / Ctrl elsewhere; `'Shift'` →
   *  ⇧ / Shift; `'Arrows'` → the arrow cluster; others render literally. */
  keys: string[]
  /** Short human label. */
  label: string
  category: ShortcutCategory
  /** Engine flags that must ALL be active for this shortcut to fire. */
  requires: string[]
}

/** Authored in display order, grouped by category. */
export const BST_SHORTCUTS_REGISTRY: readonly BstShortcut[] = [
  // Navigate — the active-cell cursor (needs cell selection)
  { keys: ['Arrows'], label: 'Move active cell', category: 'Navigate', requires: ['enableCellSelection'] },
  { keys: ['Shift', 'Arrows'], label: 'Extend selection', category: 'Navigate', requires: ['enableCellSelection'] },
  { keys: ['Mod', 'Arrows'], label: 'Jump to edge', category: 'Navigate', requires: ['enableCellSelection'] },
  { keys: ['Tab'], label: 'Next cell (wraps rows)', category: 'Navigate', requires: ['enableCellSelection'] },
  { keys: ['Shift', 'Tab'], label: 'Previous cell', category: 'Navigate', requires: ['enableCellSelection'] },
  { keys: ['Home'], label: 'Row start', category: 'Navigate', requires: ['enableCellSelection'] },
  { keys: ['End'], label: 'Row end', category: 'Navigate', requires: ['enableCellSelection'] },
  { keys: ['Mod', 'Home'], label: 'Grid start', category: 'Navigate', requires: ['enableCellSelection'] },
  { keys: ['Mod', 'End'], label: 'Grid end', category: 'Navigate', requires: ['enableCellSelection'] },
  { keys: ['Mod', 'A'], label: 'Select all', category: 'Navigate', requires: ['enableCellSelection'] },
  // Edit
  { keys: ['Enter'], label: 'Edit cell (or move down)', category: 'Edit', requires: ['enableCellSelection', 'enableEditing'] },
  { keys: ['F2'], label: 'Edit cell in place', category: 'Edit', requires: ['enableEditing'] },
  { keys: ['Esc'], label: 'Cancel edit / clear selection', category: 'Edit', requires: ['enableCellSelection'] },
  // Clipboard
  { keys: ['Mod', 'C'], label: 'Copy selection', category: 'Clipboard', requires: ['enableClipboard'] },
  { keys: ['Mod', 'V'], label: 'Paste', category: 'Clipboard', requires: ['enableClipboard', 'enableEditing'] },
  { keys: ['Mod', 'Space'], label: 'Select whole column', category: 'Clipboard', requires: ['enableCopyColumn'] },
  { keys: ['Shift', 'Space'], label: 'Select whole row', category: 'Clipboard', requires: ['enableCopyRow'] },
  // History
  { keys: ['Mod', 'Z'], label: 'Undo', category: 'History', requires: ['enableUndoRedo'] },
  { keys: ['Mod', 'Shift', 'Z'], label: 'Redo', category: 'History', requires: ['enableUndoRedo'] },
  { keys: ['Mod', 'Y'], label: 'Redo (alt)', category: 'History', requires: ['enableUndoRedo'] },
]

/** Render one key token for display, platform-aware. */
export function formatShortcutToken(token: string, isMac: boolean): string {
  switch (token) {
    case 'Mod':
      return isMac ? '⌘' : 'Ctrl'
    case 'Shift':
      return isMac ? '⇧' : 'Shift'
    case 'Arrows':
      return '↑↓←→'
    default:
      return token
  }
}

export interface ResolvedShortcut {
  keys: string[]
  label: string
}
export interface ResolvedShortcutGroup {
  category: ShortcutCategory
  items: ResolvedShortcut[]
}

const CATEGORY_ORDER: ShortcutCategory[] = ['Navigate', 'Edit', 'Clipboard', 'History']

/**
 * Filter the registry to the shortcuts whose required flags are **all** active,
 * grouped by category and optionally narrowed by a free-text `query` (label or
 * keys). Pure — the overlay renders exactly this.
 */
export function resolveActiveShortcuts(
  flags: Record<string, boolean | undefined>,
  query = '',
): ResolvedShortcutGroup[] {
  const q = query.trim().toLowerCase()
  const groups: ResolvedShortcutGroup[] = []
  for (const category of CATEGORY_ORDER) {
    const items = BST_SHORTCUTS_REGISTRY.filter(
      (s) =>
        s.category === category &&
        s.requires.every((f) => flags[f] === true) &&
        (!q ||
          s.label.toLowerCase().includes(q) ||
          s.keys.join(' ').toLowerCase().includes(q)),
    ).map((s) => ({ keys: s.keys, label: s.label }))
    if (items.length) groups.push({ category, items })
  }
  return groups
}
