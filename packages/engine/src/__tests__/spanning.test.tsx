import { describe, test, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import * as React from 'react'
import { useBstTable, BstTable, computeCellSpans, cellKey } from '../index'
import type { BstTableColumn, UseBstTableOptions, SpanCol, SpanRow } from '../index'

// ---------- pure planner ----------

const mkRows = (vals: Record<string, unknown>[]): SpanRow[] =>
  vals.map((v, i) => ({ id: String(i + 1), original: v, getValue: (c: string) => v[c] }))
const mkCols = (defs: Array<{ id: string; meta?: Record<string, unknown> }>): SpanCol[] =>
  defs.map((d) => ({ id: d.id, meta: (d.meta ?? {}) as SpanCol['meta'] }))

describe('computeCellSpans (planner)', () => {
  test("meta.rowSpan:'group' merges consecutive equal values vertically", () => {
    const rows = mkRows([{ dept: 'Eng' }, { dept: 'Eng' }, { dept: 'Sales' }, { dept: 'Sales' }, { dept: 'Sales' }])
    const cols = mkCols([{ id: 'dept', meta: { rowSpan: 'group' } }])
    const plan = computeCellSpans(rows, cols)
    expect(plan.origin.get(cellKey('1', 'dept'))).toEqual({ colSpan: 1, rowSpan: 2 })
    expect(plan.covered.has(cellKey('2', 'dept'))).toBe(true)
    expect(plan.origin.get(cellKey('3', 'dept'))).toEqual({ colSpan: 1, rowSpan: 3 })
    expect(plan.covered.has(cellKey('4', 'dept'))).toBe(true)
    expect(plan.covered.has(cellKey('5', 'dept'))).toBe(true)
  })

  test('getCellSpan covers a col×row rectangle (origin + covered)', () => {
    const rows = mkRows([{ a: 1, b: 2, c: 3 }, { a: 4, b: 5, c: 6 }, { a: 7, b: 8, c: 9 }])
    const cols = mkCols([{ id: 'a' }, { id: 'b' }, { id: 'c' }])
    const plan = computeCellSpans(rows, cols, ({ rowId, columnId }) =>
      rowId === '1' && columnId === 'a' ? { colSpan: 2, rowSpan: 2 } : undefined,
    )
    expect(plan.origin.get(cellKey('1', 'a'))).toEqual({ colSpan: 2, rowSpan: 2 })
    for (const [r, c] of [['1', 'b'], ['2', 'a'], ['2', 'b']] as const)
      expect(plan.covered.has(cellKey(r, c))).toBe(true)
    // outside the rectangle stays visible
    expect(plan.covered.has(cellKey('2', 'c'))).toBe(false)
    expect(plan.covered.has(cellKey('3', 'a'))).toBe(false)
  })

  test('spans are clamped to the grid bounds (never overflow)', () => {
    const rows = mkRows([{ a: 1, b: 2, c: 3 }])
    const cols = mkCols([{ id: 'a' }, { id: 'b' }, { id: 'c' }])
    // colSpan 5 at the last column clamps to 1 → no origin recorded.
    const plan = computeCellSpans(rows, cols, ({ columnId }) => (columnId === 'c' ? { colSpan: 5 } : undefined))
    expect(plan.origin.size).toBe(0)
  })
})

// ---------- rendered DOM ----------

type Row = { id: string; dept: string; name: string; city: string }
const seed: Row[] = [
  { id: '1', dept: 'Eng', name: 'Ada', city: 'London' },
  { id: '2', dept: 'Eng', name: 'Linus', city: 'Portland' },
  { id: '3', dept: 'Sales', name: 'Grace', city: 'NYC' },
]
const columns: BstTableColumn<Row>[] = [
  { id: 'dept', accessorKey: 'dept', header: 'Dept', meta: { type: 'text', rowSpan: 'group' } },
  { id: 'name', accessorKey: 'name', header: 'Name', meta: { type: 'text' } },
  { id: 'city', accessorKey: 'city', header: 'City', meta: { type: 'text' } },
]

function Grid(props: Partial<UseBstTableOptions<Row>>) {
  const table = useBstTable<Row>({ data: seed, columns, getRowId: (r) => r.id, ...props })
  return <BstTable table={table} />
}

describe('cell spanning (rendered)', () => {
  test("meta.rowSpan:'group' renders one tall cell and drops the covered ones", () => {
    render(<Grid enableCellSpanning />)
    // "Eng" merges rows 1–2 into a single rowSpan=2 cell.
    expect(screen.getAllByText('Eng')).toHaveLength(1)
    const engCell = screen.getByText('Eng').closest('td') as HTMLElement
    expect(engCell.getAttribute('rowspan')).toBe('2')
    expect(engCell).toHaveClass('bst-spanned')
    // Linus's row lost its Dept cell (covered) → dept + name + city minus 1 = 2 cells.
    const linusRow = screen.getByText('Linus').closest('tr') as HTMLElement
    expect(within(linusRow).getAllByRole('cell')).toHaveLength(2)
  })

  test('getCellSpan colSpan widens a cell and covers its neighbour', () => {
    render(
      <Grid
        enableCellSpanning
        getCellSpan={({ rowId, columnId }) =>
          rowId === '1' && columnId === 'name' ? { colSpan: 2 } : undefined
        }
      />,
    )
    const nameCell = screen.getByText('Ada').closest('td') as HTMLElement
    expect(nameCell.getAttribute('colspan')).toBe('2')
    // Ada's row: dept + (name spanning city) = 2 cells; "London" is covered/gone.
    const adaRow = screen.getByText('Ada').closest('tr') as HTMLElement
    expect(within(adaRow).getAllByRole('cell')).toHaveLength(2)
    expect(within(adaRow).queryByText('London')).toBeNull()
  })

  test('spanning off (default) leaves every cell intact', () => {
    render(<Grid />)
    expect(screen.getAllByText('Eng')).toHaveLength(2)
    expect(screen.getAllByText('Eng')[0].closest('td')?.getAttribute('rowspan')).toBeNull()
    const linusRow = screen.getByText('Linus').closest('tr') as HTMLElement
    expect(within(linusRow).getAllByRole('cell')).toHaveLength(3)
  })
})
