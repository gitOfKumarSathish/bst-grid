import { describe, test, expect } from 'vitest'
import { render } from '@testing-library/react'
import * as React from 'react'
import { useBstTable, BstTable } from '../index'
import type { BstTableColumn } from '../index'

type Row = { id: string; notes: string }
const data: Row[] = [{ id: '1', notes: '<b>Bold</b> and <i>italic</i>' }]

function Grid({ html }: { html?: boolean }) {
  const columns: BstTableColumn<Row>[] = [
    {
      id: 'notes',
      accessorKey: 'notes',
      header: 'Notes',
      meta: { type: 'richText', ...(html ? { cellMeta: { render: 'html' } } : {}) },
    },
  ]
  const table = useBstTable<Row>({ data, columns, getRowId: (r) => r.id })
  return (
    <div className="bst-table-root">
      <BstTable table={table} />
    </div>
  )
}

describe('richText read rendering', () => {
  test('default shows a plain-text preview (formatting stripped)', () => {
    render(<Grid />)
    const cell = document.querySelector('.bst-cell-richtext') as HTMLElement
    expect(cell).toBeTruthy()
    expect(cell.textContent).toBe('Bold and italic')
    expect(cell.querySelector('b, strong, i, em')).toBeNull()
    expect(cell.classList.contains('bst-cell-richtext-html')).toBe(false)
  })

  test('cellMeta.render="html" renders the sanitized formatting', () => {
    render(<Grid html />)
    const cell = document.querySelector('.bst-cell-richtext-html') as HTMLElement
    expect(cell).toBeTruthy()
    expect(cell.querySelector('b')?.textContent).toBe('Bold')
    expect(cell.querySelector('i')?.textContent).toBe('italic')
  })

  test('render="html" still sanitizes — scripts are stripped', () => {
    function Danger() {
      const columns: BstTableColumn<Row>[] = [
        {
          id: 'notes',
          accessorKey: 'notes',
          header: 'Notes',
          meta: { type: 'richText', cellMeta: { render: 'html' } },
        },
      ]
      const table = useBstTable<Row>({
        data: [{ id: '1', notes: '<b>ok</b><script>alert(1)</script>' }],
        columns,
        getRowId: (r) => r.id,
      })
      return (
        <div className="bst-table-root">
          <BstTable table={table} />
        </div>
      )
    }
    render(<Danger />)
    const cell = document.querySelector('.bst-cell-richtext-html') as HTMLElement
    expect(cell.querySelector('b')?.textContent).toBe('ok')
    expect(cell.querySelector('script')).toBeNull()
  })
})
