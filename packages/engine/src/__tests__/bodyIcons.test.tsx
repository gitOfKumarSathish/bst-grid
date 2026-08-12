import { describe, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import * as React from 'react'
import {
  useBstTable,
  BstTable,
  defaultBstIcons,
  resolveBstIcons,
  BST_ICON_SLOTS,
} from '../index'
import type { BstTableColumn, UseBstTableOptions, BstIcons } from '../index'

type Row = { id: string; name: string; ok: boolean; doc: string }
const seed: Row[] = [
  { id: '1', name: 'Ada', ok: true, doc: 'report.pdf' },
  { id: '2', name: 'Linus', ok: false, doc: 'sheet.xlsx' },
]
const columns: BstTableColumn<Row>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name', meta: { type: 'text' } },
  { id: 'ok', accessorKey: 'ok', header: 'OK', meta: { type: 'boolean' } },
  { id: 'doc', accessorKey: 'doc', header: 'Doc', meta: { type: 'files' } },
]

function Grid(props: Partial<UseBstTableOptions<Row>> & { icons?: Partial<BstIcons> }) {
  const { icons, ...opts } = props
  const table = useBstTable<Row>({ data: seed, columns, getRowId: (r) => r.id, ...opts })
  return <BstTable table={table} icons={icons} />
}

// Every emoji/glyph the engine body used to render.
const BODY_GLYPHS = /[📄📝📊📽️🗜️🎵🎬📎📌▲▼↕▸▾✕✓]/u

describe('engine body icons — resolveBstIcons', () => {
  test('no overrides returns the built-in defaults', () => {
    expect(resolveBstIcons()).toBe(defaultBstIcons)
    expect(resolveBstIcons({}).pin).toBe(defaultBstIcons.pin)
  })

  test('a partial map overrides only the given slots', () => {
    const Custom = () => null
    const merged = resolveBstIcons({ pin: Custom })
    expect(merged.pin).toBe(Custom)
    expect(merged.sortAsc).toBe(defaultBstIcons.sortAsc)
  })

  test('an undefined slot falls back to the default (partial-forward safety)', () => {
    const merged = resolveBstIcons({ pin: undefined as unknown as BstIcons['pin'] })
    expect(merged.pin).toBe(defaultBstIcons.pin)
  })

  test('every default slot is a component', () => {
    for (const slot of BST_ICON_SLOTS) {
      expect(typeof defaultBstIcons[slot], `defaultBstIcons.${slot}`).toBe('function')
    }
  })
})

describe('engine body renders SVG icons, not emoji/glyphs', () => {
  test('sort indicator, boolean cell and file cell are SVG — no glyphs leak', () => {
    const { container } = render(<Grid enableSorting />)
    // header sort indicators + boolean check + file-type icons.
    expect(container.querySelectorAll('svg').length).toBeGreaterThan(2)
    expect(container.textContent ?? '').not.toMatch(BODY_GLYPHS)
  })

  test('the `icons` prop replaces a body slot (adapters forward this way)', () => {
    render(
      <Grid
        icons={{ booleanTrue: () => <svg data-testid="custom-bool" /> }}
      />,
    )
    // Row 1 is `ok: true`, so the true-icon renders.
    expect(screen.getAllByTestId('custom-bool').length).toBeGreaterThan(0)
  })
})
