import { describe, test, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import * as React from 'react'
import { evalCondition, isConditionActive, filterFn_bstCondition, BstSetFilter } from '../index'

/* ------------------------------------------------------- the `set` operator */

describe('set filter — condition operator (AG4)', () => {
  test('a row passes when its value is in the selected set; blanks via ""', () => {
    expect(evalCondition('a', { op: 'set', value: ['a', 'b'] })).toBe(true)
    expect(evalCondition('c', { op: 'set', value: ['a', 'b'] })).toBe(false)
    expect(evalCondition(null, { op: 'set', value: [''] })).toBe(true) // (Blanks) selected
    expect(evalCondition('', { op: 'set', value: ['a'] })).toBe(false) // blank not selected
    expect(evalCondition(30, { op: 'set', value: ['30'] })).toBe(true) // numbers stringified
    expect(evalCondition(true, { op: 'set', value: ['true'] })).toBe(true) // booleans stringified
  })

  test('multi-value cells pass when ANY element is selected', () => {
    expect(evalCondition(['x', 'y'], { op: 'set', value: ['y'] })).toBe(true)
    expect(evalCondition(['x', 'y'], { op: 'set', value: ['z'] })).toBe(false)
    expect(evalCondition([], { op: 'set', value: [''] })).toBe(true) // empty array = blank
  })

  test('an empty selection matches nothing but is still an active filter', () => {
    expect(evalCondition('a', { op: 'set', value: [] })).toBe(false)
    expect(isConditionActive({ op: 'set', value: [] })).toBe(true)
    expect(isConditionActive({ op: 'set', value: ['a'] })).toBe(true)
    expect(isConditionActive({ op: 'set', value: undefined })).toBe(false)
  })

  test('filterFn_bstCondition applies the set to a row', () => {
    const row = { getValue: () => 'ship' }
    expect(filterFn_bstCondition(row, 'status', { op: 'set', value: ['ship', 'hold'] })).toBe(true)
    expect(filterFn_bstCondition(row, 'status', { op: 'set', value: ['hold'] })).toBe(false)
  })
})

/* ------------------------------------------------------- the popover component */

function mockColumn(initial?: unknown) {
  let fv: unknown = initial
  return {
    id: 'status',
    columnDef: {
      header: 'Status',
      meta: {
        type: 'singleSelect',
        options: [
          { value: 'a', label: 'Alpha' },
          { value: 'b', label: 'Bravo' },
        ],
      },
    },
    getFilterValue: () => fv,
    setFilterValue: (v: unknown) => {
      fv = v
    },
    get filterValue() {
      return fv
    },
  }
}
const mockTable = (vals: unknown[]) => ({
  getCoreRowModel: () => ({ rows: vals.map((v) => ({ getValue: () => v })) }),
})

describe('BstSetFilter component (AG4)', () => {
  test('renders "All" and opens a checklist of distinct values + (Blanks)', () => {
    const column = mockColumn()
    render(<BstSetFilter column={column} table={mockTable(['a', 'b', 'a', null])} />)
    const trigger = screen.getByRole('button', { name: /filter status/i })
    expect(trigger.textContent).toContain('All')
    fireEvent.click(trigger)
    expect(screen.getByText('Alpha')).toBeTruthy()
    expect(screen.getByText('Bravo')).toBeTruthy()
    expect(screen.getByText('(Blanks)')).toBeTruthy()
  })

  test('unchecking a value writes an all-but-one set condition', () => {
    const column = mockColumn()
    render(<BstSetFilter column={column} table={mockTable(['a', 'b', null])} />)
    fireEvent.click(screen.getByRole('button', { name: /filter status/i }))
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0]) // uncheck Alpha
    expect(column.filterValue).toEqual({ op: 'set', value: ['b', ''] })
  })

  test('Clear selects nothing; Select all clears the filter', () => {
    const column = mockColumn({ op: 'set', value: ['a'] })
    render(<BstSetFilter column={column} table={mockTable(['a', 'b'])} />)
    fireEvent.click(screen.getByRole('button', { name: /filter status/i }))
    fireEvent.click(screen.getByText('Clear'))
    expect(column.filterValue).toEqual({ op: 'set', value: [] })
    fireEvent.click(screen.getByText('Select all'))
    expect(column.filterValue).toBeUndefined()
  })
})
