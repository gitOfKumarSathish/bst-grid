import { describe, test, expect } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import * as React from 'react'
import { useBstTable, BstTable } from '../index'
import type { BstTableColumn } from '../index'

type Person = { id: string; name: string }

const seed: Person[] = [
  { id: '1', name: 'Charlie' },
  { id: '2', name: 'Alice' },
]

const columns: BstTableColumn<Person>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name', meta: { type: 'text', editable: true } },
  {
    id: 'actions',
    header: '',
    meta: { type: 'actionMenu', actions: { edit: true, delete: true, duplicate: true } },
  },
]

function Grid() {
  const [data, setData] = React.useState<Person[]>(seed)
  const table = useBstTable<Person>({
    data,
    columns,
    getRowId: (r) => r.id,
    enableEditing: { mode: 'row' },
    enableRowActions: true,
    onDataChange: setData,
  })
  return (
    <div className="bst-table-root">
      <BstTable table={table} />
      <pre data-testid="data">{JSON.stringify(data)}</pre>
    </div>
  )
}

const dataJson = () => JSON.parse(screen.getByTestId('data').textContent || '[]') as Person[]
const kebabs = () => screen.getAllByRole('button', { name: 'Row actions' })

describe('actionMenu cell — row ⋯ overflow menu', () => {
  test('renders one kebab button per row; menu closed until clicked', () => {
    render(<Grid />)
    expect(kebabs()).toHaveLength(2)
    expect(screen.queryByRole('menu')).toBeNull()
  })

  test('opens a menu listing the configured row actions', () => {
    render(<Grid />)
    fireEvent.click(kebabs()[0])
    const menu = screen.getByRole('menu')
    expect(within(menu).getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument()
    expect(within(menu).getByRole('menuitem', { name: 'Duplicate' })).toBeInTheDocument()
    expect(within(menu).getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument()
  })

  test('Delete removes the row (by rowId)', () => {
    render(<Grid />)
    expect(dataJson()).toHaveLength(2)
    fireEvent.click(kebabs()[0])
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }))
    const d = dataJson()
    expect(d).toHaveLength(1)
    expect(d[0].id).toBe('2')
    // menu closes after choosing an action
    expect(screen.queryByRole('menu')).toBeNull()
  })

  test('Duplicate appends a temp-id row', () => {
    render(<Grid />)
    fireEvent.click(kebabs()[0])
    fireEvent.click(screen.getByRole('menuitem', { name: 'Duplicate' }))
    const d = dataJson()
    expect(d).toHaveLength(3)
    expect(d.some((r) => r.id.startsWith('tmp_'))).toBe(true)
  })

  test('Edit puts the row in a session — menu then offers Save / Cancel', () => {
    render(<Grid />)
    fireEvent.click(kebabs()[0])
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' }))
    fireEvent.click(kebabs()[0]) // reopen
    const menu = screen.getByRole('menu')
    expect(within(menu).getByRole('menuitem', { name: 'Save' })).toBeInTheDocument()
    expect(within(menu).getByRole('menuitem', { name: 'Cancel' })).toBeInTheDocument()
    expect(within(menu).queryByRole('menuitem', { name: 'Edit' })).toBeNull()
  })

  test('Escape closes the menu', () => {
    render(<Grid />)
    fireEvent.click(kebabs()[0])
    expect(screen.getByRole('menu')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('menu')).toBeNull()
  })
})
