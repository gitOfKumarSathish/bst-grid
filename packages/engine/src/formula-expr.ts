/**
 * AG17 — Excel-style formula expressions for calculated columns.
 *
 * A dependency-free, **safe** evaluator: a tokenizer + Pratt (precedence-climbing)
 * parser + tree-walking interpreter. It NEVER uses `eval` / `new Function`, so a
 * user-authored formula can't run arbitrary JS — only the operators and the
 * whitelisted function catalog below.
 *
 * Formulas reference columns by **field name** (`qty`, or `[Full Name]` for
 * names with spaces/punctuation), not A1 grid coordinates — the right model for a
 * sorted/filtered/paginated data grid. Aggregate functions (`SUM`, `AVERAGE`, …)
 * evaluate their argument across the whole (pre-pagination) dataset via
 * `ctx.rows`, so `=SUM(salary)` or `=amount / SUM(amount)` do column math.
 *
 *   compileFormula('=qty * price * 1.1')  -> { fn: (row, ctx) => number }
 *   compileFormula('=IF(age >= 18, "adult", "minor")')
 *   compileFormula('=ROUND(amount / SUM(amount) * 100, 1)')
 *
 * On a syntax error `compileFormula` returns `{ error }` and an `fn` that yields
 * the Excel-style sentinel `#ERROR!`; runtime issues yield `#DIV/0!`, `#VALUE!`,
 * `#NAME?` etc. (see {@link FormulaError}).
 */

import type { RowData } from '@tanstack/react-table'
import type { BstFormulaContext } from './registry/types.js'

/** An Excel-style error value. Renders as its code (`#DIV/0!`, `#VALUE!`, …). */
export class FormulaError {
  constructor(public readonly code: string) {}
  toString(): string {
    return this.code
  }
}
const ERR = {
  div0: () => new FormulaError('#DIV/0!'),
  value: () => new FormulaError('#VALUE!'),
  name: () => new FormulaError('#NAME?'),
  na: () => new FormulaError('#N/A'),
  err: () => new FormulaError('#ERROR!'),
}

// ---- tokenizer ---------------------------------------------------------------

type TokKind = 'num' | 'str' | 'ident' | 'field' | 'op' | 'lparen' | 'rparen' | 'comma'
interface Tok {
  kind: TokKind
  value: string
  pos: number
}

const OPS = ['<=', '>=', '<>', '==', '!=', '+', '-', '*', '/', '%', '^', '&', '=', '<', '>']

function tokenize(src: string): Tok[] {
  const s = src.trim().replace(/^=/, '') // an optional leading `=`, Excel-style
  const toks: Tok[] = []
  let i = 0
  const isDigit = (c: string) => c >= '0' && c <= '9'
  const isIdentStart = (c: string) => /[A-Za-z_]/.test(c)
  const isIdentChar = (c: string) => /[A-Za-z0-9_.]/.test(c)
  while (i < s.length) {
    const c = s[i]
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
      i++
      continue
    }
    if (c === '(') {
      toks.push({ kind: 'lparen', value: c, pos: i++ })
      continue
    }
    if (c === ')') {
      toks.push({ kind: 'rparen', value: c, pos: i++ })
      continue
    }
    if (c === ',' || c === ';') {
      toks.push({ kind: 'comma', value: ',', pos: i++ })
      continue
    }
    // string literal — single or double quoted; doubled quote escapes
    if (c === '"' || c === "'") {
      const quote = c
      let j = i + 1
      let str = ''
      while (j < s.length) {
        if (s[j] === quote) {
          if (s[j + 1] === quote) {
            str += quote
            j += 2
            continue
          }
          break
        }
        str += s[j++]
      }
      if (j >= s.length) throw new SyntaxError(`Unterminated string at ${i}`)
      toks.push({ kind: 'str', value: str, pos: i })
      i = j + 1
      continue
    }
    // [bracketed field name] — allows spaces / punctuation
    if (c === '[') {
      const end = s.indexOf(']', i + 1)
      if (end < 0) throw new SyntaxError(`Unterminated [field] at ${i}`)
      toks.push({ kind: 'field', value: s.slice(i + 1, end).trim(), pos: i })
      i = end + 1
      continue
    }
    if (isDigit(c) || (c === '.' && isDigit(s[i + 1]))) {
      let j = i
      while (j < s.length && (isDigit(s[j]) || s[j] === '.')) j++
      // exponent
      if (s[j] === 'e' || s[j] === 'E') {
        j++
        if (s[j] === '+' || s[j] === '-') j++
        while (j < s.length && isDigit(s[j])) j++
      }
      toks.push({ kind: 'num', value: s.slice(i, j), pos: i })
      i = j
      continue
    }
    if (isIdentStart(c)) {
      let j = i
      while (j < s.length && isIdentChar(s[j])) j++
      toks.push({ kind: 'ident', value: s.slice(i, j), pos: i })
      i = j
      continue
    }
    const op = OPS.find((o) => s.startsWith(o, i))
    if (op) {
      toks.push({ kind: 'op', value: op, pos: i })
      i += op.length
      continue
    }
    throw new SyntaxError(`Unexpected character '${c}' at ${i}`)
  }
  return toks
}

