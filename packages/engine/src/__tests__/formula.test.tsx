import { describe, test, expect } from 'vitest'
import { render } from '@testing-library/react'
import * as React from 'react'
import { useBstTable, BstTable, normalizeFormulaColumns } from '../index'
import type { BstTableColumn, UseBstTableOptions, BstFormulaContext } from '../index'

type Row = { id: string; item: string; qty: number; price: number }
const seed: Row[] = [
  { id: '1', item: 'Pen', qty: 3, price: 2 },
  { id: '2', item: 'Pad', qty: 5, price: 4 },
]
const columns: BstTableColumn<Row>[] = [
  { id: 'item', accessorKey: 'item', header: 'Item', meta: { type: 'text' } },
  { id: 'qty', accessorKey: 'qty', header: 'Qty', meta: { type: 'number' } },
  { id: 'price', accessorKey: 'price', header: 'Price', meta: { type: 'number' } },
  // computed column — total = qty * price
  { id: 'total', header: 'Total', meta: { type: 'number', formula: (r: Row) => r.qty * r.price } },
]
function Grid(props: Partial<UseBstTableOptions<Row>>) {
  const table = useBstTable<Row>({ data: seed, columns, getRowId: (r) => r.id, ...props })
  return <BstTable table={table} />
}

describe('formula / calculated columns (AG17)', () => {
  test('normalizeFormulaColumns injects accessorFn + drops accessorKey, keeps id', () => {
    const out = normalizeFormulaColumns(columns, { current: seed }) as any[]
    const total = out.find((c) => c.id === 'total')
    expect(typeof total.accessorFn).toBe('function')
    expect(total.accessorKey).toBeUndefined()
    expect(total.accessorFn(seed[0], 0)).toBe(6) // 3 * 2
    expect(total.accessorFn(seed[1], 1)).toBe(20) // 5 * 4
  })

  test('columns with no formula pass through by reference (stable memo)', () => {
    const plain: BstTableColumn<Row>[] = [
      { id: 'item', accessorKey: 'item', header: 'Item', meta: { type: 'text' } },
    ]
    expect(normalizeFormulaColumns(plain, { current: seed })).toBe(plain)
  })

  test('renders the computed value through the number cell type', () => {
    const { container } = render(<Grid />)
    const cells = Array.from(container.querySelectorAll('tbody td')).map((c) => c.textContent?.trim())
    expect(cells).toContain('6')
    expect(cells).toContain('20')
  })

  test('formula receives ctx.rows + ctx.index (share of grand total)', () => {
    const share = (r: Row, ctx: BstFormulaContext<Row>) => {
      const grand = ctx.rows.reduce((s, x) => s + x.qty * x.price, 0)
      return Math.round(((r.qty * r.price) / grand) * 100)
    }
    const cols2: BstTableColumn<Row>[] = [
      { id: 'share', header: 'Share', meta: { type: 'number', formula: share } },
    ]
    const out = normalizeFormulaColumns(cols2, { current: seed }) as any[]
    expect(out[0].accessorFn(seed[0], 0)).toBe(23) // 6 / 26
    expect(out[0].accessorFn(seed[1], 1)).toBe(77) // 20 / 26
  })

  test('string (Excel-style) formula compiles + renders via normalizeFormulaColumns', () => {
    const cols: BstTableColumn<Row>[] = [
      { id: 'item', accessorKey: 'item', header: 'Item', meta: { type: 'text' } },
      { id: 'total', header: 'Total', meta: { type: 'number', formula: '=qty * price' } },
      { id: 'band', header: 'Band', meta: { type: 'text', formula: '=IF(qty * price > 10, "big", "small")' } },
    ]
    const out = normalizeFormulaColumns(cols, { current: seed }) as any[]
    const total = out.find((c) => c.id === 'total')
    const band = out.find((c) => c.id === 'band')
    expect(total.accessorFn(seed[0], 0)).toBe(6) // 3*2
    expect(total.accessorFn(seed[1], 1)).toBe(20) // 5*4
    expect(band.accessorFn(seed[0], 0)).toBe('small') // 6 <= 10
    expect(band.accessorFn(seed[1], 1)).toBe('big') // 20 > 10
  })

  test('runtime formulaColumns are appended as computed columns (builder path)', () => {
    const { container } = render(
      <Grid formulaColumns={[{ id: 'x2', header: 'Double', expression: '=qty * price * 2', type: 'number' }]} />,
    )
    const cells = Array.from(container.querySelectorAll('tbody td')).map((c) => c.textContent?.trim())
    expect(cells).toContain('12') // 3 * 2 * 2
    expect(cells).toContain('40') // 5 * 4 * 2
  })

  test('editing a runtime formula expression live-updates the grid (no stale accessor cache)', () => {
    const lastCellNum = (c: HTMLElement) => {
      const tds = c.querySelector('tbody tr')!.querySelectorAll('td')
      return Number(tds[tds.length - 1].textContent!.replace(/[^0-9.-]/g, ''))
    }
    const { container, rerender } = render(
      <Grid formulaColumns={[{ id: 'c', header: 'C', expression: '=qty * 1000', type: 'number' }]} />,
    )
    expect(lastCellNum(container)).toBe(3000) // qty 3 * 1000
    // Same column id, new expression — before the fix TanStack kept the cached
    // accessor and this stayed 3000.
    rerender(<Grid formulaColumns={[{ id: 'c', header: 'C', expression: '=qty * 2000', type: 'number' }]} />)
    expect(lastCellNum(container)).toBe(6000)
  })

  test('a formula column is filterable — it renders a filter input in the filter row', () => {
    const cols: BstTableColumn<Row>[] = [
      { id: 'item', accessorKey: 'item', header: 'Item', meta: { type: 'text' } },
      { id: 'band', header: 'Band', meta: { type: 'text', formula: '=IF(qty >= 5, "hi", "lo")' } },
    ]
    const { container } = render(<Grid columns={cols} enableColumnFilters enableColumnFilterRow />)
    // one .bst-colfilter input per filterable text column — the formula column included
    const filterInputs = container.querySelectorAll('.bst-colfilter')
    expect(filterInputs.length).toBe(2)
  })

  test('recurses into grouped (columns: [...]) headers', () => {
    const grouped: BstTableColumn<Row>[] = [
      {
        id: 'grp',
        header: 'Money',
        columns: [
          { id: 'price', accessorKey: 'price', header: 'Price', meta: { type: 'number' } },
          { id: 'total', header: 'Total', meta: { type: 'number', formula: (r: Row) => r.qty * r.price } },
        ],
      } as BstTableColumn<Row>,
    ]
    const out = normalizeFormulaColumns(grouped, { current: seed }) as any[]
    const total = out[0].columns.find((c: any) => c.id === 'total')
    expect(typeof total.accessorFn).toBe('function')
    expect(total.accessorFn(seed[1], 1)).toBe(20)
  })
})
