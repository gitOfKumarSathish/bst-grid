import { describe, test, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import * as React from 'react'
import {
  BST_SHORTCUTS_REGISTRY,
  resolveActiveShortcuts,
  formatShortcutToken,
} from '../shortcuts'
import { BstShortcuts as BstShortcutsComponent } from '../BstShortcuts'
import { useBstTable } from '../useBstTable'
import type { BstTableColumn } from '../types'

// The flags the runtime handle exposes + the resolver understands. A registry
// entry that requires anything outside this set can never light up → a bug.
const KNOWN_FLAGS = [
  'enableCellSelection',
  'enableClipboard',
  'enableEditing',
  'enableUndoRedo',
  'enableCopyColumn',
  'enableCopyRow',
  'enableFind',
]

const ALL_ON = Object.fromEntries(KNOWN_FLAGS.map((f) => [f, true]))

describe('formatShortcutToken (platform-aware)', () => {
  test('Mod → ⌘ on mac, Ctrl elsewhere', () => {
    expect(formatShortcutToken('Mod', true)).toBe('⌘')
    expect(formatShortcutToken('Mod', false)).toBe('Ctrl')
  })
  test('Shift and Arrows render as symbols; literals pass through', () => {
    expect(formatShortcutToken('Shift', true)).toBe('⇧')
    expect(formatShortcutToken('Shift', false)).toBe('Shift')
    expect(formatShortcutToken('Arrows', false)).toBe('↑↓←→')
    expect(formatShortcutToken('C', false)).toBe('C')
  })
})

describe('resolveActiveShortcuts (pure)', () => {
  test('nothing enabled → no shortcuts (every entry needs a flag)', () => {
    expect(resolveActiveShortcuts({})).toEqual([])
  })

  test('cell selection alone → Navigate + Esc, but not Clipboard/History', () => {
    const groups = resolveActiveShortcuts({ enableCellSelection: true })
    const cats = groups.map((g) => g.category)
    expect(cats).toContain('Navigate')
    expect(cats).not.toContain('Clipboard')
    expect(cats).not.toContain('History')
    const nav = groups.find((g) => g.category === 'Navigate')!
    expect(nav.items.map((i) => i.label)).toContain('Move active cell')
    // Enter needs editing too → absent; Esc only needs selection → present
    const edit = groups.find((g) => g.category === 'Edit')
    expect(edit?.items.map((i) => i.label)).toEqual(['Cancel edit / clear selection'])
  })

  test('clipboard without editing → Copy but not Paste', () => {
    const clip = resolveActiveShortcuts({ enableClipboard: true }).find(
      (g) => g.category === 'Clipboard',
    )!
    const labels = clip.items.map((i) => i.label)
    expect(labels).toContain('Copy selection')
    expect(labels).not.toContain('Paste') // Paste requires enableEditing
  })

  test('everything on → all five groups populated', () => {
    const groups = resolveActiveShortcuts(ALL_ON)
    expect(groups.map((g) => g.category)).toEqual(['Navigate', 'Find', 'Edit', 'Clipboard', 'History'])
    const paste = groups
      .find((g) => g.category === 'Clipboard')!
      .items.map((i) => i.label)
    expect(paste).toContain('Paste')
  })

  test('query narrows by label / keys', () => {
    const groups = resolveActiveShortcuts(ALL_ON, 'undo')
    expect(groups).toHaveLength(1)
    expect(groups[0].category).toBe('History')
    expect(groups[0].items.map((i) => i.label)).toEqual(['Undo'])
  })

  test('isMac drops the ⌘Y redo-alt on Mac; keeps it on PC; both when unset', () => {
    const hist = (isMac?: boolean) =>
      resolveActiveShortcuts(ALL_ON, '', isMac)
        .find((g) => g.category === 'History')!
        .items.map((i) => i.label)
    expect(hist(true)).toEqual(['Undo', 'Redo']) // Mac: no ⌘Y
    expect(hist(false)).toContain('Redo (alt)') // PC: keeps it
    expect(hist(undefined)).toContain('Redo (alt)') // unset: everything
  })
})

describe('registry integrity (mirror of the keydown handler)', () => {
  test('every shortcut requires only known handle flags', () => {
    for (const s of BST_SHORTCUTS_REGISTRY) {
      for (const f of s.requires) expect(KNOWN_FLAGS).toContain(f)
    }
  })
})

// ---- overlay renders + filters to the grid's active shortcuts -----------------
type Row = { id: string; name: string }
const data: Row[] = [{ id: '1', name: 'A' }]
const columns: BstTableColumn<Row>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name', meta: { type: 'text', editable: true } },
]

function Harness(opts: Record<string, unknown>) {
  const table = useBstTable<Row>({
    data,
    columns,
    getRowId: (r) => r.id,
    onDataChange: () => {},
    ...opts,
  })
  return <BstShortcutsComponent table={table} />
}

describe('BstShortcuts overlay', () => {
  test('opens on click and lists the active shortcuts', () => {
    render(<Harness enableCellSelection enableClipboard enableEditing enableUndoRedo />)
    fireEvent.click(screen.getByRole('button', { name: 'Keyboard shortcuts' }))
    const dialog = screen.getByRole('dialog', { name: 'Keyboard shortcuts' })
    expect(dialog).toBeInTheDocument()
    expect(screen.getByText('Copy selection')).toBeInTheDocument()
    expect(screen.getByText('Undo')).toBeInTheDocument()
    expect(screen.getByText('Move active cell')).toBeInTheDocument()
  })

  test('a bare grid (no selection/clipboard) shows the empty state', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Keyboard shortcuts' }))
    expect(screen.getByText(/No keyboard shortcuts are active/i)).toBeInTheDocument()
  })

  // Regression guard: the overlay must pass `enableFind` through to the resolver
  // (the flags object is derived from the registry, so a new group can't be
  // dropped). The pure-resolver tests alone did not catch the overlay omission.
  test('Find (X8) group appears iff enableFind is on', () => {
    const { unmount } = render(<Harness enableFind />)
    fireEvent.click(screen.getByRole('button', { name: 'Keyboard shortcuts' }))
    expect(screen.getByText('Open find')).toBeInTheDocument()
    expect(screen.getByText('Close find')).toBeInTheDocument()
    unmount()

    render(<Harness enableCellSelection />)
    fireEvent.click(screen.getByRole('button', { name: 'Keyboard shortcuts' }))
    expect(screen.queryByText('Open find')).toBeNull()
  })
})