// ---- AST + parser (precedence climbing) --------------------------------------

type Node =
  | { t: 'num'; v: number }
  | { t: 'str'; v: string }
  | { t: 'bool'; v: boolean }
  | { t: 'field'; name: string }
  | { t: 'unary'; op: string; arg: Node }
  | { t: 'bin'; op: string; a: Node; b: Node }
  | { t: 'call'; name: string; args: Node[] }

// binary operator → [left binding power, right binding power]
const BIN_BP: Record<string, [number, number]> = {
  '=': [10, 11], '==': [10, 11], '<>': [10, 11], '!=': [10, 11],
  '<': [10, 11], '<=': [10, 11], '>': [10, 11], '>=': [10, 11],
  '&': [20, 21],
  '+': [30, 31], '-': [30, 31],
  '*': [40, 41], '/': [40, 41],
  '^': [51, 50], // right-associative
}

class Parser {
  private i = 0
  constructor(private toks: Tok[]) {}
  private peek(): Tok | undefined {
    return this.toks[this.i]
  }
  private next(): Tok | undefined {
    return this.toks[this.i++]
  }
  parse(): Node {
    const node = this.expr(0)
    if (this.i < this.toks.length) {
      throw new SyntaxError(`Unexpected '${this.toks[this.i].value}'`)
    }
    return node
  }
  private expr(minBp: number): Node {
    let left = this.prefix()
    for (;;) {
      const t = this.peek()
      if (!t || t.kind !== 'op') break
      const bp = BIN_BP[t.value]
      if (!bp || bp[0] < minBp) break
      this.next()
      const right = this.expr(bp[1])
      left = { t: 'bin', op: t.value, a: left, b: right }
    }
    return left
  }
  private prefix(): Node {
    // atom, then any postfix `%` (Excel percent: 50% = 0.5).
    let node = this.atom()
    while (this.peek()?.kind === 'op' && this.peek()!.value === '%') {
      this.next()
      node = { t: 'unary', op: '%', arg: node }
    }
    return node
  }
  private atom(): Node {
    const t = this.next()
    if (!t) throw new SyntaxError('Unexpected end of formula')
    if (t.kind === 'num') return { t: 'num', v: Number(t.value) }
    if (t.kind === 'str') return { t: 'str', v: t.value }
    if (t.kind === 'field') return { t: 'field', name: t.value }
    if (t.kind === 'op' && (t.value === '-' || t.value === '+')) {
      return { t: 'unary', op: t.value, arg: this.expr(60) }
    }
    if (t.kind === 'lparen') {
      const node = this.expr(0)
      const close = this.next()
      if (!close || close.kind !== 'rparen') throw new SyntaxError('Expected )')
      return node
    }
    if (t.kind === 'ident') {
      const up = t.value.toUpperCase()
      if (up === 'TRUE') return { t: 'bool', v: true }
      if (up === 'FALSE') return { t: 'bool', v: false }
      // function call?
      if (this.peek()?.kind === 'lparen') {
        this.next() // (
        const args: Node[] = []
        if (this.peek()?.kind !== 'rparen') {
          for (;;) {
            args.push(this.expr(0))
            if (this.peek()?.kind === 'comma') {
              this.next()
              continue
            }
            break
          }
        }
        const close = this.next()
        if (!close || close.kind !== 'rparen') throw new SyntaxError('Expected )')
        return { t: 'call', name: t.value, args }
      }
      // bare identifier → field reference
      return { t: 'field', name: t.value }
    }
    throw new SyntaxError(`Unexpected '${t.value}'`)
  }
}

