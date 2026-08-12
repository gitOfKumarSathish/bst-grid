import * as React from 'react'
import { operatorsForType, operatorArity } from './filtering.js'
import type { FilterCondition } from './filtering.js'
import { resolveBstIcons } from './icons.js'
import type { BstIconOverrides } from './icons.js'

interface ColFilter {
  id: string
  value: FilterCondition
}

/**
 * Neutral, theme-agnostic filter-builder UI (E3). Reads/writes v9's
 * `columnFilters` state (one condition per column) using the operator-aware
 * `bstCondition` filterFn. Rendered by adapters inside their own popover/panel;
 * styled purely with `bst-*` classes + CSS vars, so both skins share it.
 */
export function BstFilterBuilder({
  table,
  className,
  icons,
}: {
  table: any
  className?: string
  /** Body-icon overrides (uses the `remove` slot). */
  icons?: BstIconOverrides
}) {
  const I = resolveBstIcons(icons)
  const filterable: any[] = table.getAllLeafColumns().filter((c: any) => {
    const t = (c.columnDef.meta?.type ?? 'text') as string
    return c.getCanFilter?.() !== false && t !== 'action'
  })
  const colById = new Map<string, any>(filterable.map((c) => [c.id, c]))
  const label = (c: any) =>
    typeof c.columnDef.header === 'string' && c.columnDef.header ? c.columnDef.header : c.id
  const typeOf = (id: string): string => (colById.get(id)?.columnDef.meta?.type ?? 'text') as string
  const optionsOf = (id: string): any[] => (colById.get(id)?.columnDef.meta?.options ?? []) as any[]

  const filters: ColFilter[] = (table.state.columnFilters ?? []) as ColFilter[]
  const setFilters = (next: ColFilter[]) => table.setColumnFilters(next)

  const addFilter = () => {
    const used = new Set(filters.map((f) => f.id))
    const col = filterable.find((c) => !used.has(c.id))
    if (!col) return
    const ops = operatorsForType(typeOf(col.id))
    setFilters([...filters, { id: col.id, value: { op: ops[0].op, value: '' } }])
  }

  const patchRow = (
    idx: number,
    patch: Partial<{ id: string; op: string; value: unknown; value2: unknown }>,
  ) => {
    const next = filters.slice()
    const cur = next[idx]
    let id = cur.id
    let cond: FilterCondition = { ...(cur.value ?? { op: 'contains' }) }
    if (patch.id != null && patch.id !== cur.id) {
      id = patch.id
      const ops = operatorsForType(typeOf(id))
      cond = { op: ops[0].op, value: '' } // reset for the new column's type
    }
    if (patch.op != null) cond.op = patch.op
    if ('value' in patch) cond.value = patch.value
    if ('value2' in patch) cond.value2 = patch.value2
    next[idx] = { id, value: cond }
    setFilters(next)
  }

  const removeRow = (idx: number) => setFilters(filters.filter((_, i) => i !== idx))
  const clearAll = () => setFilters([])
  const canAdd = filterable.length > 0 && filters.length < filterable.length

  return (
    <div className={'bst-filter-builder' + (className ? ' ' + className : '')}>
      {filters.length === 0 && (
        <div className="bst-filter-empty">No filters yet. Add one to narrow the rows.</div>
      )}
      {filters.map((f, idx) => {
        const t = typeOf(f.id)
        const ops = operatorsForType(t)
        const op = f.value?.op ?? ops[0].op
        const arity = operatorArity(t, op)
        return (
          <div className="bst-filter-row" key={f.id + ':' + idx}>
            <select
              className="bst-input bst-filter-col"
              aria-label="Filter column"
              value={f.id}
              onChange={(e) => patchRow(idx, { id: e.target.value })}
            >
              {filterable.map((c) => (
                <option key={c.id} value={c.id}>
                  {label(c)}
                </option>
              ))}
            </select>
            <select
              className="bst-input bst-filter-op"
              aria-label="Filter operator"
              value={op}
              onChange={(e) => patchRow(idx, { op: e.target.value })}
            >
              {ops.map((o) => (
                <option key={o.op} value={o.op}>
                  {o.label}
                </option>
              ))}
            </select>
            {arity >= 1 && (
              <FilterValueInput
                type={t}
                options={optionsOf(f.id)}
                value={f.value?.value ?? ''}
                ariaLabel="Filter value"
                onChange={(v) => patchRow(idx, { value: v })}
              />
            )}
            {arity === 2 && (
              <>
                <span className="bst-filter-and">and</span>
                <FilterValueInput
                  type={t}
                  options={optionsOf(f.id)}
                  value={f.value?.value2 ?? ''}
                  ariaLabel="Filter value 2"
                  onChange={(v) => patchRow(idx, { value2: v })}
                />
              </>
            )}
            <button
              type="button"
              className="bst-action bst-filter-remove"
              aria-label={`Remove filter ${label(colById.get(f.id))}`}
              onClick={() => removeRow(idx)}
            >
              <I.remove size={14} />
            </button>
          </div>
        )
      })}
      <div className="bst-filter-actions">
        <button type="button" className="bst-action" disabled={!canAdd} onClick={addFilter}>
          + Add filter
        </button>
        {filters.length > 0 && (
          <button type="button" className="bst-action" onClick={clearAll}>
            Clear all
          </button>
        )}
      </div>
    </div>
  )
}

function FilterValueInput({
  type,
  options,
  value,
  ariaLabel,
  onChange,
}: {
  type: string
  options: any[]
  value: unknown
  ariaLabel: string
  onChange: (v: unknown) => void
}) {
  if (type === 'singleSelect' || type === 'multiSelect' || type === 'radio') {
    return (
      <select
        className="bst-input bst-filter-val"
        aria-label={ariaLabel}
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label ?? o.value}
          </option>
        ))}
      </select>
    )
  }
  const inputType = type === 'number' ? 'number' : type === 'dateTime' ? 'date' : 'text'
  return (
    <input
      className="bst-input bst-filter-val"
      type={inputType}
      aria-label={ariaLabel}
      value={String(value ?? '')}
      placeholder="value"
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
