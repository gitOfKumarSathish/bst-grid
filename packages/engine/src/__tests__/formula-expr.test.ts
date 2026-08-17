import { describe, test, expect } from 'vitest'
import {
  compileFormula,
  validateFormula,
  listFormulaFunctions,
  FormulaError,
} from '../formula-expr'

// eval helper: compile + run against a row (and an optional full dataset)
function ev(expr: string, row: Record<string, unknown> = {}, rows: Record<string, unknown>[] = [row]) {
  const { fn } = compileFormula(expr)
  return fn(row, { rows, index: Math.max(0, rows.indexOf(row)) })
}

describe('formula evaluator — literals & arithmetic', () => {
  test('numbers, precedence, parens, power (right-assoc)', () => {
    expect(ev('1 + 2 * 3')).toBe(7)
    expect(ev('(1 + 2) * 3')).toBe(9)
    expect(ev('10 / 4')).toBe(2.5)
    expect(ev('2 ^ 3 ^ 2')).toBe(512) // 2^(3^2)
    expect(ev('-2 ^ 2')).toBe(4) // unary binds tighter than ^ (Excel)
    expect(ev('= 3 + 4')).toBe(7) // leading = is optional
  })
  test('postfix percent (Excel: 50% = 0.5)', () => {
    expect(ev('50%')).toBe(0.5)
    expect(ev('50% * 2')).toBe(1)
    expect(ev('-5%')).toBe(-0.05)
    expect(ev('200 * 10%')).toBe(20)
  })
})

describe('formula evaluator — field references', () => {
  test('bare identifiers and [bracketed names]', () => {
    expect(ev('qty * price', { qty: 3, price: 2 })).toBe(6)
    expect(ev('[unit price] * qty', { 'unit price': 2.5, qty: 4 })).toBe(10)
    expect(ev('blank + 5', {})).toBe(5) // missing field → 0 in math
  })
})

describe('formula evaluator — comparisons, logical, IF', () => {
  test('comparisons return booleans', () => {
    expect(ev('age >= 18', { age: 20 })).toBe(true)
    expect(ev('a = b', { a: 1, b: 1 })).toBe(true)
    expect(ev('a <> b', { a: 1, b: 2 })).toBe(true)
    expect(ev('"apple" < "banana"')).toBe(true) // text compare
  })
  test('IF short-circuits (does not evaluate the untaken branch)', () => {
    expect(ev('IF(x > 5, "big", "small")', { x: 10 })).toBe('big')
    expect(ev('IF(x > 5, "big", "small")', { x: 1 })).toBe('small')
    expect(ev('IF(TRUE, 1, 1/0)')).toBe(1) // else (1/0) never runs → no #DIV/0!
  })
  test('AND / OR / NOT', () => {
    expect(ev('AND(a > 0, b > 0)', { a: 1, b: 2 })).toBe(true)
    expect(ev('AND(a > 0, b > 0)', { a: 1, b: -1 })).toBe(false)
    expect(ev('OR(FALSE, TRUE)')).toBe(true)
    expect(ev('NOT(FALSE)')).toBe(true)
  })
})

describe('formula evaluator — text', () => {
  test('concat operator and text functions', () => {
    expect(ev('first & " " & last', { first: 'Ada', last: 'Lovelace' })).toBe('Ada Lovelace')
    expect(ev('UPPER("hi")')).toBe('HI')
    expect(ev('LOWER("HI")')).toBe('hi')
    expect(ev('LEN("abc")')).toBe(3)
    expect(ev('LEFT("hello", 2)')).toBe('he')
    expect(ev('RIGHT("hello", 3)')).toBe('llo')
    expect(ev('MID("hello", 2, 3)')).toBe('ell')
    expect(ev('TRIM("  x  ")')).toBe('x')
    expect(ev('PROPER("ada lovelace")')).toBe('Ada Lovelace')
    expect(ev('CONCAT(a, "-", b)', { a: 'x', b: 'y' })).toBe('x-y')
  })
})

