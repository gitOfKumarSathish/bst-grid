# Bst-Table — Capability Analysis & Architecture Plan (TanStack Table v9)

## Context

Kagami wants **one** React grid library ("Bst-Table") standardized across all apps, built on
**MIT/Apache open-source only** — no per-seat / Enterprise licensing (the AG Grid Enterprise
trap: master-detail, range-selection, clipboard, pivoting are all paid there). Engine:
**TanStack Table v9** (stable since Aug 4 2026, `latest` = 9.1.2, MIT, headless) — **confirmed by a
Phase-1 spike**, v8 = documented fallback only (see `Plan.md` PART 6).

The purpose of this document is to answer four questions before any code is written:

1. Which requirements **overlap / repeat** in the spec.
2. How many are **out-of-the-box** in TanStack Table v9.
3. How many are **custom** (we build them), and which are clean **plugin** candidates.
4. How feasible the **custom-plugin (TableFeature)** architecture is — and what should be a
   plugin vs. a component vs. a companion library.

Plus: feature suggestions (add / remove / refine).

> **Key framing:** TanStack Table is *headless*. It ships the hard, correct **state engine**
> (sorting, filtering, grouping, pagination, column/row structure, selection, expansion) and
> **zero markup**. So a large share of this spec being "custom" is **expected and desirable** —
> it is exactly the control Kagami is paying for by not using AG Grid Enterprise.

---

## 1. Out-of-the-box vs Custom — headline

| Bucket                                       | Count (of ~58 leaf items) | Meaning                                              |
| -------------------------------------------- | ------------------------- | ---------------------------------------------------- |
| **Fully OOTB** (engine + state)              | ~6                        | TanStack provides it; we only style/render           |
| **Partial** (state OOTB, we build the rest)  | ~10                       | TanStack gives state/hooks; render + logic ours      |
| **Fully Custom** (TanStack is just the host) | ~40+                      | We build entirely; TanStack provides cell/meta slots |

