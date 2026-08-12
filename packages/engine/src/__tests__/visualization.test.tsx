import { describe, test, expect } from 'vitest'
import { render } from '@testing-library/react'
import * as React from 'react'
import { useBstTable, BstTable } from '../index'
import type { BstTableColumn, UseBstTableOptions } from '../index'

type Row = { id: string; trend: number[]; kpi: { value: number; delta: number; data: number[] } }
const seed: Row[] = [
  { id: '1', trend: [1, 3, 2, 5, 4], kpi: { value: 1200, delta: 12, data: [1, 2, 3] } },
  { id: '2', trend: [], kpi: { value: 800, delta: -5, data: [] } },
]
const columns: BstTableColumn<Row>[] = [
  { id: 'trend', accessorKey: 'trend', header: 'Trend', meta: { type: 'sparkline' } },
  {
    id: 'kpi', accessorKey: 'kpi', header: 'KPI',
    meta: { type: 'kpi', locale: 'en-US', cellMeta: { deltaPercent: true } },
  },
]

function Grid(props: Partial<UseBstTableOptions<Row>>) {
  const table = useBstTable<Row>({ data: seed, columns, getRowId: (r) => r.id, ...props })
  return <BstTable table={table} />
}

describe('in-cell visualization (M1 sparkline / M2 KPI)', () => {
  test('sparkline renders an inline SVG polyline (and — when empty)', () => {
    const { container } = render(<Grid />)
    const rows = container.querySelectorAll('tbody tr.bst-table-tr')
    expect(rows[0].querySelector('svg[aria-label="sparkline"] polyline')).not.toBeNull()
    expect(rows[1].querySelector('.bst-cell-muted')?.textContent).toBe('—')
  })

  test('sparkline bar variant renders <rect> bars', () => {
    const cols: BstTableColumn<Row>[] = [
      { id: 'trend', accessorKey: 'trend', header: 'Trend', meta: { type: 'sparkline', cellMeta: { variant: 'bar' } } },
    ]
    const { container } = render(<Grid columns={cols} />)
    expect(container.querySelectorAll('tbody svg rect').length).toBe(5) // 5 values → 5 bars
  })

  test('KPI shows the value + a coloured delta chip (up / down)', () => {
    const { container } = render(<Grid />)
    const rows = container.querySelectorAll('tbody tr.bst-table-tr')
    const kpi1 = rows[0].querySelector('.bst-cell-kpi') as HTMLElement
    expect(kpi1.querySelector('.bst-kpi-value')?.textContent).toBe('1,200')
    const delta1 = kpi1.querySelector('.bst-kpi-delta') as HTMLElement
    expect(delta1).toHaveClass('is-up')
    expect(delta1.textContent).toContain('+12%')

    const delta2 = rows[1].querySelector('.bst-kpi-delta') as HTMLElement
    expect(delta2).toHaveClass('is-down')
    expect(delta2.textContent).toContain('-5%')
  })
})
