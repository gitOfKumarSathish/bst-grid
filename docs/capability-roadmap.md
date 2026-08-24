# Bst-Table — Extended capability roadmap

**Date:** 2026-08-13 (updated 2026-08-24) · **Bst-Table version:** 0.41.0

> **Method.** This is an inward-looking audit: it compares Bst-Table's own feature registry
> (`BST_SETTINGS_REGISTRY`, `CLAUDE.md` §12, `COVERAGE.md`) against the capability set that
> production teams expect from a full-featured enterprise data grid, and schedules what is
> missing. Status IDs **`X1–X29`** are ours and live in [`COVERAGE.md`](../COVERAGE.md); phases
> map to `Plan.md` PART 3. Nothing here is derived from another vendor's documentation, and
> Bst-Table depends only on MIT/Apache packages — so every capability below ships free of
> per-seat licensing.

---

## TL;DR

Bst-Table already covers the full breadth of a commercial grid's free tier and most of what such
products gate behind a paid tier — batch editing, range selection, clipboard, row grouping +
aggregation, master-detail, sparklines, and a server row model are all shipped. The remaining gaps
cluster in **four areas**:

1. ~~**Export** (CSV / Excel / print) — the single biggest hole.~~ ✅ **shipped v0.34.0** (dependency-free).
2. ~~**Set Filter**, **status bar**, **context menu**, **multi-filter**, **row numbers**, **overlays**.~~ ✅ **shipped (Phases 6 / 8)**.
3. **Interaction tail** — Find (highlight + jump), fill handle, managed row dragging.
4. **Analytics + scale tail** — integrated range charts, lazy server-side grouping, formula columns.

Plus production hardening: an **ARIA / a11y audit** and **live-update merge (I5)**.
Deliberately **out of scope**: tree data, pivoting, cell notes, i18n, RTL (see
[`COVERAGE.md`](../COVERAGE.md) "Optional").

---

## Part 1 — What ships today

| Capability | Bst-Table |
| --- | --- |
| Sorting (multi-sort) | ✅ `enableSorting` |
| Quick filter / global search | ✅ `enableGlobalFilter` + `showSearch` |
| Column filters (text / number / date) | ✅ `enableColumnFilters` |
| Per-column filter row | ✅ `enableColumnFilterRow` |
| Query-builder filtering | ✅ `showFilterBuilder` (`BstFilterBuilder`) |
| Set Filter (distinct-values checklist) | ✅ `enableSetFilter` (`BstSetFilter`) |
| Multi-filter (stack types per column) | ✅ `enableMultiFilter` + array `meta.filter` |
| Pagination (client + server) | ✅ `pagination` + `DataSource` |
| Column resize / move / pin / hide | ✅ resize · reorder (drag) · pin · hide |
| Cell spanning (col + row) | ✅ `enableCellSpanning` |
| Auto-size / size-to-fit | ✅ dbl-click autosize · `fitColumns` |
| Row selection (single / multi / checkbox) | ✅ `enableRowSelection` |
| Cell range selection + spreadsheet keyboard nav | ✅ `enableCellSelection` |
| Clipboard copy / paste (incl. row + column) | ✅ `enableClipboard` (copy-column across all pages) |
| Batch editing (staged drafts, one save) | ✅ `enableEditing:{mode:'batch'}` + `onSave` + review sheet |
| Inline cell / row editing + rich editors | ✅ 17 cell types + popup editors |
| Validation (sync / async / cross-column) | ✅ `enableValidation` |
| Undo / redo | ✅ `enableUndoRedo` |
| Row grouping + aggregation | ✅ `enableGrouping` + `aggregationFn` |
| Master / detail | ✅ `enableExpanding` + `renderDetail` |
| Row pinning (top / bottom) | ✅ `enableRowPinning` |
| In-cell sparklines + KPI tiles | ✅ `meta.type:'sparkline'` / `'kpi'` |
| Conditional cell / row styling | ✅ `conditionalFormats` + rule builder |
| Server-side row model (sort / filter / page) | ✅ `useBstDataSource` |
| Infinite / viewport scrolling | ✅ `useBstInfiniteDataSource` |
| Row & column virtualization | ✅ `enableVirtualization` (+ column) |
| Export — CSV / Excel / print | ✅ `enableExport` (dependency-free) |
| Status bar (counts + selection stats) | ✅ `showStatusBar` |
| Right-click context menu | ✅ `enableContextMenu` |
| Row-number column | ✅ `enableRowNumbers` |
| Auto row height | ✅ `enableAutoRowHeight` |
| Auto-generate columns from data | ✅ `enableAutoColumns` |
| Loading / error overlays | ✅ `enableOverlays` |
| Grid-state save / restore | ✅ `getGridState` / `useBstGridState` / `gridState={{ key }}` |
| Theming, dark mode, custom icons | ✅ MUI + shadcn adapters |
| Access control (grid / row / column / cell disable) | ✅ cascade (F1–F4) |
| Runtime settings sheet (end-users toggle features) | ✅ `showSettings` |
| ERP field formats (Aadhaar / PAN / GSTIN / IBAN / …) | ✅ `cellMeta.pattern` |
| MCP server for AI agents | ✅ `@bloomskill/table-mcp` |

