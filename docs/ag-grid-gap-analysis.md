# Bst-Table vs AG Grid — Gap Analysis & Build Roadmap

**Date:** 2026-08-13 (updated 2026-08-17) · **Bst-Table version:** 0.37.0 · **Compared against:** AG Grid Community + Enterprise (official feature matrix, ag-grid.com/license-pricing, fetched 2026-08-13).

> **Method.** No AG Grid MCP is connected to this session (the connector registry has none). This
> compares AG Grid's published Community/Enterprise matrix against our own `@bloomskill/table-mcp`
> feature registry (68 toggles, v0.33.1). "Paid" = AG Grid **Enterprise** (per-dev licence); "Free" =
> AG Grid **Community** (MIT). Bst-Table is MIT/Apache-only, so everything below we build ships free.

---

## TL;DR

Bst-Table is already **more complete than AG Grid Community** and matches a large slice of AG Grid
**Enterprise** — batch editing, range selection, clipboard, row grouping + aggregation, master-detail,
sparklines, and a server row model are all shipped and free. The real gaps cluster in **six areas**:

1. ~~**Export** (CSV / Excel / print) — *nothing shipped* — the single biggest hole.~~ ✅ **shipped v0.34.0** (Phase 5, dependency-free).
2. ~~**Set Filter** (Excel-style checkbox-of-distinct-values)~~ ✅ **shipped (Phase 6)**.
3. ~~**Status bar** (row count + sum/avg/count of the selected range)~~ ✅ **shipped (Phase 6)**.
4. **Right-click context menu** (general cell/grid, not just the row kebab).
5. **Tool-panel sidebar** (docked Columns + Filters panels).
6. **Pivoting** and **Tree Data** (self-referencing hierarchy).

Plus production-hardening: **i18n/localeText** and an **ARIA a11y audit** (grid-state save/restore ✅ shipped).

---

## Part 1 — What we already match (incl. AG Grid *paid* features we ship free)

| Capability | AG Grid tier | Bst-Table |
| --- | --- | --- |
| Sorting (multi-sort) | Free | ✅ `enableSorting` |
| Quick filter / global search | Free | ✅ `enableGlobalFilter` + `showSearch` |
| Column filters (text/number/date) | Free | ✅ `enableColumnFilters` |
| Floating (per-column) filters | Free | ✅ `enableColumnFilterRow` |
| Advanced Filter (query builder) | **Paid** | ✅ `showFilterBuilder` (`BstFilterBuilder`) |
| Pagination (client + server) | Free | ✅ `pagination` + DataSource |
| Column resize / move / pin / hide | Free | ✅ resize·reorder(drag)·pin·hide |
| Column spanning | Free | ✅ `enableCellSpanning` (col + row span) |
| Auto-size / size-to-fit | Free | ✅ dbl-click autosize · `fitColumns` |
| Row selection (single/multi/checkbox) | Free | ✅ `enableRowSelection` |
| **Cell range selection** | **Paid** | ✅ `enableCellSelection` + Excel keyboard nav |
| **Clipboard copy/paste** (incl. copy row/column) | **Paid** | ✅ `enableClipboard` (copy-column across all pages) |
| **Batch editing** (staged drafts, one save) | **Paid** | ✅ `enableEditing:{mode:'batch'}` + `onSave` + review sheet |
| Inline cell/row editing + rich editors | Free | ✅ 17 cell types + popup editors |
| Validation (sync/async/cross-column) | — | ✅ `enableValidation` |
| Undo / redo | Free | ✅ `enableUndoRedo` |
| **Row grouping + aggregation** | **Paid** | ✅ `enableGrouping` + `aggregationFn` |
| **Master / detail** | **Paid** | ✅ `enableExpanding` + `renderDetail` |
| Row pinning (top/bottom) | Free | ✅ `enableRowPinning` |
| **Sparklines** | **Paid** | ✅ `meta.type:'sparkline'` + `'kpi'` |
| Conditional cell/row styling | Free | ✅ `conditionalFormats` + rule builder |
| Server-side row model (sort/filter/page/select) | Free (basic) | ✅ `useBstDataSource` |
| Infinite / viewport scrolling | Free | ✅ `useBstInfiniteDataSource` |
| Row & column virtualization | Free | ✅ `enableVirtualization` (+ column) |
| Theming, dark mode, custom icons | Free | ✅ MUI + shadcn adapters |
| Access control (grid/row/column/cell disable) | — | ✅ cascade (F1–F4) |
| **Runtime settings sheet** (end-users toggle features) | — *(AG Grid has no equivalent)* | ✅ `showSettings` |
| **ERP field formats** (Aadhaar/PAN/GSTIN/IBAN/…) | — *(unique to us)* | ✅ `cellMeta.pattern` |
| **MCP server for AI agents** | Free (new) | ✅ `@bloomskill/table-mcp` |

