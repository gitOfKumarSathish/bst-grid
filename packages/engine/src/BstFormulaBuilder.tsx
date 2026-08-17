import * as React from 'react'
import { compileFormula, validateFormula, listFormulaFunctions, FormulaError } from './formula-expr.js'
import { resolveBstIcons } from './icons.js'
import type { BstIconOverrides } from './icons.js'
import type { BstUserFormula } from './types.js'

/** Minimal column descriptor the builder shows as an insertable field chip. */
export interface BstFormulaBuilderColumn {
  id: string
  header?: string
  type?: string
}

/** The result cell types offered in the builder's Type select. */
const RESULT_TYPES = ['number', 'text', 'boolean', 'date'] as const

/**
 * Neutral, theme-agnostic **formula (calculated column) builder** (AG17) — the
 * runtime cousin of `meta.formula`. Controlled: reads `formulas` and calls
 * `onChange` with the next array; feed the result to
 * `useBstTable({ formulaColumns })`. Each row edits a computed column's header,
 * Excel-style expression and result type, with live validation + a preview
 * against `sampleRow`. Styled with shared `bst-*` classes so both skins reuse it.
 */
export function BstFormulaBuilder({
  formulas,
  onChange,
  columns,
  sampleRow,
  className,
  icons,
}: {
  formulas: BstUserFormula[]
  onChange: (formulas: BstUserFormula[]) => void
  columns: BstFormulaBuilderColumn[]
  /** A row used to preview each formula's result (usually the first data row). */
  sampleRow?: Record<string, unknown>
  className?: string
  icons?: BstIconOverrides
}) {
  const I = resolveBstIcons(icons)
  const [helpOpen, setHelpOpen] = React.useState(false)

  const add = () => {
    onChange([...formulas, { id: nextId(formulas), header: 'Calc', expression: '', type: 'number' }])
  }
  const patch = (idx: number, next: BstUserFormula) =>
    onChange(formulas.map((f, i) => (i === idx ? next : f)))
  const remove = (idx: number) => onChange(formulas.filter((_, i) => i !== idx))

  return (
    <div className={'bst-fx-builder' + (className ? ' ' + className : '')}>
      {formulas.length === 0 && (
        <div className="bst-filter-empty">
          No calculated columns yet. Add one — e.g. <code>=qty * price</code> or{' '}
          <code>=ROUND(amount / SUM(amount) * 100, 1)</code>.
        </div>
      )}

      {formulas.map((f, idx) => {
        const check = validateFormula(f.expression)
        let preview: React.ReactNode = null
        if (f.expression.trim() && check.ok && sampleRow) {
          const v = compileFormula(f.expression).fn(sampleRow, { rows: [sampleRow], index: 0 })
          preview =
            v instanceof FormulaError ? (
              <span className="bst-fx-err">{String(v)}</span>
            ) : (
              <span className="bst-fx-preview">= {formatPreview(v)}</span>
            )
        } else if (f.expression.trim() && !check.ok) {
          preview = <span className="bst-fx-err">{check.error ?? '#ERROR!'}</span>
        }
        return (
          <div className="bst-fx-row" key={f.id}>
            <input
              className="bst-input bst-fx-name"
              aria-label="Column name"
              placeholder="Column name"
              value={f.header}
              onChange={(e) => patch(idx, { ...f, header: e.target.value })}
            />
            <input
              className={'bst-input bst-fx-expr' + (f.expression.trim() && !check.ok ? ' bst-fx-invalid' : '')}
              aria-label="Formula"
              placeholder="=qty * price"
              spellCheck={false}
              value={f.expression}
              onChange={(e) => patch(idx, { ...f, expression: e.target.value })}
            />
            <select
              className="bst-input bst-fx-type"
              aria-label="Result type"
              value={f.type ?? 'number'}
              onChange={(e) => patch(idx, { ...f, type: e.target.value })}
            >
              {RESULT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <span className="bst-fx-status">{preview}</span>
            <button
              type="button"
              className="bst-action bst-filter-remove"
              aria-label="Remove calculated column"
              onClick={() => remove(idx)}
            >
              <I.remove size={14} />
            </button>
          </div>
        )
      })}

      <div className="bst-filter-actions">
        <button type="button" className="bst-action" onClick={add}>
          + Add calculated column
        </button>
        {formulas.length > 0 && (
          <button type="button" className="bst-action" onClick={() => onChange([])}>
            Clear all
          </button>
        )}
        <button type="button" className="bst-action" onClick={() => setHelpOpen((o) => !o)}>
          {helpOpen ? 'Hide help' : 'Functions & fields'}
        </button>
      </div>

      {helpOpen && (
        <div className="bst-fx-help">
          {columns.length > 0 && (
            <div className="bst-fx-fields">
              <b>Fields:</b>{' '}
              {columns.map((c) => (
                <code key={c.id} className="bst-fx-field">
                  {/\s/.test(c.id) ? `[${c.id}]` : c.id}
                </code>
              ))}
            </div>
          )}
          <div className="bst-fx-funcs">
            <b>Functions:</b>
            <ul>
              {listFormulaFunctions().map((fn) => (
                <li key={fn.name}>
                  <code>{fn.name}</code> — {fn.help}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

/** Compute a fresh, non-colliding column id (no Date.now / Math.random). */
function nextId(formulas: BstUserFormula[]): string {
  const ids = new Set(formulas.map((f) => f.id))
  let n = formulas.length + 1
  while (ids.has('calc' + n)) n++
  return 'calc' + n
}

function formatPreview(v: unknown): string {
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
  if (v == null || v === '') return '(blank)'
  return String(v)
}
