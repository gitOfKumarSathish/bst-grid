import { describe, test, expect } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import * as React from 'react'
import {
  evalCondition,
  isConditionActive,
  filterFn_bstCondition,
  BstSetFilter,
  useBstTable,
  BstTable,
} from '../index'

/* ------------------------------------------------------- the `set` operator */

describe('set filter — condition operator (X4)', () => {
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

describe('BstSetFilter component (X4)', () => {
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

/* ------------------------------------- faceting: the list narrows (real table) */

// The mocks above have no `getFacetedRowModel`, so they cover the core-rows
// fallback. These drive a real table to prove the faceted path: the checklist
// reflects rows passing every OTHER column's filter, not the whole dataset.

type FacetRow = { id: string; dept: string; plan: string }
const facetSeed: FacetRow[] = [
  { id: '1', dept: 'Eng', plan: 'Pro' },
  { id: '2', dept: 'Eng', plan: 'Free' },
  { id: '3', dept: 'Sales', plan: 'Enterprise' },
]

function FacetGrid({ deptFilter }: { deptFilter?: string }) {
  const columns = React.useMemo(
    () => [
      { id: 'dept', accessorKey: 'dept', header: 'Dept', meta: { type: 'text' as const, filter: 'set' as const } },
      { id: 'plan', accessorKey: 'plan', header: 'Plan', meta: { type: 'text' as const, filter: 'set' as const } },
    ],
    [],
  )
  const table = useBstTable<FacetRow>({
    data: facetSeed,
    columns: columns as any,
    getRowId: (r) => r.id,
    enableColumnFilters: true,
    enableColumnFilterRow: true,
    enableSetFilter: true,
    initialState: deptFilter
      ? { columnFilters: [{ id: 'dept', value: { op: 'set', value: [deptFilter] } }] }
      : undefined,
  })
  return <BstTable table={table} />
}

describe('set filter — faceted options (X4)', () => {
  /** Open one column's checklist and return the values it offers. The same text
   *  also renders in the table body, so assertions must be scoped to the panel. */
  const openOptions = (colLabel: RegExp, valuesLabel: RegExp) => {
    fireEvent.click(screen.getByRole('button', { name: colLabel }))
    const panel = screen.getByRole('listbox', { name: valuesLabel })
    return (
      within(panel)
        .getAllByRole('checkbox')
        // Each row renders "<label><count>", e.g. "Eng2" — drop the trailing
        // count so the assertions read as plain values.
        .map((cb) =>
          (cb.closest('label') ?? cb.parentElement)?.textContent?.trim().replace(/\d+$/, ''),
        )
    )
  }

  test('with no other filter, every distinct value is offered', () => {
    render(<FacetGrid />)
    const opts = openOptions(/filter plan/i, /plan values/i)
    expect(opts).toEqual(expect.arrayContaining(['Enterprise', 'Free', 'Pro']))
  })

  test('filtering another column narrows this column’s options', () => {
    // dept=Eng leaves rows 1 and 2, so Enterprise (Sales-only) drops out.
    render(<FacetGrid deptFilter="Eng" />)
    const opts = openOptions(/filter plan/i, /plan values/i)
    expect(opts).toEqual(expect.arrayContaining(['Free', 'Pro']))
    expect(opts).not.toContain('Enterprise')
  })

  test('a column’s own selection does not shrink its own list', () => {
    // Otherwise ticking one value would hide the rest and you could never widen
    // the selection again.
    render(<FacetGrid />)
    const trigger = screen.getByRole('button', { name: /filter dept/i })
    fireEvent.click(trigger)
    const panel = screen.getByRole('listbox', { name: /dept values/i })
    fireEvent.click(within(panel).getAllByRole('checkbox')[0]) // untick one dept
    fireEvent.click(trigger) // close
    const opts = openOptions(/filter dept/i, /dept values/i) // reopen
    expect(opts).toEqual(expect.arrayContaining(['Eng', 'Sales']))
  })
})
