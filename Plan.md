# Bst-Table — Capability Analysis & Architecture Plan

## Context

Kagami wants **one** React grid ("Bst-Table") standardized across all apps, built on
**MIT/Apache open-source only** — no per-seat / Enterprise licensing (the AG Grid Enterprise
trap: master-detail, range-selection, clipboard, pivoting are all paid there). Engine:
**TanStack Table v9** (stable since Aug 4 2026, `latest` = 9.1.2, MIT, headless) — **confirmed by a
Phase-1 spike**, v8 = documented fallback only (PART 6). This doc answers: what's out-of-the-box vs custom,
what overlaps, how feasible the custom-plugin idea is, and — now that key decisions are made —
the concrete architecture and MVP phasing.

### Decisions (locked)

0. **Engine: TanStack Table v9** (GA Aug 4 2026, 9.1.2). Phase-1 spike confirms; v8 fallback only.
   v9's per-feature meta + clearer plugin model + OOTB cell-selection/spanning fit this plugin-heavy,
   1M-row, greenfield project (PART 6).
1. **Data strategy:** Hybrid **DataSource** abstraction — one interface, client-mode (in-memory
   TanStack row models) for small/medium tiers, server-mode (manual ops + windowed fetch) for the
   1M-row tier. Same grid, swap the source.
2. **MVP target:** **Workflow-grid tier first** (10–20 cols, 100–200 rows) → centers on
   **inline editing + cell types + validation + keyboard nav**, with virtualization/server seams
   stubbed for later tiers.
3. **UI/styling:** **MUI + Emotion + @mui/x-date-pickers (community) + @mui/icons-material** —
   adapter-swappable (shadcn/Radix or any lib later; see §2.6).
4. **Plugin depth:** **Pragmatic hybrid** — formal `TableFeature` only for instance-state concerns
   (editing, selection, validation, access-control); hooks + context + `columnDef.meta` for the rest.
5. **Feature customization:** every capability is a **per-instance toggle** — `enable*` for engine
   behaviour (mapped to v9 options), `show*` for adapter chrome; value `boolean | {options}`; OOTB
   features default on, heavy features off. **Every new feature MUST follow this and be added to the
   registry — see `CLAUDE.md` §12 (the canonical, always-loaded convention).**

### Licensing verdict (the hard constraint) — PASS

Entire stack is MIT/Apache. MUI split: `@mui/material`, `@mui/icons-material`, `@emotion/*`,
`@mui/x-date-pickers` (community) = **MIT, free forever**. **HARD RULE: never add** `*-pro` /
`*-premium` MUI X packages (`@mui/x-date-pickers-pro`, `@mui/x-data-grid-pro|premium`) — those are
per-dev commercial. We build the grid on TanStack, not MUI's DataGrid, so we never need them.

> **Framing:** TanStack Table is *headless* — it ships the correct **state engine** and **zero
> markup**. A large share of this spec being "custom" is the point: it's the control Kagami buys by
> not licensing AG Grid Enterprise.

---

## Toolchain & environment (pinned — do not re-detect)

> **Purpose:** exact, verified versions of the host toolchain and the project's dependencies so a
> new session can act **without re-checking or assuming**. Captured **2026-08-11** on this machine.
> If a command below reports something different, the environment changed — update this section.

### ⚠️ Critical gotcha — Node/npm are NOT on the default PATH

Node is installed **via nvm**, which is **not sourced** in a non-interactive shell. A bare
`node`/`npm`/`npx` returns **`command not found`**. **Source nvm first, every fresh shell**, before
any `node`/`npm`/`npx`/`vite`/`vitest` command:

```bash
export NVM_DIR="$HOME/.nvm"; [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
```

(`$HOME/.nvm` = `/home/sathish/.nvm`.) After sourcing, `node`, `npm`, `npx` resolve to the v24.19.0
install. There is **no `.nvmrc`** in the repo and **no `engines`/`packageManager`** field in any
`package.json` — the active Node is whatever nvm's `default` alias points to (see below).

### Host toolchain (verified `--version`)

| Tool         | Version            | Notes                                                                    |
| ------------ | ------------------ | ------------------------------------------------------------------------ |
| **OS**       | Ubuntu **26.04 LTS** | `x86_64`                                                                |
| **Kernel**   | 7.0.0-28-generic   | `Linux developement` (hostname)                                          |
| **nvm**      | **0.39.1**         | `NVM_DIR=/home/sathish/.nvm`                                             |
| **Node.js**  | **v24.19.0**       | nvm `default` → `lts/*` → `lts/krypton`; real path `/home/sathish/.nvm/versions/node/v24.19.0/bin/node` |
| **npm**      | **11.17.0**        | bundled with Node 24.19.0                                                |
| **npx**      | **11.17.0**        | bundled with npm                                                        |
| **corepack** | 0.35.0             | present but unused (npm is the package manager)                          |
| **git**      | 2.53.0             |                                                                          |
| yarn / pnpm  | **not installed**  | do not invoke — repo uses **npm workspaces** only                       |

**nvm installed Node versions:** only **v24.19.0** is installed (`nvm ls`). The LTS aliases
(argon…jod) resolve to `N/A` — not present. `default -> lts/* -> lts/krypton -> v24.19.0`.

### Project toolchain (declared → installed)

Root `package.json` `devDependencies`; "installed" is what's actually in `node_modules`.

| Package                       | Declared range | Installed | Role                         |
| ----------------------------- | -------------- | --------- | ---------------------------- |
| **typescript**                | `^7.0.2`       | **7.0.2** | typecheck / build (`tsc`)    |
| **vite**                      | `^8.2.1`       | **8.2.1** | demo dev server / bundling   |
| **vitest**                    | `^4.1.10`      | **4.1.10**| test runner (`npm test`)     |
| **@vitejs/plugin-react**      | `^6.0.5`       | 6.0.5     | React plugin for Vite        |
| **jsdom**                     | `^30.0.1`      | 30.0.1    | test DOM environment         |
| **@testing-library/react**    | `^16.3.2`      | 16.3.2    | component tests              |
| **@testing-library/jest-dom** | `^6.6.0`       | —         | matchers                     |
| **@testing-library/user-event** | `^14.5.2`    | —         | interaction sim              |
| **@types/react**              | `^19.2.0`      | (react **19.2.8**) | React 19 types      |
| **@types/react-dom**          | `^19.2.0`      | (react-dom **19.2.8**) | —               |

