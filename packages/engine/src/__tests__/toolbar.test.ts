import { describe, test, expect } from 'vitest'
import { partitionToolbar } from '../toolbar'

// Higher priority = kept inline longer. Filters (2) more important than Export (1).
const items = [
  { id: 'filters', priority: 2, width: 100 },
  { id: 'export', priority: 1, width: 80 },
]

describe('partitionToolbar (pure)', () => {
  test('everything fits → all inline, nothing overflows (no ⋯ reserved)', () => {
    const { inline, overflow } = partitionToolbar(items, 200, 36)
    expect(inline).toEqual(['filters', 'export'])
    expect(overflow).toEqual([])
  })

  test('tight width → lowest-priority overflows first, ⋯ reserved', () => {
    // total 180 > 150, so overflow; budget = 150 - 36 = 114 → only filters (100) fits
    const { inline, overflow } = partitionToolbar(items, 150, 36)
    expect(inline).toEqual(['filters'])
    expect(overflow).toEqual(['export'])
  })

  test('very tight → everything overflows', () => {
    const { inline, overflow } = partitionToolbar(items, 60, 36)
    expect(inline).toEqual([])
    expect(overflow).toEqual(['filters', 'export'])
  })

  test('preserves the original order in each bucket (not the priority sort)', () => {
    const three = [
      { id: 'a', priority: 1, width: 50 },
      { id: 'b', priority: 3, width: 50 },
      { id: 'c', priority: 2, width: 50 },
    ]
    // total 150 > 120; budget 120-36=84 → keep by importance b(3),c(2) = 100? no, 50+50=100>84
    // b(50) fits (used 50), c(50) → 100 > 84 → stop. keep only b. inline keeps source order.
    const { inline, overflow } = partitionToolbar(three, 120, 36)
    expect(inline).toEqual(['b'])
    expect(overflow).toEqual(['a', 'c'])
  })
})