// ---- coercion ----------------------------------------------------------------

function isErr(v: unknown): v is FormulaError {
  return v instanceof FormulaError
}
function toNum(v: unknown): number | FormulaError {
  if (isErr(v)) return v
  if (typeof v === 'number') return v
  if (typeof v === 'boolean') return v ? 1 : 0
  if (v == null || v === '') return 0
  const n = Number(v)
  return Number.isNaN(n) ? ERR.value() : n
}
function toStr(v: unknown): string {
  if (v == null) return ''
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  return String(v)
}
function toBool(v: unknown): boolean {
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v !== 0
  if (typeof v === 'string') return v.toLowerCase() === 'true' || v === '1'
  return v != null
}
function num2(a: unknown, b: unknown): [number, number] | FormulaError {
  const x = toNum(a)
  if (isErr(x)) return x
  const y = toNum(b)
  if (isErr(y)) return y
  return [x, y]
}

// ---- function catalog --------------------------------------------------------

type ScalarFn = (args: unknown[]) => unknown
interface FnSpec {
  kind: 'scalar' | 'aggregate' | 'special'
  min: number
  max: number
  help: string
  fn?: ScalarFn
  agg?: (values: unknown[]) => unknown
}

const nums = (values: unknown[]): number[] =>
  values.map((v) => toNum(v)).filter((n): n is number => typeof n === 'number')

