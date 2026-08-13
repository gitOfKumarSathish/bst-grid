import { describe, test, expect } from 'vitest'
import { waitFor, act, renderHook } from '@testing-library/react'
import { createClientDataSource, useBstInfiniteDataSource } from '../index'

type Row = { id: string; name: string; tag: string }
const seed: Row[] = Array.from({ length: 25 }, (_, i) => ({
  id: String(i),
  name: `Row ${i}`,
  tag: i % 2 === 0 ? 'even' : 'odd', // 13 even (0,2,…,24), 12 odd
}))
const src = createClientDataSource(seed)

describe('useBstInfiniteDataSource (A2 — fetch-on-scroll append)', () => {
  test('loads the first window and reports the full total', async () => {
    const { result } = renderHook(() => useBstInfiniteDataSource(src, { pageSize: 10, debounceMs: 0 }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.rows).toHaveLength(10)
    expect(result.current.totalCount).toBe(25)
    expect(result.current.hasNextPage).toBe(true)
    expect(result.current.rows.map((r) => r.id).slice(0, 3)).toEqual(['0', '1', '2'])
  })

  test('fetchNextPage APPENDS (does not replace) and stops at the end', async () => {
    const { result } = renderHook(() => useBstInfiniteDataSource(src, { pageSize: 10, debounceMs: 0 }))
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.fetchNextPage())
    await waitFor(() => expect(result.current.rows).toHaveLength(20))
    expect(result.current.rows.map((r) => r.id)).toEqual(
      Array.from({ length: 20 }, (_, i) => String(i)),
    )
    expect(result.current.hasNextPage).toBe(true)

    act(() => result.current.fetchNextPage())
    await waitFor(() => expect(result.current.rows).toHaveLength(25))
    expect(result.current.hasNextPage).toBe(false)

    // At the end — a further call is a no-op (no over-fetch past totalCount).
    act(() => result.current.fetchNextPage())
    await new Promise((r) => setTimeout(r, 0))
    expect(result.current.rows).toHaveLength(25)
  })

  test('onReachEnd is an alias of fetchNextPage', async () => {
    const { result } = renderHook(() => useBstInfiniteDataSource(src, { pageSize: 10, debounceMs: 0 }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => result.current.onReachEnd())
    await waitFor(() => expect(result.current.rows).toHaveLength(20))
  })

  test('changing the query RESETS the accumulation to the first window', async () => {
    const { result } = renderHook(() => useBstInfiniteDataSource(src, { pageSize: 10, debounceMs: 0 }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => result.current.fetchNextPage())
    await waitFor(() => expect(result.current.rows).toHaveLength(20))

    // Quick-filter to the 13 "even" rows — accumulation resets to one window.
    act(() => result.current.tableProps.onGlobalFilterChange('even'))
    await waitFor(() => expect(result.current.totalCount).toBe(13))
    expect(result.current.rows).toHaveLength(10)
    expect(result.current.rows.every((r) => r.tag === 'even')).toBe(true)
    expect(result.current.hasNextPage).toBe(true)
  })

  test('tableProps put the grid in manual (append) mode', async () => {
    const { result } = renderHook(() => useBstInfiniteDataSource(src, { pageSize: 10, debounceMs: 0 }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    const tp = result.current.tableProps
    expect(tp.manualSorting).toBe(true)
    expect(tp.manualFiltering).toBe(true)
    expect(tp.manualPagination).toBe(true)
    expect(tp.rowCount).toBe(25)
    // One "page" holds everything loaded → the grid renders `data` as-is.
    expect(tp.state.pagination.pageSize).toBe(result.current.rows.length)
  })
})