describe('formula evaluator — math functions', () => {
  test('rounding + core math', () => {
    expect(ev('ROUND(3.14159, 2)')).toBe(3.14)
    expect(ev('ROUNDUP(1.01, 0)')).toBe(2)
    expect(ev('ROUNDDOWN(1.99, 0)')).toBe(1)
    expect(ev('ABS(-5)')).toBe(5)
    expect(ev('MOD(7, 3)')).toBe(1)
    expect(ev('POWER(2, 10)')).toBe(1024)
    expect(ev('CEILING(1.2)')).toBe(2)
    expect(ev('FLOOR(1.8)')).toBe(1)
    expect(ev('SQRT(9)')).toBe(3)
    expect(ev('SIGN(-3)')).toBe(-1)
  })
})

describe('formula evaluator — aggregates over ctx.rows', () => {
  const rows = [{ s: 10, q: 2, p: 3 }, { s: 20, q: 4, p: 5 }, { s: 30, q: 1, p: 1 }]
  test('SUM / AVERAGE / MIN / MAX / COUNT / MEDIAN', () => {
    expect(ev('SUM(s)', rows[0], rows)).toBe(60)
    expect(ev('AVERAGE(s)', rows[0], rows)).toBe(20)
    expect(ev('AVG(s)', rows[0], rows)).toBe(20)
    expect(ev('MIN(s)', rows[0], rows)).toBe(10)
    expect(ev('MAX(s)', rows[0], rows)).toBe(30)
    expect(ev('COUNT(s)', rows[0], rows)).toBe(3)
    expect(ev('MEDIAN(s)', rows[0], rows)).toBe(20)
  })
  test('SUMPRODUCT-style: aggregate evaluates an expression per row', () => {
    // SUM(q*p) = 2*3 + 4*5 + 1*1 = 27
    expect(ev('SUM(q * p)', rows[0], rows)).toBe(27)
  })
  test('mixing a row value with a column aggregate (share of total)', () => {
    // row0 s=10, SUM=60 → 10/60*100 ≈ 16.67
    expect(ev('ROUND(s / SUM(s) * 100, 2)', rows[0], rows)).toBe(16.67)
    expect(ev('ROUND(s / SUM(s) * 100, 2)', rows[1], rows)).toBe(33.33)
  })
})

describe('formula evaluator — Excel-style errors (never throws)', () => {
  test('#DIV/0!, #VALUE!, #NAME?, #N/A', () => {
    expect(ev('1 / 0')).toBeInstanceOf(FormulaError)
    expect(String(ev('1 / 0'))).toBe('#DIV/0!')
    expect(String(ev('"abc" + 1'))).toBe('#VALUE!')
    expect(String(ev('FOO(1)'))).toBe('#NAME?')
    expect(String(ev('SUM(1, 2)'))).toBe('#N/A') // aggregate takes exactly 1 arg
  })
  test('a syntax error compiles to #ERROR! and reports it', () => {
    const r = compileFormula('(1 + ')
    expect(r.error).toBeTruthy()
    expect(String(r.fn({}, { rows: [], index: 0 }))).toBe('#ERROR!')
  })
  test('an error propagates through surrounding operators', () => {
    expect(String(ev('1 + (2 / 0)'))).toBe('#DIV/0!')
    expect(String(ev('IF(1/0 > 1, "a", "b")'))).toBe('#DIV/0!')
  })
})

describe('formula evaluator — helpers', () => {
  test('validateFormula reports ok / error', () => {
    expect(validateFormula('qty * price').ok).toBe(true)
    const bad = validateFormula('(1 +')
    expect(bad.ok).toBe(false)
    expect(bad.error).toBeTruthy()
  })
  test('listFormulaFunctions exposes the catalog for the builder', () => {
    const names = listFormulaFunctions().map((f) => f.name)
    expect(names).toContain('SUM')
    expect(names).toContain('IF')
    expect(names).toContain('ROUND')
    expect(listFormulaFunctions().find((f) => f.name === 'SUM')?.kind).toBe('aggregate')
  })
})