---

## Part 2 — The gap list

**Status:** ✅ shipped · 🟡 partial · ❌ none · ⏭️ skipped · ⚪ optional (out of scope).
**Effort:** S (days) · M (1–2 wks) · L (multi-week).

### P0 — Table-stakes / stability

| # | Capability | ID | Status | Effort | Why it matters |
| --- | --- | --- | --- | --- | --- |
| 1 | **CSV export** | X1 | ✅ v0.34.0 | S | `enableExport` → toolbar menu + `runtime.exportCsv`; dep-free RFC-4180 + BOM. |
| 2 | **Excel (.xlsx) export** | X2 | ✅ v0.34.0 | M | Dep-free `toXlsx` — real OOXML (store-only ZIP + SpreadsheetML), **no ExcelJS**; numeric cells typed. |
| 3 | **Print / print-friendly view** | X3 | ✅ v0.34.0 | S | `runtime.printTable` opens a standalone styled table view. |
| 4 | **Set Filter** (checklist of distinct values, search, select-all) | X4 | ✅ P6 | M | `enableSetFilter` + `BstSetFilter` — an `{op:'set'}` condition on the existing `bstCondition` filterFn. |
| 5 | **Status bar** (total / filtered counts + sum·avg·min·max·count of selection) | X5 | ✅ P6 | M | `showStatusBar` footer + `runtime.getSelectionStats()`. |
| 6 | **Grid-state save / restore API** | X21 | ✅ | M | `getGridState`/`applyGridState`/`loadGridState`/`saveGridState`/`resetGridState` + `useBstGridState` + the adapters' one-line `gridState={{ key }}`. Version-stamped, stale-column-safe on restore. |
| 7 | **Localization / i18n** | X19 | ⚪ | M | Out of scope — the few built-in strings are overridable at the call site. |
| 8 | **Accessibility audit + ARIA grid roles** | X20 | 🟡 | M | Keyboard nav exists; needs a formal `role="grid"` pass + axe audit for WCAG. **Top remaining P0.** |
| 9 | **Loading / error / no-rows overlays** | X23 | ✅ v0.40.0 | S | `enableOverlays` (default on) + `loading`/`error`, fed automatically by the DataSource hooks. |

### P1 — High-value

| # | Capability | ID | Status | Effort | Why it matters |
| --- | --- | --- | --- | --- | --- |
| 10 | **Right-click context menu** | X6 | ✅ P6 | M | `enableContextMenu` + `getContextMenuItems` — dep-free popup with Copy / Export / Autosize defaults + custom items. |
| 11 | **Tool-panel sidebar** (docked Columns + Filters) | X7 | ⏭️ skip | M/L | **Deliberately not built** — redundant with the toolbar's Columns menu (show/hide · pin · reorder · group) + Filters button. Prototyped and reverted 2026-08-17. |
| 12 | **Fill handle** (drag corner to fill / increment a range) | X12 | ❌ | M | Spreadsheet muscle-memory; builds on existing range selection. |
| 13 | **Find** (highlight + jump between matches, not filter) | X8 | ❌ | M | Distinct from the global filter, which hides non-matches. |
| 14 | **Tree data** (self-referencing hierarchy) | X13 | ⚪ | L | Out of scope 2026-08-24 — master-detail + grouping cover current hierarchical needs. |
| 15 | **Managed row dragging** (reorder rows) | X10 | ❌ | M | We drag columns, not rows. |
| 16 | **Row-number / index column** | X9 | ✅ v0.40.0 | S | `enableRowNumbers` + `rowNumberHeader` — leading `#` column, pinned to the start. |
| 17 | **Pivoting** | X14 | ⚪ | L | Out of scope 2026-08-24 — grouping + aggregation cover current reporting needs. |

