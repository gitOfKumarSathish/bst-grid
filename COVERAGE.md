# Bst-Table — Spec coverage matrix (58 leaves)

_2026-08-13, synced at **v0.32.2**. Compares the `CLAUDE.md` §11 requirement leaves
(A1–M2) against what has shipped (`CHANGELOG` v0.1.0 → v0.32.2), verified against the
engine + adapter source. Re-run when a version ships._

**Legend:** ✅ built · 🟡 partial · ❌ missing (needs the Phase-4 foundation / a new dep)
**Tally:** ✅ 51 built · 🟡 5 partial · ❌ 2 missing (of 58). _(v0.30.0 — batch editing + `getChangeSet` + single-call `onSave` → I4 now partial; v0.28.0 server DataSource foundation → A3 server pagination done, A2 now partial; v0.25.0 G2 row resize; v0.23.0 B1 QR/barcode + J2 rich-text)_

| ID | Requirement | Status | Where / why |
|---|---|---|---|
| A1 | Inline editing | ✅ | P2 — `enableEditing` |
| A2 | Infinite / virtual scroll | 🟡 | **data-source foundation done (v0.28.0)**; the *virtual* scroll (D1) + *infinite* fetch-on-scroll UI still to build |
| A3 | Pagination (client/server) | ✅ | client + **server (manual mode) v0.28.0** — `useBstDataSource` / `DataSource` (manual sort/filter/paginate passthrough) |
| A4 | Nested / master-detail | ✅ | **v0.13.0** — `enableExpanding` + `renderDetail` |
| A5 | Inline charts / cell spanning | ✅ | **v0.12.0** spanning (`enableCellSpanning`, col+row) · charts = M1 |
| A6 | High-perf at 3 scales | 🟡 | workflow tier ✅; **server tier reachable v0.28.0** (paginate on the server, render small pages); 10k client-virtual still needs D1 |
| B1 | Text / long text | ✅ | P2 · QR + barcode **v0.23.0** (dep-free inline-SVG; QR verified bit-for-bit vs `qrcode`) |
| B2 | Number (currency/precision/formats) | ✅ | P2 — `Intl` formats |
| B3 | Date / time | ✅ | P2 |
| B4 | Boolean | ✅ | P2 (now an injectable check icon) |
| B5 | Files & attachments | 🟡 | file cell + view + **image thumbnails + file-type icons** done; PDF thumbnail (pdf.js) + upload/delete pending |
| B6 | Single select | ✅ | P2 (inline overlay editor) |
| B7 | Multi select (chips/overflow) | ✅ | P2 |
| B8 | Radio group | ✅ | P2 |
| B9 | Hyperlink | ✅ | P2 |
| B10 | Action column | ✅ | P2; "floating" variant open (Q5) |
| C1 | Editing modes | ✅ | P2 — cell + row-session |
| C2 | Save on Enter/Blur/Explicit | ✅ | P2 |
| C3 | Cell/row/cross-col/async validation | ✅ | P2 — `enableValidation` |
| C4 | Inline validation feedback | ✅ | P2 |
| C5 | Shortcuts (arrows/undo-redo) | ✅ | P3 — nav + `enableUndoRedo` |
| C6 | Tab nav (skip/wrap) | ✅ | P3 |
| D1 | Row & column virtualization | ❌ | not implemented (no `@tanstack/react-virtual`) |
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
| I3 | File ops (upload/view/delete) | 🟡 | view + thumbnails done; **upload/delete** (DataSource verbs) pending |
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
**Server DataSource foundation — done (v0.28.0):** the manual sort/filter/paginate seam ships, so the
server tier is reachable. What still builds **on top of it**: A2 *infinite* fetch-on-scroll UI ·
I4 **backend reconcile** (the change-set + single-call `onSave` half landed in v0.30.0; applying the
server's response back into cells/rows is what remains) · I5 live/WebSocket merge.
**Needs virtualization (D1, `@tanstack/react-virtual`):** rendering 10k+ rows client-side · A2 *virtual*
scroll · the client-side 10k tier of A6.
**Smaller / dep-gated:** B5 PDF thumbnail (pdf.js) · I3 file upload/delete (DataSource verbs).
