# Bst-Table — Spec coverage matrix (58 leaves)

_2026-08-13, synced at **v0.39.0**. Compares the `CLAUDE.md` §11 requirement leaves
(A1–M2) against what has shipped (`CHANGELOG` v0.1.0 → v0.39.0), verified against the
engine + adapter source. Re-run when a version ships._

> **Two matrices below.** (1) the original 58-leaf spec (A1–M2, immediately following); (2) the
> **extended capability matrix** (`X1–X29`, at the bottom) — capabilities beyond the original spec,
> from the 2026-08-13 market review ([`docs/capability-roadmap.md`](docs/capability-roadmap.md)),
> phased in `Plan.md` PART 3 "Phases 5–8".

**Legend:** ✅ built · 🟡 partial · ❌ missing (needs the Phase-4 foundation / a new dep) · ⏭️ deliberately skipped · ⚪ optional / out of scope (kept, not scheduled)
**Tally:** ✅ 55 built · 🟡 2 partial · ❌ 1 missing (of 58). _(**B5 now ✅** — in-cell **PDF thumbnail** (`cellMeta.pdfThumbnail`, rendered by **pdf.js** via an injected renderer — engine stays dep-free), the last B5 gap; I3 file ops ✅ — formal `DataSource.uploadFile`/`deleteFile`/`getFileUrl` verbs + `createFileHandlers` bridge on top of the cell-level upload/delete; D1 row/column virtualization + A2 infinite scroll shipped on `@tanstack/react-virtual` → both ✅, leaving I5 the only ❌; v0.30.0 — batch editing + `getChangeSet` + single-call `onSave` → I4 now partial; v0.28.0 server DataSource foundation → A3 server pagination done; v0.25.0 G2 row resize; v0.23.0 B1 QR/barcode + J2 rich-text)_

