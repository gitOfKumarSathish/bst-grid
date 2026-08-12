import { describe, test, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import * as React from 'react'
import { useBstTable, BstTable, BstFilterBuilder, evalCondition } from '../index'
import type { BstTableColumn } from '../index'

type Row = { id: string; name: string; age: number; role: string }

const seed: Row[] = [
  { id: '1', name: 'Ada', age: 36, role: 'admin' },
  { id: '2', name: 'Linus', age: 54, role: 'user' },
  { id: '3', name: 'Grace', age: 79, role: 'admin' },
]

const columns: BstTableColumn<Row>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name', meta: { type: 'text' } },
  { id: 'age', accessorKey: 'age', header: 'Age', meta: { type: 'number' } },
  {
    id: 'role',
    accessorKey: 'role',
    header: 'Role',
    meta: {
      type: 'singleSelect',
      options: [
        { value: 'admin', label: 'Admin' },
        { value: 'user', label: 'User' },
      ],
    },
  },
]

function Grid() {
  const table = useBstTable<Row>({ data: seed, columns, getRowId: (r) => r.id })
  return (
    <div className="bst-table-root">
      <BstFilterBuilder table={table} />
      <BstTable table={table} />
    </div>
  )
}

const bodyRowCount = () => document.querySelectorAll('tr.bst-table-tr').length

describe('evalCondition (E3 operators)', () => {
  test('text / number / unary / boolean operators', () => {
    expect(evalCondition('Hello', { op: 'contains', value: 'ell' })).toBe(true)
    expect(evalCondition('Hello', { op: 'equals', value: 'hello' })).toBe(true) // case-insensitive
    expect(evalCondition('Hello', { op: 'startsWith', value: 'He' })).toBe(true)
    expect(evalCondition(5, { op: 'gt', value: '3' })).toBe(true)
    expect(evalCondition(5, { op: 'lt', value: '3' })).toBe(false)
    expect(evalCondition(5, { op: 'between', value: '1', value2: '10' })).toBe(true)
    expect(evalCondition('', { op: 'empty' })).toBe(true)
    expect(evalCondition('x', { op: 'notEmpty' })).toBe(true)
    expect(evalCondition(true, { op: 'isTrue' })).toBe(true)
    // an empty value (non-unary) is inactive → matches everything
    expect(evalCondition('anything', { op: 'contains', value: '' })).toBe(true)
  })
})

describe('BstFilterBuilder (E3)', () => {
  test('adding a text filter narrows the rows', () => {
    render(<Grid />)
    expect(bodyRowCount()).toBe(3)
    fireEvent.click(screen.getByRole('button', { name: '+ Add filter' }))
    fireEvent.change(screen.getByLabelText('Filter value'), { target: { value: 'Ada' } })
    expect(bodyRowCount()).toBe(1)
  })

  test('switching to a number column + operator (>) filters numerically', () => {
    render(<Grid />)
    fireEvent.click(screen.getByRole('button', { name: '+ Add filter' }))
    fireEvent.change(screen.getByLabelText('Filter column'), { target: { value: 'age' } })
    fireEvent.change(screen.getByLabelText('Filter operator'), { target: { value: 'gt' } })
    fireEvent.change(screen.getByLabelText('Filter value'), { target: { value: '40' } })
    expect(bodyRowCount()).toBe(2) // 54, 79
  })

  test('select column filters by option value', () => {
    render(<Grid />)
    fireEvent.click(screen.getByRole('button', { name: '+ Add filter' }))
    fireEvent.change(screen.getByLabelText('Filter column'), { target: { value: 'role' } })
    // operator defaults to "is" (equals); value select offers the options
    fireEvent.change(screen.getByLabelText('Filter value'), { target: { value: 'admin' } })
    expect(bodyRowCount()).toBe(2) // Ada, Grace
  })

  test('Clear all removes every filter', () => {
    render(<Grid />)
    fireEvent.click(screen.getByRole('button', { name: '+ Add filter' }))
    fireEvent.change(screen.getByLabelText('Filter value'), { target: { value: 'Ada' } })
    expect(bodyRowCount()).toBe(1)
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }))
    expect(bodyRowCount()).toBe(3)
  })
})

function ColFilterRowGrid() {
  const table = useBstTable<Row>({
    data: seed,
    columns,
    getRowId: (r) => r.id,
    enableColumnFilterRow: true,
  })
  return (
    <div className="bst-table-root">
      <BstTable table={table} />
    </div>
  )
}

describe('per-column filter row ("dual filter", Phase 3)', () => {
  test('text column input filters (contains); select column filters (equals)', () => {
    render(<ColFilterRowGrid />)
    expect(bodyRowCount()).toBe(3)
    // a text input per filterable column
    fireEvent.change(screen.getByLabelText('Filter Name'), { target: { value: 'Ada' } })
    expect(bodyRowCount()).toBe(1)
    // clearing it restores all rows
    fireEvent.change(screen.getByLabelText('Filter Name'), { target: { value: '' } })
    expect(bodyRowCount()).toBe(3)
    // the select column is a dropdown of options
    fireEvent.change(screen.getByLabelText('Filter Role'), { target: { value: 'admin' } })
    expect(bodyRowCount()).toBe(2)
  })
})
