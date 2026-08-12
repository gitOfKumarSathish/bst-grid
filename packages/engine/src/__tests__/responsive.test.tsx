import { describe, test, expect, beforeAll } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import * as React from 'react'
import { useBstTable, BstTable } from '../index'
import type { BstTableColumn, UseBstTableOptions } from '../index'

// jsdom has no ResizeObserver / layout — capture the callback so we can drive it,
// and stub the scroll box's width per assertion.
let roCb: (() => void) | null = null
beforeAll(() => {
  class RO {
    constructor(cb: () => void) {
      roCb = cb
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  ;(globalThis as any).ResizeObserver = RO
})

const setWidth = (el: HTMLElement, w: number) =>
  Object.defineProperty(el, 'clientWidth', { configurable: true, value: w })

type Row = { id: string; name: string; city: string; notes: string }
const seed: Row[] = [{ id: '1', name: 'Ada', city: 'London', notes: 'hi' }]
const columns: BstTableColumn<Row>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name', size: 150, meta: { type: 'text', responsivePriority: 3 } },
  { id: 'city', accessorKey: 'city', header: 'City', size: 150, meta: { type: 'text', responsivePriority: 1 } },
  { id: 'notes', accessorKey: 'notes', header: 'Notes', size: 150, meta: { type: 'text', responsivePriority: 0 } },
]

function Grid(props: Partial<UseBstTableOptions<Row>>) {
  const t = useBstTable<Row>({ data: seed, columns, getRowId: (r) => r.id, ...props })
  return <BstTable table={t} />
}

describe('responsive column hiding (G4)', () => {
  test('hides lowest-priority columns when narrow, restores when wide', () => {
    render(<Grid enableResponsive />)
    const scroll = document.querySelector('.bst-table-scroll') as HTMLElement

    // ~160px fits only the highest-priority column (Name, prio 3)
    setWidth(scroll, 160)
    act(() => roCb?.())
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.queryByText('City')).toBeNull()
    expect(screen.queryByText('Notes')).toBeNull()

    // widen — everything fits again
    setWidth(scroll, 900)
    act(() => roCb?.())
    expect(screen.getByText('City')).toBeInTheDocument()
    expect(screen.getByText('Notes')).toBeInTheDocument()
  })

  test('off by default — nothing hidden', () => {
    render(<Grid />)
    expect(screen.getByText('Notes')).toBeInTheDocument()
  })
})