### P2 — Advanced / heavyweight

| # | Capability | ID | Status | Effort | Why it matters |
| --- | --- | --- | --- | --- | --- |
| 18 | **Integrated charts** (select range → interactive chart) | X15 | ❌ | L | We ship *in-cell* sparkline/KPI only. Use uPlot / Recharts (MIT). |
| 19 | **Advanced server-side row model** (server grouping / lazy expand / transactions) | X16 | 🟡 | L | The DataSource covers sort/filter/page, not lazy server grouping. Needed at the 1M-row tier. |
| 20 | **Calculated / formula columns** | X17 | 🟡 | M | TanStack `accessorFn` gives derived values; no first-class expression-column UI. |
| 21 | **Cell notes / comments** | X18 | ⚪ | M | Out of scope — annotation is outside the current grid scope. |
| 22 | **Multi-filter** (stack e.g. text + set on one column) | X11 | ✅ | S/M | `enableMultiFilter` + array `meta.filter` (e.g. `['condition','set']`), AND-combined in the filter row. |
| 23 | **Cell flashing on data change** | X28 | ❌ | S | Live-data feedback; pairs with the unbuilt live-update merge. |
| 24 | **Live / streaming updates (I5)** | X22 | ❌ | L | WebSocket / parent merge with a dirty-cell conflict policy. The last ❌ in the original 58-leaf spec. |

### P3 — Polish / niche

| # | Capability | ID | Status | Effort | Notes |
| --- | --- | --- | --- | --- | --- |
| 25 | **Row / column move + sort animations** | X25 | ❌ | S/M | Perceived-quality polish. |
| 26 | **RTL support** | X24 | ⚪ | M | Out of scope — no RTL-locale consumer yet. |
| 27 | **Auto-generate columns from data** | X27 | ✅ v0.40.0 | S | `enableAutoColumns` + `autoColumns` + `autoGenerateColumns(data, opts)`. |
| 28 | **Auto row height** (fit wrapped content) | X26 | ✅ P8 | M | `enableAutoRowHeight` + `meta.wrapText` — cells wrap, rows grow (browser-measured, dep-free). |
| 29 | **Aligned grids** (two grids share column state) | X29 | ❌ | S | Niche (header / detail split). |

---

## Part 3 — Build order

> **Phase mapping (`Plan.md` PART 3).** Milestone A → finish **Phase 4** hardening + **Phase 5**
> (export) · B → **Phase 6** · C → **Phase 7** · D → **Phase 8**.

**Milestone A — "Production-ready" (P0):** export ✅ · Set Filter ✅ · status bar ✅ · grid-state API ✅ ·
overlays ✅ · **a11y audit — remaining**. *(i18n moved to Optional.)*

**Milestone B — "Complete grid chrome" (P1):** context menu ✅ · row-number column ✅ ·
multi-filter ✅ · **remaining: Find · fill handle · row drag**. *(Sidebar skipped; tree data +
pivoting out of scope.)*

**Milestone C — "Heavyweight analytics" (P2):** integrated charts · advanced SSRM · calculated
columns · live updates (I5).

**Milestone D — Polish (P3):** animations · auto-height ✅ · auto-columns ✅ · aligned grids.

Each item ships behind a `CLAUDE.md` §12 toggle (`enable*` / `show*`) per the repo's feature-toggle
convention, with a settings-sheet entry, a demo, README + CHANGELOG updates, and a version bump —
the same Definition of Done as every other feature.

---

## Appendix — capabilities we intentionally do **not** need

- **A viewport row model** — a hyper-specialised real-time trading model; the DataSource +
  infinite scroll cover the practical cases.
- **Per-seat licensing, licence keys and watermarks** — the whole reason Bst-Table exists;
  excluded by design (MIT/Apache dependencies only).
