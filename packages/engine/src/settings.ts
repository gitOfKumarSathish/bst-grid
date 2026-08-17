import * as React from 'react'
import type { BstTableEngineToggles, UseBstTableOptions } from './types.js'

/**
 * Runtime settings (§12 chrome). The adapters render a gear → a side "sheet"
 * where the end-user flips this grid's features on/off at runtime, **per table**,
 * persisted to `localStorage`. The logic is pure/headless and lives here so both
 * adapters share one model; each renders it in its own idiom (MUI Drawer, shadcn
 * slide-over). Nothing here imports a UI library.
 */

/**
 * Every feature the settings sheet can toggle. **Derived** from
 * `BstTableEngineToggles` (the §12 `enable*` layer), so a new engine toggle added
 * there flows in automatically — plus a few toggles that currently live directly on
 * `UseBstTableOptions`, and the adapter chrome flags the sheet also exposes.
 * `SETTINGS_META` below is typed `Record<BstSettingKey, …>`, so adding a toggle to
 * `BstTableEngineToggles` **breaks the build until it's registered** — the sheet
 * can't silently fall out of sync (CLAUDE.md §12 "settings-sheet parity").
 */
export type BstSettingKey =
  | keyof BstTableEngineToggles
  | ExtraEngineSettingKey
  | ChromeSettingKey

/**
 * Engine toggles that currently live on `UseBstTableOptions` rather than the
 * `BstTableEngineToggles` interface (render / expand / pin / group features). New
 * engine toggles SHOULD be declared in `BstTableEngineToggles` instead — then they
 * flow into `BstSettingKey` for free. `_AssertExtrasAreOptions` keeps this list
 * honest (each must be a real table option).
 */
type ExtraEngineSettingKey =
  | 'enableExpanding'
  | 'enableRowPinning'
  | 'enableRowResize'
  | 'enableGrouping'
  | 'enableCellSpanning'

/** Adapter chrome capabilities the sheet exposes (not part of the engine toggles). */
type ChromeSettingKey =
  | 'showFilterBuilder'
  | 'showFormatBuilder'
  | 'showDensityToggle'
  | 'showStatusBar'

// Compile-time guard: every "extra" key must be a real `UseBstTableOptions` field,
// so a rename/removal upstream surfaces here rather than silently dropping a toggle.
type _AssertExtrasAreOptions =
  ExtraEngineSettingKey extends keyof UseBstTableOptions<any> ? true : false
const _extrasAreOptions: _AssertExtrasAreOptions = true
void _extrasAreOptions

/**
 * Author-facing metadata for one setting. Only `group` + `default` are required;
 * `label` (humanized from the key), `layer` (inferred from the `show`/`enable`
 * prefix) and `alwaysShow` (false) default sensibly — so registering a newly added
 * toggle is a one-liner like `enableFoo: { group: 'Columns', default: false }`.
 */
interface SettingMeta {
  /** Section heading in the sheet. */
  group: string
  /** Resolved value when the developer passes nothing — must match the engine default. */
  default: boolean
  /** Display label. Omit → humanized from the key (`enableFoo` → "Foo"). */
  label?: string
  /** Engine behaviour vs adapter chrome. Omit → inferred (`show*` = chrome, else engine). */
  layer?: 'engine' | 'chrome'
  /** Show even while off — for default-on features a user may switch off. Omit → false. */
  alwaysShow?: boolean
  /** Short hint rendered under the label. */
  hint?: string
  /**
   * Prerequisite toggles: this setting is inert unless **every** listed key is
   * active (transitively). The sheet renders it **disabled** while any prerequisite
   * is off — mirrors the `requires` edges in `packages/mcp/src/rules.ts`.
   */
  requires?: BstSettingKey[]
  /**
   * Derive the developer-provided value from OTHER props when the flag itself is
   * unset — for toggles whose semantic lives inside an options object (e.g.
   * `enableBatchEditing` follows `enableEditing.mode === 'batch'`). Receives the
   * props (raw or override-applied); an explicit boolean prop must win inside it.
   */
  getBase?: (props: Record<string, unknown>) => boolean
}