**Plain terms:** TanStack Table covers roughly the **data-operations + structural layer**
(~25–30% of the spec's *mechanisms*). The other ~70% — **every cell type, all editing,
validation, clipboard, styling, charts, error handling, backend wiring** — is our custom layer.

### TanStack Table v9 built-in features (the engine we get free — opt-in via `tableFeatures`)

Sorting · Column filtering · Global filtering · Faceting (filter value lists) · Grouping
(multi-column) · Expanding (→ master-detail state) · Pagination (client + `manual` server) ·
Column sizing · Column resizing · Column ordering · Column pinning · Column visibility ·
Row pinning · **Row** selection · **Cell/range selection** (`cellSelectionFeature`) · **Cell
spanning** (`cellSpanningFeature`). *(v9 ships the last two OOTB — v8 did not; verify scope in spike.)*

### What v9 does NOT give (all headless / not present)

All markup & styling · editing · validation · virtualization (→ TanStack Virtual) · clipboard ·
keyboard navigation · charts · file handling · backend wiring (only manual-mode flags +
`onXChange` callbacks). *(Note: v9 DOES ship cell/range selection + cell spanning — see above.)*

---

## 2. Section-by-section mapping

Legend: **OOTB** = engine+state provided · **Partial** = state provided, render/logic ours ·
**Custom** = we build it (TanStack only hosts the cell/meta slot).

### A. Core Rendering

| Req                              | Verdict                | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| -------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1 Inline editing                | **Custom**             | No editing engine in TT. Best built as an **Editing plugin** (edit-session + dirty state + `updateData`).                                                                                                                                                                                                                                                                                                                                                                   |
| A2 Infinite / virtual scroll     | **Custom (companion)** | **Two capabilities, not one.** *Virtual* scroll = render only visible rows → **TanStack Virtual** (MIT), same as D1. *Infinite* scroll = fetch-on-scroll append mode → a **data-source** concern, not a render one. See Plan.md §2.7c.                                                                                                                                                                                                                                      |
| A3 Pagination (client/server)    | **OOTB**               | `getPaginationRowModel` (client); `manualPagination`+`pageCount` (server).                                                                                                                                                                                                                                                                                                                                                                                                  |
| A4 Nested / Master-Detail        | **Partial**            | Expanding + `getSubRows`/`renderSubComponent` gives state OOTB; the detail panel (esp. *different columns*) = nested table instance, custom render. **(AG Grid Enterprise-only; free here.)**                                                                                                                                                                                                                                                                               |
| A5 Inline charts / cell spanning | **Custom**             | Charts = charting lib. Cell spanning: v9 ships `cellSpanningFeature` (we layer over it), **and it collides with virtualization**: `colSpan` is row-local so it is safe (forces column-virt off for spanned columns); `rowSpan` works only as **precomputed span-groups** treated as one virtual item, honoured only while the spanned rows stay contiguous under the active sort/filter, else auto-collapsing. Resolved in Plan.md §2.7a. *A5 charts == M1 — see overlaps.* |
| A6 High-perf at 3 scales         | **Partial**            | Engine is efficient, but **1M rows needs server-side ops + virtualization** (see §5).                                                                                                                                                                                                                                                                                                                                                                                       |

### B. Column Types & Cell Rendering — **all Custom** (this is Bst-Table's core value)

B1 Text/long-text (ellipsis, wrap, tooltip-on-truncate, line-height, internal scroll, popover,
QR/barcode) · B2 Number (int/decimal/currency/precision/separators/formats) · B3 Date/Time ·
B4 Boolean · B5 Files (image/PDF thumbnail, icon fallback) · B6 Single-select (icon/badge/color/
avatar, rich edit, custom read) · B7 Multi-select (== B6 + chips/overflow) · B8 Radio group ·
B9 Hyperlink · B10 Action column.

- All are **React renderers/editors** plugged via `columnDef.cell` + `columnDef.meta` — **not**
  TableFeatures. Architecture: a **cell-type registry** keyed by `meta.type`.
- B10 action column: **pin = OOTB** (column pinning), **buttons = custom**. → *Partial*. The spec's
  **"floating"** variant (hover-overlay, no column width) is a separate render mode — **open Q5**.
- B6/B7/B8 share one **option-based-cell** core (see overlaps).

### C. Editing & Validation — **all Custom**

C1 modes · C2 save on Enter/Blur/Explicit · C3 cell/row/cross-column/async validation ·
C4 inline feedback · C5 shortcuts (Enter/Esc/arrows/**undo-redo**) · C6 Tab nav (skip
non-editable/hidden, wrap to next row).

- Natural **plugins**: **Editing**, **Validation**, **Undo/Redo**, **Keyboard/Navigation**.
- C2 save-timing == I2 (deferred save until row edit ends) — reconcile as ONE lifecycle.

### D. Performance & Rendering

| Req                                    | Verdict                | Notes                                                                                                                                                                                                                                                                            |
| -------------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1 Row & column virtualization         | **Custom (companion)** | TanStack Virtual. *== A2's **virtual** scroll only — not its infinite scroll.*                                                                                                                                                                                                   |
| D2 Lightweight cell renderers          | **Custom**             | Our design; `flexRender` is the mechanism. *Restates B for perf.*                                                                                                                                                                                                                |
| D3 Smart column auto-size              | **Partial**            | Sizing state OOTB; content measurement custom — and **unmeasurable rows force a sampled strategy**: header + first ~50 rows of the current window, offscreen `canvas.measureText`, clamped to `minSize`/`maxSize`, on-demand only (never continuous). Resolved in Plan.md §2.7b. |
| D4 Partial refresh / dirty-cell render | **Custom**             | TT's stable row/cell refs enable `React.memo` boundaries; dirty state from Editing plugin.                                                                                                                                                                                       |

### E. Data Operations — **TanStack's sweet spot**

| Req                       | Verdict     | Notes                                                                  |
| ------------------------- | ----------- | ---------------------------------------------------------------------- |
| E1 Sorting                | **OOTB**    | multi-sort, custom `sortFns` (v9 rename of `sortingFns`).              |
| E2 Column & global search | **OOTB**    | column filters + global filter. *E2 ⊂ E3.*                             |
| E3 Advanced filtering     | **Partial** | Engine + custom `filterFns` OOTB; the **filter-builder UI** is custom. |
| E4 Multi-column grouping  | **OOTB**    | `getGroupedRowModel` + aggregation fns.                                |

> At 1M rows, **E must run server-side** (manual mode) — the client row models won't be used at that tier.

### F. Access Control & Conditional Behaviour — **Custom** (except visibility)

F1 grid · F2 row · F3 column · F4 cell enable/disable · F5 conditional visibility/render.

- Column *visibility* = **OOTB**; enable/disable (*editability/interactivity*) = **Custom**.
- Ideal single **Access-Control plugin**: predicates in options/meta → `cell.getIsEditable()`,
  `row.getIsDisabled()`, etc.

### G. Layout & UX

| Req                          | Verdict            | Notes                                                                      |
| ---------------------------- | ------------------ | -------------------------------------------------------------------------- |
| G1 Freeze/pin rows & columns | **OOTB**           | column pinning + row pinning (sticky CSS ours).                            |
| G2 Row & column resizing     | **Partial**        | Column resize OOTB; **row resize = Custom** (no row-height feature in TT). |
| G3 Auto layout               | **Partial/Custom** |                                                                            |
| G4 Responsive                | **Custom**         | our CSS/logic.                                                             |

### H. Clipboard & Productivity — **all Custom**

H1 copy cell · H2 copy row · H3 copy column · H4 paste.

- **Builds on v9's `cellSelectionFeature`** (v8 had only *row* selection; v9 ships cell/range
  selection OOTB — verify range semantics in the spike).
- **Clipboard plugin** layered on the selection feature. **(AG Grid Enterprise-only; free here.)**

### I. Backend Integration — **Partial** (TT gives callbacks/manual modes; wiring ours)

I1 row lifecycle · I2 cell events + deferred save (refer C2) · I3 file ops · I4 backend updates
1/many cells/rows/grid · I5 external updates (parent/workflow/WebSocket).

- Our layer: a **data-source contract** + **change-set/dirty-tracking plugin**
  (`table.getChangeSet()`), reconciliation on I4/I5.
- **I3 is three verbs, all on the contract:** `uploadFile` · `getFileUrl` (view — short-lived/signed,
  so B5 thumbnails never embed permanent URLs in row data) · `deleteFile`. See Plan.md §2.2.

### J. Popup & Advanced Editors — **Custom** (components, not plugins)

J1 popup form editors · J2 rich React editors. Portals via Floating UI/Radix. Part of the
cell-type/editor registry.

### K. Styling & Conditional Formatting — **Custom**

K1 cell styling · K2 row styling · K3 conditional formatting.

- Optional **Conditional-Formatting plugin** (rules → `cell.getStyle()`/`row.getStyle()`), or
  pure render-time. *Mechanism shared with F5 and L.*

### L. Error Handling — **Custom** (ties to Validation plugin)

L1 multi-row highlight · L2 cell highlight · L3 inline error. *Highlighting ⊂ K mechanism;
errors come from the Validation plugin.*

### M. Visualization — **Custom**

M1 in-cell charts (*== A5*) · M2 KPI cells. Charting lib + renderers.

---

## 3. Overlaps / repeated requirements (asked explicitly)

**Notation:** `≡` identical (same requirement, two labels) · `⊇`/`⊂` contains / is contained by ·
`∩` overlaps (shares logic/mechanism) · `*` near-duplicate / restatement.

### Overlaps / repeated requirements (14)

| #   | Overlap               | Plain meaning                                                                                                                        | Collapses into                   |
| --- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| 1   | A2 ∩ D1 (**not** ≡)   | D1 = A2's *virtual* scroll (render only visible). A2 also asks for *infinite* scroll = fetch-on-scroll — a separate **data** concern | Virtualization **+** data-source |
| 2   | A5 ≡ M1 (M2 adjacent) | in-cell charts; KPI adjacent                                                                                                         | In-cell visualization            |
| 3   | B* ≡ D2               | D2 restates the B cell types for perf                                                                                                | Custom cell renderers            |
| 4   | C2 ≡ I2               | "refer C2" — deferred save                                                                                                           | One editing lifecycle            |
| 5   | A1 ⊇ C ⊇ J            | A1 wraps C1–C6 wraps popup/rich editors                                                                                              | Editing umbrella                 |
| 6   | C5 ∩ C6               | shortcuts + Tab nav                                                                                                                  | Keyboard / navigation            |
| 7   | F5 ∩ K1–3 ∩ L1–2      | all "evaluate rule → style / show / enable"                                                                                          | Shared rule engine               |
| 8   | F1–F4 ∩ C1            | enable/disable is a facet of editing                                                                                                 | Editability                      |
| 9   | B10 ≡ G1              | "pinned last" = column pinning                                                                                                       | Pinning                          |
| 10  | L1/L2 ⊂ K1/K2         | error highlight = conditional styling                                                                                                | Highlighting                     |
| 11  | I4 ∩ I5               | same reconciliation mechanism                                                                                                        | External data apply              |
| 12  | B6 ≡ B7 ∩ B8          | "same as single select" + chip/tag                                                                                                   | Option-based cell                |
| 13  | B1 ∩ J1 ∩ B6/B7       | tooltip/popover + popup + dropdowns                                                                                                  | Shared overlay infra             |
| 14  | E2 ⊂ E3               | search is a subset of filtering                                                                                                      | Search ⊂ filter                  |

### The 12 engineering concerns

| #   | Concern                                      | Folds in                                                                                                                                 | Nature                      |
| --- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| 1   | Core / render                                | A frame, A3 pagination, A4 master-detail, **A5 spanning**, A6 scale; **D3 auto-size**, **G1 pin render**, G2–G4 resize/layout/responsive | Mixed OOTB/Custom           |
| 2   | Cell-type registry                           | B1–B10, D2, J editors (keyed by `meta.type`)                                                                                             | Custom (components)         |
| 3   | Editing                                      | A1, C1–C2/C4/C6 + save lifecycle (C2≡I2)                                                                                                 | Custom (plugin)             |
| 4   | Validation + errors                          | C3, L1–L3                                                                                                                                | Custom (plugin)             |
| 5   | Keyboard / nav                               | C5, C6                                                                                                                                   | Custom (plugin)             |
| 6   | Selection (cell/range)                       | **v9 `cellSelectionFeature` OOTB** (v8 was row-only); foundation for H                                                                   | OOTB-assisted               |
| 7   | Clipboard                                    | H1–H4 (uses selection)                                                                                                                   | Custom (plugin)             |
| 8   | Virtualization                               | A2 *virtual* scroll ≡ D1, D4                                                                                                             | Custom (TanStack Virtual)   |
| 9   | Data-ops                                     | E1–E4, A3                                                                                                                                | Mostly OOTB                 |
| 10  | Access-control + conditional rules + styling | F1–F5, K1–K3, L1/L2                                                                                                                      | Custom (shared rule engine) |
| 11  | Backend / data-source + change-set           | I1–I5 (incl. **I3 upload/view/delete**), **A2 infinite scroll**, DataSource, change-tracking                                             | Partial (wiring custom)     |
| 12  | Visualization                                | A5 *charts* ≡ M1, M2                                                                                                                     | Custom (charts)             |

**Net:** 58 leaves → 12 engineering concerns — **all 58 mapped**. A2 and A5 each split across two
concerns (A2 → #8 render + #11 fetch; A5 → #1 spanning + #12 charts). Phase assignment for every
leaf, plus the resolved virtualization collisions, live in `Plan.md` §2.7 and PART 3.

---

## 4. Custom-plugin (TableFeature) feasibility — "how much is possible"

**Very feasible for stateful/behavioral concerns.** A TanStack `TableFeature` registers
**state + options + instance APIs** (v9: `tableFeatures({ myFeature })`, with `constructTableAPIs`/
`assign*Prototype` methods + per-feature `FeatureMap` typing). These compose cleanly and keep Bst-Table
modular/tree-shakeable, mirroring TanStack's own architecture.

**Good plugin candidates (build as `TableFeature`):**

| Plugin                 | Registers                         | Example APIs                                                |
| ---------------------- | --------------------------------- | ----------------------------------------------------------- |
| Editing                | edit-session + dirty state        | `table.startRowEdit(id)`, `cell.getIsDirty()`, `updateData` |
| Validation             | per cell/row errors, async state  | `cell.getError()`, `row.getIsValid()`                       |
| Range/Cell selection   | extends v9 `cellSelectionFeature` | `cell.getIsSelected()`, `table.getSelectedRange()`          |
| Clipboard              | (uses selection)                  | `table.copySelection()`, `table.paste()`                    |
| Access control         | enable/disable predicates         | `cell.getIsEditable()`, `row.getIsDisabled()`               |
| Undo/Redo              | edit-history stack                | `table.undo()`, `table.redo()`                              |
| Change-tracking        | adds/edits/deletes set            | `table.getChangeSet()`                                      |
| Row height / density   | row sizing state                  | `row.getHeight()`, `table.setDensity()`                     |
| Conditional formatting | rules                             | `cell.getStyle()`, `row.getStyle()`                         |

**NOT plugins — build as components/layers (driven by `columnDef.meta`):**
cell renderers/editors (B), charts/KPI (M), virtualization (D1/A2 — a render-layer hook),
popup editors (J), most styling (K).

**Pragmatic hybrid (still applies):** v9's plugin model is cleaner than v8 — per-feature meta typing,
**no global declaration merging**, explicit `tableFeatures` registration. **Recommendation:** use the
formal `TableFeature` API where state must live on table/row/column/cell instances (Editing, Selection,
Validation, Access-control); use hooks+context+meta for the rest. Don't force everything into
`TableFeature`.

---

## 5. The dominant constraint: 1,000,000 rows

TanStack's **client-side** row models (sort/filter/group) hold all rows in memory and are O(n)
per op. At **1M rows × 100+ cols** this is not viable in-browser. Required at that tier:

- **Server-side data operations** (`manualSorting/Filtering/Pagination/Grouping`) — logic is ours.
- **Windowed/virtualized data fetching** (fetch visible window + overscan) + **TanStack Virtual**
  for row **and** column virtualization.
- A **DataSource abstraction** so the same grid runs client-mode (tiers 1–2) and server-mode
  (tier 3) by swapping the source, not the grid.

This is the #1 architectural decision — see open question Q1.

---

## 6. Recommended companion libraries (all MIT / Apache — commercial-safe)

| Concern                    | Library                                           | License      |
| -------------------------- | ------------------------------------------------- | ------------ |
| Table engine               | @tanstack/react-table v9                          | MIT          |
| Virtualization             | @tanstack/react-virtual                           | MIT          |
| Overlays/popovers/tooltips | Floating UI **or** Radix UI                       | MIT          |
| Dropdown/combobox behavior | Downshift **or** Radix                            | MIT          |
| Dates                      | date-fns **or** Day.js                            | MIT          |
| Charts (in-cell/KPI)       | **uPlot** (perf) / Recharts (DX) / visx / ECharts | MIT / Apache |
| QR / Barcode               | qrcode / bwip-js                                  | MIT          |
| PDF thumbnails             | pdf.js                                            | Apache-2.0   |
| Drag reorder (col/row)     | dnd-kit                                           | MIT          |
| Export (CSV/XLSX)          | ExcelJS / SheetJS Community                       | MIT / Apache |
| Schema validation (opt.)   | zod                                               | MIT          |

*Avoid:* Highcharts (commercial), AG Grid Enterprise, MUI X Pro/Premium DataGrid (per-seat).
AG Grid **Community** is MIT but lacks master-detail/range-select/clipboard — the very features
we get free by building on TanStack.

---

## 7. Feature suggestions (add / remove / refine)

> **AG Grid parity roadmap (2026-08-13).** The gaps below are audited against AG Grid and scheduled by
> phase — see `Plan.md` PART 3 "Phases 5–8", the `AG1–AG29` matrix in `COVERAGE.md`, and the full
> analysis in `docs/ag-grid-gap-analysis.md`. Bst-Table already matches most AG Grid **Enterprise**
> features free; the biggest remaining hole is **export (CSV/Excel/print)** — the recommended next slice.

**Add (missing but expected for a shared framework):**

- Column header menu UI (sort/filter/hide/pin/resize controls).
- **State persistence** (per-user column order/size/sort/filter/visibility) — big for reporting.
- **Aggregation / summary footer / totals row** (TT has aggregation fns OOTB).
- **Accessibility** (ARIA grid roles, full keyboard grid nav, focus mgmt) — first-class, WCAG.
- **i18n / RTL** and **theming tokens** (it's the single standard grid).
- **Loading / skeleton / empty / error states**.
- **Server-side DataSource contract** (formalize for I + 1M-row tier).
- **Cell/range selection** (foundation for clipboard — currently only implied).
- **Export** (CSV/Excel/print).
- **Tree data** (self-referencing hierarchy) — clarify vs master-detail.

**Refine:**

- Merge A5+M1 → "in-cell visualization" (A5's *spanning* half stays a render concern).
- **Do NOT merge A2+D1** — D1 covers A2's *virtual* scroll only; A2's *infinite* scroll is a
  separate fetch-on-scroll concern. Split them in the spec.
- Define B6/B7/B8 as variants of one **option-based cell**.
- Clarify F = *editability/interactivity* (distinct from column *visibility*, which is OOTB).
- Unify C2 + I2 into one **edit-session lifecycle** (deferred save).

**Remove / defer (post-MVP):**

- QR/Barcode (B1) — pluggable renderer later.
- Complex/3D charts — start with sparklines + KPI tiles.

---

## 8. Open questions (blocking final architecture) — see AskUserQuestion

- **Q1 Data scale strategy:** client-only, server-only, or **hybrid DataSource** (recommended)?
- **Q2 MVP target:** which tier first — workflow grids (10–20c/100–200r) vs reporting (10k+) vs
  migration (1M+)? Drives phasing.
- **Q3 Styling/theming:** Tailwind vs CSS-in-JS vs CSS Modules + design tokens?
- **Q4 Plugin depth:** formal `TableFeature` everywhere (max modularity) vs pragmatic
  hooks+context+meta where the formal API is awkward (recommended)?

**Q1–Q4 are now answered — see `Plan.md` "Decisions (locked)".** Remaining questions need the spec
author, not an architecture decision (full text in `Plan.md` "Open questions for the spec author"):

- **Q5 B10 "floating" action column** — hover-overlay, or just another pinned column? Assumed
  hover-overlay with pinned-last as the resting state.
- **Q6 J2 "Rich/custom React editors"** — arbitrary custom React components (assumed), or **rich
  text** (bold/italic/lists)? If the latter: a new `richText` cell type, Lexical (MIT, no paid tier)
  - DOMPurify both directions, plain-text preview in read mode, markdown as the stored format.
- **Q7 Deferral sign-off** — B1 QR/barcode and complex/3D charts are deliberately deferred.
- **Q8 H3 copy-column at scale** — loaded window only (assumed, with an "n of m copied" notice) or a
  dedicated server export call?

---

## 9. Verification (once building starts — not in plan mode)

- Scaffold a Vite + React + TS library workspace; render a baseline table (data/columns/core row model).
- Prove each tier: workflow (client), reporting (client + virtual), migration (server DataSource + virtual).
- Perf gates: 10k rows scroll @ 60fps; 1M rows via server window < 200ms/interaction; memory bounded.
- Unit-test each plugin's state/APIs; a11y audit (axe) on the rendered grid.

## 10. Status

- [x] **Engine reconciled to v9** (GA Aug 4 2026, 9.1.2); Phase-1 spike confirms; v8 fallback (`Plan.md` PART 6)
- [x] Capability mapping (OOTB / Partial / Custom), overlaps, plugin feasibility
- [x] Companion library + licensing check
- [x] Feature suggestions
- [x] Q1–Q4 resolved → architecture + phasing finalized in **`Plan.md`** (PARTs 2–3)
- [x] §3 reformatted to tables; A2 split, A5 spanning, D3 auto-size, I3 file verbs corrected
- [ ] Q5–Q8 answers from the spec author (§8)

> **`Plan.md` is the working document** — it carries the locked decisions, the package/DataSource/
> registry architecture, the resolved virtualization collisions (§2.7), the B-series sub-feature
> table (§2.3) and the 4-phase delivery plan. This file remains the capability/licensing analysis.
>
> **`Plan.md` Appendix A is the spec audit log** (2026-08-10): the 14 findings from checking all 58
> leaves + sub-bullets on *both* axes — design exists **and** a phase owns it — plus a repeatable
> checklist. **Re-run it whenever this spec changes**; a capability verdict in §2 above does not
> mean anyone is scheduled to build the thing.

---

## 11. Requirement feasibility (v9) — annotated

**Annotations:** `easy out of box` · `Doable` · `difficult but doable` · `not possible`.
**Repeats** reference the §1.3 overlap number (1–14); `≈` = close relative not in the original 14.
**Headline:** nothing is `not possible`; many of the 58 leaves are the *same* feature relabelled —
§11.1 groups them (build once), §11.2 is the flat per-item list.

### 11.1 Repeated-feature groups (build once → reused by many)
Each row is ONE thing to build; the listed requirements all resolve to it.

| §1.3 # | Shared feature (build once) | Requirements that repeat it | Annotation |
| --- | --- | --- | --- |
| 1 | Virtualization (render only visible) | A2 *virtual* ≡ D1 | easy out of box |
| 2 | In-cell visualization | A5 *charts* ≡ M1 · M2 adjacent | Doable |
| 3 | Custom cell renderers | B1–B10 ≡ D2 | Doable |
| 4 | Editing save lifecycle | C2 ≡ I2 | Doable |
| 5 | Editing umbrella | A1 ⊇ C1–C6 ⊇ J1–J2 | Doable (C3/C5/C6 difficult) |
| 6 | Keyboard / navigation | C5 ∩ C6 | difficult but doable |
| 7 | Conditional rule engine | F5 ∩ K1–K3 ∩ L1–L2 | Doable |
| 8 | Editability (enable/disable) | F1–F4 ∩ C1 | Doable |
| 9 | Column pinning | B10 ≡ G1 | easy out of box |
| 10 | Highlighting | L1–L2 ⊂ K1–K2 | Doable |
| 11 | External data apply | I4 ∩ I5 | Doable (I5 difficult) |
| 12 | Option-based cell | B6 ≡ B7 ∩ B8 | Doable |
| 13 | Overlay infra (popover/dropdown/dialog) | B1 ∩ J1 ∩ B6/B7 | Doable |
| 14 | Search ⊂ filter | E2 ⊂ E3 | easy out of box (E2) |
| ≈ | Inline error UI | C4 ≈ L3 | Doable |
| ≈ | Copy variants (one clipboard mechanism) | H1 ≈ H2 ≈ H3 | Doable |

### 11.2 Full feasibility table (per-item, flat)

| Requirement                                        | Annotation               | Note (v9)                                                                          |
| -------------------------------------------------- | ------------------------ | ---------------------------------------------------------------------------------- |
| **A. Core Rendering**                              |                          |                                                                                    |
| A1 Inline editing                                  | Doable                   | custom editing plugin; standard pattern                                            |
| A2 Infinite / Virtual scrolling                    | easy out of box / Doable | virtual = TanStack Virtual (drop-in); infinite = fetch-on-scroll (Doable)          |
| A3 Pagination (client/server)                      | easy out of box          | v9 pagination feature (`manual*` for server)                                       |
| A4 Nested / Master-Detail                          | Doable                   | Expanding state OOTB; detail panel = nested table (custom)                         |
| A5 Inline charts / spanning                        | difficult but doable     | `colSpan` via `cellSpanningFeature`; `rowSpan`×virtualization hard; charts via lib |
| A6 High-perf across scales                         | difficult but doable     | ≤10k easy/Doable; 1M needs server-side ops + virtualization                        |
| **B. Column Types & Cell Rendering**               |                          |                                                                                    |
| B1 Text / Long Text                                | Doable                   |                                                                                    |
| ↳ Ellipsis                                         | Doable                   |                                                                                    |
| ↳ Word-break / Wrap                                | Doable                   |                                                                                    |
| ↳ Tooltip on truncation                            | Doable                   | overflow detection                                                                 |
| ↳ Configurable line-height                         | easy out of box          | CSS                                                                                |
| ↳ Internal scroll                                  | Doable                   |                                                                                    |
| ↳ Popover/dialog for full content                  | Doable                   | shared overlay layer                                                               |
| ↳ QR Code / Barcode                                | Doable                   | qrcode / bwip-js (deferred, not hard)                                              |
| B2 Number                                          | Doable                   |                                                                                    |
| ↳ Integer / Decimal                                | Doable                   |                                                                                    |
| ↳ Currency                                         | Doable                   |                                                                                    |
| ↳ Precision                                        | Doable                   |                                                                                    |
| ↳ Thousands separator                              | Doable                   | `Intl.NumberFormat`                                                                |
| ↳ Multiple display formats                         | Doable                   |                                                                                    |
| B3 Date / Time                                     | Doable                   | MUI x-date-pickers + date-fns                                                      |
| ↳ Date / Time / DateTime                           | Doable                   |                                                                                    |
| ↳ Configurable formatting                          | Doable                   | locale-aware                                                                       |
| B4 Boolean (Checkbox/Toggle)                       | Doable                   |                                                                                    |
| B5 Files & Attachments                             | Doable                   |                                                                                    |
| ↳ Image thumbnail                                  | Doable                   |                                                                                    |
| ↳ PDF thumbnail                                    | Doable                   | pdf.js                                                                             |
| ↳ File-type icon fallback                          | easy out of box          | MUI icons                                                                          |
| B6 Single Select Dropdown                          | Doable                   |                                                                                    |
| ↳ Multi-attribute rendering                        | Doable                   |                                                                                    |
| ↳ Icon / Badge / Color / Avatar / Image            | Doable                   |                                                                                    |
| ↳ Rich edit mode                                   | Doable                   |                                                                                    |
| ↳ Custom read mode                                 | Doable                   |                                                                                    |
| B7 Multi Select Dropdown                           | Doable                   |                                                                                    |
| ↳ Same as single select                            | Doable                   | shared option-based-cell core                                                      |
| ↳ Chip/tag display                                 | Doable                   |                                                                                    |
| ↳ Overflow handling                                | Doable                   | `+N more`                                                                          |
| B8 Radio Group                                     | Doable                   |                                                                                    |
| ↳ Single-select radios                             | Doable                   |                                                                                    |
| ↳ Chip/tag display                                 | Doable                   |                                                                                    |
| ↳ Horizontal/vertical layout                       | Doable                   |                                                                                    |
| B9 Hyperlink                                       | Doable                   | simple renderer                                                                    |
| B10 Action Column (floating + pinned last)         | Doable                   | pinned = easy out of box (pinning); floating overlay = Doable                      |
| ↳ Edit/Save                                        | Doable                   |                                                                                    |
| ↳ Delete                                           | Doable                   |                                                                                    |
| ↳ View (optional)                                  | Doable                   |                                                                                    |
| **C. Editing & Validation**                        |                          |                                                                                    |
| C1 Editing modes                                   | Doable                   |                                                                                    |
| C2 Save on Enter / Blur / Explicit                 | Doable                   |                                                                                    |
| C3 Cell/Row/Cross-column & Async validation        | difficult but doable     | async races + cross-column logic                                                   |
| C4 Inline validation feedback                      | Doable                   | error ring + popover                                                               |
| C5 Keyboard shortcuts (Enter/Esc/Arrows/Undo-Redo) | difficult but doable     | undo/redo command stack                                                            |
| C6 Tab Navigation (skip non-editable/hidden, wrap) | difficult but doable     | Excel-like nav is fiddly                                                           |
| **D. Performance & Rendering**                     |                          |                                                                                    |
| D1 Row & Column virtualization                     | easy out of box          | TanStack Virtual (row easy; column Doable)                                         |
| D2 Lightweight custom cell renderers               | Doable                   | our design; `flexRender`                                                           |
| D3 Smart column auto-sizing                        | difficult but doable     | sampled `canvas.measureText`; conflicts with virtualization                        |
| D4 Partial refresh / Dirty-cell rendering          | difficult but doable     | strict memo discipline on hot path                                                 |
| **E. Data Operations**                             |                          |                                                                                    |
| E1 Sorting                                         | easy out of box          | v9 sorting feature                                                                 |
| E2 Column & Global Search                          | easy out of box          | column + global filter                                                             |
| E3 Advanced Filtering                              | Doable                   | engine OOTB; filter-builder UI custom                                              |
| E4 Multi-column Grouping                           | easy out of box          | grouping feature + aggregation                                                     |
| **F. Access Control & Conditional Behaviour**      |                          |                                                                                    |
| F1 Enable/Disable entire grid                      | Doable                   |                                                                                    |
| F2 Enable/Disable row                              | Doable                   |                                                                                    |
| F3 Enable/Disable column                           | Doable                   | visibility = easy out of box; disable = Doable                                     |
| F4 Enable/Disable cell                             | Doable                   |                                                                                    |
| F5 Conditional visibility/rendering                | Doable                   | shared rule engine                                                                 |
| **G. Layout & User Experience**                    |                          |                                                                                    |
| G1 Freeze/Pin rows & columns                       | easy out of box          | pin state OOTB; sticky CSS custom                                                  |
| G2 Row & Column resizing                           | Doable                   | col-resize = easy out of box; row-resize = custom                                  |
| G3 Auto layout                                     | Doable                   |                                                                                    |
| G4 Responsive behaviour                            | Doable                   |                                                                                    |
| **H. Clipboard & Productivity**                    |                          |                                                                                    |
| H1 Copy Cell                                       | Doable                   | on `cellSelectionFeature`                                                          |
| H2 Copy Row                                        | Doable                   |                                                                                    |
| H3 Copy Column                                     | Doable                   | at scale (server) = difficult but doable (windowed)                                |
| H4 Paste support                                   | difficult but doable     | parse → validate → multi-cell write                                                |
| **I. Backend Integration**                         |                          |                                                                                    |
| I1 Row lifecycle events                            | Doable                   |                                                                                    |
| I2 Cell events (onChange/onBlur), deferred save    | Doable                   |                                                                                    |
| I3 File operations (Upload/View/Delete)            | Doable                   | DataSource verbs                                                                   |
| I4 Backend responses updating cells/rows/grid      | Doable                   | reconciliation layer                                                               |
| I5 External updates (parent/workflow/WebSocket)    | difficult but doable     | live merge + dirty-cell conflict policy                                            |
| **J. Popup & Advanced Editors**                    |                          |                                                                                    |
| J1 Popup form editors                              | Doable                   | MUI Dialog                                                                         |
| J2 Rich / custom React editors                     | Doable                   | arbitrary React easy; rich-text = difficult but doable (Lexical)                   |
| **K. Styling & Conditional Formatting**            |                          |                                                                                    |
| K1 Dynamic cell styling                            | Doable                   | className + CSS vars                                                               |
| K2 Dynamic row styling                             | Doable                   |                                                                                    |
| K3 Conditional formatting                          | Doable                   | shared rule engine                                                                 |
| **L. Error Handling**                              |                          |                                                                                    |
| L1 Multi-row highlighting                          | Doable                   |                                                                                    |
| L2 Cell highlighting                               | Doable                   |                                                                                    |
| L3 Inline error presentation                       | Doable                   | from Validation plugin                                                             |
| **M. Visualization**                               |                          |                                                                                    |
| M1 In-cell charts                                  | Doable                   | uPlot / Recharts                                                                   |
| M2 KPI cells                                       | Doable                   |                                                                                    |

---

## 12. Feature toggle convention — MUST follow for every feature

**Rule:** every Bst-Table capability is customizable **per grid instance** via a flag.
When adding ANY new feature (now or in future chats), it MUST ship with a toggle
following this convention. **No always-on features.**

**Two layers, two prefixes:**
- **`enable<Feature>`** — engine *behaviour* (does the capability run). Resolve in
  `@bloomskill/table-engine`'s `useBstTable` and **map to the TanStack v9 option of the same name**
  where one exists (`enableSorting`, `enableColumnFilters`, `enableGlobalFilter`,
  `enableHiding`, `enableColumnResizing`, `enableColumnPinning`, `enableRowSelection`,
  …). Do NOT reinvent what v9 already exposes.
- **`show<Element>`** — adapter *chrome/UI* (does the toolbar/menu/control render).
  Resolve in the adapters (`@bloomskill/table-mui`, `@bloomskill/table-shadcn`): `showToolbar`, `showSearch`,
  `showColumnsMenu`, `showPagination`, …

**Value shape:** `boolean` to toggle; use `boolean | <FeatureOptions>` when the feature
has settings (passing an object implies enabled), e.g.
`pagination?: boolean | { pageSize?: number; pageSizeOptions?: number[] }`. This avoids a
parallel set of `xOptions` props.

**Defaults:** OOTB data features default **on** (opt-out) so a zero-config grid is
full-featured; heavy/opinionated features (editing, selection, clipboard) default **off**
(opt-in). Every default is declared in the registry below.

**Chrome follows behaviour:** a `show*` flag is a no-op when its underlying `enable*` is
off (e.g. `showSearch` requires the global filter). Chrome never implies behaviour.

**Anti-explosion rule:** flat props for now (matches `showSearch`). **If the prop surface
exceeds ~10, group into `features={{…}}` (behaviour) + `toolbar={{…}}` (chrome)** — same
names, nested. Do not pre-group before that threshold.

**Resolution points (don't scatter):** `enable*` → resolved in `useBstTable` (passed to
TanStack options); `show*` → resolved in the adapter render. Nowhere else.

**Every new feature MUST be added to the registry below** (flag, layer, type, default,
maps-to, status) so the API stays discoverable and consistent across sessions.

**Settings-sheet parity — COMPILE-ENFORCED (not just a convention).** The runtime settings
sheet's key set (`BstSettingKey` in `packages/engine/src/settings.ts`) is **derived from
`BstTableEngineToggles`**, and its metadata lives in `SETTINGS_META`, typed
`Record<BstSettingKey, …>`. So the moment you add an `enable*` flag to `BstTableEngineToggles`,
`settings.ts` **fails to compile** until you register it — the sheet cannot silently miss a
feature. Registration is a **one-liner**: `enableFoo: { group: 'Columns', default: false }`
(label is humanized from the key, `layer` inferred from the `enable`/`show` prefix, `alwaysShow`
defaults false — set `alwaysShow: true` only for default-on features). **So: declare new engine
toggles in `BstTableEngineToggles`** (the §12 `enable*` layer) and they're auto-picked-up; if a
toggle must live elsewhere on `UseBstTableOptions` (as the A4/A5/G1/E4 render features currently
do), add its key to `ExtraEngineSettingKey` in `settings.ts` (a type assertion checks it's a real
option). `settings.test.tsx` adds a runtime backstop. **Out of scope** (not user toggles):
non-boolean config (`conditionalFormats` rule arrays, `cellTypes`, `classNames`/`styles`,
`meta.type` cell types), adapter-only chrome/enums (`dark`, `theme`, `tokenFormat`, `icons`), and
pure interactions with no flag (double-click auto-size).

### Feature toggle registry
| Feature | Flag | Layer | Type | Default | Maps to | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Global search box | `showSearch` | chrome | boolean | true | adapter toolbar | ✅ done |
| Global filter | `enableGlobalFilter` | engine | boolean | true | v9 `enableGlobalFilter` | ✅ done |
| Sorting | `enableSorting` | engine | boolean | true | v9 `enableSorting` | ✅ done |
| Column filters | `enableColumnFilters` | engine | boolean | true | v9 `enableColumnFilters` (+ `bstCondition` filterFn) | ✅ done (Phase 3) |
| Filter builder UI (E3) | `showFilterBuilder` | chrome | boolean | false | adapter panel hosting `BstFilterBuilder` | ✅ done (Phase 3) |
| Format builder UI (K3) | `showFormatBuilder` (+ `onConditionalFormatsChange`) | chrome | boolean | false | adapter toolbar "Formats" button + panel hosting `BstConditionalFormatBuilder` — end-users build `conditionalFormats` rules at runtime (uncontrolled local state, or controlled via the callback). Builder columns auto-derived from the grid's columns. Needs `enableConditionalFormatting`. In settings ("Display", always shown). shadcn: new `format` icon slot (palette) | ✅ done |
| Per-column filter row ("dual filter") | `enableColumnFilterRow` | engine | boolean | false | engine header row (needs `enableColumnFilters`). **Always shown in the settings sheet** ("Columns", `alwaysShow`) so end-users can switch it on themselves | ✅ done (Phase 3; always-in-settings v0.29.0) |
| Pagination (logic) | `pagination` | engine | boolean \| {pageSize} | true | v9 pagination | ✅ done |
| Pagination bar | `showPagination` | chrome | boolean | true | adapter footer | ✅ done |
| Page-size choices | `pageSizeOptions` | chrome | number[] | [5,10,20,50] | adapter select | ✅ done |
| Column visibility | `enableHiding` | engine | boolean | true | v9 `enableHiding` | ✅ done |
| Columns menu | `showColumnsMenu` | chrome | boolean | true | adapter toolbar | ✅ done |
| Column resizing | `enableColumnResizing` | engine | boolean | true | v9 `enableColumnResizing` | ✅ done |
| Column pinning | `enableColumnPinning` | engine | boolean | false | v9 `enableColumnPinning` (state `{start,end}`) | ✅ done (Phase 3) |
| Column reordering | `enableColumnOrdering` | engine | boolean | false | v9 `setColumnOrder` (adapter menu **+ header drag-drop**) | ✅ done (Phase 3) |
| Toolbar (whole) | `showToolbar` | chrome | boolean | true | adapter | ✅ done |
| Inline editing | `enableEditing` | engine | boolean \| {mode,saveOn,policy} | false | custom feature | ✅ done (Phase 2) |
| Validation | `enableValidation` | engine | boolean \| {policy} | false | custom feature | ✅ done (Phase 2) |
| Row add/delete/duplicate | `enableRowActions` | engine | boolean | false | custom feature | ✅ done (Phase 2) |
| Cell-type registry | `cellTypes` | engine | CellTypeRegistry | neutral defaults | custom feature | ✅ done (Phase 2) |
| Add-row button | `showAddRow` | chrome | boolean | follows `enableRowActions` | adapter toolbar | ✅ done (Phase 2) |
| Save/Discard bar | `showSaveBar` | chrome | boolean | follows `enableEditing` | adapter toolbar | ✅ done (Phase 2) |
| Cell/range selection + keyboard nav | `enableCellSelection` | engine | boolean | false | custom feature | ✅ done (Phase 3) |
| Clipboard (copy/paste) | `enableClipboard` | engine | boolean | false | custom feature (implies `enableCellSelection`; paste needs `enableEditing`). **Copy-column (H3): Ctrl+Space / `copyColumn` copies the whole column across ALL pages (pre-pagination); Shift+Space / `copyRow` for rows** | ✅ done (Phase 3; copy-column all-pages v0.24.0) |
| Copy column (H3) | `enableCopyColumn` | engine | boolean | true | custom — sub-toggle of clipboard; gates `selectColumn`/`copyColumn` (the Ctrl/⌘+Space gesture **and** the Columns-menu copy button) at the runtime choke point. In settings ("Selection & clipboard", always shown) | ✅ done |
| Copy row (H2) | `enableCopyRow` | engine | boolean | true | custom — sub-toggle of clipboard; gates `selectRow`/`copyRow` (Shift+Space). In settings ("Selection & clipboard", always shown) | ✅ done |
| Grid disable (F1) | `disabled` | engine | boolean | false | custom (access cascade) | ✅ done (Phase 2) |
| Row disable (F2) | `rowDisabled` | engine | (row)=>bool | — | custom (access cascade) | ✅ done (Phase 2) |
| Column / cell disable (F3/F4) | `meta.disabled` | engine | boolean \| (row)=>bool | — | custom (access cascade) | ✅ done (Phase 3) |
| Cell disable predicate (F4) | `cellDisabled` | engine | (ctx)=>bool | — | custom (access cascade) | ✅ done (Phase 3) |
| Row selection | `enableRowSelection` | engine | boolean | false | v9 `enableRowSelection` | ✅ done (Phase 3) |
| Selected-count chip | `showSelectionInfo` | chrome | boolean | follows `enableRowSelection` | adapter toolbar | ✅ done (Phase 3) |
| Undo/redo (C5) | `enableUndoRedo` | engine | boolean | false | custom feature (needs `onDataChange`) | ✅ done (Phase 3) |
| Undo/Redo buttons | `showUndoRedo` | chrome | boolean | follows `enableUndoRedo` | adapter toolbar | ✅ done (Phase 3) |
| Column pin/reorder controls | (in columns menu) | chrome | — | follows `enableColumnPinning` / `enableColumnOrdering` | adapter columns menu | ✅ done (Phase 3) |
| Density toggle | `showDensityToggle` | chrome | boolean | false | adapter toolbar (`data-bst-density`) | ✅ done (Phase 3) |
| Runtime settings sheet | `showSettings` | chrome | boolean \| `BstSettingsOptions` | false | adapter gear → sheet (MUI `Drawer` / shadcn slide-over); engine `useBstSettings` resolves overrides → per-table `enable*`/`show*`, persisted to `localStorage`. Covers **every** instance-level boolean toggle via `BST_SETTINGS_REGISTRY` (grouped: Data ops · Columns · Rows · Editing · Selection & clipboard · Display) — keep in sync per "settings-sheet parity" above. Sheet chrome: **highlighted header band**, **divider-separated sections** with prominent uppercase headings, and a **search box** (`BstSettingsOptions.search`, auto for 30+ lists) filtering by label/hint/group via the shared pure helpers `filterSettingsGroups` / `shouldShowSettingsSearch`. **Dependency cascade:** a toggle whose prerequisite is off renders disabled ("Needs \<parent\>"), transitive + reversible — via `requires` edges on the registry (mirror `packages/mcp/src/rules.ts`) resolved by the pure export `isSettingActive`; in-section parent→child pairs also draw a **dotted branch connector** (git-graph style) via `parentKey`/`lastChild` on `BstSettingsItem` | ✅ done |
| Custom-CSS slots (K1/K2) | `classNames` / `styles` | engine | `BstClassNames` / `BstStyles` | — (opt-in by presence) | slot class/style on grid parts (root · table · header · headerRow · headerCell · filterRow · body · row · cell · empty); `headerCell`/`row`/`cell` accept a fn | ✅ done |
| Per-column header CSS | `meta.headerClassName` / `meta.headerStyle` | engine | `string` / `CSSProperties` | — | header `<th>` for that column | ✅ done |
| Outer-card CSS | `className` / `style` | chrome | `string` / `CSSProperties` | — | adapter card wrapper (`<Paper>` / `.sc-card`) | ✅ done |
| Cell spanning (A5) | `enableCellSpanning` (+ `getCellSpan` / `meta.rowSpan:'group'`) | engine | boolean | false | custom render feature — `colSpan` **and** `rowSpan`; covered cells skipped (Plan.md §2.7a; no v9 feature in 9.1.2) | ✅ done |
| Master-detail (A4) | `enableExpanding` (+ `renderDetail` / `getRowCanExpand`) | engine | boolean | false | v9 `rowExpandingFeature` — leading expander column + full-width detail panel row | ✅ done |
| Row pinning (G1) | `enableRowPinning` | engine | boolean | false | v9 `rowPinningFeature` — leading pin column; frozen top/bottom rows (sticky) | ✅ done |
| Row resize (G2) | `enableRowResize` | engine | boolean | false | custom — per-cell bottom drag handle → per-row height (local state); double-click resets; **always shown** in the settings sheet ("Rows", `alwaysShow`) so an end-user can switch it on without developer wiring (like row/column virtualization) | ✅ done |
| Grouping (E4) | `enableGrouping` (+ column `aggregationFn`) | engine | boolean | false | v9 `columnGroupingFeature` + `rowAggregationFeature` — collapsible group rows + aggregates; adapters add a group toggle (▤) in the columns menu | ✅ done |
| Theme inheritance (shadcn) | `theme` (+ `tokenFormat`) | chrome | `'zinc' \| 'inherit'` (+ `'hsl' \| 'oklch'`) | `'zinc'` / `'hsl'` | `@bloomskill/table-shadcn` — `'inherit'` re-points `--sc-*` at host shadcn tokens (`.sc-inherit` / `.sc-fmt-color` classes); `'zinc'` = self-contained palette | ✅ done |
| Ambient dark mode (shadcn) | `dark` | chrome | boolean (tri-state) | follows ambient `.dark` | `@bloomskill/table-shadcn` — omitted follows ancestor `.dark` / `[data-theme=dark]`; `true`/`false` force via `.sc-dark` / `.sc-light`; ignored under `theme="inherit"` | ✅ done |
| Pluggable icons (shadcn) | `icons` | chrome | `Partial<BstShadcnIcons>` | built-in lucide-styled SVGs | `@bloomskill/table-shadcn` — icon slots; optional-peer presets at `./icons/{lucide,tabler,hugeicons,phosphor,remix}`; unspecified slots fall back to defaults | ✅ done |
| Conditional formatting (K3/F5) | `conditionalFormats` (+ `<BstConditionalFormatBuilder>`) | engine | `BstFormatRule[]` | — (opt-in by presence) | declarative rules (E3 operators) → cell/row class+style, or blank a cell (F5); composes with `classNames`/`styles` | ✅ done |
| Conditional formatting runtime toggle (K3) | `enableConditionalFormatting` | engine | boolean | true | gates `conditionalFormats` at the `useBstTable` choke point — `false` makes the rules inert without dropping them. In settings ("Display", always shown; no-op on grids without rules) | ✅ done |
| In-cell visualization (M1/M2) | `meta.type: 'sparkline'` / `'kpi'` | engine | cell type | — | dep-free inline-SVG cell renderers — sparkline (line/area/bar via `cellMeta.variant`) + KPI (value · delta chip · mini-spark) | ✅ done |
| QR / barcode / rich-text cells (B1, J2) | `meta.type: 'qr'` / `'barcode'` / `'richText'` | engine | cell type | — | dep-free — `qr` inline-SVG QR (byte mode, v1–10, verified vs `qrcode`), `barcode` Code 128; `richText` = sanitized-HTML cell (allow-list sanitizer + plain-text preview **or `cellMeta.render:'html'` formatted read** + contentEditable editor); adapters add a popup rich-text editor | ✅ done |
| Row action overflow menu (B10) | `meta.type: 'actionMenu'` | engine | cell type | — | dep-free "⋯" kebab → `position:fixed` popup of the row's actions (edit/save/cancel/duplicate/delete via the cell `api`), the compact alternative to the inline `action` buttons. Reuses `meta.actions`; closes on outside-click/Escape/scroll. Both skins inherit it (shadcn via `...defaultCellTypes`, MUI via preset) | ✅ done |
| ERP field formats (B1/B2) | `cellMeta.pattern` (+ `patternMessage`) | engine | preset name \| `RegExp` \| `FieldFormat` | — (opt-in by presence) | Frappe-style **validation + input-mask + normalizer** on `text`/`number` cells. Built-ins: `aadhaar` (Verhoeff), `pan`, `gstin` (mod-36), `tan`, `ifsc`, `email`, `phone`, `pincode`, `url`, `upi`, `passport`, `iec`, `esic`, `pf` (UAN), `iban` (mod-97), `swift`, `creditCard` (Luhn). Extensible via `defineFieldFormat` / `FIELD_FORMATS` / a bare `RegExp`; standalone validators exported (`isValidAadhaar` · `isValidGstin` · `isValidIban` · `luhnValid` · …). Lives in `cells/formats.ts`; both skins inherit it | ✅ done |
| Width-aware multiSelect chips (B7) | `cellMeta.fitChips` | engine | boolean | false | `multiSelect` read cell fits as many chips as the **column width** allows, folding the rest into `+N more` (widen → more chips, shrink → fewer); a hidden ghost row is measured + a `ResizeObserver` recomputes. `maxChips` (if set) becomes an upper cap. Both skins inherit it | ✅ done |
| File preview + upload/delete (B5/I3) | `files` cell + `cellMeta.preview`/`onUpload`/`onDelete`/`accept` | engine + adapters | boolean / callbacks | preview on | **Click a file → dep-free preview overlay** (`BstFilePreview`, exported): images inline, **PDFs via the browser's native `<iframe>` viewer (no pdf.js)**, else open/download. Adapters' popup editor adds/removes files; `onUpload(file)=>FileRef` / `onDelete(file)` wire a real backend (busy state), else a local object URL keeps preview working offline. `cellMeta.preview:false` opts out | ✅ done |
| Fit columns to viewport (G3) | `fitColumns` | engine | boolean | false | custom render measure — sizes visible columns to the scroll box (utility columns fixed) so there is **no horizontal scroll**; `overflow-x:hidden` + resizers suppressed while on. Pure render overlay via `distributeFitWidths` (no model mutation) | ✅ done |
| Injectable body icons (engine) | `icons` (on `<BstTable>` / `<BstFilterBuilder>` / `<BstConditionalFormatBuilder>`) | engine render | `Partial<BstIcons>` | built-in skin-neutral inline SVGs | `@bloomskill/table-engine` — sort/expander/pin/boolean/file/KPI-trend/remove glyphs are inline SVG (never emoji), overridable via context; adapters forward their icon set so the whole grid matches one library | ✅ done |
| Column auto-size (D3) | double-click resizer (+ `computeAutoWidth`) | engine | interaction | — | sampled offscreen `canvas.measureText` (header + current page), clamped to `minSize`/`maxSize` → `setColumnSizing`; exports `computeAutoWidth` / `measureTextWidth` | ✅ done |
| Responsive column hiding (G4) | `enableResponsive` (+ `meta.responsivePriority`) | engine | boolean | false | `ResizeObserver` hides lowest-priority columns when too narrow (v9 `columnVisibility`), restores as it widens; only auto-hidden columns are restored; no-op under `fitColumns` | ✅ done |
| Row virtualization (D1) | `enableVirtualization` (+ `VirtualizationOptions`) | engine | boolean \| {overscan,estimateRowSize,estimateColumnSize} | false | custom render feature — `@tanstack/react-virtual`; paints only rows in the viewport (`resolveVirtualization` pure helper, `useVirtualizer` in `BstTable`). **Yields to** (renders un-windowed under) master-detail / grouping / cell spanning / row pinning — see `virtualizationBypassReason`. In settings ("Performance", **always shown** so an end-user can switch it on for a large grid) | ✅ done |
| Column virtualization (D1) | `enableColumnVirtualization` | engine | boolean | false | sub-toggle of `enableVirtualization` (needs it on) — also windows columns horizontally for very wide grids (header + filter row + body kept aligned via spacer cells); falls back to all-columns under column pinning / `fitColumns` / grouped headers / cell spanning. In settings ("Performance", **always shown**) | ✅ done |
| Infinite scroll (A2) | `useBstInfiniteDataSource` + `<BstTable onReachEnd>` (+ `endReachedThreshold`) | engine hook | hook + `() => void` callback | — (opt-in) | fetch-on-scroll append over a `DataSource`: accumulates windows, resets on sort/filter change, exposes `fetchNextPage`/`hasNextPage`/`isFetchingNextPage`/`rows`/`totalCount` + `tableProps` (manual mode). `onReachEnd` fires once as the virtualized body nears its tail. Pair with `enableVirtualization` + `pagination={false}`. Not a settings toggle (a hook + callback, like the server `DataSource`) | ✅ done |
| File ops verbs (I3) | `DataSource.uploadFile` / `deleteFile` / `getFileUrl` (+ `createFileHandlers`) | engine API | optional `DataSource` methods + bridge helper | — (opt-in) | formal server file contract (Plan.md §2.2): `uploadFile(file, ctx?)`→`BstFileRef`, `deleteFile(ref, ctx?)`, `getFileUrl(ref, ctx?)`→short-lived view URL (so B5 thumbnails never bake a permanent URL into row data). `createFileHandlers(source, ctx?)` bridges them to the `files` cell's `cellMeta.onUpload`/`onDelete`; complements the cell-level upload/delete. Not a settings toggle (a `DataSource` API) | ✅ done |
| Per-column edit lock (F3, runtime) | `showColumnEditToggle` | chrome | boolean | false | adapter Columns-menu lock/unlock (✏️) per editable column → engine `runtime.setColumnEditable` overrides `meta.editable` at runtime (store `columnEdit`). Requires `enableEditing`. Not a `BstTableEngineToggles` flag (no settings-sheet entry) | ✅ done |
| Batch editing + single-call save (C2/I2/I4) | `enableEditing: { mode: 'batch' }` + `onSave` | engine | EditingOptions + callback | — (opt-in) | third editing mode: EVERY edit/paste stays an unsaved draft; `runtime.getChangeSet()` (old→new + formatted text), `revertCell`/`revertRow`, `formatValue`. `onSave(event)` fires **once per save action** (`commitAll`/`commitRowSession`) with `{ changes, rows[].patch, next }` — ONE batched API call, never per cell/row/column; a rejected `onSave` keeps every draft. Mode is settings-toggleable via `enableBatchEditing` (next rows) | ✅ done |
| Review-changes sheet | `showChangesSheet` (+ `changesRowLabel`) | chrome | boolean | follows `mode: 'batch'` | adapter "{n} unsaved" chip + **Review & save** → right sheet (MUI Drawer / shadcn slide-over) listing each edit (row · column · old → new) with per-change/per-row revert + the final Save confirmation (`runtime.commitAll()` → one `onSave`); failed save keeps drafts + shows the error. Replaces the plain save bar while on. Like `showSaveBar`, not a settings-sheet entry | ✅ done |
| Batch-editing runtime switch | `enableBatchEditing` | engine | boolean | — (follows `enableEditing.mode`) | overrides the editing mode at runtime: `true` forces `'batch'`, `false` forces a batch grid back to per-cell; unset follows `enableEditing.mode`. **In the settings sheet** ("Editing", `alwaysShow`) via the new `SETTINGS_META.getBase` hook, so the switch truthfully reflects a `{ mode: 'batch' }` grid as ON; adapters' review-sheet chrome follows it. | ✅ done |
| Export — CSV/Excel/print (AG1–AG3) | `enableExport` | engine | boolean \| `BstExportOptions` | false | custom — **dep-free** `toCsv` / `toXlsx` (store-only ZIP + OOXML, **no exceljs**) / `buildPrintHtml`; `runtime.exportCsv`/`exportExcel`/`printTable`. Scope defaults to **all pages** (pre-pagination); values formatted per cell type (match copy). In settings ("Export", always shown) | ✅ done |
| CSV export (AG1) | `enableCsvExport` | engine | boolean | true | custom — sub-toggle of `enableExport`; gates `runtime.exportCsv` + the CSV menu item (RFC-4180, UTF-8 BOM). In settings ("Export", always shown) | ✅ done |
| Excel export (AG2) | `enableExcelExport` | engine | boolean | true | custom — sub-toggle; gates `runtime.exportExcel` + the Excel item; a real `.xlsx` (hand-built store-only ZIP + SpreadsheetML, numeric cells typed). In settings ("Export", always shown) | ✅ done |
| Print (AG3) | `enablePrint` | engine | boolean | true | custom — sub-toggle; gates `runtime.printTable` + the Print item; opens a print-friendly window (hidden-iframe fallback). In settings ("Export", always shown) | ✅ done |
| Export menu | `showExport` | chrome | boolean | follows `enableExport` | adapter toolbar **Export** button → menu (CSV/Excel/Print, filtered by the sub-toggles); MUI `Menu`, shadcn Radix `DropdownMenu` | ✅ done |
| Set Filter (AG4) | `enableSetFilter` (+ `meta.filter`) | engine | boolean | false | custom — Excel-style **checklist of distinct values** per column in the filter row (`BstSetFilter`: search · select-all/clear · counts · (Blanks)). Writes an `{op:'set'}` condition through the `bstCondition` filterFn. Categorical columns (select/multiSelect/radio/boolean) auto-eligible; `meta.filter: 'set'`/`'condition'` forces/opts out. Needs `enableColumnFilters` + `enableColumnFilterRow`. In settings ("Data operations", always shown) | ✅ done |
| Status bar (AG5) | `showStatusBar` | chrome | boolean | false | adapter footer — total / filtered row count + `runtime.getSelectionStats()` (sum·avg·min·max·count of the selected range). Selection aggregates need `enableCellSelection`. In settings ("Display") | ✅ done |
| Calculated / formula columns (AG17) | `meta.formula` (+ `normalizeFormulaColumns`) | engine | `(row, ctx) => value` | — (opt-in by presence) | **computed column** — value is derived by the formula, not read from a row field; flows through the accessor so sort/filter/group/`aggregationFn` all see it and the cell `type` still formats it. `ctx.rows`/`ctx.index` for running totals/ratios. Dep-free (no string eval); stable across data changes. Not a settings toggle (per-column config) | ✅ done |
| Loading / error overlays (AG23) | `loading` / `error` (+ `renderLoading`/`renderError`, `classNames.overlay`) | engine + adapters | `boolean` / `ReactNode` | `false` / — | dep-free spinner + error overlay over the grid body (error wins), theme + reduced-motion aware, ARIA `status`/`alert`; complements the empty state. Flows through both adapters via `...rest`. Not a settings toggle (render state) | ✅ done |

| MCP server for AI agents | `@bloomskill/table-mcp` | tooling | MCP stdio server | — (separate package) | `npx -y @bloomskill/table-mcp` — 8 tools (`bst_search_docs` · `bst_get_feature` · `bst_get_cell_type` · `bst_get_api` · `bst_get_example` · `bst_scaffold_grid` · `bst_validate_config` · `bst_detect_version`), 4 prompts, `bst://` resources. Corpus **generated from source** at build time; `src/rules.ts` holds the hand-authored flag-dependency table (parity-tested) | ✅ done |

Add a row here — in this exact shape — whenever a feature is introduced.

> **Custom-CSS note:** these are customization props, not on/off toggles — presence
> is the opt-in (§12 "passing an object implies enabled"). Slots **compose with** the
> built-in `bst-*` classes (never replace them), so a consumer's CSS layers on top of a
> theme rather than forking the renderer. Per-column `meta.cellStyle`/`headerStyle` win
> over the global `styles.cell`/`styles.headerCell` slot (more specific).

---

## 13. Release & README discipline — MUST follow on every change

A user-facing feature or behaviour change is **not "done"** until its docs and version
are updated in the **same change**. This keeps the npm package pages accurate and gives us
a per-release feature trail. (Reminder: npm **cannot republish a version** — every release
needs a version bump.)

### Definition of Done for any feature / flag
1. **Code + test** — it works and has a test (`npm test` green).
2. **§12 registry row** — add or flip the feature's toggle row (if it is a toggle).
3. **Demo** — wire the feature into `apps/demo/src/App.tsx` (enable the flag / add a small
   section) so **`npm run demo` shows it working before any publish**. `npm run demo` builds the
   packages first, so the demo always runs against the current source — but only if the demo
   actually *uses* the feature. A feature the demo can't show isn't done.
4. **README(s)** — update the affected package README's **Features** list, **Props/Options
   table**, and **example** (if the API surface changed). Mapping below.
5. **CHANGELOG.md** — add a bullet under the new version heading.
6. **Version bump** — bump the affected package `version` (semver).

### Which README to update
| Change is in… | Update this README |
| --- | --- |
| Engine behaviour · `useBstTable` options · `enable*` flags · new sort/filter fn | `packages/engine/README.md` |
| MUI chrome · `show*` props · MUI-specific behaviour | `packages/mui/README.md` |
| shadcn/Radix chrome · `show*` props · `dark` · shadcn CSS | `packages/shadcn/README.md` |
| A feature spanning engine + adapters (e.g. row selection, editing) | engine README **and** each adapter README |
| MCP server tools/prompts/resources · the corpus generator · validation rules | `packages/mcp/README.md` |

Also refresh **Requirements** (peer deps) in a README whenever that package's dependencies change.

> **MCP server (`@bloomskill/table-mcp`) — it updates itself, with two exceptions.** Its knowledge
> base is **generated from source** (`BST_SETTINGS_REGISTRY`, the §12 table, `COVERAGE.md`,
> `types.ts` TSDoc, the built `.d.ts`, the READMEs, `examples/*`), so a new feature flows in with
> no extra step — provided you did steps 2 and 4 above. Two guards enforce that and will **fail
> the build**: corpus generation errors if a toggle in `BST_SETTINGS_REGISTRY` has no §12 row, and
> `packages/mcp/src/__tests__/rules.test.ts` fails if a toggle has no entry in
> `packages/mcp/src/rules.ts` (the hand-authored flag-dependency table — a bare `{}` is a valid
> entry meaning "no dependencies"). So: **add a rules entry for every new `enable*`/`show*` flag.**

> **DoD step 3 for `packages/mcp`.** An MCP server can't be shown in `apps/demo`, so its equivalent
> gate is `npm run mcp` from the repo root — builds, runs the package's tests (including the two
> parity guards), boots the server over stdio as a real MCP client and calls every tool, then
> typechecks every scaffolded component against the built packages. That must pass before publishing.

### Release flow (versions kept in lockstep via `version.ini`)
`version.ini` is the **single source of truth** for the version. The `version:*` scripts
increment it and sync all four `package.json`s (version + the adapters' internal
`@bloomskill/table-engine` range) and run `npm install`. The MCP server rides the same version
because its corpus documents exactly the release it ships with.
```bash
1. npm run build && npm test && npm run verify:portability     # all green
2. # update the demo (apps/demo) + README(s) + §12 registry + CHANGELOG.md
3. npm run demo               # eyeball the new feature live BEFORE publishing (builds first, so dist is fresh)
4. npm run version:patch      # or version:minor / version:major (bumps version.ini + all 3 pkgs)
5. npm run mcp                # MCP DoD gate: build + tests (parity guards) + stdio smoke + scaffold typecheck (see §13 note below)
6. npm run release            # build + publish all four (engine FIRST — adapters peer-depend on it)
```
Semver: **patch** = fix/docs · **minor** = new backward-compatible feature (most new flags) ·
**major** = breaking change. Record every release in `CHANGELOG.md`.
