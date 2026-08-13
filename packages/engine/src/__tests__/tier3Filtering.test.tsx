// Regression tests for the Tier-3 filtering fixes (AUDIT_FIXES.md):
//   #6 — empty cells must not coerce to 0 and match before/</<= or zero ranges
//   #7 — date equals/between compare by local calendar day, not string identity
//   #8 — a half-filled `between` is inactive (matches all), never empties the grid
import { describe, test, expect } from 'vitest'
import { evalCondition, isConditionActive } from '../index'

// Cells built from a LOCAL wall-clock time, so `.toISOString()` + local-day
// comparison is timezone-independent in the test runner.
const isoLocal = (y: number, m: number, d: number, h = 12, min = 0) =>
  new Date(y, m - 1, d, h, min).toISOString()

describe('#6 empty cells never match ordered comparisons', () => {
  test('null / empty / whitespace cells do not match <, <=, or a zero-spanning range', () => {
    for (const empty of [null, undefined, '', '   ', []]) {
      expect(evalCondition(empty, { op: 'lt', value: '5' })).toBe(false)
      expect(evalCondition(empty, { op: 'lte', value: '0' })).toBe(false)
      expect(evalCondition(empty, { op: 'gt', value: '-5' })).toBe(false)
      expect(evalCondition(empty, { op: 'between', value: '-10', value2: '10' })).toBe(false)
    }
  })

  test('a real zero still compares as zero (not treated as empty)', () => {
    expect(evalCondition(0, { op: 'lte', value: '0' })).toBe(true)
    expect(evalCondition(0, { op: 'gte', value: '0' })).toBe(true)
    expect(evalCondition(0, { op: 'lt', value: '0' })).toBe(false)
  })

  test('the empty operators still work', () => {
    expect(evalCondition(null, { op: 'empty' })).toBe(true)
    expect(evalCondition(5, { op: 'empty' })).toBe(false)
  })
})

describe('#7 date equals / between match by local calendar day', () => {
  test('"on <day>" matches any time on that day of a datetime cell', () => {
    const cell = isoLocal(2026, 3, 15, 14, 30)
    expect(evalCondition(cell, { op: 'equals', value: '2026-03-15' })).toBe(true)
    expect(evalCondition(cell, { op: 'equals', value: '2026-03-16' })).toBe(false)
  })

  test('midnight and late-evening timestamps both count as "on" that day', () => {
    expect(evalCondition(isoLocal(2026, 3, 15, 0, 0), { op: 'equals', value: '2026-03-15' })).toBe(
      true,
    )
    expect(evalCondition(isoLocal(2026, 3, 15, 23, 59), { op: 'equals', value: '2026-03-15' })).toBe(
      true,
    )
  })

  test('between D and D is an inclusive whole-day range', () => {
    const within = isoLocal(2026, 3, 15, 23, 0)
    const after = isoLocal(2026, 3, 16, 0, 30)
    expect(evalCondition(within, { op: 'between', value: '2026-03-15', value2: '2026-03-15' })).toBe(
      true,
    )
    expect(evalCondition(after, { op: 'between', value: '2026-03-15', value2: '2026-03-15' })).toBe(
      false,
    )
  })
})

describe('#8 a half-filled between is inactive, not a grid-emptying predicate', () => {
  test('only one bound → treated as inactive (matches every row)', () => {
    expect(isConditionActive({ op: 'between', value: '5' })).toBe(false)
    expect(isConditionActive({ op: 'between', value: '', value2: '10' })).toBe(false)
    expect(evalCondition(3, { op: 'between', value: '5', value2: '' })).toBe(true)
    expect(evalCondition(999, { op: 'between', value: '', value2: '10' })).toBe(true)
  })

  test('both bounds present → active and applied', () => {
    expect(isConditionActive({ op: 'between', value: '1', value2: '10' })).toBe(true)
    expect(evalCondition(5, { op: 'between', value: '1', value2: '10' })).toBe(true)
    expect(evalCondition(50, { op: 'between', value: '1', value2: '10' })).toBe(false)
  })
})