/**
 * THE SINGLE SOURCE OF TRUTH for the settings sheet. Typed `Record<BstSettingKey, …>`
 * where `BstSettingKey` is derived from `BstTableEngineToggles`, so **adding a new
 * engine toggle makes this object fail to compile until it's registered** — the
 * sheet cannot silently miss a feature (CLAUDE.md §12 "settings-sheet parity").
 * Authored in display order; grouped by `group`.
 */
const SETTINGS_META: Record<BstSettingKey, SettingMeta> = {
  // Data operations (default-on — the user may switch these off)
  enableSorting: { group: 'Data operations', default: true, alwaysShow: true, label: 'Sorting' },
  enableGlobalFilter: { group: 'Data operations', default: true, alwaysShow: true, label: 'Global search', hint: 'The toolbar search box' },
  enableColumnFilters: { group: 'Data operations', default: true, alwaysShow: true, label: 'Column filters' },
  enableSetFilter: { group: 'Data operations', default: false, alwaysShow: true, label: 'Set filter', hint: 'Checklist of distinct values per column (AG4) · needs the per-column filter row', requires: ['enableColumnFilterRow'] },
  pagination: { group: 'Data operations', default: true, alwaysShow: true, label: 'Pagination', hint: 'Off shows every row' },
  enableGrouping: { group: 'Data operations', default: false, alwaysShow: true, label: 'Row grouping', hint: 'Group rows + aggregates (E4)' },
  // Columns
  enableColumnResizing: { group: 'Columns', default: true, alwaysShow: true, label: 'Resize columns' },
  enableHiding: { group: 'Columns', default: true, alwaysShow: true, label: 'Show / hide columns' },
  enableColumnPinning: { group: 'Columns', default: false, label: 'Pin columns' },
  enableColumnOrdering: { group: 'Columns', default: false, label: 'Reorder columns' },
  enableColumnFilterRow: { group: 'Columns', default: false, alwaysShow: true, label: 'Per-column filter row', hint: 'Filter inputs under each header · needs Column filters', requires: ['enableColumnFilters'] },
  fitColumns: { group: 'Columns', default: false, label: 'Fit columns to width', hint: 'No horizontal scroll (G3)' },
  enableResponsive: { group: 'Columns', default: false, label: 'Responsive columns', hint: 'Hide low-priority columns when narrow (G4)' },
  // Rows
  enableExpanding: { group: 'Rows', default: false, label: 'Master-detail rows', hint: 'Expandable detail panel (A4)' },
  enableRowPinning: { group: 'Rows', default: false, label: 'Pin rows', hint: 'Freeze rows top / bottom (G1)' },
  enableRowResize: { group: 'Rows', default: false, alwaysShow: true, label: 'Resize rows', hint: 'Drag a row edge to set its height (G2)' },
  // Editing
  enableEditing: { group: 'Editing', default: false, label: 'Inline editing' },
  enableBatchEditing: {
    group: 'Editing',
    default: false,
    alwaysShow: true,
    label: 'Batch editing',
    hint: 'Edits stay unsaved until Review & save — one batched call · needs Inline editing',
    requires: ['enableEditing'],
    // The switch reflects the REAL mode: an explicit flag wins, else it follows
    // `enableEditing.mode === 'batch'` — so a `{ mode: 'batch' }` grid shows ON.
    getBase: (p) =>
      typeof p.enableBatchEditing === 'boolean'
        ? p.enableBatchEditing
        : typeof p.enableEditing === 'object' &&
          p.enableEditing !== null &&
          (p.enableEditing as { mode?: string }).mode === 'batch',
  },
  enableValidation: { group: 'Editing', default: false, label: 'Validation', requires: ['enableEditing'] },
  enableRowActions: { group: 'Editing', default: false, label: 'Add / delete rows' },
  enableUndoRedo: { group: 'Editing', default: false, label: 'Undo / redo' },
  // Selection & clipboard
  enableRowSelection: { group: 'Selection & clipboard', default: false, label: 'Row selection' },
  enableCellSelection: { group: 'Selection & clipboard', default: false, label: 'Cell selection' },
  enableClipboard: { group: 'Selection & clipboard', default: false, label: 'Copy & paste', hint: 'Ctrl/⌘+C · Ctrl/⌘+V' },
  enableCopyColumn: { group: 'Selection & clipboard', default: true, alwaysShow: true, label: 'Copy column', hint: 'Ctrl/⌘+Space · needs Copy & paste', requires: ['enableClipboard'] },
  enableCopyRow: { group: 'Selection & clipboard', default: true, alwaysShow: true, label: 'Copy row', hint: 'Shift+Space · needs Copy & paste', requires: ['enableClipboard'] },
  // Display
  enableCellSpanning: { group: 'Display', default: false, label: 'Cell spanning', hint: 'Merge repeated cells (A5)' },
  enableConditionalFormatting: {
    group: 'Display',
    default: true,
    alwaysShow: true,
    label: 'Conditional formatting',
    hint: 'Rule-based cell / row styling (K3) — needs `conditionalFormats` rules',
  },
  showFilterBuilder: { group: 'Display', default: false, label: 'Filter builder', requires: ['enableColumnFilters'] },
  showFormatBuilder: {
    group: 'Display',
    default: false,
    alwaysShow: true,
    label: 'Format builder',
    hint: 'Toolbar "Formats" button — build rules at runtime (K3)',
    requires: ['enableConditionalFormatting'],
  },
  showDensityToggle: { group: 'Display', default: false, label: 'Density toggle' },
  showStatusBar: { group: 'Display', default: false, label: 'Status bar', hint: 'Row counts + sum / avg / min / max of the selection (AG5)' },
  // Export (AG1–AG3) — an opt-in capability plus per-format sub-toggles, mirroring
  // the clipboard pattern (master off; formats default-on, always shown with a
  // "needs Export" hint) so an end-user can switch export on and pick formats.
  enableExport: {
    group: 'Export',
    default: false,
    alwaysShow: true,
    label: 'Export',
    hint: 'Toolbar Export menu — download CSV / Excel or print',
  },
  enableCsvExport: {
    group: 'Export',
    default: true,
    alwaysShow: true,
    label: 'CSV export',
    hint: 'needs Export',
    requires: ['enableExport'],
  },
  enableExcelExport: {
    group: 'Export',
    default: true,
    alwaysShow: true,
    label: 'Excel export',
    hint: 'needs Export',
    requires: ['enableExport'],
  },
  enablePrint: {
    group: 'Export',
    default: true,
    alwaysShow: true,
    label: 'Print',
    hint: 'needs Export',
    requires: ['enableExport'],
  },
  // Performance (default-off, but always shown so a user can switch virtualization
  // on themselves for a large grid — like Row grouping)
  enableVirtualization: {
    group: 'Performance',
    default: false,
    alwaysShow: true,
    label: 'Row virtualization',
    hint: 'Render only the visible rows — for large datasets (D1)',
  },
  enableColumnVirtualization: {
    group: 'Performance',
    default: false,
    alwaysShow: true,
    label: 'Column virtualization',
    hint: 'Also window wide grids horizontally · needs Row virtualization',
    requires: ['enableVirtualization'],
  },
}