---

## Part 2 — The gap list (features to develop)

Legend — **AG tier:** 🆓 Community · 💷 Enterprise (paid). **Status:** ❌ none · 🟡 partial.
**Effort:** S (days) · M (1–2 wks) · L (multi-week).

### P0 — Table-stakes / stability (close these first)

| # | Feature | AG tier | Status | Effort | Why it matters |
| --- | --- | --- | --- | --- | --- |
| 1 | **CSV export** | 🆓 | ✅ v0.34.0 | S | `enableExport` → toolbar menu + `runtime.exportCsv`; dep-free RFC-4180 + BOM. |
| 2 | **Excel (.xlsx) export** | 💷 | ✅ v0.34.0 | M | Dep-free `toXlsx` — real OOXML (store-only ZIP + SpreadsheetML), **no ExcelJS**; numeric cells typed. |
| 3 | **Print / print-friendly view** | 🆓 | ✅ v0.34.0 | S | `runtime.printTable` opens a standalone styled table view. |
| 4 | **Set Filter** (checkbox list of distinct values, search, select-all) | 💷 | ✅ P6 | M | Shipped: `enableSetFilter` + `BstSetFilter` — `{op:'set'}` condition on the existing `bstCondition` filterFn. |
| 5 | **Status bar** (total/filtered row count + sum·avg·min·max·count of selection) | 💷 | ✅ P6 | M | Shipped: `showStatusBar` footer + `runtime.getSelectionStats()`. |
| 6 | **Grid state save/restore API** (`getState`/`applyState`: sort+filter+columns+order+width+pin+group+visibility) | 🆓 | ✅ | M | Shipped: `getGridState`/`applyGridState`/`loadGridState`/`saveGridState`/`resetGridState` + the `useBstGridState` hook + adapters' one-line `gridState={{ key }}`. Full per-user view snapshot (`BstGridState`, version-stamped), stale-column-safe on restore. |
| 7 | **Localization / i18n** (`localeText` map, number/date locale) | 🆓 | ❌ | M | All chrome text is hardcoded English. Blocks non-English deployments. |
| 8 | **Accessibility audit + ARIA grid roles** (roles, `aria-*`, focus mgmt, screen-reader) | 🆓 | 🟡 | M | We have keyboard nav; needs a formal `role="grid"` pass + axe audit for WCAG. |
| 9 | **Formal loading / error / no-rows overlays** | 🆓 | 🟡 | S | `empty` slot exists; add first-class loading spinner + error overlay components. |

### P1 — High-value parity

| # | Feature | AG tier | Status | Effort | Why it matters |
| --- | --- | --- | --- | --- | --- |
| 10 | **Right-click context menu** (copy, export, autosize, pin, group — configurable) | 💷 | ✅ P6 | M | Shipped: `enableContextMenu` + `getContextMenuItems` — dep-free popup with Copy / Export / Autosize defaults + custom items. |
| 11 | **Tool-panel sidebar** (docked Columns panel + Filters panel) | 💷 | ⏭️ skip | M/L | **Deliberately not built** — redundant with the toolbar's Columns menu (show/hide · pin · reorder · group) + Filters button. Prototyped and reverted 2026-08-17. |
| 12 | **Fill handle** (drag corner to fill/increment a range) | 💷 | ❌ | M | Excel muscle-memory; builds on existing range selection. |
| 13 | **Find** (search box that highlights + jumps between matches, not filter) | 💷 | ❌ | M | Distinct from global filter (which hides non-matches). |
| 14 | **Tree Data** (self-referencing parent/child hierarchy, one column) | 💷 | ❌ | L | We have master-detail + grouping, not recursive tree data. Common for BOM/org/folder data. |
| 15 | **Managed row dragging** (drag to reorder rows / across grids) | 🆓 | ❌ | M | We drag columns, not rows. |
| 16 | **Row-number / index column** (pinned, auto) | 💷 | ❌ | S | Trivial but frequently requested. |
| 17 | **Pivoting** (turn row values into columns + aggregate) | 💷 | ❌ | L | The heavyweight reporting feature; grouping is the foundation. |