### Key runtime dependencies (installed)

| Package                    | Installed | Where / range                                             |
| -------------------------- | --------- | --------------------------------------------------------- |
| **@tanstack/react-table**  | **9.1.2** | `packages/engine` dep `^9.1.2` — **the engine** (v9 GA)   |
| **react** / **react-dom**  | 19.2.8    | engine peer `>=18` (works on React 19)                    |
| **@mui/material**          | 9.3.1     | `@bloomskill/table-mui` adapter                           |
| **@radix-ui/react-slot**   | 1.3.3     | `@bloomskill/table-shadcn` adapter                        |
| @tanstack/react-virtual    | not yet installed | Phase-4 virtualization companion (see PART 5)     |
| @mui/x-date-pickers, date-fns | not yet installed | add when the Date/Time cell type lands (§2.3)  |

### Workspace package versions (release in lockstep)

`version.ini` is the **single source of truth**; `npm run version:*` syncs all three `package.json`s.

| Package                     | Current `package.json` |
| --------------------------- | ---------------------- |
| `@bloomskill/table-engine`  | **0.1.2**              |
| `@bloomskill/table-mui`     | **0.1.2**              |
| `@bloomskill/table-shadcn`  | **0.1.2**              |
| `version.ini` (SoT)         | **0.1.1**              |

> **Drift to reconcile:** the three packages are at **0.1.2** but `version.ini` reads **0.1.1**.
> They should match. Next release: run `npm run version:patch` (bumps `version.ini` → 0.1.2/0.1.3
> and re-syncs all three) rather than hand-editing — see `CLAUDE.md` §13.

### One-liner to re-verify everything (paste into a fresh shell)

```bash
export NVM_DIR="$HOME/.nvm"; [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
node -v; npm -v; nvm --version; git --version
cd /home/sathish/projects && npm test        # vitest run — all green expected
```

---

## PART 1 — Capability analysis (the original question)

### 1.1 OOTB vs Custom headline (of ~58 leaf items)

| Bucket | Count | Meaning |
| --- | --- | --- |
| **Fully OOTB** (engine+state) | ~6 | TanStack provides it; we style/render |
| **Partial** (state OOTB, logic ours) | ~10 | TanStack gives state/hooks; render+logic ours |
| **Fully Custom** (TanStack hosts the slot) | ~40+ | We build entirely |

TanStack covers ~25–30% of the spec's *mechanisms* (data-ops + structural layer). The other ~70%
— every cell type, editing, validation, clipboard, styling, charts, error handling, backend wiring
— is our layer.

- **Free OOTB:** Sorting (E1) · Column+Global search (E2) · Advanced-filter *engine* (E3) ·
  Multi-col grouping (E4) · Pagination client+server (A3) · Column visibility/ordering/**resizing**/
  **pinning** · **Row pinning** (G1) · **Row** selection · **cell/range selection**
  (`cellSelectionFeature`) · **cell spanning** (`cellSpanningFeature`) · Master-detail *state* via
  Expanding (A4). *(Master-detail + the basis for clipboard are AG Grid Enterprise-only; free here.)*
- **Not in v9 (we build):** editing · validation · virtualization (→TanStack Virtual) · clipboard ·
  keyboard nav · charts · files · all styling. *(v9 DOES ship cell/range selection + spanning — above.)*

### 1.2 Per-section verdict (condensed)

- **A Core render:** A3 OOTB; A4 Partial (expand state OOTB, detail render custom); A1/A5 Custom;
  **A2 = two capabilities** — *virtual* scroll (render-only-visible) **+** *infinite* scroll
  (fetch-on-scroll); see §2.7. A6 Partial (needs virtualization + server at scale).
- **B Cell types (B1–B10): all Custom** — the heart of Bst-Table; React renderers via a **cell-type
  registry** keyed on `meta.type`. B10 action-column: pin OOTB, buttons custom.