/** Fallback label for a toggle registered without an explicit `label`. */
function humanizeKey(key: string): string {
  const bare = key.replace(/^(enable|show)/, '')
  const spaced = bare.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase() : key
}

interface RegistryEntry {
  key: BstSettingKey
  label: string
  group: string
  layer: 'engine' | 'chrome'
  default: boolean
  alwaysShow: boolean
  hint?: string
  requires?: BstSettingKey[]
  getBase?: (props: Record<string, unknown>) => boolean
}

/**
 * The runtime list the sheet renders, built from {@link SETTINGS_META} in author
 * order with defaults resolved (label ← humanized key, layer ← key prefix,
 * alwaysShow ← false). Downstream code (the hook, `applySettingsOverrides`) reads
 * only this.
 */
export const BST_SETTINGS_REGISTRY: readonly RegistryEntry[] = (
  Object.keys(SETTINGS_META) as BstSettingKey[]
).map((key) => {
  const m = SETTINGS_META[key]
  return {
    key,
    label: m.label ?? humanizeKey(key),
    group: m.group,
    layer: m.layer ?? (key.startsWith('show') ? 'chrome' : 'engine'),
    default: m.default,
    alwaysShow: m.alwaysShow ?? false,
    hint: m.hint,
    requires: m.requires,
    getBase: m.getBase,
  }
})

