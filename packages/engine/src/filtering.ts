// Operator-aware column filtering (E3). The filter *engine* is TanStack's; this
// adds the small semantic layer the filter-builder UI needs: a set of operators
// per cell-type category and one `filterFn` that interprets a `{ op, value }`
// condition. Registered as `filterFns.bstCondition` and wired as the default
// column filterFn so the builder's conditions "just work" on any column.

/** One selectable operator in the filter builder. */
export interface FilterOperator {
  op: string
  label: string
  /** Number of value inputs: 0 = unary (is empty), 1 = default, 2 = between. */
  arity?: 0 | 1 | 2
}

/** A single column condition stored as the column filter value. */
export interface FilterCondition {
  op: string
  value?: unknown
  value2?: unknown
}

export const TEXT_OPERATORS: FilterOperator[] = [
  { op: 'contains', label: 'contains' },
  { op: 'notContains', label: 'does not contain' },
  { op: 'equals', label: 'equals' },
  { op: 'startsWith', label: 'starts with' },
  { op: 'endsWith', label: 'ends with' },
  { op: 'empty', label: 'is empty', arity: 0 },
  { op: 'notEmpty', label: 'is not empty', arity: 0 },
]

export const NUMBER_OPERATORS: FilterOperator[] = [
  { op: 'equals', label: '=' },
  { op: 'notEquals', label: '≠' },
  { op: 'gt', label: '>' },
  { op: 'gte', label: '≥' },
  { op: 'lt', label: '<' },
  { op: 'lte', label: '≤' },
  { op: 'between', label: 'between', arity: 2 },
]

export const DATE_OPERATORS: FilterOperator[] = [
  { op: 'equals', label: 'on' },
  { op: 'gt', label: 'after' },
  { op: 'lt', label: 'before' },
  { op: 'between', label: 'between', arity: 2 },
]

export const SELECT_OPERATORS: FilterOperator[] = [
  { op: 'equals', label: 'is' },
  { op: 'notEquals', label: 'is not' },
  { op: 'empty', label: 'is empty', arity: 0 },
  { op: 'notEmpty', label: 'is not empty', arity: 0 },
]

export const BOOLEAN_OPERATORS: FilterOperator[] = [
  { op: 'isTrue', label: 'is checked', arity: 0 },
  { op: 'isFalse', label: 'is unchecked', arity: 0 },
]

/** The operators offered for a given `meta.type`. */
export function operatorsForType(typeId?: string): FilterOperator[] {
  switch (typeId) {
    case 'number':
      return NUMBER_OPERATORS
    case 'dateTime':
      return DATE_OPERATORS
    case 'boolean':
      return BOOLEAN_OPERATORS
    case 'singleSelect':
    case 'multiSelect':
    case 'radio':
      return SELECT_OPERATORS
    default:
      return TEXT_OPERATORS
  }
}

/** Look up an operator's arity (value-input count). Default 1. */
export function operatorArity(typeId: string | undefined, op: string): 0 | 1 | 2 {
  const found = operatorsForType(typeId).find((o) => o.op === op)
  return found?.arity ?? 1
}

const str = (v: unknown): string => (v == null ? '' : String(v))

const num = (v: unknown): number => {
  if (typeof v === 'number') return v
  if (v == null) return NaN
  // Blank / whitespace-only / empty-array cells have NO numeric value — they must
  // NOT coerce to 0 (the Unix epoch), which silently matched `before`/`<`/`<=`
  // and any zero-spanning range on every empty cell (#6).
  const s = String(v).trim()
  if (s === '') return NaN
  const n = Number(s)
  if (!Number.isNaN(n)) return n
  const t = Date.parse(s) // allow date strings for </>/between
  return Number.isNaN(t) ? NaN : t
}

const isEmptyVal = (v: unknown): boolean =>
  v == null || v === '' || (Array.isArray(v) && v.length === 0)

const looseEq = (a: unknown, b: unknown): boolean =>
  str(a).toLowerCase() === str(b).toLowerCase()

/** Parse a value to a Date, treating a bare `YYYY-MM-DD` as LOCAL midnight (the
 *  calendar day the user picked) rather than UTC — so day comparisons never slip
 *  a day (#7). Returns null when the value isn't a valid date. */