| ID | Requirement | Status | Where / why |
|---|---|---|---|
| A1 | Inline editing | ✅ | P2 — `enableEditing` |
| A2 | Infinite / virtual scroll | ✅ | *virtual* scroll = D1 (`enableVirtualization`); *infinite* = **`useBstInfiniteDataSource`** (fetch-on-scroll append + `onReachEnd`) over the server `DataSource` |
| A3 | Pagination (client/server) | ✅ | client + **server (manual mode) v0.28.0** — `useBstDataSource` / `DataSource` (manual sort/filter/paginate passthrough) |
| A4 | Nested / master-detail | ✅ | **v0.13.0** — `enableExpanding` + `renderDetail` |
| A5 | Inline charts / cell spanning | ✅ | **v0.12.0** spanning (`enableCellSpanning`, col+row) · charts = M1 |
| A6 | High-perf at 3 scales | 🟡 | workflow tier ✅; **10k client-virtual now ✅ (D1)**; server tier reachable v0.28.0 + infinite scroll (A2); 1M migration tier still to prove end-to-end |
| B1 | Text / long text | ✅ | P2 · QR + barcode **v0.23.0** (dep-free inline-SVG; QR verified bit-for-bit vs `qrcode`) · **ERP field formats** (`cellMeta.pattern`: PAN/GSTIN/IFSC/IBAN/SWIFT/email/…) |
| B2 | Number (currency/precision/formats) | ✅ | P2 — `Intl` formats · **ERP field formats** (`cellMeta.pattern`: Aadhaar/Verhoeff, PIN, card/Luhn) |
| B3 | Date / time | ✅ | P2 |
| B4 | Boolean | ✅ | P2 (now an injectable check icon) |
| B5 | Files & attachments | ✅ | file cell + image thumbnails + file-type icons + **in-cell PDF thumbnail** (`cellMeta.pdfThumbnail` — page 1 rendered by **pdf.js** to an `<img>`; engine stays dep-free, app injects `createPdfjsThumbnailer(pdfjs)` via `<BstPdfThumbnailerProvider>`) + **click-to-preview** (`BstFilePreview`: image inline · PDF native iframe, `data:`→`blob:`) + configurable **upload/delete** (`cellMeta.onUpload`/`onDelete`); a server raster (`thumbnailUrl`) wins when present |
| B6 | Single select | ✅ | P2 (inline overlay editor) |
| B7 | Multi select (chips/overflow) | ✅ | P2 · **width-aware chips** (`cellMeta.fitChips` — fit to column width) |
| B8 | Radio group | ✅ | P2 |
| B9 | Hyperlink | ✅ | P2 |
| B10 | Action column | ✅ | P2; "floating" variant open (Q5) |
| C1 | Editing modes | ✅ | P2 — cell + row-session |
| C2 | Save on Enter/Blur/Explicit | ✅ | P2 |
| C3 | Cell/row/cross-col/async validation | ✅ | P2 — `enableValidation` |
| C4 | Inline validation feedback | ✅ | P2 |
| C5 | Shortcuts (arrows/undo-redo) | ✅ | P3 — nav + `enableUndoRedo` |
| C6 | Tab nav (skip/wrap) | ✅ | P3 |
| D1 | Row & column virtualization | ✅ | `enableVirtualization` (+ `enableColumnVirtualization`) on `@tanstack/react-virtual` — windowed rows (dynamic measure) + columns, sticky header, bounded DOM; yields to master-detail / grouping / cell spanning / row pinning. Tested (`virtualization.test.tsx`) |
| D2 | Lightweight cell renderers | ✅ | P2 — memoized hot-path |
| D3 | Smart column auto-size | ✅ | **v0.22.0** — double-click resizer → sampled `canvas.measureText` fit |
| D4 | Partial / dirty-cell render | ✅ | P2–3 — draft overlay, paint-time |
| E1 | Sorting | ✅ | P1 |
| E2 | Column & global search | ✅ | P1 global + P3 per-column filter row |
| E3 | Advanced filtering | ✅ | P3 — filter builder + `bstCondition` |
| E4 | Multi-column grouping | ✅ | **v0.15.0** — `enableGrouping` + aggregates + group toggle |
| F1 | Disable grid | ✅ | P2 — `disabled` |
| F2 | Disable row | ✅ | P2 — `rowDisabled` |
| F3 | Disable column | ✅ | P3 — `meta.disabled` |
| F4 | Disable cell | ✅ | P3 — `meta.disabled` fn + `cellDisabled` |
| F5 | Conditional visibility/render | ✅ | **v0.18.0** — `conditionalFormats` (`hideContent` + rule styling) |
| G1 | Freeze / pin rows & columns | ✅ | column pin P3 + **row pin v0.14.0** (`enableRowPinning`) |
| G2 | Row & column resizing | ✅ | column resize (P3) + **row resize v0.25.0** (`enableRowResize` — drag a row edge to set its height, double-click to reset) |
| G3 | Auto layout | ✅ | fixed layout + total-size **+ `fitColumns` fit-to-viewport** |
| G4 | Responsive | ✅ | **v0.22.0** — `enableResponsive` + `meta.responsivePriority` (hide low-priority when narrow) |
| H1 | Copy cell | ✅ | P3 |
| H2 | Copy row | ✅ | P3 |
| H3 | Copy column | ✅ | **fixed** — `runtime.copyColumn` / **Ctrl+Space** selects the whole column and copies **all pages** (pre-pagination, filter+sort order); `copyRow`/Shift+Space too. Server-tier export rides the Phase-4 foundation |
| H4 | Paste | ✅ | P3 — needs `enableEditing` |
| I1 | Row lifecycle events | ✅ | P2 — `enableRowActions` + `onDataChange` |
| I2 | Cell events + deferred save | ✅ | P2 (C2≡I2) |
| I3 | File ops (upload/view/delete) | ✅ | view + **preview** (`BstFilePreview`) + **upload/delete** via `cellMeta.onUpload`/`onDelete` (busy state; local object-URL fallback), now also **formal `DataSource` verbs** `uploadFile`/`deleteFile`/`getFileUrl` + `createFileHandlers(source)` bridge (Plan.md §2.2) |
| I4 | Backend updates → cells/rows/grid | 🟡 | **change-set half done v0.30.0** — batch mode's `runtime.getChangeSet()` + one `onSave({ changes, rows[].patch, next })` per save action, with a rejected save keeping every draft; **reconciling the backend's response back into cells/rows** (server-authoritative values, partial failures) not built |
| I5 | External updates (parent/WS) | ❌ | WebSocket / live merge not built |
| J1 | Popup form editors | ✅ | P2 — Dialog / modal popups |
| J2 | Rich / custom React editors | ✅ | custom React ✅ · rich-text **v0.23.0** (dep-free sanitized-HTML cell + popup editor; not Lexical) |
| K1 | Dynamic cell styling | ✅ | **v0.10.0** slots + **v0.18.0** `conditionalFormats` |
| K2 | Dynamic row styling | ✅ | slots (`classNames.row`/`styles.row`) + row-scope rules |
| K3 | Conditional formatting | ✅ | **v0.18.0** — rule engine + `<BstConditionalFormatBuilder>` |
| L1 | Multi-row highlighting | ✅ | row-scope `conditionalFormats` (v0.18.0) + validation |
| L2 | Cell highlighting | ✅ | P2 — error ring + rule styling |
| L3 | Inline error presentation | ✅ | P2 |
| M1 | In-cell charts | ✅ | **v0.19.0** — `sparkline` cell type (line/area/bar) |
| M2 | KPI cells | ✅ | **v0.19.0** — `kpi` cell type (value + delta + mini-spark) |