const DEFAULT_BY_KEY: Record<BstSettingKey, boolean> = BST_SETTINGS_REGISTRY.reduce(
  (acc, e) => {
    acc[e.key] = e.default
    return acc
  },
  {} as Record<BstSettingKey, boolean>,
)

const ENTRY_BY_KEY = new Map(BST_SETTINGS_REGISTRY.map((e) => [e.key, e]))

/** A setting's resolved value on a props object (explicit prop, derived, or default). */
function baseOf(key: BstSettingKey, props: Record<string, unknown>): boolean {
  const entry = ENTRY_BY_KEY.get(key)
  if (entry?.getBase) return entry.getBase(props)
  return resolveBool(props[key], DEFAULT_BY_KEY[key])
}

/**
 * Is a setting **effectively active** — on itself AND every prerequisite
 * (`requires`) transitively active? Drives the sheet's dependency cascade: turning
 * a parent off disables its dependents, and re-enabling it brings them back. Pure;
 * exported for testing. `props` should be the override-applied (effective) props.
 */
export function isSettingActive(
  key: BstSettingKey,
  props: Record<string, unknown>,
  seen: Set<BstSettingKey> = new Set(),
): boolean {
  if (seen.has(key)) return true
  seen.add(key)
  if (!baseOf(key, props)) return false
  const reqs = ENTRY_BY_KEY.get(key)?.requires
  if (reqs) {
    for (const r of reqs) if (!isSettingActive(r, props, seen)) return false
  }
  return true
}

/** One toggle in the settings sheet — its live value plus mutators. */
export interface BstSettingsItem {
  key: BstSettingKey
  label: string
  group: string
  layer: 'engine' | 'chrome'
  hint?: string
  /** Current effective value — the user override if present, else the developer prop / default. */
  value: boolean
  /** True when the user has changed this away from the developer-provided value. */
  overridden: boolean
  /**
   * A prerequisite (`requires`) is off, so this toggle can't take effect — the
   * sheet renders it disabled and non-interactive until the parent is back on.
   */
  disabled: boolean
  /** Label of the prerequisite blocking it (for a tooltip), when `disabled`. */
  disabledBy?: string
  /**
   * The prerequisite this item hangs off **within the same group** — set when the
   * required parent is also rendered in this section, so the sheet can draw a
   * tree/branch connector from parent to child. Cross-group prerequisites (parent
   * in another section) stay unlinked; the "Needs …" hint still names them.
   */
  parentKey?: BstSettingKey
  /** This is the last child of its `parentKey` in the group — the connector's
   *  vertical branch line stops at this row. */
  lastChild?: boolean
  set: (next: boolean) => void
  toggle: () => void
  reset: () => void
}

/** Items grouped for sheet rendering (a labelled section per group). */
export interface BstSettingsGroup {
  name: string
  items: BstSettingsItem[]
}

/** The headless model an adapter renders as the settings sheet. */
export interface BstSettingsModel {
  /** Flat, in registry order. */
  items: BstSettingsItem[]
  /** Grouped for sheet rendering. */
  groups: BstSettingsGroup[]
  /** How many settings the user has changed from the developer configuration. */
  overrideCount: number
  /** Clear every override — back to the developer-provided configuration. */
  reset: () => void
  /** The `localStorage` key in use, or `null` when persistence is off. */
  storageKey: string | null
}

/** Options for the settings sheet (`showSettings={{ … }}`). Passing an object implies enabled (§12). */
export interface BstSettingsOptions {
  /**
   * Restrict the sheet to these keys (rendered in registry order). Omit → auto:
   * the default-on data/display features plus any opt-in feature the developer
   * has enabled.
   */
  features?: BstSettingKey[]
  /** Sheet heading. Default `"Table settings"`. */
  title?: string
  /**
   * Explicit `localStorage` key. Omit → a key derived from the column ids (stable
   * per grid shape). Set this to disambiguate two grids with identical columns.
   */
  persistKey?: string
  /** Persist the user's choices to `localStorage`. Default `true`. */
  persist?: boolean
  /**
   * Show a search box in the sheet to filter the toggle list — the sheet can list
   * 30+ features, so it's on by default but appears **only once the sheet has more
   * than a handful of items** (`{@link shouldShowSettingsSearch}`). `true` always
   * shows it; `false` never. Filters by label / hint / group name.
   */
  search?: boolean
}

