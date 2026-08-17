import { describe, test, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import * as React from 'react'
import { useBstTable, BstTable } from '../index'
import type { BstTableColumn, BstContextMenuItem, BstContextMenuContext } from '../index'

type Row = { id: string; name: string; qty: number }
const data: Row[] = [
  { id: '1', name: 'Al', qty: 5 },
  { id: '2', name: 'Bo', qty: 9 },
]
const columns: BstTableColumn<Row>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name', meta: { type: 'text' } },
  { id: 'qty', accessorKey: 'qty', header: 'Qty', meta: { type: 'number' } },
]

function Grid(opts: Record<string, unknown>) {
  const table = useBstTable<Row>({ data, columns, getRowId: (r) => r.id, ...opts })
  return <BstTable table={table} />
}

describe('context menu (AG6)', () => {
  test('off by default — cells carry no data-attrs, no menu on right-click', () => {
    const { container } = render(<Grid />)
    expect(container.querySelector('td[data-bst-rowid]')).toBeNull()
    expect(screen.queryByRole('menu')).toBeNull()
  })

  test('right-click opens a menu with the clipboard + autosize defaults', () => {
    const { container } = render(<Grid enableContextMenu enableClipboard enableCellSelection />)
    const cell = container.querySelector('td[data-bst-rowid]') as HTMLElement
    expect(cell).toBeTruthy()
    fireEvent.contextMenu(cell)
    expect(screen.getByRole('menu')).toBeTruthy()
    for (const label of ['Copy', 'Copy row', 'Copy column', 'Autosize column']) {
      expect(screen.getByText(label)).toBeTruthy()
    }
  })

  test('getContextMenuItems receives the clicked cell + defaults and reshapes the list', () => {
    let seenCol = ''
    let defaultCount = 0
    const getContextMenuItems = (ctx: BstContextMenuContext<Row>): BstContextMenuItem[] => {
      seenCol = ctx.columnId
      defaultCount = ctx.defaultItems.length
      return [...ctx.defaultItems, { key: 'x', label: 'My Action', onSelect: () => {} }]
    }
    const { container } = render(
      <Grid enableContextMenu enableClipboard getContextMenuItems={getContextMenuItems} />,
    )
    fireEvent.contextMenu(container.querySelector('td[data-bst-rowid]') as HTMLElement)
    expect(screen.getByText('My Action')).toBeTruthy()
    expect(seenCol).toBeTruthy()
    expect(defaultCount).toBeGreaterThan(0)
  })

  test('choosing an item runs its action and closes the menu', () => {
    let ran = false
    const getContextMenuItems = (): BstContextMenuItem[] => [
      { key: 'go', label: 'Go', onSelect: () => (ran = true) },
    ]
    const { container } = render(<Grid enableContextMenu getContextMenuItems={getContextMenuItems} />)
    fireEvent.contextMenu(container.querySelector('td[data-bst-rowid]') as HTMLElement)
    fireEvent.click(screen.getByText('Go'))
    expect(ran).toBe(true)
    expect(screen.queryByRole('menu')).toBeNull()
  })
})
