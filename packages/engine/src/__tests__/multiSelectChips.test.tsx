import { describe, test, expect, beforeAll } from 'vitest'
import { render, act } from '@testing-library/react'
import * as React from 'react'
import { useBstTable, BstTable } from '../index'
import type { BstTableColumn } from '../index'

/**
 * Width-aware multi-select chips (B7 `cellMeta.fitChips`). jsdom has no layout /
 * ResizeObserver, so — like responsive.test.tsx — we capture the RO callback and
 * stub the widths: the visible row's `clientWidth` and the ghost chips'/badge
 * `offsetWidth`. Driving the callback then exercises the real fit arithmetic.
 */
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

type Row = { id: string; skills: string[] }
const options = [
  { value: 'react', label: 'React' },
  { value: 'ts', label: 'TypeScript' },
  { value: 'node', label: 'Node' },
  { value: 'css', label: 'CSS' },
  { value: 'sql', label: 'SQL' },
]
const seed: Row[] = [{ id: '1', skills: ['react', 'ts', 'node', 'css', 'sql'] }]

const stub = (el: Element, prop: 'clientWidth' | 'offsetWidth', v: number) =>
  Object.defineProperty(el, prop, { configurable: true, value: v })

const box = () => document.querySelector('.bst-cell-chips-fit') as HTMLElement
const visibleChips = () =>
  document.querySelectorAll('.bst-cell-chips-fit > .bst-chip:not(.bst-chip-more)')
const moreBadge = () =>
  document.querySelector('.bst-cell-chips-fit > .bst-chip-more') as HTMLElement | null

/** Stub the ghost measurement row: N chips @ chipW, the sample badge @ moreW. */
function measure(chipW: number, moreW: number) {
  document
    .querySelectorAll('.bst-cell-chips-measure .bst-chip:not(.bst-chip-more)')
    .forEach((el) => stub(el, 'offsetWidth', chipW))
  const more = document.querySelector('.bst-cell-chips-measure .bst-chip-more')
  if (more) stub(more, 'offsetWidth', moreW)
}

function Grid({ maxChips }: { maxChips?: number }) {
  const columns: BstTableColumn<Row>[] = [
    {
      id: 'skills', accessorKey: 'skills', header: 'Skills',
      meta: { type: 'multiSelect', options, cellMeta: { fitChips: true, maxChips } },
    },
  ]
  const t = useBstTable<Row>({ data: seed, columns, getRowId: (r) => r.id })
  return <BstTable table={t} />
}

describe('multiSelect width-aware chips (B7 fitChips)', () => {
  test('fits chips to the cell width, folding the rest into +N more', () => {
    render(<Grid />)
    measure(50, 45) // 5 chips @ 50px, badge @ 45px, gap 4

    // Wide (400px): all five fit → no badge.
    stub(box(), 'clientWidth', 400)
    act(() => roCb?.())
    expect(visibleChips().length).toBe(5)
    expect(moreBadge()).toBeNull()

    // Medium (160px): 50 + 54 = 104 within 160−45−4=111 → 2 chips + "+3 more".
    stub(box(), 'clientWidth', 160)
    act(() => roCb?.())
    expect(visibleChips().length).toBe(2)
    expect(moreBadge()?.textContent).toBe('+3 more')

    // Narrow (60px): even one chip + badge won't fit, but keep ≥1 → 1 chip + "+4 more".
    stub(box(), 'clientWidth', 60)
    act(() => roCb?.())
    expect(visibleChips().length).toBe(1)
    expect(moreBadge()?.textContent).toBe('+4 more')

    // Widen again (400px): folds back open to all five (no stale collapse).
    stub(box(), 'clientWidth', 400)
    act(() => roCb?.())
    expect(visibleChips().length).toBe(5)
    expect(moreBadge()).toBeNull()
  })

  test('maxChips caps the fitted count even when more would fit', () => {
    render(<Grid maxChips={3} />)
    measure(50, 45)
    stub(box(), 'clientWidth', 400) // all five would fit on width…
    act(() => roCb?.())
    expect(visibleChips().length).toBe(3) // …but the cap holds at 3
    expect(moreBadge()?.textContent).toBe('+2 more')
  })
})
