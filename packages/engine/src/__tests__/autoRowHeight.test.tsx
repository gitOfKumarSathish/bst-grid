import { describe, test, expect } from 'vitest'
import { render } from '@testing-library/react'
import * as React from 'react'
import { useBstTable, BstTable } from '../index'
import type { BstTableColumn } from '../index'

type Row = { id: string; note: string; name: string }
const data: Row[] = [
  { id: '1', name: 'Al', note: 'a long note that would wrap onto several lines when the column is narrow' },
  { id: '2', name: 'Bo', note: 'short' },
]

function Grid({ wrapNote, ...opts }: { wrapNote?: boolean } & Record<string, unknown>) {
  const columns: BstTableColumn<Row>[] = [
    { id: 'name', accessorKey: 'name', header: 'Name', meta: { type: 'text' } },
    {
      id: 'note',
      accessorKey: 'note',
      header: 'Note',
      meta: { type: 'text', wrapText: wrapNote || undefined },
    },
  ]
  const table = useBstTable<Row>({ data, columns, getRowId: (r) => r.id, ...opts })
  return <BstTable table={table} />
}

describe('auto row height (AG26)', () => {
  test('off by default — no root class, cells still truncate', () => {
    const { container } = render(<Grid />)
    expect(container.querySelector('.bst-auto-rowheight')).toBeNull()
    expect(container.querySelector('.bst-table-td.bst-wrap')).toBeNull()
  })

  test('enableAutoRowHeight adds the grid-wide root class', () => {
    const { container } = render(<Grid enableAutoRowHeight />)
    expect(container.querySelector('.bst-auto-rowheight')).toBeTruthy()
  })

  test('meta.wrapText marks only that column\'s body cells', () => {
    const { container } = render(<Grid wrapNote />)
    // No grid-wide class (per-column opt-in works on its own)…
    expect(container.querySelector('.bst-auto-rowheight')).toBeNull()
    // …and one wrapped cell per body row (the Note column).
    const wrapped = container.querySelectorAll('.bst-table-td.bst-wrap')
    expect(wrapped.length).toBe(data.length)
  })
})
