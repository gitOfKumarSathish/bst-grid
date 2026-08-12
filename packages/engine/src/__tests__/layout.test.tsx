import { describe, test, expect } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import * as React from 'react'
import { useBstTable, BstTable } from '../index'
import { distributeFitWidths } from '../BstTable'
import type { BstTableColumn } from '../index'

type Row = { id: string; name: string; age: number; city: string }

const seed: Row[] = [
  { id: '1', name: 'Ada', age: 36, city: 'London' },
  { id: '2', name: 'Linus', age: 54, city: 'Portland' },
]

const columns: BstTableColumn<Row>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name', meta: { type: 'text' } },
  { id: 'age', accessorKey: 'age', header: 'Age', meta: { type: 'number' } },
  { id: 'city', accessorKey: 'city', header: 'City', meta: { type: 'text' } },
]

function Grid() {
  const table = useBstTable<Row>({
    data: seed,
    columns,
    getRowId: (r) => r.id,
    enableColumnPinning: true,
    // v9 pins to 'start'/'end'; pin the first two columns left.
    initialState: { columnPinning: { start: ['name', 'age'], end: [] } },
  })
  return (
    <div className="bst-table-root">
      <BstTable table={table} />
    </div>
  )
}

const th = (label: string) => screen.getByText(label).closest('th') as HTMLElement

describe('column pinning (Phase 3)', () => {
  test('start-pinned columns render sticky with accumulating left offsets', () => {
    render(<Grid />)
    // The sticky affordance is the class (jsdom does not apply stylesheet rules
    // to element.style); the inline left offset accumulates by column width.
    expect(th('Name')).toHaveClass('bst-pinned-left')
    expect(th('Name').style.left).toBe('0px')
    expect(th('Age')).toHaveClass('bst-pinned-left')
    expect(th('Age').style.left).toBe('150px') // after Name's default 150px width

    // the unpinned column is static
    expect(th('City')).not.toHaveClass('bst-pinned-left')

    // body cells mirror the header pinning
    const firstRow = screen.getAllByRole('row')[1]
    const nameCell = within(firstRow).getAllByRole('cell')[0]
    expect(nameCell).toHaveClass('bst-pinned-left')
    expect((nameCell as HTMLElement).style.left).toBe('0px')
  })

  // Regression: a pinned cell paints over the cells scrolling beneath it, so its
  // background — including every state tint — must be OPAQUE, or scrolled content
  // bleeds through. jsdom can't resolve `var()`, so assert on the shipped CSS: the
  // pinned state variants mix over `--bst-table-bg`, never over `transparent`.
  test('pinned cells keep opaque backgrounds in every state (no scroll bleed)', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    // vitest runs from the repo root (vitest.config.ts lives there).
    const css = readFileSync(resolve(process.cwd(), 'packages/engine/styles/bst-table.css'), 'utf8')
    for (const state of ['bst-selected', 'bst-active', 'bst-disabled']) {
      const rule = css.match(new RegExp(`bst-pinned-left\\.${state}[\\s\\S]*?\\{[\\s\\S]*?\\}`))?.[0]
      expect(rule, `pinned .${state} rule should exist`).toBeTruthy()
      expect(rule).toContain('var(--bst-table-bg)')
      expect(rule).not.toContain('transparent')
    }
  })

  // Regression: adapters may supply a TRANSLUCENT --bst-table-row-hover (MUI's
  // theme.palette.action.hover is rgba(0,0,0,0.04)). Sticky cells must composite
  // that tint over an opaque base INSIDE the cell (two-layer background) — using
  // it raw makes the pinned cell see-through on hover and scrolled content bleeds.
  test('sticky-cell hover/selected tints composite over an opaque base', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const css = readFileSync(resolve(process.cwd(), 'packages/engine/styles/bst-table.css'), 'utf8')
    const ruleFor = (selector: string) =>
      css.match(new RegExp(`${selector.replace(/[.\\-]/g, '\\$&')}[^{]*\\{[\\s\\S]*?\\}`))?.[0]

    // pinned COLUMN cells on row hover: tint layered over the opaque cell bg
    const colHover = ruleFor('.bst-table-tr:hover .bst-table-td.bst-pinned-left')
    expect(colHover, 'pinned-column hover rule should exist').toBeTruthy()
    expect(colHover).toContain('linear-gradient(var(--bst-table-row-hover)')
    expect(colHover).toContain('var(--bst-table-bg)')

    // pinned (frozen) ROWS on hover: same layering over the opaque row base
    const rowHover = ruleFor('.bst-table-tr.bst-row-pinned-top:hover .bst-table-td')
    expect(rowHover, 'row-pinned hover rule should exist').toBeTruthy()
    expect(rowHover).toContain('linear-gradient(var(--bst-table-row-hover)')
    expect(rowHover).toContain('var(--bst-table-header-bg)')

    // row-selected pinned cells (incl. the pinned checkbox cell): opaque accent mix
    const rowSel = ruleFor('.bst-table-tr.bst-row-selected .bst-table-td.bst-pinned-left')
    expect(rowSel, 'row-selected pinned rule should exist').toBeTruthy()
    expect(rowSel).toContain('.bst-select-td.bst-pinned-left')
    expect(rowSel).toContain('var(--bst-table-bg)')
    expect(rowSel).not.toContain('transparent')
  })
})