/** The whitelisted functions. Also drives the builder's help panel. */
export const FORMULA_FUNCTIONS: Record<string, FnSpec> = {
  // logical
  IF: { kind: 'special', min: 2, max: 3, help: 'IF(condition, then, else) — pick a value on a test.' },
  AND: { kind: 'scalar', min: 1, max: Infinity, help: 'AND(a, b, …) — true when every argument is true.', fn: (a) => a.every(toBool) },
  OR: { kind: 'scalar', min: 1, max: Infinity, help: 'OR(a, b, …) — true when any argument is true.', fn: (a) => a.some(toBool) },
  NOT: { kind: 'scalar', min: 1, max: 1, help: 'NOT(x) — logical negation.', fn: (a) => !toBool(a[0]) },
  ISBLANK: { kind: 'scalar', min: 1, max: 1, help: 'ISBLANK(x) — true when x is empty.', fn: (a) => a[0] == null || a[0] === '' },
  ISNUMBER: { kind: 'scalar', min: 1, max: 1, help: 'ISNUMBER(x) — true when x is numeric.', fn: (a) => typeof a[0] === 'number' && !Number.isNaN(a[0]) },
  // math
  ROUND: { kind: 'scalar', min: 1, max: 2, help: 'ROUND(x, digits) — round to N decimals.', fn: (a) => roundTo(a[0], a[1], 'round') },
  ROUNDUP: { kind: 'scalar', min: 1, max: 2, help: 'ROUNDUP(x, digits) — round away from zero.', fn: (a) => roundTo(a[0], a[1], 'up') },
  ROUNDDOWN: { kind: 'scalar', min: 1, max: 2, help: 'ROUNDDOWN(x, digits) — round toward zero.', fn: (a) => roundTo(a[0], a[1], 'down') },
  ABS: { kind: 'scalar', min: 1, max: 1, help: 'ABS(x) — absolute value.', fn: (a) => mathUnary(a[0], Math.abs) },
  CEILING: { kind: 'scalar', min: 1, max: 1, help: 'CEILING(x) — round up to an integer.', fn: (a) => mathUnary(a[0], Math.ceil) },
  FLOOR: { kind: 'scalar', min: 1, max: 1, help: 'FLOOR(x) — round down to an integer.', fn: (a) => mathUnary(a[0], Math.floor) },
  INT: { kind: 'scalar', min: 1, max: 1, help: 'INT(x) — truncate to an integer.', fn: (a) => mathUnary(a[0], Math.trunc) },
  SQRT: { kind: 'scalar', min: 1, max: 1, help: 'SQRT(x) — square root.', fn: (a) => mathUnary(a[0], Math.sqrt) },
  SIGN: { kind: 'scalar', min: 1, max: 1, help: 'SIGN(x) — -1, 0 or 1.', fn: (a) => mathUnary(a[0], Math.sign) },
  POWER: { kind: 'scalar', min: 2, max: 2, help: 'POWER(x, y) — x to the power y.', fn: (a) => { const p = num2(a[0], a[1]); return isErr(p) ? p : p[0] ** p[1] } },
  MOD: { kind: 'scalar', min: 2, max: 2, help: 'MOD(a, b) — remainder of a / b.', fn: (a) => { const p = num2(a[0], a[1]); return isErr(p) ? p : p[1] === 0 ? ERR.div0() : p[0] % p[1] } },
  // text
  CONCAT: { kind: 'scalar', min: 1, max: Infinity, help: 'CONCAT(a, b, …) — join values as text.', fn: (a) => a.map(toStr).join('') },
  CONCATENATE: { kind: 'scalar', min: 1, max: Infinity, help: 'CONCATENATE(a, b, …) — alias of CONCAT.', fn: (a) => a.map(toStr).join('') },
  UPPER: { kind: 'scalar', min: 1, max: 1, help: 'UPPER(text) — uppercase.', fn: (a) => toStr(a[0]).toUpperCase() },
  LOWER: { kind: 'scalar', min: 1, max: 1, help: 'LOWER(text) — lowercase.', fn: (a) => toStr(a[0]).toLowerCase() },
  TRIM: { kind: 'scalar', min: 1, max: 1, help: 'TRIM(text) — strip leading/trailing spaces.', fn: (a) => toStr(a[0]).trim() },
  LEN: { kind: 'scalar', min: 1, max: 1, help: 'LEN(text) — character count.', fn: (a) => toStr(a[0]).length },
  LEFT: { kind: 'scalar', min: 1, max: 2, help: 'LEFT(text, n) — first n characters.', fn: (a) => toStr(a[0]).slice(0, a[1] == null ? 1 : Math.max(0, Math.trunc(Number(a[1])))) },
  RIGHT: { kind: 'scalar', min: 1, max: 2, help: 'RIGHT(text, n) — last n characters.', fn: (a) => { const s = toStr(a[0]); const n = a[1] == null ? 1 : Math.max(0, Math.trunc(Number(a[1]))); return n === 0 ? '' : s.slice(-n) } },
  MID: { kind: 'scalar', min: 3, max: 3, help: 'MID(text, start, len) — substring (1-based start).', fn: (a) => toStr(a[0]).substr(Math.max(0, Math.trunc(Number(a[1])) - 1), Math.trunc(Number(a[2]))) },
  PROPER: { kind: 'scalar', min: 1, max: 1, help: 'PROPER(text) — Title Case.', fn: (a) => toStr(a[0]).replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase()) },
  TEXT: { kind: 'scalar', min: 1, max: 1, help: 'TEXT(x) — coerce to text.', fn: (a) => toStr(a[0]) },
  VALUE: { kind: 'scalar', min: 1, max: 1, help: 'VALUE(text) — parse text to a number.', fn: (a) => toNum(a[0]) },
  // aggregates (over ctx.rows)
  SUM: { kind: 'aggregate', min: 1, max: 1, help: 'SUM(expr) — total across all rows.', agg: (v) => nums(v).reduce((s, n) => s + n, 0) },
  AVERAGE: { kind: 'aggregate', min: 1, max: 1, help: 'AVERAGE(expr) — mean across all rows.', agg: (v) => { const n = nums(v); return n.length ? n.reduce((s, x) => s + x, 0) / n.length : ERR.div0() } },
  AVG: { kind: 'aggregate', min: 1, max: 1, help: 'AVG(expr) — alias of AVERAGE.', agg: (v) => { const n = nums(v); return n.length ? n.reduce((s, x) => s + x, 0) / n.length : ERR.div0() } },
  MIN: { kind: 'aggregate', min: 1, max: 1, help: 'MIN(expr) — smallest across all rows.', agg: (v) => { const n = nums(v); return n.length ? Math.min(...n) : 0 } },
  MAX: { kind: 'aggregate', min: 1, max: 1, help: 'MAX(expr) — largest across all rows.', agg: (v) => { const n = nums(v); return n.length ? Math.max(...n) : 0 } },
  COUNT: { kind: 'aggregate', min: 1, max: 1, help: 'COUNT(expr) — count of numeric values.', agg: (v) => nums(v).length },
  COUNTA: { kind: 'aggregate', min: 1, max: 1, help: 'COUNTA(expr) — count of non-blank values.', agg: (v) => v.filter((x) => x != null && x !== '').length },
  PRODUCT: { kind: 'aggregate', min: 1, max: 1, help: 'PRODUCT(expr) — product across all rows.', agg: (v) => nums(v).reduce((p, n) => p * n, 1) },
  MEDIAN: { kind: 'aggregate', min: 1, max: 1, help: 'MEDIAN(expr) — median across all rows.', agg: (v) => median(nums(v)) },
}

