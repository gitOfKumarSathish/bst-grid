import * as React from 'react'
import { operatorsForType, operatorArity } from './filtering.js'
import type { FilterCondition } from './filtering.js'
import { DEFAULT_FORMAT_PRESETS } from './formatting.js'
import type { BstFormatRule, BstFormatPreset, BstFormatScope } from './formatting.js'
import { resolveBstIcons } from './icons.js'
import type { BstIconOverrides } from './icons.js'

/** Minimal column descriptor the builder needs (id + label + cell type). */
export interface BstFormatBuilderColumn {
  id: string
  header?: string
  type?: string
}

const presetKey = (p: { className?: string; style?: React.CSSProperties }): string =>
  JSON.stringify({ c: p.className ?? '', s: p.style ?? {} })

/**
 * Neutral, theme-agnostic **conditional-format builder** (K3) — the styling
 * cousin of `<BstFilterBuilder>`. Controlled: it reads `rules` and calls
 * `onChange` with the next array. Each row is `scope · column · operator · value ·
 * style`. Feed the result to `useBstTable({ conditionalFormats })`. Styled purely
 * with `bst-*` classes, so both skins share it.
 */
export function BstConditionalFormatBuilder<TData = any>({
  rules,
  onChange,
  columns,
  presets = DEFAULT_FORMAT_PRESETS,
  className,
  icons,
}: {
  rules: BstFormatRule<TData>[]
  onChange: (rules: BstFormatRule<TData>[]) => void
  columns: BstFormatBuilderColumn[]
  presets?: BstFormatPreset[]
  className?: string
  /** Body-icon overrides (uses the `remove` slot). */
  icons?: BstIconOverrides
}) {
  const I = resolveBstIcons(icons)
  const colById = new Map(columns.map((c) => [c.id, c]))
  const label = (id?: string) => (id != null ? colById.get(id)?.header ?? id : '')
  const typeOf = (id?: string): string => (id != null ? colById.get(id)?.type ?? 'text' : 'text')
  const byKey = new Map(presets.map((p) => [presetKey(p), p.id]))
  const first = columns[0]

  const add = () => {
    if (!first) return
    const ops = operatorsForType(typeOf(first.id))
    const p = presets[0]
    onChange([
      ...rules,
      {
        columnId: first.id,
        scope: 'cell',
        when: { op: ops[0].op, value: '' },
        className: p?.className,
        style: p?.style,
      },
    ])
  }
  const patch = (idx: number, next: BstFormatRule<TData>) =>
    onChange(rules.map((r, i) => (i === idx ? next : r)))
  const remove = (idx: number) => onChange(rules.filter((_, i) => i !== idx))

  return (
    <div className={'bst-cf-builder' + (className ? ' ' + className : '')}>
      {rules.length === 0 && (
        <div className="bst-filter-empty">
          No formatting rules yet. Add one to colour cells or rows by value.
        </div>
      )}
      {rules.map((rule, idx) => {
        // Predicate rules are code-authored; the builder can only edit conditions.
        if (typeof rule.when === 'function') {
          return (
            <div className="bst-cf-row" key={idx}>
              <span className="bst-cf-custom">Custom rule ({label(rule.columnId) || 'predicate'})</span>
              <button
                type="button"
                className="bst-action bst-filter-remove"
                aria-label="Remove rule"
                onClick={() => remove(idx)}
              >
                <I.remove size={14} />
              </button>
            </div>
          )
        }
        const cond = rule.when as FilterCondition
        const t = typeOf(rule.columnId)
        const ops = operatorsForType(t)
        const arity = operatorArity(t, cond.op)
        const selectedPreset = byKey.get(presetKey(rule)) ?? ''
        return (
          <div className="bst-cf-row" key={idx}>
            <select
              className="bst-input bst-cf-scope"
              aria-label="Rule scope"
              value={rule.scope ?? 'cell'}
              onChange={(e) => patch(idx, { ...rule, scope: e.target.value as BstFormatScope })}
            >
              <option value="cell">Cell</option>
              <option value="row">Row</option>
            </select>
            <select
              className="bst-input bst-cf-col"
              aria-label="Rule column"
              value={rule.columnId ?? ''}
              onChange={(e) => {
                const id = e.target.value
                const nextOps = operatorsForType(typeOf(id))
                patch(idx, { ...rule, columnId: id, when: { op: nextOps[0].op, value: '' } })
              }}
            >
              {columns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.header ?? c.id}
                </option>
              ))}
            </select>
            <select
              className="bst-input bst-cf-op"
              aria-label="Rule operator"
              value={cond.op}
              onChange={(e) => patch(idx, { ...rule, when: { ...cond, op: e.target.value } })}
            >
              {ops.map((o) => (
                <option key={o.op} value={o.op}>
                  {o.label}
                </option>
              ))}
            </select>
            {arity >= 1 && (
              <FormatValueInput
                type={t}
                value={cond.value ?? ''}
                onChange={(v) => patch(idx, { ...rule, when: { ...cond, value: v } })}
              />
            )}
            {arity === 2 && (
              <FormatValueInput
                type={t}
                value={cond.value2 ?? ''}
                onChange={(v) => patch(idx, { ...rule, when: { ...cond, value2: v } })}
              />
            )}
            <select
              className="bst-input bst-cf-style"
              aria-label="Rule style"
              value={selectedPreset}
              onChange={(e) => {
                const p = presets.find((x) => x.id === e.target.value)
                patch(idx, { ...rule, className: p?.className, style: p?.style })
              }}
            >
              {selectedPreset === '' && <option value="">—</option>}
              {presets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="bst-action bst-filter-remove"
              aria-label="Remove rule"
              onClick={() => remove(idx)}
            >
              <I.remove size={14} />
            </button>
          </div>
        )
      })}
      <div className="bst-filter-actions">
        <button type="button" className="bst-action" disabled={!first} onClick={add}>
          + Add rule
        </button>
        {rules.length > 0 && (
          <button type="button" className="bst-action" onClick={() => onChange([])}>
            Clear all
          </button>
        )}
      </div>
    </div>
  )
}

function FormatValueInput({
  type,
  value,
  onChange,
}: {
  type: string
  value: unknown
  onChange: (v: unknown) => void
}) {
  const inputType = type === 'number' ? 'number' : type === 'dateTime' ? 'date' : 'text'
  return (
    <input
      className="bst-input bst-cf-val"
      type={inputType}
      aria-label="Rule value"
      value={String(value ?? '')}
      placeholder="value"
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