/** Overrides map — a subset of keys the user has explicitly set. */
export type BstSettingsOverrides = Partial<Record<BstSettingKey, boolean>>

const STORAGE_PREFIX = 'bst-table:settings:'

function resolveBool(v: unknown, dflt: boolean): boolean {
  if (v === undefined || v === null) return dflt
  return v !== false
}

/**
 * Apply user overrides onto a table-options object. Only the registry keys are
 * touched; everything else passes through untouched. Object-valued flags
 * (`pagination`, `enableEditing`, …) keep their options when toggled back on and
 * become `false` when toggled off.
 */
export function applySettingsOverrides<P extends object>(
  props: P,
  overrides: BstSettingsOverrides | undefined,
): P {
  if (!overrides || Object.keys(overrides).length === 0) return props
  const rec = props as Record<string, unknown>
  const next: Record<string, unknown> = { ...rec }
  for (const entry of BST_SETTINGS_REGISTRY) {
    const ov = overrides[entry.key]
    if (ov === undefined) continue
    if (ov === false) {
      next[entry.key] = false
    } else {
      const original = rec[entry.key]
      // Preserve a passed options object (e.g. { pageSize }); else plain `true`.
      next[entry.key] = original && typeof original === 'object' ? original : true
    }
  }
  return next as P
}

/** Stable short key derived from the column ids (djb2), so persistence survives reloads. */
function deriveKey(columns: ReadonlyArray<Record<string, unknown>> | undefined): string {
  const ids = (columns ?? [])
    .map((c) => String(c.id ?? c.accessorKey ?? ''))
    .join('|')
  let h = 5381
  for (let i = 0; i < ids.length; i++) h = (((h << 5) + h) ^ ids.charCodeAt(i)) | 0
  return 'c' + (h >>> 0).toString(36)
}

function readStored(storageKey: string | null): BstSettingsOverrides {
  if (!storageKey || typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const out: BstSettingsOverrides = {}
    for (const entry of BST_SETTINGS_REGISTRY) {
      const v = parsed[entry.key]
      if (typeof v === 'boolean') out[entry.key] = v
    }
    return out
  } catch {
    return {}
  }
}

function writeStored(storageKey: string | null, overrides: BstSettingsOverrides): void {
  if (!storageKey || typeof window === 'undefined') return
  try {
    if (Object.keys(overrides).length === 0) window.localStorage.removeItem(storageKey)
    else window.localStorage.setItem(storageKey, JSON.stringify(overrides))
  } catch {
    /* storage unavailable (private mode / quota) — stay in-memory */
  }
}

/**
 * Headless settings hook the adapters wrap in a sheet. Holds the per-table
 * override state (so it is naturally per instance), persists it to `localStorage`,
 * and returns:
 *  - `props` — the incoming options with overrides applied, ready to feed
 *    `useBstGrid` / drive the `show*` chrome, so flipping a switch actually
 *    turns the feature on/off; and
 *  - `model` — the toggle list (grouped) the sheet renders.
 */
