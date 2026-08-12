import { describe, test, expect } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import * as React from 'react'
import { useBstTable, BstTable } from '../index'
import type { BstTableColumn } from '../index'

type Person = { id: string; name: string; age: number }

const data: Person[] = [
  { id: '1', name: 'Charlie', age: 30 },
  { id: '2', name: 'Alice', age: 25 },
  { id: '3', name: 'Bob', age: 40 },
]

const columns: BstTableColumn<Person>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name', sortFn: 'basic' },
  { id: 'age', accessorKey: 'age', header: 'Age', sortFn: 'basic' },
]

function Grid() {
  const table = useBstTable<Person>({ data, columns, getRowId: (r) => r.id })
  return (
    <div className="bst-table-root">
      <BstTable table={table} />
    </div>
  )
}

const names = () =>
  screen
    .getAllByRole('row')
    .slice(1) // drop header row
    .map((r) => within(r).getAllByRole('cell')[0]?.textContent)

describe('@bloomskill/table-engine (TanStack v9)', () => {
  test('renders all rows in source order', () => {
    render(<Grid />)
    expect(names()).toEqual(['Charlie', 'Alice', 'Bob'])
  })

  test('OOTB sorting toggles on header click (asc → desc)', () => {
    render(<Grid />)
    const nameHeader = screen.getByText('Name')
    fireEvent.click(nameHeader)
    expect(names()).toEqual(['Alice', 'Bob', 'Charlie']) // asc
    fireEvent.click(nameHeader)
    expect(names()).toEqual(['Charlie', 'Bob', 'Alice']) // desc
  })
})