const toDate = (v: unknown): Date | null => {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v
  if (typeof v === 'number') {
    const d = new Date(v)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const s = str(v).trim()
  if (!s) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  const t = Date.parse(s)
  return Number.isNaN(t) ? null : new Date(t)
}

/** True for a bare calendar-date string (`YYYY-MM-DD`) — what the date filter inputs emit. */
const isDateOnly = (v: unknown): boolean => /^\d{4}-\d{2}-\d{2}$/.test(str(v).trim())

/** Same local calendar day (ignores time-of-day). */
const sameLocalDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

const includesArr = (cell: unknown, value: unknown): boolean =>
  Array.isArray(cell)
    ? cell.some((x) => looseEq(x, value))
    : str(cell).toLowerCase().includes(str(value).toLowerCase())

/** Evaluate a `{ op, value }` condition (or a bare value → contains) on a cell. */
export function evalCondition(cell: unknown, raw: unknown): boolean {
  if (raw == null) return true
  let op: string
  let value: unknown
  let value2: unknown
  if (typeof raw === 'object' && raw !== null && 'op' in (raw as object)) {
    op = (raw as FilterCondition).op
    value = (raw as FilterCondition).value
    value2 = (raw as FilterCondition).value2
  } else {
    op = 'contains'
    value = raw
  }
  // Set filter (AG4): `value` is the list of selected values; a row passes if its
  // value — or, for a multi-value cell, ANY element — is selected. Blank cells match
  // the '' sentinel. Handled here, BEFORE the empty-value short-circuit below, so an
  // empty selection correctly matches nothing (rather than being read as inactive).
  if (op === 'set') {
    if (!Array.isArray(value)) return true
    const set = value as unknown[]
    if (Array.isArray(cell)) {
      return cell.length === 0
        ? set.some((v) => str(v) === '')
        : cell.some((el) => set.some((v) => str(v) === str(el)))
    }
    const key = isEmptyVal(cell) ? '' : str(cell)
    return set.some((v) => str(v) === key)
  }

  // A filter with no value (other than unary ops) is treated as inactive. A
  // `between` is inactive only when BOTH bounds are empty (a one-bound range is a
  // valid one-sided filter — see the `between` case).
  const unary = op === 'empty' || op === 'notEmpty' || op === 'isTrue' || op === 'isFalse'
  if (!unary && isEmptyVal(value) && (op !== 'between' || isEmptyVal(value2))) return true

  switch (op) {
    case 'contains':
      return includesArr(cell, value)
    case 'notContains':
      return !includesArr(cell, value)
    case 'equals': {
      // A date-only filter value ("on <day>") must match a datetime cell by
      // calendar day, not string identity — otherwise it never matches an ISO
      // timestamp and returns zero rows (#7).
      if (isDateOnly(value)) {
        const c = toDate(cell)
        const v = toDate(value)
        if (c && v) return sameLocalDay(c, v)
      }
      return Array.isArray(cell) ? cell.some((x) => looseEq(x, value)) : looseEq(cell, value)
    }
    case 'notEquals':
      return Array.isArray(cell) ? !cell.some((x) => looseEq(x, value)) : !looseEq(cell, value)
    case 'startsWith':
      return str(cell).toLowerCase().startsWith(str(value).toLowerCase())
    case 'endsWith':
      return str(cell).toLowerCase().endsWith(str(value).toLowerCase())
    case 'empty':
      return isEmptyVal(cell)
    case 'notEmpty':
      return !isEmptyVal(cell)
    case 'gt':
      return num(cell) > num(value)
    case 'gte':
      return num(cell) >= num(value)
    case 'lt':
      return num(cell) < num(value)
    case 'lte':
      return num(cell) <= num(value)
    case 'between': {
      // Date range: whole local days, inclusive — so `between D and D` matches
      // every time on day D (bounds are no longer UTC midnight, which excluded any
      // non-midnight timestamp) (#7).
      if (isDateOnly(value) || isDateOnly(value2)) {
        const c = toDate(cell)
        const lo = toDate(value)
        const hi = toDate(value2)
        if (c && lo && hi) {
          const hiEnd = new Date(hi.getFullYear(), hi.getMonth(), hi.getDate(), 23, 59, 59, 999)
          return c.getTime() >= lo.getTime() && c.getTime() <= hiEnd.getTime()
        }
      }
      // Numeric range. An empty cell has no value to compare (#6); a missing bound
      // is open-ended, so a half-built range filters on the bound present instead
      // of building a `<= NaN` predicate that emptied the grid to "No rows" (#8).
      const c = num(cell)
      if (Number.isNaN(c)) return false
      const lo = num(value)
      const hi = num(value2)
      return (Number.isNaN(lo) || c >= lo) && (Number.isNaN(hi) || c <= hi)
    }
    case 'isTrue':
      return cell === true || cell === 'true' || cell === 1 || cell === '1'
    case 'isFalse':
      return !(cell === true || cell === 'true' || cell === 1 || cell === '1')
    default:
      return true
  }
}

/**
 * Whether a `{ op, value }` condition (or bare value) would actually filter
 * anything — i.e. `evalCondition` wouldn't treat it as inactive. A half-built
 * builder row (operator chosen, no value) is **inactive**; unary ops
 * (`empty` / `isTrue` / …) are always active. Used to strip no-op conditions
 * before sending them to a server (client mode ignores them anyway).
 */
export function isConditionActive(raw: unknown): boolean {
  if (raw == null) return false
  let op: string
  let value: unknown
  let value2: unknown
  if (typeof raw === 'object' && raw !== null && 'op' in (raw as object)) {
    op = (raw as FilterCondition).op
    value = (raw as FilterCondition).value
    value2 = (raw as FilterCondition).value2
  } else {
    op = 'contains'
    value = raw
  }
  const unary = op === 'empty' || op === 'notEmpty' || op === 'isTrue' || op === 'isFalse'
  if (unary) return true
  // A set filter is active whenever a selection array is present (an empty array
  // means "match nothing", which is still an active filter).
  if (op === 'set') return Array.isArray(value)
  return !(isEmptyVal(value) && (op !== 'between' || isEmptyVal(value2)))
}

/** TanStack v9 `filterFn` that interprets a `{ op, value }` condition. */
export function filterFn_bstCondition(row: any, columnId: string, filterValue: unknown): boolean {
  return evalCondition(row.getValue(columnId), filterValue)
}