export function useBstSettings<P extends object>(
  props: P,
  options?: BstSettingsOptions,
): { props: P; model: BstSettingsModel } {
  const rec = props as Record<string, unknown>
  const persist = options?.persist ?? true
  const columns = rec.columns as ReadonlyArray<Record<string, unknown>> | undefined
  const derived = React.useMemo(() => deriveKey(columns), [columns])
  const storageKey = persist ? STORAGE_PREFIX + (options?.persistKey ?? derived) : null

  const [overrides, setOverrides] = React.useState<BstSettingsOverrides>(() =>
    readStored(persist ? STORAGE_PREFIX + (options?.persistKey ?? deriveKey(columns)) : null),
  )

  React.useEffect(() => {
    writeStored(storageKey, overrides)
  }, [storageKey, overrides])

  const setOverride = React.useCallback(
    (key: BstSettingKey, next: boolean) => {
      // When the user picks the developer's own value, drop the override (so
      // "overridden" stays truthful and storage stays minimal).
      const devBase = baseOf(key, rec)
      setOverrides((prev) => {
        const cp = { ...prev }
        if (next === devBase) delete cp[key]
        else cp[key] = next
        return cp
      })
    },
    [rec],
  )

  const clearOverride = React.useCallback((key: BstSettingKey) => {
    setOverrides((prev) => {
      if (!(key in prev)) return prev
      const cp = { ...prev }
      delete cp[key]
      return cp
    })
  }, [])

  const reset = React.useCallback(() => setOverrides({}), [])

  const effectiveProps = applySettingsOverrides(props, overrides)
  const effRec = effectiveProps as Record<string, unknown>

  const explicit = options?.features
  const items: BstSettingsItem[] = []
  for (const entry of BST_SETTINGS_REGISTRY) {
    const base = baseOf(entry.key, rec)
    const shown = explicit
      ? explicit.includes(entry.key)
      : entry.alwaysShow || base || entry.key in overrides
    if (!shown) continue
    const value = baseOf(entry.key, effRec)
    // Dependency cascade: disabled while any prerequisite is (transitively) off.
    const blockingReq = entry.requires?.find((r) => !isSettingActive(r, effRec))
    items.push({
      key: entry.key,
      label: entry.label,
      group: entry.group,
      layer: entry.layer,
      hint: entry.hint,
      value,
      overridden: entry.key in overrides,
      disabled: blockingReq !== undefined,
      disabledBy: blockingReq ? ENTRY_BY_KEY.get(blockingReq)?.label : undefined,
      set: (next: boolean) => setOverride(entry.key, next),
      toggle: () => setOverride(entry.key, !value),
      reset: () => clearOverride(entry.key),
    })
  }

  const groups: BstSettingsGroup[] = []
  for (const it of items) {
    let g = groups.find((x) => x.name === it.group)
    if (!g) {
      g = { name: it.group, items: [] }
      groups.push(g)
    }
    g.items.push(it)
  }

  // Tree connectors: link a child to a prerequisite that's visible in the SAME
  // group (parent → child branch), and mark the last child so the adapter's
  // connector line stops there. Cross-group prerequisites stay unlinked.
  for (const g of groups) {
    const inGroup = new Set(g.items.map((it) => it.key))
    for (const it of g.items) {
      const parent = ENTRY_BY_KEY.get(it.key)?.requires?.find((r) => inGroup.has(r))
      if (parent) it.parentKey = parent
    }
    for (let i = 0; i < g.items.length; i++) {
      const it = g.items[i]
      if (!it.parentKey) continue
      it.lastChild = !g.items.some((n, j) => j > i && n.parentKey === it.parentKey)
    }
  }

  const model: BstSettingsModel = {
    items,
    groups,
    overrideCount: Object.keys(overrides).length,
    reset,
    storageKey,
  }

  return { props: effectiveProps, model }
}

/**
 * Filter the sheet's groups by a free-text query (case-insensitive), for the
 * search box. A setting matches on its **label** or **hint**; a group whose
 * **name** matches keeps all its items (so "export" surfaces the whole Export
 * section). An empty / whitespace query returns the groups unchanged. Pure — both
 * adapters share it, like the rest of this model. Returns fresh group objects
 * (item references reused) so callers never mutate the source model.
 */
export function filterSettingsGroups(
  groups: readonly BstSettingsGroup[],
  query: string,
): BstSettingsGroup[] {
  const q = query.trim().toLowerCase()
  if (!q) return groups.map((g) => ({ name: g.name, items: g.items.slice() }))
  const out: BstSettingsGroup[] = []
  for (const g of groups) {
    if (g.name.toLowerCase().includes(q)) {
      out.push({ name: g.name, items: g.items.slice() })
      continue
    }
    const items = g.items.filter(
      (it) =>
        it.label.toLowerCase().includes(q) ||
        (it.hint ? it.hint.toLowerCase().includes(q) : false),
    )
    if (items.length) out.push({ name: g.name, items })
  }
  return out
}

/**
 * Resolve whether the sheet shows its search box. `false` → never; `true` →
 * always; omitted → auto (only for lists longer than a handful, so a short sheet
 * stays clutter-free). Keeps both adapters' behaviour identical.
 */
export function shouldShowSettingsSearch(
  search: boolean | undefined,
  itemCount: number,
): boolean {
  if (search === false) return false
  if (search === true) return true
  return itemCount > 6
}