function OrderGrid() {
  const table = useBstTable<Row>({
    data: seed,
    columns,
    getRowId: (r) => r.id,
    enableColumnOrdering: true,
  })
  return (
    <div className="bst-table-root">
      <BstTable table={table} />
    </div>
  )
}

const headerLabels = () =>
  screen.getAllByRole('columnheader').map((h) => (h.textContent || '').replace(/[↕▲▼]/g, '').trim())

describe('column drag-to-reorder (Phase 3)', () => {
  test('dragging a header onto another reorders the columns', () => {
    render(<OrderGrid />)
    expect(headerLabels()).toEqual(['Name', 'Age', 'City'])
    const nameContent = screen.getByText('Name').closest('.bst-table-th-content') as HTMLElement
    const ageTh = screen.getByText('Age').closest('th') as HTMLElement
    const dataTransfer = { setData: () => {}, getData: () => 'name', effectAllowed: '' }
    fireEvent.dragStart(nameContent, { dataTransfer })
    fireEvent.drop(ageTh, { dataTransfer })
    expect(headerLabels()).toEqual(['Age', 'Name', 'City'])
  })
})

describe('column resize infra (Phase 3)', () => {
  test('the table carries an explicit width so table-layout:fixed can honour resizes', () => {
    render(<OrderGrid />)
    // width is set inline from getTotalSize (default 150 × 3 = 450)
    expect((screen.getByRole('table') as HTMLElement).style.width).toBe('450px')
  })
})

function FitGrid({ fit }: { fit: boolean }) {
  const table = useBstTable<Row>({
    data: seed,
    columns,
    getRowId: (r) => r.id,
    enableColumnResizing: true,
    fitColumns: fit,
  })
  return (
    <div className="bst-table-root">
      <BstTable table={table} />
    </div>
  )
}

describe('fit-to-viewport (G3)', () => {
  test('distributeFitWidths splits width proportionally and sums exactly', () => {
    // 3:1:1 of 500 → 300/100/100
    expect(distributeFitWidths(500, [300, 100, 100])).toEqual([300, 100, 100])
    // rounding remainder is absorbed so the total is preserved exactly
    const w = distributeFitWidths(1000, [150, 150, 150, 150, 150, 150, 150])
    expect(w.reduce((a, b) => a + b, 0)).toBe(1000)
    // every column honours the minimum
    const clamped = distributeFitWidths(120, [10, 10, 1000], 48)
    expect(Math.min(...clamped)).toBeGreaterThanOrEqual(48)
  })

  test('fitColumns hides horizontal scroll and suppresses resizers', () => {
    const { container, rerender } = render(<FitGrid fit={false} />)
    const scroll = container.querySelector('.bst-table-scroll') as HTMLElement
    expect(scroll.style.overflowX).toBe('') // normal: horizontal scroll allowed
    expect(container.querySelectorAll('.bst-table-resizer').length).toBeGreaterThan(0)

    rerender(<FitGrid fit={true} />)
    expect((container.querySelector('.bst-table-scroll') as HTMLElement).style.overflowX).toBe('hidden')
    expect(container.querySelectorAll('.bst-table-resizer').length).toBe(0)
  })
})
