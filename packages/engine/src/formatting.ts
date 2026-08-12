import type * as React from 'react'
import { evalCondition } from './filtering.js'
import type { FilterCondition } from './filtering.js'

/**
 * Conditional formatting (K3) — a declarative rule engine that maps a condition
 * to a cell/row class + style (and, for F5, optionally blanks the cell). Rules
 * reuse the E3 operator machinery (`{ op, value }` conditions via `evalCondition`)
 * or a free predicate. Evaluated at render time and merged into the same
 * class/style path as the `classNames` / `styles` slots — so it composes with a
 * theme rather than replacing it. Feed rules via `conditionalFormats`; build them
 * with `<BstConditionalFormatBuilder>`.
 */

export type BstFormatScope = 'cell' | 'row'

/** Context passed to a predicate `when`. */
export interface BstFormatContext<TData = any> {
  value: unknown
  row: TData
  rowId: string
  /** The column being evaluated (cell scope) or the rule's trigger column (row scope). */
  columnId?: string
}

/** A single conditional-format rule. */
export interface BstFormatRule<TData = any> {
  /** Stable id (useful for a builder UI). */
  id?: string
  /**
   * The column whose value the rule tests. For `scope: 'cell'`, also the column
   * whose cells get styled (omit to style **every** cell against its own value).
   * For `scope: 'row'`, the trigger column whose value decides the whole row.
   */
  columnId?: string
  /** `'cell'` (default) styles the matched cell; `'row'` styles the whole row. */
  scope?: BstFormatScope
  /** A `{ op, value }` condition (E3 operators) or a predicate over the row/cell. */
  when: FilterCondition | ((ctx: BstFormatContext<TData>) => boolean)
  /** Class name(s) applied on match. */
  className?: string
  /** Inline style / CSS vars applied on match. */
  style?: React.CSSProperties
  /** F5 — blank the matched cell's content (cell scope only). */
  hideContent?: boolean
}

/** The merged formatting for one cell or row. */
export interface FormatResult {
  className?: string
  style?: React.CSSProperties
  hideContent?: boolean
}

const UNARY = new Set(['empty', 'notEmpty', 'isTrue', 'isFalse'])
const isEmpty = (v: unknown): boolean =>
  v == null || v === '' || (Array.isArray(v) && v.length === 0)

/**
 * Unlike a *filter* (where an incomplete condition means "match everything"), an
 * incomplete *format* rule must match **nothing** — otherwise a half-typed rule
 * would paint the whole column. So a non-unary condition needs a value to be live.
 */
function conditionActive(cond: FilterCondition): boolean {
  if (UNARY.has(cond.op)) return true
  if (cond.op === 'between') return !isEmpty(cond.value) && !isEmpty(cond.value2)
  return !isEmpty(cond.value)
}

function matches<TData>(
  rule: BstFormatRule<TData>,
  ctx: BstFormatContext<TData>,
  getValue: (columnId: string) => unknown,
): boolean {
  if (typeof rule.when === 'function') return !!rule.when(ctx)
  const cond = rule.when
  if (!conditionActive(cond)) return false
  const testValue = rule.columnId != null ? getValue(rule.columnId) : ctx.value
  return evalCondition(testValue, cond)
}

function merge(into: FormatResult, rule: BstFormatRule, classes: string[]): void {
  if (rule.className) classes.push(rule.className)
  if (rule.style) into.style = { ...into.style, ...rule.style }
  if (rule.hideContent) into.hideContent = true
}

/** Merge all matching **cell-scope** rules for one cell. */
export function evalCellFormat<TData = any>(
  rules: ReadonlyArray<BstFormatRule<TData>>,
  ctx: BstFormatContext<TData>,
  getValue: (columnId: string) => unknown,
): FormatResult {
  const out: FormatResult = {}
  const classes: string[] = []
  for (const rule of rules) {
    if ((rule.scope ?? 'cell') !== 'cell') continue
    // A column-scoped rule only touches its own column; an unscoped rule touches all.
    if (rule.columnId != null && rule.columnId !== ctx.columnId) continue
    if (!matches(rule, ctx, getValue)) continue
    merge(out, rule, classes)
  }
  if (classes.length) out.className = classes.join(' ')
  return out
}

/** Merge all matching **row-scope** rules for one row. */
export function evalRowFormat<TData = any>(
  rules: ReadonlyArray<BstFormatRule<TData>>,
  row: TData,
  rowId: string,
  getValue: (columnId: string) => unknown,
): FormatResult {
  const out: FormatResult = {}
  const classes: string[] = []
  for (const rule of rules) {
    if ((rule.scope ?? 'cell') !== 'row') continue
    const value = rule.columnId != null ? getValue(rule.columnId) : undefined
    if (!matches(rule, { value, row, rowId, columnId: rule.columnId }, getValue)) continue
    merge(out, rule, classes)
  }
  if (classes.length) out.className = classes.join(' ')
  return out
}

/** A named style preset for the conditional-format builder. */
export interface BstFormatPreset {
  id: string
  label: string
  className?: string
  style?: React.CSSProperties
}

/** Default swatch presets offered by `<BstConditionalFormatBuilder>`. */
export const DEFAULT_FORMAT_PRESETS: BstFormatPreset[] = [
  { id: 'red', label: 'Red', style: { background: '#fee2e2', color: '#991b1b' } },
  { id: 'amber', label: 'Amber', style: { background: '#fef3c7', color: '#92400e' } },
  { id: 'green', label: 'Green', style: { background: '#dcfce7', color: '#166534' } },
  { id: 'blue', label: 'Blue', style: { background: '#dbeafe', color: '#1e40af' } },
  { id: 'bold', label: 'Bold', style: { fontWeight: 700 } },
  { id: 'strike', label: 'Strike', style: { textDecoration: 'line-through', opacity: 0.6 } },
]