### P2 — Advanced / enterprise-heavy

| # | Feature | AG tier | Status | Effort | Why it matters |
| --- | --- | --- | --- | --- | --- |
| 18 | **Integrated charts** (select range → interactive chart from grid data) | 💷 | ❌ | L | We ship *in-cell* sparkline/KPI only. Use uPlot/Recharts (MIT). |
| 19 | **Advanced server-side row model** (server-side grouping/pivot/tree, lazy group expand, transactions) | 💷 | 🟡 | L | DataSource covers sort/filter/page; not lazy server grouping. Needed at 1M-row tier. |
| 20 | **Calculated / formula columns** (derived values + expression columns) | 💷 | 🟡 | M | TanStack `accessorFn` gives derived values; no first-class calc/expression column UI. |
| 21 | **Cell notes / comments** | 💷 | ❌ | M | Per-cell annotation popovers. |
| 22 | **Multi-filter** (stack e.g. text + set on one column) | 💷 | ❌ | S/M | Combine filter types per column. |
| 23 | **Cell flashing on data change** (highlight changed cells) | 🆓 | ❌ | S | Live-data feedback; pairs with the (unbuilt) I5 WebSocket merge. |
| 24 | **Live/streaming updates (I5)** (WebSocket/parent merge with dirty-cell conflict policy) | — | ❌ | L | Listed NOT BUILT in COVERAGE.md; needed for real-time grids. |

### P3 — Polish / niche

| # | Feature | AG tier | Status | Effort | Notes |
| --- | --- | --- | --- | --- | --- |
| 25 | **Row/column move + sort animations** | 🆓 | ❌ | S/M | Perceived-quality polish. |
| 26 | **RTL support** | 🆓 | ❌ | M | Arabic/Hebrew layouts. |
| 27 | **Auto-generate columns from data** | 🆓 | ❌ | S | Zero-config first render. |
| 28 | **Auto row height** (fit wrapped content) | 🆓 | ✅ P8 | M | Shipped: `enableAutoRowHeight` + `meta.wrapText` — cells wrap, rows grow (browser-measured, dep-free). |
| 29 | **Aligned grids** (two grids share column state) | 🆓 | ❌ | S | Niche (header/detail split). |
| 30 | **AI toolkit** (natural-language → grid ops) | 💷 | 🟡 | L | We already expose an MCP server; a runtime NL layer is optional. |

---

## Part 3 — Recommended build order

> **Phase mapping (`Plan.md` PART 3).** Milestone A → finish **Phase 4** hardening + **Phase 5** (export) ·
> B → **Phase 6** · C → **Phase 7** · D → **Phase 8**. Per-feature status IDs `AG1–AG29` live in `COVERAGE.md`.

**Milestone A — "Production-ready" (P0):** Export (CSV → Excel → print) ✅ · Set Filter ✅ · Status bar ✅ ·
Grid-state API ✅ · i18n · a11y audit · overlays. *These are the items whose absence blocks real
adoption and the ones AG Grid users notice missing on day one — **i18n + a11y + overlays remain**.*

**Milestone B — "Feels like AG Grid" (P1):** Context menu · Tool-panel sidebar · Fill handle · Find ·
Row drag · Row-number column. *(Tree Data + Pivoting are P1 in value but L in effort — schedule as
their own slices.)*

**Milestone C — "Enterprise heavyweight" (P2):** Integrated charts · advanced SSRM · calculated
columns · cell notes · live updates (I5).

**Milestone D — Polish (P3):** animations · RTL · auto-height · auto-columns.

Each item ships behind a `§12` toggle (`enable*`/`show*`) per the repo's feature-toggle convention,
with a settings-sheet entry, a demo, README + CHANGELOG updates, and a version bump — same Definition
of Done as every other feature.

---

## Appendix — AG Grid features we intentionally do **not** need

- **Viewport row model** — hyper-specialised real-time trading model; the DataSource + infinite scroll
  cover the practical cases.
- **AG Grid's per-seat Enterprise licence / watermark** — the whole reason Bst-Table exists; excluded
  by design (MIT/Apache only).
