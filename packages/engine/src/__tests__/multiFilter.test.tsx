import { describe, test, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import * as React from 'react'
import {
  useBstTable,
  BstTable,
  evalCondition,
  isConditionActive,
  filterFn_bstCondition,
  combineFilterConditions,
} from '../index'
import type { BstTableColumn, FilterCondition } from '../index'

/**
 * Multi-filter (X11) — stack several filter types on one column via an array
 * `meta.filter` (e.g. `['condition', 'set']`). The column stores a compound
 * `{ op:'and', conditions }` value the `bstCondition` filterFn understands; the
 * filter row stacks the widgets, each bound to its own slot.
 */
const AND = (c: (FilterCondition | undefined)[]) => ({ op: 'and' as const, conditions: c })
const OR = (c: (FilterCondition | undefined)[]) => ({ op: 'or' as const, conditions: c })

describe('multi-filter — compound conditions (X11)', () => {
  test('AND: a cell must satisfy every active part', () => {
    const g = AND([{ op: 'contains', value: 'a' }, { op: 'set', value: ['admin', 'user'] }])
    expect(evalCondition('admin', g)).toBe(true) // has 'a' + in set
    expect(evalCondition('user', g)).toBe(false) // no 'a'
    expect(evalCondition('agent', g)).toBe(false) // has 'a' but not in the set
  })

  test('OR: a cell may satisfy any part', () => {
    const g = OR([{ op: 'contains', value: 'x' }, { op: 'set', value: ['user'] }])
    expect(evalCondition('user', g)).toBe(true) // in set
    expect(evalCondition('xray', g)).toBe(true) // has 'x'
    expect(evalCondition('admin', g)).toBe(false) // neither
  })

  test('inactive slots (undefined / empty) do not restrict', () => {
    const g = AND([undefined, { op: 'set', value: ['a'] }, { op: 'contains', value: '' }])
    expect(evalCondition('a', g)).toBe(true) // only the set part is active
    expect(evalCondition('b', g)).toBe(false)
    // no active slot → the group is inactive → matches everything
    expect(evalCondition('anything', AND([undefined, { op: 'contains', value: '' }]))).toBe(true)
  })

  test('isConditionActive: true iff any slot is active', () => {
    expect(isConditionActive(AND([undefined, { op: 'contains', value: '' }]))).toBe(false)
    expect(isConditionActive(AND([{ op: 'set', value: ['a'] }, undefined]))).toBe(true)
  })

  test('combineFilterConditions keeps positional slots; all-inactive → undefined', () => {
    expect(combineFilterConditions([undefined, { op: 'contains', value: '' }])).toBeUndefined()
    expect(combineFilterConditions([{ op: 'contains', value: 'a' }, undefined])).toEqual({
      op: 'and',
      conditions: [{ op: 'contains', value: 'a' }, undefined],
    })
    expect(combineFilterConditions([{ op: 'set', value: ['a'] }], 'or')?.op).toBe('or')
  })

  test('filterFn_bstCondition applies a group against a row value', () => {
    const row = { getValue: () => 'admin' } as any
    expect(
      filterFn_bstCondition(row, 'role', AND([{ op: 'contains', value: 'a' }, { op: 'set', value: ['admin'] }])),
    ).toBe(true)
    expect(
      filterFn_bstCondition(row, 'role', AND([{ op: 'contains', value: 'z' }, { op: 'set', value: ['admin'] }])),
    ).toBe(false)
  })
})

type Row = { id: string; name: string; role: string }
const seed: Row[] = [
  { id: '1', name: 'Ada', role: 'admin' },
  { id: '2', name: 'Bob', role: 'admin' },
  { id: '3', name: 'Cy', role: 'user' },
  { id: '4', name: 'Al', role: 'user' },
]
const columns: BstTableColumn<Row>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name', meta: { type: 'text' } },
  { id: 'role', accessorKey: 'role', header: 'Role', meta: { type: 'text', filter: ['condition', 'set'] } },
]

function renderGrid(props?: Record<string, unknown>) {
  function G() {
    const t = useBstTable<Row>({
      data: seed,
      columns,
      getRowId: (r) => r.id,
      enableColumnFilterRow: true,
      enableSetFilter: true,
      enableMultiFilter: true,
      ...props,
    })
    return (
      <div className="bst-table-root">
        <BstTable table={t} />
      </div>
    )
  }
  return render(<G />)
}

describe('multi-filter — stacked filter row (X11)', () => {
  test('an array meta.filter stacks the parts (condition + set)', () => {
    renderGrid()
    const multi = document.querySelector('.bst-multifilter')
    expect(multi).not.toBeNull()
    expect(multi!.querySelectorAll('.bst-multifilter-part').length).toBe(2)
    expect(multi!.querySelector('input.bst-colfilter')).not.toBeNull() // condition part
    expect(multi!.querySelector('.bst-setfilter-trigger')).not.toBeNull() // set part
  })

  test('the condition part filters rows', () => {
    renderGrid()
    const input = document.querySelector('.bst-multifilter input.bst-colfilter') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'admin' } }) // role contains "admin"
    expect(screen.getByText('Ada')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.queryByText('Cy')).toBeNull()
    expect(screen.queryByText('Al')).toBeNull()
  })

  test('both parts AND together', () => {
    renderGrid()
    // condition: role contains "a" → admin rows (Ada, Bob); user has no 'a'
    const input = document.querySelector('.bst-multifilter input.bst-colfilter') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'a' } })
    expect(screen.getByText('Ada')).toBeInTheDocument()
    expect(screen.queryByText('Cy')).toBeNull()
    // now open the set filter and clear it (select nothing) → AND with an empty
    // set matches nothing, so the grid empties even though the condition matched.
    fireEvent.click(document.querySelector('.bst-multifilter .bst-setfilter-trigger') as Element)
    fireEvent.click(screen.getByText('Clear'))
    expect(screen.queryByText('Ada')).toBeNull()
    expect(screen.queryByText('Bob')).toBeNull()
  })

  test('multi off → the array collapses to the first part (condition only)', () => {
    renderGrid({ enableMultiFilter: false })
    expect(document.querySelector('.bst-multifilter')).toBeNull()
    // role shows a single condition input, not a set-filter trigger
    const roleCells = document.querySelectorAll('.bst-colfilter-th')
    expect(document.querySelector('.bst-setfilter-trigger')).toBeNull()
    expect(roleCells.length).toBeGreaterThan(0)
  })
})
