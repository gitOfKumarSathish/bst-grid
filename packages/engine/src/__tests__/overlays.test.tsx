import { describe, test, expect } from 'vitest'
import { render } from '@testing-library/react'
import * as React from 'react'
import { useBstTable, BstTable } from '../index'
import type { BstTableColumn, UseBstTableOptions } from '../index'

type Row = { id: string; name: string }
const seed: Row[] = [{ id: '1', name: 'Ada' }]
const columns: BstTableColumn<Row>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name', meta: { type: 'text' } },
]
function Grid(props: Partial<UseBstTableOptions<Row>>) {
  const table = useBstTable<Row>({ data: seed, columns, getRowId: (r) => r.id, ...props })
  return <BstTable table={table} />
}

describe('loading / error overlays (AG23)', () => {
  test('no overlay by default, but the viewport wrapper is always present', () => {
    const { container } = render(<Grid />)
    expect(container.querySelector('.bst-overlay')).toBeNull()
    expect(container.querySelector('.bst-table-viewport')).not.toBeNull()
  })

  test('loading shows the spinner overlay (role=status)', () => {
    const { container } = render(<Grid loading />)
    expect(container.querySelector('.bst-overlay.bst-overlay-loading')).not.toBeNull()
    expect(container.querySelector('.bst-spinner')).not.toBeNull()
    expect(container.textContent).toContain('Loading…')
    expect(container.querySelector('.bst-overlay')?.getAttribute('role')).toBe('status')
  })

  test('error shows the error overlay with the message (role=alert)', () => {
    const { container } = render(<Grid error="Failed to load" />)
    expect(container.querySelector('.bst-overlay.bst-overlay-error')).not.toBeNull()
    expect(container.textContent).toContain('Failed to load')
    expect(container.querySelector('.bst-overlay')?.getAttribute('role')).toBe('alert')
  })

  test('error takes precedence over loading', () => {
    const { container } = render(<Grid loading error="Boom" />)
    expect(container.querySelector('.bst-overlay-error')).not.toBeNull()
    expect(container.querySelector('.bst-overlay-loading')).toBeNull()
    expect(container.querySelector('.bst-spinner')).toBeNull()
  })

  test('custom renderLoading / renderError slots replace the defaults', () => {
    const a = render(<Grid loading renderLoading={() => <span>please wait</span>} />)
    expect(a.container.textContent).toContain('please wait')
    expect(a.container.querySelector('.bst-spinner')).toBeNull()
    a.unmount()
    const b = render(<Grid error="x" renderError={(e) => <span>err: {e}</span>} />)
    expect(b.container.textContent).toContain('err: x')
  })

  test('a falsy error does not show the overlay', () => {
    const { container } = render(<Grid error={''} />)
    expect(container.querySelector('.bst-overlay')).toBeNull()
  })
})