- **C Editing/validation (C1–C6): all Custom.**
- **D Performance:** D1 Custom (TanStack Virtual, = A2's *virtual* scroll); D2 Custom (== B);
  **D3 Partial** (sizing state OOTB, sampled measurement ours — §2.7); D4 Custom.
- **E Data ops:** E1/E2/E4 OOTB; E3 Partial (engine OOTB, builder UI custom). *Server-side at 1M.*
- **F Access control:** column *visibility* OOTB; enable/disable (F1–F4) + F5 Custom → one
  Access-Control plugin.
- **G Layout:** G1 Partial (pin *state* OOTB, **sticky render ours**); G2 Partial (col-resize OOTB,
  **row-resize custom**); G3/G4 Custom.
- **H Clipboard (H1–H4): Custom** — builds on v9 `cellSelectionFeature` (cell/range selection now OOTB).
- **I Backend: Partial** — callbacks/manual modes OOTB, wiring + change-set custom.
- **J Popup/rich editors: Custom** (components). **K Styling: Custom.** **L Errors: Custom**
  (from Validation). **M Viz: Custom** (== A5).

### 1.3 Overlaps / repeats (asked explicitly)

The spec's 58 leaf requirements (`A1 … M2`) contain many duplicates expressed as a dense
shorthand. Decoded below into scannable tables — same 14 overlaps and same 12 concerns as
`CLAUDE.md` §3, formatting pass only, no new analysis.

**Notation:** `≡` identical (same requirement, two labels) · `⊇`/`⊂` contains / is contained by ·
`∩` overlaps (shares logic/mechanism) · `*` near-duplicate / restatement.

#### Overlaps / repeated requirements (14)

| # | Overlap | Plain meaning | Collapses into |
| --- | --- | --- | --- |
| 1 | A2 ∩ D1 (**not** ≡) | D1 = A2's *virtual* scroll (render only visible). A2 also asks for *infinite* scroll = fetch-on-scroll — a separate **data** concern (§2.7) | Virtualization **+** data-source |
| 2 | A5 ≡ M1 (M2 adjacent) | in-cell charts; KPI adjacent | In-cell visualization |
| 3 | B* ≡ D2 | D2 restates the B cell types for perf | Custom cell renderers |
| 4 | C2 ≡ I2 | "refer C2" — deferred save | One editing lifecycle |
| 5 | A1 ⊇ C ⊇ J | A1 wraps C1–C6 wraps popup/rich editors | Editing umbrella |
| 6 | C5 ∩ C6 | shortcuts + Tab nav | Keyboard / navigation |
| 7 | F5 ∩ K1–3 ∩ L1–2 | all "evaluate rule → style / show / enable" | Shared rule engine |
| 8 | F1–F4 ∩ C1 | enable/disable is a facet of editing | Editability |
| 9 | B10 ≡ G1 | "pinned last" = column pinning | Pinning |
| 10 | L1/L2 ⊂ K1/K2 | error highlight = conditional styling | Highlighting |
| 11 | I4 ∩ I5 | same reconciliation mechanism | External data apply |
| 12 | B6 ≡ B7 ∩ B8 | "same as single select" + chip/tag | Option-based cell |
| 13 | B1 ∩ J1 ∩ B6/B7 | tooltip/popover + popup + dropdowns | Shared overlay infra |
| 14 | E2 ⊂ E3 | search is a subset of filtering | Search ⊂ filter |

#### The 12 engineering concerns

| # | Concern | Folds in | Nature |
| --- | --- | --- | --- |
| 1 | Core / render | A frame, A3 pagination, A4 master-detail, **A5 spanning**, A6 scale; **D3 auto-size**, **G1 pin render**, G2–G4 resize/layout/responsive | Mixed OOTB/Custom |
| 2 | Cell-type registry | B1–B10, D2, J editors (keyed by `meta.type`) | Custom (components) |
| 3 | Editing | A1, C1–C2/C4/C6 + save lifecycle (C2≡I2) | Custom (plugin) |
| 4 | Validation + errors | C3, L1–L3 | Custom (plugin) |
| 5 | Keyboard / nav | C5, C6 | Custom (plugin) |
| 6 | Selection (cell/range) | **v9 `cellSelectionFeature` OOTB** (v8 was row-only); foundation for H | OOTB-assisted |
| 7 | Clipboard | H1–H4 (uses selection) | Custom (plugin) |
| 8 | Virtualization | A2 *virtual* scroll ≡ D1, D4 | Custom (TanStack Virtual) |
| 9 | Data-ops | E1–E4, A3 | Mostly OOTB |
| 10 | Access-control + conditional rules + styling | F1–F5, K1–K3, L1/L2 | Custom (shared rule engine) |
| 11 | Backend / data-source + change-set | I1–I5 (incl. **I3 upload/view/delete**), **A2 infinite scroll (fetch-on-scroll)**, DataSource, change-tracking | Partial (wiring custom) |
| 12 | Visualization | A5 *charts* ≡ M1, M2 | Custom (charts) |

**Net:** 58 leaves → 12 engineering concerns — **all 58 mapped**. A2 and A5 each split across two
concerns (A2 → #8 render + #11 fetch; A5 → #1 spanning + #12 charts).

*`CLAUDE.md` §3 now mirrors these two tables (done), including the corrected A2 split and the D3 /
G1 mappings.*

### 1.4 Custom-plugin feasibility — "how much is possible"

Very feasible for **stateful/behavioral** concerns (formal `TableFeature`): **Editing, Validation,
Cell/Range-Selection, Clipboard, Access-Control, Undo/Redo, Change-Tracking, Row-Height/Density,
Conditional-Formatting.** **Presentational** concerns are NOT plugins — cell types (B), charts (M),
virtualization, popups (J) are components/hooks driven by `columnDef.meta`.
**v9 plugin model:** register via `tableFeatures({ x })`; per-feature meta typing replaces v8's global
declaration merging, and the model is clearer than v8's `_features` — pragmatic hybrid (Decision 4)
still governs *what* becomes a formal feature vs a hook.

---

## PART 2 — Finalized architecture

### 2.1 Package structure — hard core/adapter split

Monorepo (pnpm workspaces + Turborepo). **`grid-core` never imports MUI/Emotion** — that boundary
protects the cell hot-path and keeps MUI swappable.

```
bst-table/
├─ packages/
│  ├─ grid-core/            # @bloomskill/grid-core — NO MUI, NO Emotion
│  │  ├─ table/             # useBstTable (useTable + tableFeatures), resolveColumns (memoized)
│  │  ├─ datasource/        # DataSource.ts, ClientDataSource.ts, ServerDataSource.ts (stub)
│  │  ├─ features/          # formal TableFeatures: editing/ validation/ selection/ access/
│  │  ├─ store/             # interactionStore.ts (useSyncExternalStore hot-state)
│  │  ├─ registry/          # CellTypeRegistry, defineCellType, types.ts
│  │  ├─ hooks/             # useKeyboardNav, useClipboard, useChangeSet, useLiveUpdates, useConditionalFormat
│  │  ├─ render/            # GridRoot/Header/Row, GridCell.tsx (HOT PATH, memoized, no MUI), virtual/
│  │  ├─ styles/            # grid.css (static classes), tokens.css (CSS custom props)
│  │  └─ types/augmentation.d.ts   # minimal in v9 — per-feature meta slots replace global merging
│  ├─ grid-mui/             # @bloomskill/grid-mui — MUI + Emotion live ONLY here
│  │  ├─ celltypes/         # text longText number dateTime boolean singleSelect multiSelect radio hyperlink files action  + viz/
│  │  ├─ chrome/            # Toolbar, PopupEditorDialog, ErrorPopover
│  │  ├─ theme/muiThemeToCssVars.ts   # MUI theme → CSS vars ONCE at root
│  │  └─ preset.ts          # createMuiPreset() registers all built-in CellTypes
│  └─ grid-testing/
└─ apps/playground/         # Vite + Storybook + perf scenes
```

Build ESM+CJS via tsup; `@tanstack/*`, `react`, `@mui/*` as **peerDependencies** (single instance).
**Adapters are swappable (see §2.6):** `grid-core` is UI-agnostic; `grid-mui` now, `grid-shadcn`
(Radix) or any lib later, all implement the same contracts.

### 2.2 `DataSource<TData>` contract (the client/server seam)

Async-first so server-mode is a drop-in; client-mode wraps sync in a Promise. Grid reads
`capabilities` to decide TanStack's `manualSorting/Filtering/Pagination`. **No feature code branches
on mode.**

```ts
interface DataSourceQuery { sort: SortSpec[]; filters: FilterSpec[]; quickFilter?: string;
  grouping: GroupSpec[]; offset: number; limit: number }
interface DataSourcePage<TData> { rows: TData[]; startIndex: number; totalCount: number }
interface RowChange<TData> { rowId: RowId; type: 'create'|'update'|'delete';
  patch?: Partial<TData>; row?: TData; baseVersion?: string|number }
interface DataSource<TData> {
  readonly capabilities: { mode:'client'|'server'; sorting; filtering; grouping; pagination };
  getRowId(row: TData): RowId;                                   // identity across data swaps
  fetch(q: DataSourceQuery, signal?: AbortSignal): Promise<DataSourcePage<TData>>;
  commit(changes: RowChange<TData>[], signal?): Promise<MutationResult<TData>[]>;
  uploadFile?(rowId, columnId, file: File, signal?): Promise<FileRef>;   // I3 upload
  getFileUrl?(ref: FileRef, signal?): Promise<string>;                   // I3 view — short-lived/signed URL
  deleteFile?(rowId, columnId, ref: FileRef, signal?): Promise<void>;    // I3 delete
  subscribe?(onEvent: (e: DataSourceEvent<TData>) => void): Unsubscribe; // WebSocket #11
}
```

Client-mode: `fetch` returns the full set once, TanStack row models do the work, `manual*=false`.
Server-mode (later): `manual*=true`, a windowing hook calls `fetch(query)` from table state and
feeds the virtualizer.
**I3 covers all three file verbs** (upload / view / delete). `getFileUrl` exists because B5
thumbnails must not embed permanent public URLs in row data — the read path resolves a short-lived
URL on demand and caches it per `FileRef`. Read path (`getFileUrl`) lands Phase 1 with B5;
`uploadFile`/`deleteFile` land Phase 4 with the change-set.

### 2.3 Cell-type registry (concern #2)

A `CellType` bundles read renderer (hot path, plain DOM), edit renderer (MUI lives here),
parse/format (clipboard + text I/O), validator, default meta. Selected via `columnDef.meta.type`,
resolved **once per column** (memoized).

```ts
interface CellType<TValue=unknown, TMeta=unknown, TData=any> {
  id: string;                                              // 'text'|'number'|'date'|...
  renderRead: (p: CellRenderProps<TData,TValue>) => React.ReactNode;   // cheap, NO MUI
  renderEdit?: (p: CellEditProps<TData,TValue>) => React.ReactNode;    // MUI OK here
  editMode?: 'inline'|'popup';                            // popup = dialog (LongText/Files)
  parse?: (raw: string, meta: TMeta) => TValue;           // paste / typed input
  format?: (v: TValue, meta: TMeta) => string;            // display + copy
  validate?: (v: TValue, ctx) => FieldError[] | Promise<FieldError[]>;
  capturesArrowKeys?: boolean;                            // editor yields arrow keys to nav
  isEmpty?: (v: TValue) => boolean; defaultMeta?: Partial<TMeta>;
}
// columnDef.meta (v9 per-feature meta slot — no global declaration merging): type, cellMeta, editMode,
// editable(row), cellClassName(p), cellStyleVars(p)  ← conditional formatting via className + CSS vars
```

A MUI editor is just a `renderEdit` returning `<TextField/>`/`<Select/>`/`<DatePicker/>`; the engine
never sees MUI. `createMuiPreset()` registers all built-ins.

#### Cell-type sub-features (the B-series detail — build to this, not to the type names)

| Type (`meta.type`) | Req | Sub-features that must ship |
| --- | --- | --- |
| `text` / `longText` | B1 | ellipsis · word-break/wrap · **tooltip only on truncation** (detect overflow) · configurable line-height · internal scroll · popover/dialog for full content · *(QR/barcode deferred — see Open questions)* |
| `number` | B2 | integer/decimal · currency · precision · thousands separator · multiple display formats · locale-aware parse+format |
| `dateTime` | B3 | date · time · dateTime · configurable format · locale |
| `boolean` | B4 | checkbox **or** toggle variant |
| `files` | B5 | image thumbnail · PDF thumbnail (pdf.js) · file-type icon fallback · view/delete via §2.2 |
| `singleSelect` | B6 | multi-attribute option render (icon/badge/color/avatar/image) · rich edit mode · custom read mode |
| `multiSelect` | B7 | B6 + chip/tag display + **overflow handling** (`+N more`) |
| `radio` | B8 | single-select radios · chip/tag display · **horizontal/vertical layout** flag |
| `hyperlink` | B9 | href/label split · target · safe-rel |
| `action` | B10 | Edit/Save · Delete · View (optional) · pinned last (OOTB) + **floating variant — see Open questions** |

B6/B7/B8 share one **option-based-cell** core (overlap #12); B1's popover, J1's popup and B6/B7's
dropdowns share one **overlay layer** (overlap #13).

### 2.4 MVP plugin set (pragmatic hybrid)

**Formal `TableFeature`s** (v9: `constructTableAPIs`/`assign*Prototype` + per-feature meta; state on instances):

- **Editing:** `state.editing{active, mode:'cell'|'row', rowSession(draft), dirty}` · APIs
  `startEditing/commitCell/cancelEditing/beginRowSession/commitRowSession/getDirtyChanges`,
  `row.isDirty()`, `cell.isEditing()/getDirtyValue()`. Save on `('enter'|'blur'|'explicit')`.
  Writeback by **`rowId` (not rowIndex)**. Live keystrokes never hit `table.setState` (§2.5).
- **Validation:** `state.validation{cell, row, pending}` · `validateCell/validateRow`,
  `cell.getErrors()/isValid()`, `row.getErrors()`. Compose CellType→column→cross-column validators;
  async = last-write-wins per `${rowId}:${colId}` + AbortSignal. Feedback = CSS error ring + on-demand
  MUI `ErrorPopover`. Policy: `blockCommitOnError | commitButFlag`.
- **Cell/Range-Selection** (extends v9 `cellSelectionFeature`; verify range scope in spike):
  anchor/focus **by id**, rectangles materialized to indices at paint ·
  `setActiveCell/selectRange/extendSelectionTo/getSelectedRangeValues`, `cell.isActive()/isSelected()`.
  High-frequency → lives in interactionStore (§2.5).
- **Access-Control** (thin: options + `createCell/createRow`): cascade grid→row→column→cell →
  `cell.getAccess()/isEditable()`, `row.getAccess()`, `table.isCellEditable()`.

**Hooks + context + meta (NOT features):** keyboard/nav (#5, computes Tab order, skips
hidden/non-editable, wraps), clipboard (#7), virtualization (#8), data-ops (#9, mostly OOTB),
conditional formatting (#10 styling), change-set/dirty/live (#11), registry (#2) & viz (#12).

### 2.5 Cell hot-path performance rules (non-negotiable)

1. **`GridCell` = `React.memo` with scalar-only props** (`rowId,columnId,value,isActive,isSelected,
   isEditing,isDirty,errorLevel,access` + stable `table` ref). Never pass fresh `row`/`cell` objects.
2. **Zero Emotion in read cells** — one `<div className="kg-cell">`; variants via `data-*`/class +
   **static CSS**; conditional formatting via inline CSS custom properties. No per-cell `sx`/`styled()`.
3. **MUI theme → CSS vars once** at `GridRoot` (`muiThemeToCssVars`); cells consume vars.
4. **Keystrokes bypass `table.setState`** — active draft in local/`interactionStore`
   (`useSyncExternalStore` per-cell selector); table state written **only on commit**. *(Single most
   important decision — prevents 200-row re-render per keystroke.)* *(v9's atoms/`table.Subscribe` give
   fine-grained subscriptions natively — may shrink the custom store; keep `interactionStore` as the
   abstraction/fallback.)*
5. **Per-cell interaction subscriptions** — moving active cell re-renders 2 cells, not the grid.
6. **Draft-overlay read path** — `display = editing.getDirtyValue() ?? sourceValue` so deferred
   sessions render without mutating the row model (avoids reorder-under-user).
7. **Stable data + `getRowId`**; memoized column→CellType resolution.
8. **Row virtualization on from day 1; column virtualization behind a flag** (off ≤20 cols).
9. **Fast inline editors for Text/Number = plain `<input>`** (CSS-var styled); reserve heavy MUI
   editors (DatePicker/multi-select) for click/Enter-to-open — keeps Tab-through snappy.

### 2.6 Adapters & custom styling (MUI now; shadcn/Radix or any lib later) — YES, by design

The core/adapter split makes the styling system pluggable:

- **`grid-core` is UI-agnostic** (no MUI/Emotion/Tailwind) — engine, hot-path read cells (plain DOM +
  CSS vars), features, and the `CellType` registry *contract*.
- **`grid-core` ships neutral default `renderRead`** for every cell type → read-mode looks consistent
  across adapters and needs zero adapter work.
- **Adapters own `renderEdit` (editors) + chrome** (toolbar, popup dialog, error popover, dropdowns,
  pickers) — where the component library shows. Switching adapters mostly swaps *editors + chrome*.
- **Theme surface = CSS custom properties** (`tokens.css`, `--kg-*`). MUI maps its theme → CSS vars
  once at root; **shadcn/Radix + Tailwind already theme via CSS variables** → maps directly.
- **To add shadcn later:** create `@bloomskill/grid-shadcn` implementing the same `CellType`s + chrome with
  Radix primitives (MIT) + Tailwind (MIT), then swap `createMuiPreset()` → `createShadcnPreset()`.
  **No change to `grid-core` or app data logic.** Adapters coexist; apps pick their skin.
- Building the shadcn adapter is a **Phase 4 nice-to-have that proves the seam** — but the seam
  exists from **Phase 1**.

### 2.7 Three constraints that collide with virtualization (resolved)

Virtualization is on from day 1 (§2.5 rule 8), so three spec items need an explicit rule rather than
"custom render". **These are the answers, not open questions.**

**(a) A5 cell/row spanning.** v9 ships **`cellSpanningFeature`** — the rules below become a thin layer
over it (verify scope in spike). Two different problems:

- **`colSpan` — supported from Phase 1.** A span is row-local, so row virtualization is unaffected:
  the cell declares `colSpan`, the row renderer skips the covered cells. *Caveat:* a span crossing
  the column-virtualization window is invalid → **`colSpan` forces column virtualization off for the
  spanned columns** (harmless: column virt is already flag-gated off ≤20 cols).
- **`rowSpan` — supported only as precomputed span-groups.** A `rowSpan` whose top row scrolls out
  of the window would break, so the virtualizer must know spans *before* it measures: a memoized
  **span map** derived from the row model turns each spanned block into **one virtual item** of
  combined height. Hard rule: **a `rowSpan` is honoured only while its rows are contiguous under the
  active sort/filter** — if a sort or filter breaks contiguity the span **auto-collapses** to
  per-row rendering. Anything requiring spans across non-contiguous rows is out of scope.
- Seam in Phase 1 (span map hook + covered-cell skip in the row renderer); `rowSpan` + spanning
  charts land Phase 4 with the viz cell types.

**(b) D3 smart column auto-size.** You cannot measure rows that were never rendered, so auto-size is
**sampled, bounded and on-demand — never continuous**:

1. Measure the header plus **the first N=50 rows of the current window** (not the whole dataset).
2. Measure with an **offscreen `canvas.measureText`** using the resolved font — no DOM insertion, no
   layout thrash, no reflow per column.
3. Take the max, add cell padding, **clamp to the column's `minSize`/`maxSize`**.
4. Trigger points: explicit "fit to content" (double-click the resize handle) and an optional
   one-shot pass on first data load. **Not** on every data change.
5. Server-mode measures only the fetched window — the number is a good estimate, not a guarantee.

**(c) A2 infinite scroll ≠ D1 virtual scroll.** Two capabilities, deliberately separated:

- *Virtual* scroll = render only visible rows (concern #8, TanStack Virtual, Phase 1).
- *Infinite* scroll = **fetch the next chunk as the user approaches the end** (concern #11). Same
  `DataSource.fetch(offset, limit)`, but in **append mode**: results concatenate onto the loaded set
  instead of replacing it, with an `isLoadingMore` tail row. Requires a stable `getRowId` to
  de-duplicate overlapping pages. Client-mode grids that already hold all rows simply never trigger
  it. Lands Phase 4 with `ServerDataSource`.

---

## PART 3 — Delivery in 4 phases (easy → hard)

Each phase is independently shippable and leaves later-phase seams stubbed.

### Phase 1 — Engine spike + read-only grid + cell types  *(EASIEST — leans on OOTB)*

**1a. Engine spike (do FIRST, ~2–4 days) → commit gate before Phase 2.** Build the skeleton on
**v9** (with a v8 fallback branch): `useBstTable` wiring + one sample custom feature
(state+options+APIs) + one MUI editor; confirm v9 plugin ergonomics, `cellSelectionFeature`/
`cellSpanningFeature` scope, atom-based re-render control, and no blocking bugs (9.x is ~1 wk old).
**Lock the engine, record rationale, proceed.** Everything below is engine-agnostic except noted v9 specifics.

**1b. Build:** Scaffold (monorepo, core/adapter split, `DataSource`+`ClientDataSource`, CSS-var theming,
playground+Storybook) · headless read grid with memoized cells + row virtualization + `getRowId` ·
cell-type registry with **all B-type read renderers to the §2.3 sub-feature table** + Action column +
conditional formatting + loading/empty states · **G1 sticky render** (pinned rows + columns; pin
*state* is OOTB, the sticky CSS is ours) · **A4 master-detail** read panel (Expanding + nested table
instance for a different column set) · **G3 auto layout + G4 responsive** (grid CSS, column
flex/min/max, overflow behaviour) · **A5 `colSpan` + the span-map seam** (§2.7a) · **`getFileUrl`
read path** for B5 thumbnails · **OOTB data-ops free here:** sorting, column+global search, grouping,
client pagination.
→ *Deliverable:* fast, themeable, read-only grid over `ClientDataSource` (MUI preset).

### Phase 2 — Editing + validation  *(MEDIUM — the workflow MVP)*

Editing feature (inline edit, draft-in-store, save on Enter/Blur/Explicit, `updateData` **by rowId**,
dirty tracking, MUI editors, popup editor, **row-session deferred save**) · Validation feature
(cell/row/cross-column/async, error ring + popover, commit policy) · **row add/delete/duplicate +
temp-id**.
→ *Deliverable:* **shippable workflow-tier grid** — fully editable + validated.

### Phase 3 — Productivity, chrome & access control  *(HARDER — all custom, no OOTB help)*

Cell/range selection (**on v9 `cellSelectionFeature`**) + keyboard nav (arrows/Tab/Enter/Esc, skip hidden/non-editable,
wrap, shift-range, undo/redo) · Clipboard (copy/paste) · Access-control cascade (grid/row/column/cell
enable/disable + conditional behavior) · **chrome & layout UI:** column resize/reorder/pin/visibility
menu, **E3 advanced-filter builder UI** (the engine is OOTB, the builder is ours), **G2 row
resize + row-height/density**, **D3 sampled auto-size** (§2.7b, wired to the resize handle).
→ *Deliverable:* Excel-like productivity + permissioning + full user-facing layout control.

### Phase 4 — Scale, backend, viz, polish  *(HARDEST)*

`ServerDataSource` (manual sort/filter/pagination + windowed fetch) → unlocks **reporting (10k+)** and
**migration (1M+)** tiers · **A2 infinite scroll / fetch-on-scroll append mode** (§2.7c) ·
column-virtualization flip-on · change-set + live updates (batch commit optimistic+rollback,
WebSocket, **`uploadFile`/`deleteFile`**) · **visualization** cell types (in-cell charts, KPI) +
**A5 `rowSpan` span-groups** (§2.7a) · state persistence · i18n · a11y + perf hardening (gates: no
full-grid re-render/keystroke on 200×20; 1M-row server window <200ms) · **(optional) `grid-shadcn`
adapter** to prove multi-skin.
→ *Deliverable:* production-hardened, scales to 1M rows, backend-integrated, charted, multi-adapter.

**Phase order = risk order:** P1 mostly OOTB + rendering → P2 the core custom value → P3 the hardest
*interaction* code → P4 the hardest *systems* work (scale + backend).
**Deferred behind seams until Phase 4:** `ServerDataSource` (manual ops + windowed fetch),
column-virtualization flip-on, server-side grouping, viz cell types.

---

## PART 4 — Spec gaps to add + v9 gotchas

### Add (missing for a workflow-tier grid)

Column resize/reorder/pin/visibility **UI** (state is OOTB, chrome is ours) · **row add/delete/
duplicate** + temp-id strategy for created rows (ties to `getRowId` stability) · unsaved-changes
navigation guard · undo/redo scope (per-command w/ session boundaries) · Excel-isms
(Enter-moves-down, type-to-replace, optional fill-handle) · **i18n/locale** for number/date
parse+format · **a11y** (ARIA grid/row/gridcell, roving tabindex, focus restore) · state persistence
(per-user column/sort/filter) · summary/totals row (aggregation fns OOTB).

### Refine / defer

Merge A5+M1 (charts) but keep A5's *spanning* half as a render concern; **do not merge A2+D1** —
split A2 into *virtual* scroll (≡D1) and *infinite* scroll (fetch-on-scroll, §2.7c); unify B6/B7/B8
as one option-based cell; unify C2+I2 as one edit-session lifecycle; clarify F = editability
(≠ visibility). **Defer (needs sign-off — Q7):** QR/barcode (B1), complex/3D charts (start
sparklines+KPI).

### TanStack v9 gotchas (bake into Phase 1)

- **Explicit feature registration** — `useTable({ features: tableFeatures({...}) })`; row models +
  `filterFns`/`sortFns` register **inside** `tableFeatures`, not as separate options.
- **State access changed** — `table.state` / `table.store.state` / `table.atoms.<slice>`;
  `onStateChange` removed (per-slice `on[State]Change` remain); `table.Subscribe` for fine-grained reads.
- **Instance methods are prototypical** — do **not** destructure (`const {getValue}=row` loses `this`);
  call `row.getValue(...)` directly.
- **TS generics gain a features param** — `ColumnDef<typeof features, T>`,
  `createColumnHelper<typeof features, T>()`; per-feature meta (no global declaration merging).
- **Stable refs or you thrash/loop** — memoize `data`/`columns`; always set `getRowId`.
- **Editing writeback by `rowId`, not `rowIndex`** — indexes shift under sort/filter.
- **Renames to watch** — `sortingFn`→`sortFn`, pin `left/right`→`start/end`, `columnSizingInfo`→`columnResizing`.
- **Cell selection + spanning are OOTB** (`cellSelectionFeature`/`cellSpanningFeature`) — our plugins
  extend them rather than build from zero (confirm scope in the spike).

---

## PART 5 — Companion libraries (all MIT/Apache — commercial-safe)

Engine `@tanstack/react-table` v9 (MIT) · Virtualization `@tanstack/react-virtual` (MIT) ·
UI `@mui/material` + `@emotion/react|styled` (MIT) · Pickers `@mui/x-date-pickers` **community** (MIT)
· Icons `@mui/icons-material` (MIT) · Overlays Floating UI/Radix (MIT) · Dropdown behavior Downshift/
Radix (MIT) · Dates date-fns/Day.js (MIT) · Charts uPlot(perf)/Recharts(DX)/visx/ECharts (MIT/Apache)
· QR/Barcode qrcode/bwip-js (MIT) · PDF thumbnails pdf.js (Apache) · DnD dnd-kit (MIT) · Export
ExcelJS/SheetJS-community (MIT/Apache) · Schema zod (MIT).
**Avoid:** MUI X `*-pro`/`*-premium`, AG Grid Enterprise, Highcharts (all commercial per-seat).

---

## PART 6 — Engine facts, why v9 & agent-skills

**v9 is stable:** GA **Aug 4 2026**; `@tanstack/react-table` `latest` = **9.1.2** (actively patched).
A bare `pnpm add @tanstack/react-table` installs **v9**; pin `@8` only for the fallback branch.

**Why v9 for this project:**

- **Plugin ergonomics** — v9 per-feature meta typing + clearer plugin model remove v8's global
  declaration-merging + verbose `_features` boilerplate (the docs' biggest documented plugin risk).
- **OOTB wins** — v9 `stockFeatures` include **`cellSelectionFeature`** and **`cellSpanningFeature`**,
  turning concern #6 (cell/range selection) and §2.7a (spanning) from fully-custom into OOTB-assisted.
  ⚠️ Confirm exact scope of both in the Phase-1 spike.
- **Scale** — lower memory + fine-grained atom subscriptions (`table.Subscribe`) serve the 1M tier.
- **Greenfield + headless-custom** — no migration debt; low exposure to v9's young ecosystem (we write
  all rendering/editors/plugins ourselves and consume documented core + plugin APIs).

**Reverse direction, if ever needed:** `useLegacyTable` (`@tanstack/react-table/legacy`) runs the v8
API on the v9 engine — irrelevant here (greenfield on v9), noted only for completeness.

**Agent-skills (now usable):** on v9, TanStack's official Agent Skills apply — run
`npx @tanstack/intent install` to wire version-synced guidance into `CLAUDE.md`/Cursor/Copilot. Still
**author our own Bst-Table skill** for the custom API (the standardization lever from `CLAUDE.md` §7).

## Open questions for the spec author (not blocking Phase 1)

Every other spec leaf now has a design **and** a phase. These four need a human answer, not an
architecture decision:

- **Q5 — B10 "floating" action column.** The spec says "floating **and** pinned as the last column."
  Pinning is handled. Does *floating* mean (a) buttons that appear on row hover, overlaying the row
  without consuming column width, or (b) a column that stays visible like a pinned one? Assumption
  until told otherwise: **(a) hover-overlay**, with pinned-last as the default non-hover state.
- **Q6 — J2 "Rich/custom React editors".** Read as *arbitrary custom React components in a popup*.
  If it actually means **rich text** (bold/italic/lists stored as markup), that is a new `richText`
  cell type: Lexical (MIT, no paid tier) + DOMPurify sanitising in **and** out, a plain-text preview
  in read mode (never mount an editor per cell), and a stored-format decision (markdown recommended
  over HTML). **Not currently in any phase** — it would be Phase 2 alongside the popup editor.
- **Q7 — deferred spec items need sign-off.** B1 **QR/barcode** and complex/3D charts are
  deliberately deferred (sparklines + KPI first). Both are in the spec; confirm the deferral is
  accepted rather than an oversight.
- **Q8 — H3 "Copy Column" at scale.** Copying a whole column in server-mode means values for rows
  that were never fetched. Options: copy only the loaded window (fast, possibly partial) or issue a
  dedicated server export call. Assumption until told otherwise: **loaded window, with a visible
  "n of m rows copied" notice.**

## Appendix A — Spec audit log (2026-08-10)

Record of the full spec-vs-plan audit: all 58 leaves **plus their sub-bullets**, checked on two
axes — *does a design exist* **and** *does a phase own it*. Kept because the second axis is what the
earlier passes missed: an item can be correctly analysed in CLAUDE.md §2 and still be built by
nobody. **Result: 44/58 clean, 14 findings, all closed or converted to an open question.**

| # | Finding | Type | Resolution |
| --- | --- | --- | --- |
| 1 | **A5 cell/row spanning** had no design in either doc and no `CellType` support; `rowSpan` structurally conflicts with row virtualization | Design gap | §2.7a — `colSpan` Phase 1, `rowSpan` as precomputed span-groups with a contiguity rule, Phase 4 |
| 2 | **D3 auto-size** absent from the 12-concern table *and* all phases; content measurement conflicts with virtualization | Design gap | §2.7b — sampled `canvas.measureText`, on-demand only; concern #1; Phase 3 |
| 3 | **I3 view + delete** missing — contract had `uploadFile` only | Design gap | §2.2 — `getFileUrl` (Phase 1, B5 thumbnails) + `deleteFile` (Phase 4) |
| 4 | **A2 ≡ D1 was wrong** — infinite scroll (fetch) ≠ virtual scroll (render) | Definition | §2.7c + overlap #1 rewritten; A2 maps to concerns #8 **and** #11 |
| 5 | **A4 master-detail** analysed but in no phase — despite being a headline win over AG Grid Enterprise | Unscheduled | Phase 1 (read panel, nested table instance) |
| 6 | **E3 advanced-filter builder UI** analysed but in no phase | Unscheduled | Phase 3 |
| 7 | **G1 pin rendering** (sticky CSS) in no phase; also missing from the 12-concern table | Unscheduled | Phase 1 + concern #1 |
| 8 | **G2 row resize / row-height** in no phase | Unscheduled | Phase 3 |
| 9 | **G3 auto layout** in no phase | Unscheduled | Phase 1 |
| 10 | **G4 responsive** in no phase | Unscheduled | Phase 1 |
| 11 | **B-series sub-bullets existed only in CLAUDE.md §2** — Plan.md compressed them to type names, so it was not buildable alone | Doc structure | §2.3 sub-feature table (10 rows) added to Plan.md |
| 12 | `Refine` sections still said "**merge A2+D1**", contradicting finding 4 | Contradiction | Both docs now say explicitly *do not merge* |
| 13 | Stale milestone refs (`M0/M1`, `M9`) survived the M0–M9 → 4-phase restructure | Stale ref | Renamed to Phase 1 / Phase 4 |
| 14 | **B10 "floating"**, **J2 rich-text ambiguity**, **QR/barcode deferral**, **H3 copy-column at scale** — all need a human answer, not an architecture decision | Needs author | Q5–Q8, each with a stated working assumption so Phase 1 is unblocked |
| 15 | **Engine was locked to v8** before v9 went stable (GA Aug 4 2026, 9.1.2); v9 removes the docs' #1 plugin pain (global declaration merging) and ships cell-selection/spanning OOTB | Engine change | Planned for **v9**, Phase-1 spike confirms; concern #6 + Finding-1 scope reduced (PART 6) |

### Re-run this audit whenever the spec changes

1. Enumerate leaves **including sub-bullets** — the 58 count is top-level only; B1/B2/B5/B6/B7/B8/B10
   carry ~40 more sub-requirements that are easy to lose.
2. For each leaf check **both** axes: (a) a design exists, (b) **a phase owns it**. Failing (b) is
   the common failure and it is invisible in a capability table.
3. Check every leaf maps to one of the 12 concerns — an unmapped leaf means the collapse is lying.
4. Re-test any leaf touching **spanning, measurement, or "show everything"** against the day-1
   virtualization decision (§2.5 rule 8). That is where three of the four design gaps came from.
5. Grep for contradictions after edits (`≡`, "merge X+Y", milestone names) — restructures leave
   stale cross-references behind.

## Verification (once building — not in plan mode)

- Scaffold Vite+React+TS monorepo; render baseline table (data/columns/core row model).
- Prove the workflow tier end-to-end: edit → validate → save via `ClientDataSource.commit`.
- Perf gate in Phase 4: **200×20 grid shows no full-grid re-render per keystroke** (React Profiler);
  active-cell move re-renders ≤2 cells.
- Unit-test each feature's state/APIs; axe a11y audit on rendered grid.
- Seams check: swapping in a stub `ServerDataSource` with `manual*=true` must not require feature
  code changes.

## Status

- [x] Capability mapping (OOTB/Partial/Custom), overlaps, plugin feasibility — answers PART 1
- [x] Decisions locked (data strategy, MVP tier, MUI stack, plugin depth) + licensing PASS
- [x] **Engine reconciled to v9** (GA Aug 4 2026, 9.1.2); Phase-1 spike confirms; v8 fallback — PART 6
- [x] Finalized architecture (packages, DataSource, registry, plugins, hot-path) — PART 2
- [x] Adapter/custom-styling seam confirmed (MUI now, shadcn/Radix later) — §2.6
- [x] Delivery in 4 phases, easy → hard — PART 3
- [x] Spec gaps + v9 gotchas + companion libs — PARTs 4–5
- [x] Overlaps decoded into tables (14 overlaps → 12 concerns) — §1.3
- [x] **Full spec audit — all 58 leaves + sub-bullets have a design and a phase.** Closed: A5
      spanning, D3 auto-size, I3 view/delete, A2 virtual-vs-infinite split, B-series sub-features,
      and the six previously unscheduled items (A4, E3 builder UI, G1–G4) — §2.7, §2.3, PART 3
- [x] **Audit findings logged with a repeatable checklist — Appendix A** (re-run it on any spec change)
- [x] **Toolchain & versions pinned** (Node/npm/nvm/TS/Vite/Vitest/deps) so new sessions don't
      re-detect — see "Toolchain & environment (pinned)" near the top. **Node not on default PATH: source nvm first.**
- [ ] **Q5–Q8 answers from the spec author** — floating action column, rich-text ambiguity,
      QR/barcode deferral sign-off, copy-column-at-scale
- [x] **Phase-1 engine spike POC built + verified** — v9 confirmed against the real
      registry (9.1.2; `useTable` + `tableFeatures` + `create*RowModel` + `cellSelectionFeature`/
      `cellSpanningFeature` all real); `@bloomskill/table-engine` + `@bloomskill/table-mui` + `@bloomskill/table-shadcn` adapters render the
      same grid; OOTB sort/search/pagination/visibility green in tests; **portability proven** via
      `npm pack` → fresh external consumer builds + tests. See `README.md` + `scripts/pack-and-verify.sh`.
- [x] **Phase 2 shipped** (v0.2.0) — editing, validation, cell-type registry, row lifecycle.
- [x] **Phase 3 shipped** (v0.3.0 → v0.8.0) — cell/range selection + keyboard nav + clipboard
      (0.3.0); access-control cascade F1–F4 (0.4.0); row selection (0.5.0); undo/redo C5 (0.6.0);
      column pinning + reordering + density (0.7.0); filter-builder UI E3 (0.8.0). See `CHANGELOG.md`
      + the `CLAUDE.md` §12 registry. **Tail (deferred):** draggable **row-resize** (G2) and **D3
      sampled auto-size** were not in the shipped layout slice; **Phase 4** (server DataSource / 1M
      tier, infinite scroll, viz cells, live updates, a11y/perf hardening) is next.
