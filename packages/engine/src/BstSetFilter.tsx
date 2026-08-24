import * as React from 'react'

/**
 * Set Filter (X4) — an Excel-style **checklist of distinct values** for one
 * column. A dependency-free popover (search · select-all / clear · per-value
 * counts · a "(Blanks)" entry) that drives the column's own `columnFilters` entry
 * via `setFilterValue({ op: 'set', value })` — interpreted by the `bstCondition`
 * filterFn, so it composes with the filter builder and the rest of the filter row.
 *
 * When every value is checked the filter clears (inactive); an empty selection
 * matches nothing. Distinct values come from `meta.options` when present, else
 * from the grid's rows (client mode — under a server `DataSource` it lists the
 * loaded page). Rendered inside the per-column filter row for eligible columns;
 * also exported for bespoke filter UIs.
 */

/** One selectable value in the checklist. */
export interface BstSetFilterOption {
  /** The stored value (stringified) — what the filter matches on. */
  value: string
  /** Human label (from `meta.options`, else the value itself). */
  label: string
  /** How many rows carry this value (when derivable). */
  count?: number
}

export interface BstSetFilterProps {
  /** The TanStack column this filter targets. */
  column: any
  /** The TanStack table instance (source of distinct values). */
  table: any
  /** Accessible label; defaults to the column header / id. */
  label?: string
  /**
   * Controlled slot (multi-filter, X11). When `onChange` is given, the checklist
   * reads/writes this `{ op:'set', value }` condition instead of the column's whole
   * filter value — so it can be one part of a stacked filter. Omit both for the
   * default standalone mode (drives `column.setFilterValue` directly).
   */
  value?: { op?: string; value?: string[] }
  onChange?: (condition: { op: 'set'; value: string[] } | undefined) => void
}

const BLANK = ''
const BLANK_LABEL = '(Blanks)'

const isBlank = (v: unknown): boolean =>
  v == null || v === '' || (Array.isArray(v) && v.length === 0)

/** Distinct values for the column: declared `meta.options` first (stable order +
 *  labels), then any data value not covered, plus a "(Blanks)" bucket. */
function computeOptions(column: any, table: any): BstSetFilterOption[] {
  const meta = (column.columnDef?.meta ?? {}) as {
    options?: Array<{ value: unknown; label?: string }>
    type?: string
  }
  const rows = (table.getCoreRowModel?.()?.rows ?? []) as any[]
  const counts = new Map<string, number>()
  let blanks = 0
  for (const r of rows) {
    const v = r.getValue(column.id)
    if (isBlank(v)) {
      blanks++
      continue
    }
    if (Array.isArray(v)) for (const el of v) counts.set(String(el), (counts.get(String(el)) ?? 0) + 1)
    else counts.set(String(v), (counts.get(String(v)) ?? 0) + 1)
  }

  const declared = meta.options ?? []
  let opts: BstSetFilterOption[]
  if (declared.length) {
    opts = declared.map((o) => {
      const value = String(o.value)
      return { value, label: o.label ?? value, count: counts.get(value) }
    })
    for (const [k, c] of counts) {
      if (!declared.some((o) => String(o.value) === k)) opts.push({ value: k, label: k, count: c })
    }
  } else if (meta.type === 'boolean') {
    opts = [
      { value: 'true', label: 'Yes', count: counts.get('true') },
      { value: 'false', label: 'No', count: counts.get('false') },
    ]
  } else {
    opts = [...counts.keys()]
      .sort((a, b) => a.localeCompare(b))
      .map((k) => ({ value: k, label: k, count: counts.get(k) }))
  }
  if (blanks > 0) opts.push({ value: BLANK, label: BLANK_LABEL, count: blanks })
  return opts
}

export function BstSetFilter({ column, table, label, value, onChange }: BstSetFilterProps) {
  // Controlled slot (multi-filter) vs standalone (drives the column filter value).
  const controlled = typeof onChange === 'function'
  const getFV = () =>
    (controlled ? value : column.getFilterValue?.()) as { op?: string; value?: string[] } | undefined
  const setFV = (c: { op: 'set'; value: string[] } | undefined) =>
    controlled ? onChange!(c) : column.setFilterValue(c)
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [pos, setPos] = React.useState<{ top: number; left: number; width: number } | null>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const panelRef = React.useRef<HTMLDivElement>(null)

  // Recompute distinct values whenever the panel opens (data may have changed).
  const options = React.useMemo(
    () => (open ? computeOptions(column, table) : []),
    [open, column, table],
  )
  const allValues = React.useMemo(() => options.map((o) => o.value), [options])

  const filterValue = getFV()
  const selected =
    filterValue?.op === 'set' && Array.isArray(filterValue.value) ? new Set(filterValue.value) : null
  const allChecked = selected === null
  const isChecked = (v: string) => (selected ? selected.has(v) : true)
  const activeCount = selected ? selected.size : allValues.length

  const apply = (checked: string[]) => {
    if (allValues.length > 0 && checked.length === allValues.length) setFV(undefined)
    else setFV({ op: 'set', value: checked })
  }
  const toggle = (v: string) => {
    const cur = selected ? new Set(selected) : new Set(allValues)
    if (cur.has(v)) cur.delete(v)
    else cur.add(v)
    apply([...cur])
  }

  const openPanel = () => {
    const r = triggerRef.current?.getBoundingClientRect()
    if (r) setPos({ top: r.bottom + 2, left: r.left, width: Math.max(r.width, 200) })
    setQuery('')
    setOpen(true)
  }

  React.useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (panelRef.current?.contains(t) || triggerRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onScroll = (e: Event) => {
      if (panelRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open])

  const visible = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options
  const triggerText = allChecked ? 'All' : activeCount === 0 ? 'None' : `${activeCount} selected`

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={'bst-input bst-colfilter bst-setfilter-trigger' + (allChecked ? '' : ' bst-setfilter-active')}
        aria-label={`Filter ${label ?? column.id}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openPanel())}
      >
        <span className="bst-setfilter-triglabel">{triggerText}</span>
        <span aria-hidden="true" className="bst-setfilter-caret">▾</span>
      </button>
      {open && pos && (
        <div
          ref={panelRef}
          className="bst-setfilter-panel"
          role="listbox"
          aria-label={`${label ?? column.id} values`}
          style={{ position: 'fixed', top: pos.top, left: pos.left, minWidth: pos.width }}
        >
          <input
            className="bst-input bst-setfilter-search"
            placeholder="Search…"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="bst-setfilter-actions">
            <button type="button" className="bst-setfilter-link" onClick={() => setFV(undefined)}>
              Select all
            </button>
            <button
              type="button"
              className="bst-setfilter-link"
              onClick={() => setFV({ op: 'set', value: [] })}
            >
              Clear
            </button>
          </div>
          <div className="bst-setfilter-list">
            {visible.length === 0 && <div className="bst-setfilter-empty">No values</div>}
            {visible.map((o) => (
              <label key={o.value} className="bst-setfilter-item">
                <input type="checkbox" checked={isChecked(o.value)} onChange={() => toggle(o.value)} />
                <span className="bst-setfilter-label">{o.label}</span>
                {o.count != null && <span className="bst-setfilter-count">{o.count}</span>}
              </label>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
