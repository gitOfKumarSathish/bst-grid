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
  const n = Number(v)
  if (!Number.isNaN(n)) return n
  const t = Date.parse(String(v)) // allow date strings for </>/between
  return Number.isNaN(t) ? NaN : t
}

const isEmptyVal = (v: unknown): boolean =>
  v == null || v === '' || (Array.isArray(v) && v.length === 0)

const looseEq = (a: unknown, b: unknown): boolean =>
  str(a).toLowerCase() === str(b).toLowerCase()

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
  // A filter with no value (other than unary ops) is treated as inactive.
  const unary = op === 'empty' || op === 'notEmpty' || op === 'isTrue' || op === 'isFalse'
  if (!unary && isEmptyVal(value) && (op !== 'between' || isEmptyVal(value2))) return true

  switch (op) {
    case 'contains':
      return includesArr(cell, value)
    case 'notContains':
      return !includesArr(cell, value)
    case 'equals':
      return Array.isArray(cell) ? cell.some((x) => looseEq(x, value)) : looseEq(cell, value)
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
      const c = num(cell)
      return c >= num(value) && c <= num(value2)
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
  return !(isEmptyVal(value) && (op !== 'between' || isEmptyVal(value2)))
}

/** TanStack v9 `filterFn` that interprets a `{ op, value }` condition. */
export function filterFn_bstCondition(row: any, columnId: string, filterValue: unknown): boolean {
  return evalCondition(row.getValue(columnId), filterValue)
}