## Built beyond the original spec
Row selection · column reorder + header drag · density toggle · per-column "dual filter" ·
undo/redo · cell/range selection + keyboard nav · clipboard · **runtime settings sheet**
(`useBstSettings`) · **custom-CSS slots** (K1/K2) · **conditional-format builder** ·
**two adapters** (MUI + shadcn) with shadcn **`theme="inherit"`** + **pluggable icons**
(lucide/tabler/…) · **fit-to-viewport** (`fitColumns`) · injectable body icons ·
**server DataSource** (`useBstDataSource` / `createClientDataSource` / `createServerDataSource`) ·
**MCP server for AI agents** (`@bloomskill/table-mcp` — docs search, feature registry, config
validation, grid scaffolding; its corpus is generated from this file among others, so coverage
stays accurate for agents automatically).

## Still open
**Virtualization (D1) + infinite scroll (A2) — done:** `enableVirtualization` +
`enableColumnVirtualization` window rows/columns on `@tanstack/react-virtual`, and
`useBstInfiniteDataSource` + `<BstTable onReachEnd>` append on scroll over the server `DataSource`.
This closes A2 and the client-side 10k tier of A6. What still builds on the server foundation:
I4 **backend reconcile** (the change-set + single-call `onSave` half landed in v0.30.0; applying the
server's response back into cells/rows is what remains) · I5 live/WebSocket merge · the 1M migration
tier proven end-to-end (A6).
**B5 — done:** the in-cell PDF **thumbnail** renders page 1 via **pdf.js** (`cellMeta.pdfThumbnail` + an injected renderer — `createPdfjsThumbnailer` / `<BstPdfThumbnailerProvider>`; the engine itself never imports pdf.js), joining click-to-preview + upload/delete (`BstFilePreview` + `cellMeta.onUpload`/`onDelete` + the formal `DataSource` file verbs). A server raster (`thumbnailUrl`) still wins when present.

---

## Extended capability matrix (beyond the original 58 leaves)

_Added 2026-08-13 from a review of what commercial enterprise data grids offer — full analysis in
[`docs/capability-roadmap.md`](docs/capability-roadmap.md), phased in `Plan.md` PART 3 (Phase-4
remainder → Phase 8). Many of these sit behind a paid tier in commercial products; everything below
ships **free** (MIT/Apache)._

| ID | Feature | Status | Target phase |
|---|---|---|---|
| X1 | CSV export | ✅ | P5 — **v0.34.0** (`enableExport`, dep-free `toCsv`) |
| X2 | Excel (.xlsx) export | ✅ | P5 — **v0.34.0** (`enableExcelExport`, dep-free `toXlsx` — real OOXML, no exceljs) |
| X3 | Print / print-friendly view | ✅ | P5 — **v0.34.0** (`enablePrint`, `runtime.printTable`) |
| X4 | Set Filter (distinct-values checklist) | ✅ | P6 — `enableSetFilter` + `BstSetFilter` (`{op:'set'}` condition) |
| X5 | Status bar (row count + range sum/avg/count) | ✅ | P6 — `showStatusBar` + `runtime.getSelectionStats()` |
| X6 | Right-click context menu | ✅ | P6 — `enableContextMenu` + `getContextMenuItems` (dep-free popup: Copy / Export / Autosize + custom) |
| X7 | Tool-panel sidebar (Columns + Filters) | ⏭️ skip | **Deliberately not built** (2026-08-17) — redundant with the toolbar's **Columns** menu (show/hide · pin · reorder · group) + **Filters** button. Was prototyped (`showSidebar` + `BstColumnPanel`) and reverted. |
| X8 | Find (highlight + jump between matches) | ❌ | P6 |
| X9 | Row-number column | ✅ | **`enableRowNumbers`** (+ `rowNumberHeader`) — leading non-interactive `#` column numbering the current view (continuous across pages; reflects sort + filter). **Pinned to the start (sticky-left) by default**, so it stays leftmost even when other columns are pinned. Settings-toggle ("Columns"). Both skins |
| X10 | Managed row dragging (reorder) | ❌ | P6 |
| X11 | Multi-filter (stack filter types per column) | ✅ | P6 — `enableMultiFilter` + array `meta.filter` (e.g. `['condition','set']`); stacked in the filter row, AND-combined via `combineFilterConditions` / `FilterConditionGroup` |
| X12 | Fill handle (drag-to-fill range) | ❌ | P6 |
| X13 | Tree data (self-referencing hierarchy) | ⚪ | **Optional — out of scope** (see below) |
| X14 | Pivoting | ⚪ | **Optional — out of scope** (see below) |
| X15 | Integrated charts (range → chart) | ❌ | P7 |
| X16 | Advanced server-side row model (server group/pivot/tree, lazy expand) | 🟡 | P7 |
| X17 | Calculated / formula columns | 🟡 | P7 |
| X18 | Cell notes / comments | ⚪ | **Optional — out of scope** (see below) |
| X19 | Localization / i18n (localeText) | ⚪ | **Optional — out of scope** (see below) |
| X20 | Accessibility / ARIA grid audit | 🟡 | P4 |
| X21 | Grid-state save/restore API | ✅ | P4 — `getGridState`/`applyGridState`/`loadGridState`/`useBstGridState` (+ adapters' one-line `gridState={{ key }}`); full view snapshot, stale-column-safe |
| X22 | Live / streaming updates (I5, WebSocket merge) | ❌ | P4 |
| X23 | Formal loading / error overlays | ✅ | **`enableOverlays`** (default on) + `loading` / `error` (+ `overlayText` / `renderLoadingOverlay` / `renderErrorOverlay`); `useBstDataSource` / `useBstInfiniteDataSource` `tableProps` feed both, so server grids get it free |
| X24 | RTL support | ⚪ | **Optional — out of scope** (see below) |
| X25 | Row / column animations | ❌ | P8 |
| X26 | Auto row height (content-measured) | ✅ | P8 — `enableAutoRowHeight` + `meta.wrapText` (CSS wrap, browser-measured, dep-free) |
| X27 | Auto-generate columns from data | ✅ | **`enableAutoColumns`** (+ `autoColumns`) — infer columns from data when none supplied; helper `autoGenerateColumns(data, opts)`; settings-toggle ("Columns") |
| X28 | Cell flashing on data change | ❌ | P8 |
| X29 | Aligned grids (shared column state) | ❌ | P8 |

**Tally:** 29 extended capabilities — ✅ 12 built · 🟡 3 partial (X16 SSRM · X17 formula cols · X20 a11y) ·
❌ 8 missing · ⏭️ 1 skipped (X7 sidebar) · ⚪ 5 optional/out-of-scope (X13 · X14 · X18 · X19 · X24).
**12 of the 29 are paid-tier capabilities in commercial grids** — they ship free here. _(v0.40.0 added **X9** row-number
column, **X23** loading/error overlays, **X27** auto-generate columns; and moved **X18/X19/X24** to
Optional below. **2026-08-24:** moved **X13** tree data + **X14** pivoting to Optional too.)_

**Already matched (paid-tier elsewhere, shipped free):** cell/range selection · clipboard
copy/paste · batch editing · row grouping + aggregation · master-detail · sparklines · advanced-filter
builder · server row model. See "Built beyond the original spec" above and `CLAUDE.md` §12.

### Optional — kept but out of scope (not scheduled)

These capability items are **intentionally not on the roadmap** (decisions 2026-08-20 and 2026-08-24). They
remain documented here for completeness and can be picked up later, but no phase owns them and they are
**not** counted toward the missing tally as work-to-do.

| ID | Feature | Why deferred |
|---|---|---|
| X13 | Tree data (self-referencing hierarchy) | Master-detail (A4) + multi-column grouping (E4) cover the hierarchical needs of the target apps; recursive self-referencing tree data (BOM/org/folder) is L-effort and no consuming app requires it yet. Revisit if one does. |
| X14 | Pivoting | The heavyweight cross-tab reporting feature (L-effort); grouping + aggregation cover current reporting needs and no target app requires pivot/reshape. Revisit if one does. |
| X18 | Cell notes / comments | Collaboration/annotation feature outside the current grid scope; no consuming app needs it yet. |
| X19 | Localization / i18n (`localeText`) | The grid's few built-in strings are overridable at the call site (e.g. `overlayText`, headers, labels); a full `localeText` catalog isn't required for the target apps. |
| X24 | RTL support | No RTL-locale app currently consumes the grid; revisit if/when one does. |