function roundTo(x: unknown, d: unknown, mode: 'round' | 'up' | 'down'): unknown {
  const n = toNum(x)
  if (isErr(n)) return n
  const digits = d == null ? 0 : Math.trunc(Number(d) || 0)
  const f = 10 ** digits
  const scaled = n * f
  const r = mode === 'up' ? Math.sign(scaled) * Math.ceil(Math.abs(scaled)) : mode === 'down' ? Math.sign(scaled) * Math.floor(Math.abs(scaled)) : Math.round(scaled)
  return r / f
}
function mathUnary(x: unknown, f: (n: number) => number): unknown {
  const n = toNum(x)
  return isErr(n) ? n : f(n)
}
function median(n: number[]): number | FormulaError {
  if (!n.length) return ERR.div0()
  const s = [...n].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

/** A catalog row for the builder's function help. */
export function listFormulaFunctions(): Array<{ name: string; kind: string; help: string }> {
  return Object.entries(FORMULA_FUNCTIONS).map(([name, s]) => ({ name, kind: s.kind, help: s.help }))
}

// ---- interpreter -------------------------------------------------------------

interface Scope {
  row: Record<string, unknown>
  ctx: BstFormulaContext<any>
}

function evalNode(node: Node, scope: Scope): unknown {
  switch (node.t) {
    case 'num':
      return node.v
    case 'str':
      return node.v
    case 'bool':
      return node.v
    case 'field':
      return scope.row?.[node.name]
    case 'unary': {
      const v = toNum(evalNode(node.arg, scope))
      if (isErr(v)) return v
      if (node.op === '%') return v / 100
      return node.op === '-' ? -v : v
    }
    case 'bin':
      return evalBin(node, scope)
    case 'call':
      return evalCall(node, scope)
  }
}

function evalBin(node: Extract<Node, { t: 'bin' }>, scope: Scope): unknown {
  const { op } = node
  const a = evalNode(node.a, scope)
  const b = evalNode(node.b, scope)
  if (isErr(a)) return a
  if (isErr(b)) return b
  if (op === '&') return toStr(a) + toStr(b)
  // comparisons
  if (op === '=' || op === '==' || op === '<>' || op === '!=' || op === '<' || op === '<=' || op === '>' || op === '>=') {
    const cmp = compare(a, b)
    switch (op) {
      case '=':
      case '==':
        return cmp === 0
      case '<>':
      case '!=':
        return cmp !== 0
      case '<':
        return cmp < 0
      case '<=':
        return cmp <= 0
      case '>':
        return cmp > 0
      case '>=':
        return cmp >= 0
    }
  }
  // arithmetic
  const p = num2(a, b)
  if (isErr(p)) return p
  const [x, y] = p
  switch (op) {
    case '+':
      return x + y
    case '-':
      return x - y
    case '*':
      return x * y
    case '/':
      return y === 0 ? ERR.div0() : x / y
    case '^':
      return x ** y
  }
  return ERR.err()
}

/** Excel-ish comparison: numeric when both numeric, else case-insensitive text. */
function compare(a: unknown, b: unknown): number {
  const an = typeof a === 'number' ? a : typeof a === 'boolean' ? (a ? 1 : 0) : null
  const bn = typeof b === 'number' ? b : typeof b === 'boolean' ? (b ? 1 : 0) : null
  if (an != null && bn != null) return an === bn ? 0 : an < bn ? -1 : 1
  const as = toStr(a).toLowerCase()
  const bs = toStr(b).toLowerCase()
  return as === bs ? 0 : as < bs ? -1 : 1
}

function evalCall(node: Extract<Node, { t: 'call' }>, scope: Scope): unknown {
  const name = node.name.toUpperCase()
  const spec = FORMULA_FUNCTIONS[name]
  if (!spec) return ERR.name()
  if (node.args.length < spec.min || node.args.length > spec.max) return ERR.na()

  if (spec.kind === 'aggregate') {
    // Evaluate the single argument expression once per row, then reduce.
    const arg = node.args[0]
    const values = scope.ctx.rows.map((r, index) =>
      evalNode(arg, { row: r as Record<string, unknown>, ctx: { ...scope.ctx, index } }),
    )
    const err = values.find(isErr)
    if (err) return err
    return spec.agg!(values)
  }

  if (name === 'IF') {
    const cond = evalNode(node.args[0], scope)
    if (isErr(cond)) return cond
    return toBool(cond)
      ? evalNode(node.args[1], scope)
      : node.args[2] != null
        ? evalNode(node.args[2], scope)
        : false
  }

  const args = node.args.map((a) => evalNode(a, scope))
  const err = args.find(isErr)
  if (err) return err
  return spec.fn!(args)
}

// ---- public API --------------------------------------------------------------

/** The compiled formula + an optional compile-time error message. */
export interface FormulaCompileResult<TData extends RowData = any> {
  fn: (row: TData, ctx: BstFormulaContext<TData>) => unknown
  error?: string
}

/**
 * Compile an Excel-style formula string into a `(row, ctx) => value` function
 * suitable for `meta.formula`. A parse error is reported in `error` and the
 * returned `fn` yields `#ERROR!`; runtime problems yield the matching sentinel
 * (`#DIV/0!`, `#VALUE!`, `#NAME?`, `#N/A`). Never throws.
 */
export function compileFormula<TData extends RowData = any>(
  expr: string,
): FormulaCompileResult<TData> {
  let ast: Node
  try {
    ast = new Parser(tokenize(expr)).parse()
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return { fn: () => new FormulaError('#ERROR!'), error: message }
  }
  return {
    fn: (row, ctx) => {
      try {
        return evalNode(ast, { row: row as Record<string, unknown>, ctx })
      } catch {
        return new FormulaError('#ERROR!')
      }
    },
  }
}

/** Validate a formula without keeping the compiled fn — for the builder UI. */
export function validateFormula(expr: string): { ok: boolean; error?: string } {
  const r = compileFormula(expr)
  return r.error ? { ok: false, error: r.error } : { ok: true }
}
