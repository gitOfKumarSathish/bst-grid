import { describe, test, expect } from 'vitest'
import { waitFor, act, renderHook } from '@testing-library/react'
import {
  createClientDataSource,
  createServerDataSource,
  useBstDataSource,
  isConditionActive,
} from '../index'
import type { DataSourceQuery } from '../index'

type Row = { id: string; name: string; age: number }
const seed: Row[] = [
  { id: '1', name: 'Charlie', age: 30 },
  { id: '2', name: 'Alice', age: 25 },
  { id: '3', name: 'Bob', age: 40 },
  { id: '4', name: 'Dave', age: 22 },
  { id: '5', name: 'Eve', age: 35 },
]

/** A DataSource that records every query it's asked for. */
function recording(total = seed.length) {
  const queries: DataSourceQuery[] = []
  const src = createServerDataSource<Row>(async (q) => {
    queries.push(q)
    return { rows: seed.slice(q.offset, q.offset + q.limit), totalCount: total }
  })
  return { src, queries }
}

describe('isConditionActive (shared filter guard)', () => {
  test('a half-built condition is inactive; a real one is active', () => {
    expect(isConditionActive({ op: 'contains', value: '' })).toBe(false)
    expect(isConditionActive({ op: 'contains', value: 'x' })).toBe(true)
    expect(isConditionActive({ op: 'empty' })).toBe(true) // unary
    // between is inactive only when BOTH bounds are empty (mirrors evalCondition)
    expect(isConditionActive({ op: 'between', value: undefined, value2: undefined })).toBe(false)
    expect(isConditionActive({ op: 'between', value: 1, value2: undefined })).toBe(true)
    expect(isConditionActive({ op: 'between', value: 1, value2: 5 })).toBe(true)
    expect(isConditionActive('foo')).toBe(true) // bare value → contains
    expect(isConditionActive(null)).toBe(false)
  })
})

describe('useBstDataSource — hardening (review fixes)', () => {
  test('a debounced filter resets to page 0 and the fetch carries the filter (no stranded page)', async () => {
    const { src, queries } = recording()
    const { result } = renderHook(() => useBstDataSource(src, { pageSize: 2, debounceMs: 20 }))
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.tableProps.onPaginationChange({ pageIndex: 2, pageSize: 2 }))
    await waitFor(() => expect(result.current.tableProps.state.pagination.pageIndex).toBe(2))

    act(() =>
      result.current.tableProps.onColumnFiltersChange([
        { id: 'name', value: { op: 'contains', value: 'a' } },
      ]),
    )
    // once the debounce settles, the page is back at 0 AND the query has the filter
    await waitFor(() => expect(result.current.tableProps.state.pagination.pageIndex).toBe(0))
    const last = queries[queries.length - 1]
    expect(last.offset).toBe(0)
    expect(last.filters).toEqual([{ id: 'name', value: { op: 'contains', value: 'a' } }])
  })

  test('half-built (empty-value) filter conditions are stripped from the query', async () => {
    const { src, queries } = recording(0)
    const { result } = renderHook(() => useBstDataSource(src, { debounceMs: 0 }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() =>
      result.current.tableProps.onColumnFiltersChange([
        { id: 'name', value: { op: 'contains', value: '' } },
      ]),
    )
    await waitFor(() => expect(queries.length).toBeGreaterThan(1))
    expect(queries[queries.length - 1].filters).toEqual([]) // no no-op condition sent
  })

  test('an external pageSize change updates the pagination', async () => {
    const src = createClientDataSource(seed)
    const { result, rerender } = renderHook(
      ({ ps }) => useBstDataSource(src, { pageSize: ps, debounceMs: 0 }),
      { initialProps: { ps: 2 } },
    )
    await waitFor(() => expect(result.current.tableProps.state.pagination.pageSize).toBe(2))
    rerender({ ps: 4 })
    await waitFor(() => expect(result.current.tableProps.state.pagination.pageSize).toBe(4))
  })

  test('sourceKey change triggers a refetch of the new source', async () => {
    const a = recording(1)
    const b = recording(2)
    let which = a
    let key = 'a'
    const { result, rerender } = renderHook(() =>
      useBstDataSource(which.src, { debounceMs: 0, sourceKey: key }),
    )
    await waitFor(() => expect(result.current.totalCount).toBe(1))
    which = b
    key = 'b'
    rerender()
    await waitFor(() => expect(result.current.totalCount).toBe(2))
    expect(b.queries.length).toBeGreaterThan(0)
  })
})

describe('createClientDataSource — hardening', () => {
  test('quick filter is scoped to the given columns and reports unfilteredCount', async () => {
    const src = createClientDataSource(seed, { columns: ['name'] })
    // '25' only appears in age → not searched when scoped to name
    const p = await src.fetch({ sort: [], filters: [], quickFilter: '25', offset: 0, limit: 10 })
    expect(p.totalCount).toBe(0)
    expect(p.unfilteredCount).toBe(5)
    const p2 = await src.fetch({ sort: [], filters: [], quickFilter: 'ali', offset: 0, limit: 10 })
    expect(p2.totalCount).toBe(1)
    expect(p2.rows[0].name).toBe('Alice')
  })
})
