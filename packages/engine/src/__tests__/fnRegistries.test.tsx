import { describe, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import * as React from 'react'
import { useBstTable, BstTable } from '../index'
import type { BstTableColumn, UseBstTableOptions } from '../index'
import { bstTableFeatures } from '../features'

// The sortFn / aggregationFn registries in features.ts decide which names a
// column may use. A name that is not registered silently falls back, so these
// assert the wiring end-to-end (registered AND producing the right numbers),
// not merely that the key exists.

type Row = { id: string; dept: string; name: string; salary: number }

// Salary is deliberately skewed: one outlier drags `mean` far from `median`.
const seed: Row[] = [
  { id: '1', dept: 'Eng', name: 'ada', salary: 100 },
  { id: '2', dept: 'Eng', name: 'Bo', salary: 200 },
  { id: '3', dept: 'Eng', name: 'Cy', salary: 9000 },
]

function Grid({ aggregationFn, ...props }: { aggregationFn: string } & Partial<UseBstTableOptions<Row>>) {
  const columns: BstTableColumn<Row>[] = React.useMemo(
    () => [
      { id: 'dept', accessorKey: 'dept', header: 'Dept', meta: { type: 'text' } },
      { id: 'name', accessorKey: 'name', header: 'Name', meta: { type: 'text' } },
      { id: 'salary', accessorKey: 'salary', header: 'Salary', aggregationFn, meta: { type: 'number' } },
    ],
    [aggregationFn],
  )
  const table = useBstTable<Row>({
    data: seed,
    columns,
    getRowId: (r) => r.id,
    enableGrouping: true,
    initialState: { grouping: ['dept'] },
    ...props,
  })
  return <BstTable table={table} />
}

describe('sortFn registry', () => {
  test('registers the case-sensitive variants alongside the folding ones', () => {
    const keys = Object.keys(bstTableFeatures.sortFns ?? {})
    expect(keys).toEqual(
      expect.arrayContaining([
        'basic',
        'alphanumeric',
        'datetime',
        'text',
        'alphanumericCaseSensitive',
        'textCaseSensitive',
      ]),
    )
  })

  test('textCaseSensitive orders uppercase before lowercase (text does not)', () => {
    const folding = bstTableFeatures.sortFns?.text
    const sensitive = bstTableFeatures.sortFns?.textCaseSensitive
    expect(folding).toBeTypeOf('function')
    expect(sensitive).toBeTypeOf('function')

    // Compare the raw comparators: the folding fn treats "Bo"/"ada" as
    // "bo"/"ada" so "ada" wins; the sensitive one puts "Bo" first on codepoint.
    const cmp = (fn: any, a: string, b: string) =>
      fn({ getValue: () => a }, { getValue: () => b }, 'name')
    expect(cmp(folding, 'ada', 'Bo')).toBeLessThan(0)
    expect(cmp(sensitive, 'ada', 'Bo')).toBeGreaterThan(0)
  })
})

describe('aggregationFn registry', () => {
  test('registers median / first / last / unique alongside the originals', () => {
    const keys = Object.keys(bstTableFeatures.aggregationFns ?? {})
    expect(keys).toEqual(
      expect.arrayContaining([
        'sum',
        'count',
        'mean',
        'median',
        'min',
        'max',
        'extent',
        'first',
        'last',
        'unique',
        'uniqueCount',
      ]),
    )
  })

  // Salary is the last column, so its aggregate is the group row's last cell.
  // (`data-bst-colid` is only emitted when notes / the context menu are on.)
  const salaryAggregate = () => {
    const groupRow = screen.getByText('Eng').closest('tr') as HTMLElement
    const cells = [...groupRow.querySelectorAll('td')]
    return cells[cells.length - 1]?.textContent?.trim()
  }

  test('median resists the outlier that skews mean', () => {
    // median(100, 200, 9000) = 200, while mean = 3,100.
    const { unmount } = render(<Grid aggregationFn="median" />)
    expect(salaryAggregate()).toBe('200')
    unmount()

    render(<Grid aggregationFn="mean" />)
    expect(salaryAggregate()).toBe('3,100')
  })

  test('first and last surface a single row value rather than a computed one', () => {
    const { unmount } = render(<Grid aggregationFn="first" />)
    expect(salaryAggregate()).toBe('100')
    unmount()

    render(<Grid aggregationFn="last" />)
    expect(salaryAggregate()).toBe('9,000')
  })
})
