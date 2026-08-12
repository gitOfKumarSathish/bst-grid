import { describe, test, expect, beforeAll } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import * as React from 'react'
import { useBstTable, BstTable, computeAutoWidth } from '../index'
import type { BstTableColumn, UseBstTableOptions } from '../index'

beforeAll(() => {
  // jsdom has no canvas text metrics — mock a fixed 8px-per-char measurer.
  ;(HTMLCanvasElement.prototype as any).getContext = () => ({
    font: '',
    measureText: (t: string) => ({ width: t.length * 8 }),
  })
})

type Row = { id: string; name: string }
const seed: Row[] = [
  { id: '1', name: 'Ada' },
  { id: '2', name: 'Linus Torvalds' }, // 14 chars — widest
]
const columns: BstTableColumn<Row>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name', meta: { type: 'text' } },
]

function Grid(props: Partial<UseBstTableOptions<Row>>) {
  const t = useBstTable<Row>({ data: seed, columns, getRowId: (r) => r.id, ...props })
  return <BstTable table={t} />
}

describe('column auto-size (D3)', () => {
  test('computeAutoWidth = widest text + padding, clamped to [min, max]', () => {
    expect(computeAutoWidth(['ab', 'abcd'], { padding: 10, min: 10, max: 500 })).toBe(4 * 8 + 10)
    expect(computeAutoWidth([''], { padding: 4, min: 20 })).toBe(20) // clamped up to min
    expect(computeAutoWidth(['x'.repeat(1000)], { max: 300 })).toBe(300) // clamped down to max
  })

  test('double-clicking the resize handle fits the column to its content', () => {
    render(<Grid />)
    const th = screen.getByText('Name').closest('th') as HTMLElement
    expect(th.style.width).toBe('150px') // v9 default size
    fireEvent.doubleClick(th.querySelector('.bst-table-resizer') as HTMLElement)
    // widest = 'Linus Torvalds' (14) × 8 = 112, + 28 default pad = 140
    expect(th.style.width).toBe('140px')
  })
})
