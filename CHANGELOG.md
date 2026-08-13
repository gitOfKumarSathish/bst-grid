# Changelog

All notable changes to the **`@bloomskill/table-*`** packages
(`table-engine`, `table-mui`, `table-shadcn`, `table-mcp`). Versions are kept **in lockstep** —
all four bump together. Format loosely follows [Keep a Changelog](https://keepachangelog.com);
this project uses [Semantic Versioning](https://semver.org).

> Per `CLAUDE.md` §13: every feature/behaviour change must add an entry here **and** update the
> affected package README(s) **and** bump the version, in the same change.

## [Unreleased]
### Added — `@bloomskill/table-mcp`: an MCP server for AI coding agents (new package)
A fourth package, published alongside the other three and versioned in lockstep with them.
No language model has seen Bst-Table, so an agent asked to build one of these grids emits AG Grid
or MUI X DataGrid code instead. This server gives any MCP client (Claude Code, Cursor, Copilot)
accurate, version-pinned knowledge of the packages — plus scaffolding and validation.

- **Knowledge base generated from source at build time**, not hand-written: `BST_SETTINGS_REGISTRY`
  (runtime toggles), the `CLAUDE.md` §12 table, the `COVERAGE.md` 58-leaf matrix, `types.ts` TSDoc,
  the engine's built `.d.ts`, all package READMEs and the six `examples/` apps → `dist/corpus.json`.
  Shipping a feature updates the MCP server for free; nothing can drift.
- **Self-indexing docs**: the doc corpus is the four package READMEs plus a **`docs/*.md` glob**, so
  the server documents itself — its own `docs/mcp-server.md` guide and `packages/mcp/README.md` are
  searchable (`bst_search_docs("install mcp")` works), and a new guide joins the index with no code
  change. `bst_search_docs` gains a `pkg: 'mcp'` filter.
- **8 tools** — `bst_search_docs` (BM25 over the whole corpus), `bst_get_feature` (a flag's layer /
  type / default / dependencies, **or** a spec leaf's built/partial/missing status),
  `bst_get_cell_type`, `bst_get_api`, `bst_get_example`, `bst_scaffold_grid`,
  `bst_validate_config`, `bst_detect_version`.
- **`bst_validate_config`** catches the silent failures: chrome without its behaviour flag
  (`showSearch` + `enableGlobalFilter={false}`), editing without `getRowId`, batch mode without
  `onSave`, `manualPagination` without `rowCount`, and invented capabilities — asking for
  virtualization returns D1's ❌ NOT BUILT plus the server-`DataSource` workaround.
- **`bst_scaffold_grid`** emits a complete component with dependencies already resolved
  (clipboard also enables cell selection; editing also wires `getRowId` + `onDataChange`; batch
  editing emits a single-request `onSave`). Every output is typechecked against the built packages.
- **4 prompts** (`bst-quick-start`, `bst-add-feature`, `bst-new-cell-type`, `bst-migrate`) and
  `bst://` resources for coverage, features, cell types and examples.
- **Three parity/freshness guards**, in the spirit of the engine's compile-time settings-sheet
  check: corpus generation fails the build if an engine toggle has no §12 row; `rules.test.ts` fails
  if a toggle has no flag-dependency entry; and a freshness test fails if any indexed source's mtime
  is newer than the corpus's `generatedAt` (now a full ISO timestamp) — catching a doc edited
  without rebuilding the corpus. A new feature cannot slip past the validator, and the docs can't go
  stale silently.
- Zero search dependencies (hand-written BM25); runtime deps are the MCP SDK and zod. Runs over
  stdio, makes no network calls, and works standalone via `npx -y @bloomskill/table-mcp`.
- Repo wiring: `bump-version.mjs` bumps four packages; root `build`/`typecheck`/`release` include
  it; `verify:portability` installs the tarball outside the workspace and proves the corpus ships
  inside it; new `npm run mcp` gate (stdio smoke + scaffold typecheck) stands in for the demo
  step of the §13 Definition of Done.
- **`scripts/mcp-server.sh` launch wrapper**, used by this repo's `.mcp.json` and `.vscode/mcp.json`.
  Clients spawn the server with *their* cwd and *their* `PATH` — so a relative script path can
  resolve to nothing, and under nvm there is frequently no `node` on `PATH` at all (nvm lives in an
  interactive shell rc, not a GUI/daemon environment). The wrapper resolves both the checkout and a
  `node` binary from its own location, so one committed config works from any directory on any
  machine. Diagnostics go to stderr — stdout is the JSON-RPC channel.

### Added — Distribution & team-sharing docs for the MCP server (docs)
The server was documented as something you *install*, not something you *hand to other people*, and
the two are different problems: this repo's `.mcp.json` is project-scoped and names a path inside
the checkout, so it does nothing in anyone else's project. Now spelled out end to end.

- **`docs/mcp-server.md` §2 restructured into three named install routes** — **npm** (`npx`, the
  zero-setup path for anyone), **tarball** (`npm pack` → `npm i -g` the `.tgz`, for sharing before
  publishing), **local build** (for contributors) — each with the exact `command`/`args` pair, plus
  a lookup table so every client config in §3 is the same shape with one line swapped.
- **New `docs/mcp-server.md` §4 "Use it in your own projects — and share it with others"**: the
  local / project / user scope table (**user scope** is the answer to "wherever I'm working";
  project scope only ever applies to the repo it sits in), the one-command teammate setup, how to
  commit an `.mcp.json` into a *consuming* app's repo so a team gets it on clone, the publish
  procedure, and how corpus freshness travels with the installed version (`bst_detect_version`).
- **Publishing caveats recorded**: `npm run release` publishes all four packages and 403s on any
  already on the registry at the current `version.ini` version, so publish `table-mcp` alone (its
  version is free — the *name* has never been published) or bump first; and publishing makes the
  corpus — every README, the §12 registry, `COVERAGE.md`, all six examples — public.
- **Client configs now lead with the npx form** and name the *user-level* config location for each
  client (`~/.cursor/mcp.json`, VS Code *MCP: Open User Configuration*, `claude_desktop_config.json`
  incl. its Linux path), instead of showing an absolute checkout path as the default.
- **Fixed** the troubleshooting table's 404 row, which pointed at "Option B" for the local build
  when Option B *was* the npm route; added rows for the release 403, for "works in the Bst-Table
  repo but not in my app" (scope), and for a teammate's stale corpus. Uninstall now mentions
  `npm rm -g` for the tarball route.
- `packages/mcp/README.md` and the root `README.md` re-pointed at the same story: `-s user` in the
  register command, self-contained/no-`@bloomskill/table-*`-needed called out, and the "not on npm
  yet" warning reduced to one line that names the two routes that work today.

### Changed — Documentation audit across all three packages + the repo root (docs)
Cross-verified every README against the `CLAUDE.md` §12 registry, `types.ts`, `settings.ts`, both
adapter prop interfaces, `runtime.ts` and `index.ts`. Feature coverage was already complete
(44/45 registry features documented, all 17 cell types catalogued, all 18 `BstColumnMeta` fields
tabulated, every documented `runtime.*` API verified to exist); these fix the doc-hygiene gaps:

- **Root `README.md` rewritten** — it still described the repo as a *Phase-1 POC* using "only easy,
  out-of-the-box features", cited a stale "7/7 tests" figure, and listed editing, validation,
  cell/range selection, clipboard, the server DataSource and the cell-type registry as
  **"Not in scope yet"** — all long since shipped. Now: a package table, a grouped capability
  summary, the real suite size (35 files / ~245 tests), a runnable-examples pointer, the portability
  story, and an accurate "not built yet" list (D1 virtualization · A2 infinite scroll · B5 PDF
  thumbnails · I3 upload/delete · I5 live merge).
- **Fixed 4 broken cross-package links** — both adapter READMEs pointed at engine anchors that the
  README overhaul had renamed: `#custom-css-classnames--styles` → `#custom-css` and
  `#runtime-settings-usebstsettings` → `#runtime-settings-sheet`.
- **`showColumnEditToggle` added to both adapters' Props tables** — it was implemented and described
  in a feature bullet, but missing from the table a reader actually scans.
- **`enableCopyColumn` / `enableCopyRow` now named in both adapter READMEs** — the copy-column
  behaviour was described without ever naming the flags that gate it.
- **`autoResetPageIndex` documented** (engine, Server mode) — a real public option that appeared in
  no README; the `on*Change` row now enumerates all six callbacks.
- **Adapters' "extends every `useBstTable` option" lists rebuilt** — the flat parenthetical stopped at
  Phase 3 and omitted `enableRowResize`, `enableCopyColumn`/`Row`, `enableConditionalFormatting`,
  `enableBatchEditing`, `onSave`, `tempIdPrefix` and the whole server-mode group. Now a grouped list
  that links to the engine's options reference as the authority.
- **Engine "Full export list" completed** — ~25 exported symbols were missing (`BST_RUNTIME`,
  `isConditionActive`, `splitCellKey`, `createStore`, `arrayEqual`, `isRichTextEmpty`,
  `advancedCellTypes`, and types `BstRuntimeHandle`, `BstTableEngineToggles`, `SpanRow`, `SpanCol`,
  `BstFormatBuilderColumn`, `BstSettingsOverrides`, `DsSort`, `DsColumnFilter`, `DsPagination`,
  `RuntimeCtx`, `CellChange`, `CellValidateContext`, `FieldErrorLevel`, `SaveTrigger`,
  `CommitPolicy`, `VisualIndex`, `MoveActiveOptions`, `InteractionState`/`InteractionStore`/`Store`).
- **`actionMenu` cell type, column auto-size (D3) and `meta.responsivePriority` now surfaced in both
  adapter READMEs** — engine features both skins inherit but neither mentioned.
- **`COVERAGE.md` re-synced** — the header claimed v0.19.0 while the packages were at v0.32.2.
  **I4 moved ❌ → 🟡**: batch editing (v0.30.0) shipped the change-set + single-call `onSave` half;
  reconciling the server's response back into cells/rows is what remains. Tally is now
  ✅ 51 · 🟡 5 · ❌ 2.

_No source changes — documentation only._

## [0.32.2] — 2026-08-13
_Covers the interim `0.32.1` and `0.32.2` patch bumps, which shipped the work below without their
own headings._

### Changed — Engine README overhaul + runnable examples (docs)
- **`packages/engine/README.md` restructured** for discoverability — the previous 38-bullet feature
  "dump" is replaced by a linked **Contents** menu, a grouped **Feature map** (Data ops · Columns ·
  Rows · Editing · Selection & clipboard · Cells/styling/scale — each row: feature → flag → default →
  guide link), and a new **Column reference** section: a full `BstColumnMeta` field table, a **cell-type
  catalog** (all 17 `meta.type`s → renders / value shape / editable / `cellMeta`), **per-type `cellMeta`
  tables** (number, dateTime, multiSelect, radio, hyperlink, sparkline, kpi, qr, barcode, richText), and
  a `BstOption` table. Every feature now has a **"Use it / Customize"** guide. Options reference regrouped
  by area. All internal anchor links verified (no broken links); documented `runtime.*` APIs verified
  against source.
- **Live examples instead of screenshots** — new top-level [`examples/`](examples) folder with **six**
  self-contained, runnable Vite + React 19 + TS apps (`quick-start`, `editing`, `cell-types`,
  `conditional-formatting`, `cell-spanning`, `server-mode`) that import the **published**
  `@bloomskill/table-engine@0.32.0` from npm. Each is verified to build (`vite build`), and the README's
  new **Live examples** section + inline links open them one-click in **StackBlitz**
  (`stackblitz.com/github/gitOfKumarSathish/bst-grid/tree/main/examples/<name>`) — Vite in-browser with
  an instant preview — or `npm install && npm run dev` locally. (Examples also carry a
  `.codesandbox/tasks.json` for CodeSandbox users; CodeSandbox anonymous *drafts* defer the preview, so
  StackBlitz/local are the documented paths.)
- Fixed the README's conditional-formatting example (`op: 'gt'`/`'lt'`, and `columnId` on the rule not
  inside `when`). No engine code change.

### Added — Width-aware multiSelect chips (B7 `cellMeta.fitChips`)
- **`cellMeta.fitChips`** (`@bloomskill/table-engine`) — the `multiSelect` read cell can now fit as
  many chips as the **column width** allows, folding only the remainder into a single `+N more`
  (widen the column → more chips appear, shrink → they collapse back), instead of a fixed
  `maxChips` count. Implemented with a hidden **ghost row** measured for true chip/badge widths + a
  **`ResizeObserver`** on the visible row, so it recomputes on every resize; **`maxChips` (if set)
  stays an upper cap**. **Opt-in + backward compatible** — without `fitChips` the fixed-count
  behaviour (`maxChips`, default 3) is unchanged, and both adapters inherit it (they spread
  `defaultCellTypes`). Falls back to showing every chip where there is no layout (SSR / jsdom).
  New `multiSelectChips.test.tsx` (deterministic width arithmetic); the demo's **Skills** column
  switched to `fitChips` — drag it wider/narrower to watch the chips fold in and out.

## [0.32.0] — 2026-08-12
### Added — Batch editing in the settings sheet (`enableBatchEditing`)
- **`enableBatchEditing`** (`@bloomskill/table-engine`) — a boolean runtime switch for the batch
  editing mode: `true` forces `enableEditing.mode: 'batch'` (edits defer + Review & save), `false`
  forces a batch-configured grid back to **per-cell commits** (plain save bar returns); unset
  follows `enableEditing.mode`. Resolved in `useBstTable`'s `resolveEditing`; the adapters' review-
  sheet chrome follows it automatically.
- **Registered in the settings sheet** ("Editing" group, always offered) so **end-users toggle
  batch mode per table** from the ⚙ gear on both MUI and shadcn grids — persisted to
  `localStorage` like every other setting. New `SETTINGS_META.getBase(props)` hook lets a
  setting derive its developer-base value from other props, so the switch truthfully shows **ON**
  for a `enableEditing={{ mode: 'batch' }}` grid without any extra prop (an explicit
  `enableBatchEditing` still wins). Also registered the in-flight `showFormatBuilder` chrome key.
- Tests: settings-model derivation/override/round-trip, engine mode-forcing both directions, and
  a full sheet→switch→edit integration test per adapter. **Demo:** the batch section's grid now
  has the ⚙ gear — Editing → Batch editing flips the whole flow live.

## [0.31.0] — 2026-08-12
### Added — Conditional-format builder chrome (K3) — a toolbar button to build rules at runtime
- **`showFormatBuilder`** (`@bloomskill/table-mui` + `@bloomskill/table-shadcn`) — a toolbar
  **"Formats (n)"** button that opens/closes a panel hosting `<BstConditionalFormatBuilder>`, so
  end-users **create / edit / delete `conditionalFormats` rules at runtime** (with a close ✕ in the
  panel header). Rule edits are **uncontrolled local state** seeded from `conditionalFormats` by
  default; pass **`onConditionalFormatsChange`** to own them (controlled). The builder's column
  list is auto-derived from the grid's own columns (action columns excluded). Chrome follows
  behaviour: hidden while `enableConditionalFormatting` is off.
- **Settings sheet:** "Format builder" is registered ("Display" group, `alwaysShow`) — end-users
  can summon the Formats button from the ⚙ sheet on any grid, even ones that shipped no rules.
- **shadcn icons:** new `format` slot (palette glyph) — built-in SVG + mapped in all five presets
  (lucide `Palette` · tabler `IconPalette` · phosphor `Palette` · remix `RiPaletteLine` ·
  hugeicons `PaintBoardIcon`). MUI uses `FormatColorFill`.
- **Demo:** the two main **MUI + shadcn** "People" grids now ship `showFormatBuilder` +
  seeded `conditionalFormats` (shared, controlled via `onConditionalFormatsChange`), so the 🎨
  Formats button and live cell/row styling are visible **directly in both skins** — not just the
  MUI-only K3 section, which also switched to the built-in chrome (button + panel) instead of a
  hard-wired builder box. Adapter tests cover open / add-rule / close and the behaviour-off case.

### Changed — neutral `multiSelect` editor is now a checkbox-dropdown (B7, MUI parity)
- **`@bloomskill/table-engine`** — the default `multiSelect` cell editor was a native
  `<select multiple>` listbox (Ctrl+click to multi-pick, rendered as an inline box overlapping
  the rows below). It is now a proper **checkbox-dropdown**: a trigger showing the selected
  labels + a dependency-free `position: fixed` popup (the action-menu pattern, never clipped by
  the table's scroll overflow) with one checkbox per option, color dots, and a scrollable list.
  Toggling keeps the popup open; closing it (outside click / trigger / scroll) **commits the
  accumulated draft**; **Escape cancels** — the same lifecycle as MUI's multiple `Select`. The
  cell type is now `overlayEditor: true` so the host skips its commit-on-blur while the popup is
  open. **`@bloomskill/table-shadcn` inherits this automatically** (it spreads
  `defaultCellTypes`), closing the multi-select UX gap vs the MUI skin; `@bloomskill/table-mui`
  keeps its own MUI `Select` editor. Engine tests (`multiSelectEditor.test.tsx`) + a shadcn
  inheritance test added; READMEs updated.

### Added — demo: server DataSource — manual sort / filter / paginate (Plan.md §5)
- New demo section + dataset (`apps/demo`, not published): a **server-driven** grid over a
  **2,000-row** synthetic register via `createClientDataSource` (350 ms simulated latency),
  running in TanStack **manual mode** through `{...useBstDataSource(source, { pageSize: 10 }).tableProps}`.
  Only the current 10-row page ever reaches the DOM; **sort / filter / search / paging re-run in the
  source** and the normal chrome drives it with **no adapter changes**. A live **Fetching…/Idle** chip
  + "showing X–Y of N" status reads the hook's `loading`/`totalCount`. Adapter tests assert only one
  page renders (10 of 2,000), paging **refetches**, and sorting is **server-wide** — page 1 carries a
  global salary extreme a page-local sort could never surface (the artifact's correctness point).

## [0.30.0] — 2026-08-12
### Added — Batch editing + review-changes sheet + single-call `onSave` (C2/I2/I4)
- **`enableEditing: { mode: 'batch' }`** (`@bloomskill/table-engine`) — a third editing mode:
  **every** edit (typed or pasted) stays an **unsaved draft** rendered dirty in place; nothing
  reaches `onDataChange` until an explicit save. Paste in batch mode drafts too (validated
  non-blocking; the real gate is the save's `validateRow` pass).
- **`onSave(event)`** (`@bloomskill/table-engine`) — the batched save hook: called **exactly once
  per save action** (`commitAll` / `commitRowSession`) with `{ changes, rows, next }` — flat
  cell edits (`oldValue`/`newValue` + `oldText`/`newText` display strings), per-row groups with a
  ready **`patch`** body, and the full next data array — so the backend gets **ONE** request at
  whichever granularity it wants, never a call per cell/row/column. `await`ed **before** the
  local write: a rejection **aborts the save and keeps every draft** for retry. New runtime APIs:
  `getChangeSet()` · `revertCell(rowId, columnId)` · `revertRow(rowId)` · `formatValue(columnId, v)`.
  New exported types: `BstSaveEvent`, `BstCellEdit`, `BstRowChange`.
- **Review-changes sheet** (`@bloomskill/table-mui` + `@bloomskill/table-shadcn`) —
  `showChangesSheet` (default **on** in batch mode): the toolbar shows an **"{n} unsaved"** chip +
  **Review & save**, opening a right-hand sheet (MUI Drawer / shadcn slide-over) that lists every
  unsaved edit grouped by row — **column · old → new** (old struck through) — with **per-change and
  per-row revert**, **Discard all**, and the final **Save n changes** confirmation that runs the one
  batched `onSave`. A failed save keeps the sheet open with the drafts intact and an error notice.
  `changesRowLabel(row, rowId)` customizes the row heading (e.g. show the person's name).
- **Demo:** new "Batch editing + review-changes sheet" section — edits defer, the sheet reverts
  per change, and the save reports "1 call · n changes across m rows".

## [0.29.1] — 2026-08-12
### Fixed — pinned-cell bleed-through on hover (MUI)
- **Sticky cells no longer turn see-through on hover** (`@bloomskill/table-engine` CSS,
  visible through `@bloomskill/table-mui`): the pinned-column and frozen-row hover rules
  applied `--bst-table-row-hover` raw, and MUI supplies a translucent tint
  (`theme.palette.action.hover` = `rgba(0,0,0,0.04)`) — so hovering a row let the
  horizontally-scrolled cells bleed through the pinned column. The hover tint is now
  composited over an opaque base inside the cell (two-layer background), matching the
  existing opaque-backing discipline for the other state tints. shadcn (opaque hover
  color) was never affected.
- Same-family holes closed in the same pass: **frozen top/bottom rows** (row pinning, G1)
  had the identical translucent-hover bleed, and the **row-selected accent tint** mixed
  into `transparent`, so a pinned data/checkbox cell in a selected row either bled or
  silently lost its tint — both now mix over the opaque base. CSS-text regression test
  added in `layout.test.tsx`.

### Added — demo: master-detail with a nested table (A4)
- New demo section + dataset (`apps/demo`, not published): a database-catalog grid where
  `renderDetail` returns a **full nested `BstTableMui`** — its own header row (Column ·
  Type · Nullable · Default · PK), value rows and sorting — proving the detail panel can
  host a complete nested grid; `users` starts pre-expanded. Adapter test asserts the
  nested `<thead>`/values render inside `.bst-detail-td` and that instances are independent.

## [0.29.0] — 2026-08-12
### Added — Conditional formatting in the settings sheet (K3) + always-offered filter row
- **`enableConditionalFormatting`** (`@bloomskill/table-engine`) — new engine toggle (default
  **true**) that gates the `conditionalFormats` rules at the `useBstTable` resolution point:
  `false` makes the rules **inert without dropping them**, so conditional formatting can be
  switched off/on at runtime. **Always offered** in the settings sheet ("Display" group,
  `alwaysShow`) — end-users can toggle rule-based cell/row styling on any grid; on grids
  without `conditionalFormats` rules the switch is simply a no-op.
- **Per-column filter row is now always offered in the settings sheet** ("Columns" group,
  `alwaysShow`) — like Row grouping / Copy column / Copy row, end-users can switch the
  column-wise filter row on themselves without the developer provisioning `enableColumnFilterRow`
  (it still needs Column filters, which default on).
- **Demo:** the K3 section's grid now has a ⚙ settings gear (`showSettings`) so both new
  settings-sheet behaviours are visible in `npm run demo` before publishing. §13's Definition of
  Done now includes a "Demo" step — every feature must be wired into `apps/demo` so
  `npm run demo` always shows the latest changes.

### Fixed — Async validators no longer bypass `blockCommitOnError`
- **Editing + paste now await async validators before writing** (`@bloomskill/table-engine`) — under
  the default `blockCommitOnError` policy, a cell whose validator returned a **Promise** (async
  uniqueness / server lookup — exactly the check a server-backed grid wants) was persisted through
  `onDataChange` **before the promise resolved**, because `validateCell` reported no error while it
  was still in flight (same hole in `pasteFromText`). `commitCell` and `pasteFromText` now gate the
  write on the validator's **real** result: **sync** validators still commit in the same tick (no
  behaviour change), an **async** validator holds the editor open until it settles and then commits or
  blocks, and pressing **Escape** meanwhile aborts the commit (generation-guarded). Errors surface
  exactly as before — only the bypass is gone. Added `asyncValidation.test.tsx` (commit + paste).

## [0.28.0] — 2026-08-11
### Added — Server DataSource foundation (Plan.md §5) — server-side sort / filter / paginate
- **`useBstDataSource(source, opts?)`** (`@bloomskill/table-engine`) — drive a grid from a **server
  query** instead of an in-memory array. Returns `{ rows, totalCount, loading, error, refetch,
  tableProps }`; spread `tableProps` into `useBstTable` / any adapter to put the grid in TanStack
  **manual mode**. The grid's existing chrome — sort headers, per-column filter row, search box,
  pagination bar — then drives the query with **no adapter changes**. The hook manages the request
  lifecycle: **aborts** superseded requests, ignores **stale** responses, **debounces** filter/search
  typing (sort + paging are immediate), and **resets to page 0** when the result set changes.
- **`DataSource` contract** — `fetch(query, signal) → { rows, totalCount }`, where `query` is
  `{ sort, filters, quickFilter?, offset, limit }`. **`createServerDataSource(fetchFn)`** wraps a
  fetch; **`createClientDataSource(rows)`** is an in-memory source with the **same operator semantics**
  as the client grid, so a grid runs identically over client data (tiers 1–2) or a server (tier 3) by
  swapping one line.
- **`useBstTable` now forwards v9 manual-mode + controlled-state options** — `manualSorting`,
  `manualFiltering`, `manualPagination`, `rowCount`/`pageCount`, `state`, and the `on*Change`
  callbacks (previously it hard-listed options and never forwarded these — the exact gap that made the
  engine client-only). Forwarded **conditionally**, so the default client mode is byte-for-byte unchanged.
### Notes
- **No new dependencies.** Fully backward compatible — a grid without a DataSource is unchanged. This
  builds the Phase-4 **server tier** (A3 server pagination + the sort/filter/paginate half of the
  reporting/migration tiers). **Virtualization** (D1) is still needed to *render* 1M rows in-browser;
  live/WebSocket updates (I5) and file upload/delete (I3) ride this same foundation later.

### Added — Rich-text cells can render formatted (`cellMeta.render: 'html'`)
- **`richText` read mode** (`@bloomskill/table-engine`) — set `meta.cellMeta.render: 'html'` to show
  the value **formatted** in the cell (bold / italic / lists / headings) instead of the default
  one-line plain-text preview. It renders the **sanitized** HTML (the same allow-list sanitizer, so
  it stays XSS-safe — scripts/handlers stripped). New CSS `.bst-cell-richtext-html` resets block
  margins so paragraphs/lists sit tidily in a row. Default is unchanged (`'text'` preview).
### Notes
- **No new dependencies.** Additive + backward compatible — a `richText` column without the flag keeps
  the plain-text preview.

## [0.27.0] — 2026-08-11
### Added — Copy-column / copy-row toggles + more customizable settings sheet
- **`enableCopyColumn` / `enableCopyRow`** (`@bloomskill/table-engine`) — copy-column (H3) and
  copy-row (H2) are now **individually toggleable** sub-features of clipboard (both default `true`).
  Gating happens once at the runtime choke point (`selectColumn`/`copyColumn`/`selectRow`/`copyRow`),
  so the **keyboard gestures** (Ctrl/⌘+Space, Shift+Space) always respect the toggle. Both adapters
  additionally **hide the Columns-menu "Copy column" button** when copy-column is off
  (`copyColumnOn = enableClipboard && enableCopyColumn !== false`), so a disabled feature leaves no
  dead control. Defaults preserve existing behavior.
- **Settings sheet** now exposes **Copy column**, **Copy row** and **Row grouping** as
  always-visible toggles (Selection & clipboard / Data operations), so end-users can turn them on/off
  from the ⚙ gear even when not pre-provisioned. (Previously these were either hidden until
  provisioned or bundled under "Copy & paste".)
- Adding `enableCopyColumn`/`enableCopyRow` to `BstTableEngineToggles` **auto-required** their
  settings-sheet entries via the compile-enforced parity guard — the mechanism working as intended.
- **New guide:** [`docs/settings-sheet.md`](docs/settings-sheet.md) documents the settings sheet,
  the `actionMenu` row menu, and the copy toggles in one place.
### Notes
- **No new dependencies.** Additive + backward compatible.

### Added — Row action overflow ("⋯" / three-dots) menu (B10)
- **`actionMenu` cell type** (`@bloomskill/table-engine`) — a compact **kebab menu** alternative to
  the inline `action` buttons: a single "⋯" button opens a popup of the row's actions
  (**Edit / Save / Cancel / Duplicate / Delete**, driven by the same cell `api` and `meta.actions`
  config). Opt in with `meta.type: 'actionMenu'`. **Dependency-free** — a `position: fixed` popup so
  the table's scroll overflow never clips it, closing on outside-click / **Escape** / scroll; styled
  with the `--bst-table-*` vars so it themes in both skins (light/dark). New export
  `actionMenuCellType`.
- **Both adapters** inherit it — `@bloomskill/table-shadcn` via `...defaultCellTypes`,
  `@bloomskill/table-mui` via its preset list. No adapter API change.
### Notes
- **No new dependencies.** Additive + backward compatible — the existing `action` (inline-buttons)
  cell is unchanged; `actionMenu` is a separate opt-in cell type. It's a cell type (`meta.type`), not
  a toggle, so it's out of scope for the settings sheet (per §12).

### Added — Per-column edit lock (runtime, F3) — a Columns-menu toggle
- **`runtime.setColumnEditable(columnId, on)` / `runtime.getColumnEditable`** (`@bloomskill/table-engine`)
  — make an **editable column read-only at runtime** (or back), overriding `meta.editable`, **without**
  disabling the whole grid. Backed by a `columnEdit` map on the interaction store that `isCellEditable`
  consults; cells re-render reactively (the override is part of their cell slice). This is the
  **runtime, column-wise** counterpart to the static `meta.editable` / `meta.disabled` cascade.
- **`showColumnEditToggle`** on both adapters — a per-column **lock/unlock** (✏️) in the Columns menu,
  shown for editable columns when `enableEditing` is on (default **off**, opt-in). Toggling flips the
  column between editable and read-only. `@bloomskill/table-shadcn` gains an **`edit` icon slot** (its
  18th; the built-in SVG + every preset — lucide `Pencil`, tabler `IconPencil`, phosphor `Pencil`,
  remix `RiPencilLine`, hugeicons `Edit01Icon`); MUI uses its `Edit` icon.
### Notes
- **No new dependencies.** Additive + backward compatible — a grid without `showColumnEditToggle` and
  no `setColumnEditable` calls is unchanged. It's a `show*` **chrome** flag (not on
  `BstTableEngineToggles`), so it has no settings-sheet entry (per §12).

## [0.26.0] — 2026-08-11
### Added — `copy` icon slot (shadcn) → the Copy-column button is now a real icon
- **`@bloomskill/table-shadcn`** — added a **17th icon slot, `copy`**, to the pluggable icon system.
  The Columns-menu **Copy-column** button (shipped in v0.24.0) now renders this slot instead of the
  interim **⧉ glyph**: a built-in lucide-styled SVG by default, wired through every preset
  (`lucide` → `Copy`, `tabler` → `IconCopy`, `phosphor` → `Copy`, `remix` → `RiFileCopyLine`,
  `hugeicons` → `Copy01Icon`) and overridable via `icons={{ copy: … }}`. `BstShadcnIcons`,
  `ICON_SLOTS` and `defaultIcons` gain the `copy` key.
### Notes
- **No new dependencies** (icon libraries remain optional peers). Backward compatible — callers who
  passed a partial `icons` map still fall back to the built-in `copy` SVG for that slot.

## [0.25.0] — 2026-08-11
### Added — Row resizing (G2)
- **`enableRowResize`** (`@bloomskill/table-engine`) — drag the **bottom edge of any row** to set its
  height; a thin handle runs along each data cell's bottom edge (tiled → a full-width drag zone),
  shown on row hover. The row grows to the dragged height (clamped to a **24px minimum**);
  **double-click a handle to reset** that row. Per-row heights are **local UI state** in `<BstTable>`
  (the drag reads the row's height from the DOM, so the handlers stay stable and cell memoization is
  preserved). Registered in the runtime **settings sheet** ("Rows" group) and flows through both
  adapters via `...rest` — **no adapter changes**. New CSS: `.bst-rowresize-handle`, `.bst-row-resized`.
### Notes
- **No new dependencies.** Opt-in; a grid without `enableRowResize` is unchanged. This closes the last
  **dependency-free, non-Phase-4** spec leaf (G2) — every remaining gap needs virtualization or a
  server DataSource (or one small dep, pdf.js, for B5).

## [0.24.0] — 2026-08-11
### Fixed — copy-column (H3) now copies the whole column across all pages
- **`@bloomskill/table-engine`** — "copy column" used to copy only the **current page** (the range
  selection is post-pagination) and had no one-action trigger. Fixed: **`runtime.copyColumn(columnId)`**
  and **Ctrl/Cmd+Space** now select the whole column and copy **every row across all pages**, in
  **pre-pagination** (filter + sort) order via v9's `getPrePaginatedRowModel`. **Shift+Space** /
  **`runtime.copyRow(rowId)`** do the same for a whole row (H2). New runtime APIs: `selectColumn`,
  `selectRow`, `copyColumn`, `copyRow`, `getColumnClipboardText`, `getRowClipboardText`; a
  `wholeSelect` marker on the interaction store makes a `Ctrl/Cmd+C` after `Ctrl+Space` grab all pages
  (a plain range copy stays page-local). Both skins inherit the engine behaviour through the shared
  `<BstTable>` body **and** gain a **"Copy column" button in the Columns menu** (shown when
  `enableClipboard`) — MUI uses its `ContentCopy` icon; shadcn uses a glyph (⧉) since its icon set has
  no copy slot. Keyboard: Ctrl/Cmd+Space then Ctrl/Cmd+C.
### Notes
- **No breaking change** — additive runtime APIs + one new keyboard gesture; fully backward compatible.

## [0.23.0] — 2026-08-11
### Added — QR / barcode / rich-text cell types (B1, J2) — all dependency-free
- **`qr` cell** (`@bloomskill/table-engine`) — renders the value as an inline-SVG **QR code** via a
  **dependency-free encoder** (byte mode, versions 1–10, EC levels L/M/Q/H, multi-block interleaving,
  auto mask selection). Verified **bit-for-bit against the `qrcode` reference library** (a dev-only
  dependency) across versions, levels and UTF-8 input. `cellMeta`: `ecLevel` · `size` · `margin`.
  Exports `qrMatrix(text, level)`.
- **`barcode` cell** — renders a **Code 128** (subset B) barcode as inline SVG, dep-free (covers all
  printable ASCII). `cellMeta`: `height` · `showText`. Exports `code128(text)`. Verified by an
  encode→decode round-trip + canonical anchor patterns.
- **`richText` cell** (J2) — stores **sanitized HTML** via a built-in **allow-list sanitizer** (no
  DOMPurify — strips script/style/handlers/unknown tags, keeps formatting + safe `href`); read mode
  shows a **plain-text preview**; edit mode is a `contentEditable` surface + toolbar
  (bold/italic/underline/lists). Exports `sanitizeHtml`, `htmlToText`, `escapeHtml`, `RichTextEditor`.
- **`@bloomskill/table-mui` / `@bloomskill/table-shadcn`** — both wire the new cells (`qr`/`barcode`
  are read-only display cells) and add a **popup rich-text editor** (MUI `Dialog` with Material format
  icons; shadcn modal), matching how they already treat long-text.
### Notes
- **No new runtime dependencies** (`qrcode` is a *dev*-only dep, used solely to verify the encoder in
  tests). All three are opt-in via `meta.type`. QR/barcode render **dark-on-light** regardless of theme
  for scannability. Content that exceeds QR version-10 capacity shows a graceful "QR too long" fallback.

### Changed — settings sheet now covers the newer features + auto-stays-in-sync
- **`BST_SETTINGS_REGISTRY` extended** (`@bloomskill/table-engine`) — the runtime settings sheet
  (`showSettings`) now exposes **every** instance-level boolean toggle added since it shipped:
  **row grouping** (E4), **fit-to-width** (G3), **responsive columns** (G4), **master-detail** (A4),
  **row pinning** (G1), **cell spanning** (A5) and **validation** — with a new **"Rows"** group.
  Opt-in features still surface only once the developer provisions them (so a user can turn one
  off/on but can't enable something the grid isn't wired for). No adapter changes — the new keys
  flow through the shared `useBstSettings` → `...rest`.
- **Settings stay in sync automatically (compile-enforced).** `BstSettingKey` is now **derived
  from `BstTableEngineToggles`**, and the metadata map is typed `Record<BstSettingKey, …>`, so
  **adding a new engine toggle fails the build until it's registered** in the sheet — a one-line
  entry (`enableFoo: { group, default }`; label humanized, layer inferred). CLAUDE.md §12
  "settings-sheet parity" is now a compiler guarantee, not just a convention; `settings.test.tsx`
  is the runtime backstop.

## [0.22.0] — 2026-08-11
### Added — Column auto-size (D3) + responsive column hiding (G4)
- **Column auto-size (D3)** (`@bloomskill/table-engine`) — **double-click a column's resize handle**
  to fit it to its content: the header + the **current page's** formatted cells are measured with an
  **offscreen `canvas.measureText`** (no layout thrash), clamped to the column's `minSize`/`maxSize`,
  and applied via `setColumnSizing`. Sampled + on-demand (never continuous). New exports:
  `computeAutoWidth(texts, opts)` and `measureTextWidth(text, font)` for programmatic sizing.
- **Responsive column hiding (G4)** — **`enableResponsive`** hides the **lowest-priority** columns
  (`meta.responsivePriority`, higher = kept longer) when the grid is too narrow to fit them, and
  restores them as it widens — via a `ResizeObserver` on the scroll box + v9 `columnVisibility`. Only
  columns it auto-hid are restored, so it never fights a manual hide; always keeps at least one
  column; a no-op under `fitColumns` (which already prevents horizontal scroll).
### Notes
- **No new runtime dependencies.** Both are render-layer + opt-in; a grid using neither is unchanged.
  Auto-size measures a page-sized sample (Plan.md §2.7b), so it's O(rows-on-page), not O(dataset).

## [0.21.0] — 2026-08-11
### Changed — the whole grid body is now emoji-free (injectable body icons)
- **`@bloomskill/table-engine`** — every emoji / Unicode glyph the shared `<BstTable>` body, the
  filter / conditional-format builders and the file & boolean cells used to render is now a
  **skin-neutral inline SVG** (lucide-styled, dependency-free): the sort indicator (`▲ ▼ ↕`), the
  master-detail / group expander (`▸ ▾`), the row-pin control (`📌`), the boolean cell (`✓`), the
  eight file-type icons (`📄 📝 📊 📽️ 🗜️ 🎵 🎬 📎`), the KPI trend chip (`▲ ▼`) and the builder
  remove buttons (`✕`). New injectable **`icons`** prop on `<BstTable>` / `<BstFilterBuilder>` /
  `<BstConditionalFormatBuilder>` (provided to deep cell renderers via context). New exports:
  `defaultBstIcons`, `resolveBstIcons`, `useBstIcons`, `BstIconsContext`, `BST_ICON_SLOTS` + types
  `BstIcons`, `BstIconOverrides`, `IconProps`, `IconComponent`. 18 slots; unspecified slots keep the
  built-in SVG.
- **`@bloomskill/table-shadcn` / `@bloomskill/table-mui`** — both adapters **forward their icon set**
  into the body for the overlapping slots (pin · boolean check · expander chevrons · remove; MUI also
  the sort arrows), so chrome and cells use one library. The MUI columns-menu **group toggle** glyph
  (`▤ / ▦`) is now a Material icon (the shadcn one was already an icon).
### Notes
- **No new dependencies**; render-only and backward compatible — the built-in SVGs render if no
  `icons` are supplied. A repo-wide sweep confirms **zero emoji/glyphs remain in render code**.

## [0.20.0] — 2026-08-11
### Added — Fit columns to viewport (G3), no horizontal scroll
- **`fitColumns`** (`@bloomskill/table-engine`) — size every visible column to the grid's scroll box
  so the table fills the width **with no horizontal scroll**. The renderer measures the scroll
  container (via `ResizeObserver`) and splits the available width — box minus the fixed **utility
  columns** (selection / expander / pin) — across the data columns **in proportion to their own
  sizes**, clamped to a readable minimum, so the fitted widths sum to the box exactly. While on, the
  scroll box is `overflow-x: hidden` and manual column resizing is suppressed (the two are mutually
  exclusive). It's a **pure render overlay** — it never mutates the column-sizing model, so toggling
  it off restores the authored widths. New export: **`distributeFitWidths(avail, sizes, min?)`** (the
  pure distribution helper).
- Both adapters inherit it through the shared `<BstTable>` body (the option forwards via `...rest`) —
  **no adapter changes**. The demo gains a **"Fit to width"** toggle.
### Notes
- **No new runtime dependencies.** Additive + backward compatible — a grid without `fitColumns` keeps
  its own column widths and horizontal scroll. With very many columns the fitted widths hit the
  minimum and the overflow is clipped (there isn't room to show them all without scroll).

## [0.19.0] — 2026-08-11
### Added — In-cell visualization: sparklines (M1) + KPI cells (M2)
- **Two dep-free cell types** (`@bloomskill/table-engine`), rendered as **inline SVG** — no charting
  library, no new dependency:
  - **`sparkline`** — value is `number[]` (or a comma string); `cellMeta.variant` picks `'line'` /
    `'area'` / `'bar'`, with `color` / `width` / `height` / `min` / `max` / `showValue` options.
  - **`kpi`** — value is a `number` or `{ value, delta?, data? }`; renders the value (formatted by the
    number cell type's `Intl` options), a coloured **trend delta** chip (▲/▼; `cellMeta.deltaPercent`
    / `invertDelta`), and an optional **mini sparkline** from `data`.
- Registered in the neutral default registry, so **both adapters** get them (shadcn via
  `...defaultCellTypes`; MUI added to `muiCellTypes`). New exports: `sparklineCellType`, `kpiCellType`.
### Notes
- **No new runtime dependencies.** Read-only display cells (no editor). Opt-in via `meta.type`.

## [0.18.1] — 2026-08-11
### Fixed — pinned-column bleed-through + MUI inline select editors couldn't select
- **`@bloomskill/table-engine` — frozen (pinned) columns are now always opaque.** A sticky pinned
  cell paints over the cells scrolling beneath it, so any translucency let that scrolled content
  bleed through the frozen column: the range-selection / active-cell tint, a disabled cell, **or a
  consumer's `rgba(...)` row/cell style**. Pinned cells (start **and** end) now carry a solid base
  plus **opaque variants of every state tint**, at a specificity that wins over both a consumer
  `.foo .bst-table-td { background }` (0,2,0) and the engine's own translucent state rules (0,3,0).
  The leading selection / expander / pin / filter-row cells are covered too, and a right-edge shadow
  marks end-pinned columns.
- **`@bloomskill/table-engine` — new `CellType.overlayEditor` flag.** Editors that open a
  **portalled** overlay (a menu/popover rendered OUTSIDE the cell) blur the trigger the instant they
  open; the default commit-on-blur then tore the editor down before a value could be picked. Cell
  types that set `overlayEditor` opt out of blur-commit and self-commit instead (Escape still
  cancels via the host key handler).
- **`@bloomskill/table-mui` — the inline single-select and multi-select editors now work.** Both set
  `overlayEditor`, open on edit, and self-commit (single-select on change; multi-select on menu
  close, with per-option **checkboxes** + colour swatches). Previously the MUI `Select` menu
  (portalled to `<body>`) blurred the cell and the edit was discarded before any value could be
  chosen.
### Notes
- **No breaking change** — the only new surface is the additive `overlayEditor` cell-type flag;
  fully backward compatible.
- **Consumer note:** don't use CSS `opacity` on grid cells if you freeze columns — `opacity` makes
  the whole cell (its background included) translucent, which no `background` can override. Dim via
  `color` instead. (The demo's inactive-row style was updated accordingly.)

## [0.18.0] — 2026-08-11
### Added — Conditional formatting (K3) + conditional render (F5)
- **`conditionalFormats`** (`@bloomskill/table-engine`) — a declarative rule engine that colours
  **cells and rows by value**. Each rule is `{ scope?: 'cell' | 'row', columnId?, when, className?,
  style?, hideContent? }`, where `when` is a `{ op, value }` condition (reusing the **E3 operators** via
  `evalCondition`) or a predicate. Row-scope rules apply to every cell in the row (so backgrounds read
  over the cell surfaces); `hideContent` blanks the matched cell (**F5** conditional render). Rules
  **compose with** `meta.cellStyle` + the `classNames`/`styles` slots. New exports: `evalCellFormat`,
  `evalRowFormat`, `DEFAULT_FORMAT_PRESETS` + types `BstFormatRule`, `BstFormatScope`,
  `BstFormatContext`, `FormatResult`, `BstFormatPreset`.
- **`<BstConditionalFormatBuilder>`** — a neutral, theme-agnostic builder (the styling cousin of
  `<BstFilterBuilder>`): controlled `rules` / `onChange`, one row per rule (`scope · column · operator ·
  value · style`) with a preset swatch picker. Adapters can host it in a panel.
### Notes
- **No new runtime dependencies.** Render-only + opt-in — a grid without `conditionalFormats` is unchanged.

## [0.16.0] — 2026-08-11
### Added — shadcn-native icons + theme inheritance (`@bloomskill/table-shadcn`)
- **`icons`** — the toolbar/menu icons are now **pluggable**. Pass any React icon components, or a
  ready-made **preset** from a subpath import so only the library you use is pulled in:
  `@bloomskill/table-shadcn/icons/{lucide,tabler,hugeicons,phosphor,remix}` (each an **optional**
  peer dependency). Unspecified slots fall back to built-in **lucide-styled inline SVGs**, so a bare
  grid renders crisp icons with **zero** icon dependencies. This replaces the previous emoji / Unicode
  glyphs (`📌 ⚙ ↶ ↷ ▾ ✕ ✓ ‹ › ▤ ▦ +`) across search, filters, undo/redo, save, add-row, density,
  columns, pin, group, settings, close and pagination. 16 slots; also exports `defaultIcons`,
  `resolveIcons`, `ICON_SLOTS` and the `BstShadcnIcons` type for building a custom map.
- **`theme="inherit"`** — adopt the host shadcn design tokens (`--background` / `--card` /
  `--foreground` / `--muted(-foreground)` / `--border` / `--input` / `--ring` / `--primary(-foreground)`
  / `--radius`) + font, so the grid matches a real shadcn app. **`tokenFormat`** selects the token form:
  `'hsl'` (classic HSL channels, the shadcn CLI default) or `'oklch'` (Tailwind v4 / full-color). The
  default `theme="zinc"` keeps the self-contained palette (no Tailwind build required).
- **Ambient dark mode** — `dark` is now **tri-state**: omitted follows an ancestor `.dark` /
  `[data-theme="dark"]` class (next-themes / shadcn convention); `dark={true|false}` forces it. Under
  `theme="inherit"` the host's own `.dark` drives it.
- Chrome polish — focus rings use `--ring`; the search box gains a leading icon.
### Notes
- **No new *required* dependencies** — icon libraries are optional peers. Backward compatible: existing
  grids keep the zinc palette and `dark` still works as before. The grid body needs no
  `data-bst-table-theme` attribute now — it follows the mapped `--sc-*` tokens in every mode.

## [0.15.0] — 2026-08-11
### Added — Multi-column grouping (E4)
- **`enableGrouping`** (`@bloomskill/table-engine`) — group rows by one or more columns into
  **collapsible group-header rows** with per-column **aggregates**. A column aggregates by declaring
  `aggregationFn` (`'sum' | 'count' | 'mean' | 'min' | 'max' | 'extent' | 'uniqueCount'`, registered
  in the feature set). Group with `initialState.grouping` or `table.setGrouping([...])`. The group
  header shows a caret + value + row count; aggregated cells are formatted by their cell type; other
  cells are blank placeholders; collapse/expand rides the expanding feature. Built on v9's
  `columnGroupingFeature` + `rowAggregationFeature` + `createGroupedRowModel` (with
  `groupedColumnMode: false` so columns keep their place).
- **`@bloomskill/table-mui` / `@bloomskill/table-shadcn`** — the **Columns** menu gains a per-column
  **group toggle** (▤ / ▦) that calls `column.toggleGrouping()` (shown when `enableGrouping`).
### Notes
- **No new runtime dependencies.** Opt-in — a grid without `enableGrouping` is unchanged.

## [0.14.0] — 2026-08-11
### Added — Row pinning (G1)
- **`enableRowPinning`** (`@bloomskill/table-engine`) — freeze rows to the **top and/or bottom** of
  the grid. Adds a leading **pin column** whose per-row toggle cycles **top → bottom → unpinned**
  (`row.pin()`); pinned rows are pulled out of the flow and stay put across **sort / filter /
  pagination**, and stick (`position: sticky`) while the body scrolls. Maps to v9 `rowPinningFeature`;
  render order is `getTopRows()` → `getCenterRows()` → `getBottomRows()`. The pin column sits outside
  the column model (like selection/expander) and composes with column pinning.
- Both adapters inherit it through the shared `<BstTable>` body (options forward via `...rest`) — **no
  adapter changes**. New CSS (`.bst-pin-*`, `.bst-row-pinned-top` / `-bottom`).
### Notes
- **No new runtime dependencies.** Opt-in — a grid without `enableRowPinning` is unchanged. Rows pinned
  to the same edge stack in order (single sticky offset — fine for a handful of pinned rows).

## [0.13.0] — 2026-08-11
### Added — Master-detail / expandable rows (A4)
- **`enableExpanding`** (`@bloomskill/table-engine`) — a leading **expander column**; clicking a row's
  ▸ reveals a full-width **detail panel** rendered by **`renderDetail(row)`** (a row spanning every
  column). Built on v9's `rowExpandingFeature` + `createExpandedRowModel`. **`getRowCanExpand(row)`**
  gates which rows expand (default: all). The expander column sits **outside the column model**, so it
  never joins cell-selection ranges, copy output, resizing or reordering (like the selection column),
  and it composes with pinning (sticky, left of the pinned data columns).
- Both adapters inherit it through the shared `<BstTable>` body (options forward via `...rest`) — **no
  adapter changes**. New CSS block (`.bst-expander-*` / `.bst-detail-*`) + a `bst-row-expanded` row class.
### Notes
- **No new runtime dependencies.** Opt-in — a grid without `enableExpanding` is unchanged.

## [0.12.1] — 2026-08-11
### Fixed — shadcn columns menu rendered with a transparent background
- **`@bloomskill/table-shadcn`** — the **Columns ▾** dropdown (and any future portaled
  surface) is rendered through a Radix `Portal` at `<body>`, i.e. **outside `.sc-card`**,
  where the `--sc-*` theme tokens used to live. `var(--sc-bg)` / `var(--sc-border)` therefore
  resolved to nothing, so the menu had **no background and no border** and the table bled
  through it (unreadable). Fix: the `--sc-*` tokens are now declared on `.sc-menu` as well as
  `.sc-card` (light **and** `.sc-dark`), and the portaled `DropdownMenu.Content` is tagged with
  `sc-dark` in dark mode so it themes correctly outside the card. No API change.

## [0.12.0] — 2026-08-11
### Added — Cell spanning, column + row (A5)
- **`enableCellSpanning`** (`@bloomskill/table-engine`) — merge body cells across **columns and
  rows**. A render-layer feature (v9 9.1.2 ships none; there's no virtualizer yet, so it's a pure
  paint concern per Plan.md §2.7a). Two ways to declare spans, composable:
  - **`meta.rowSpan: 'group'`** on a column auto-merges vertically-consecutive cells that share an
    equal value into one tall cell.
  - **`getCellSpan(ctx)`** returns `{ colSpan?, rowSpan? }` for the **top-left origin** of a block;
    `ctx = { row, rowId, columnId, value, rowIndex, colIndex }`. Covered cells are removed from the
    DOM, spans are clamped to the grid bounds, and a `colSpan` cell gets the summed column width.
- Both adapters inherit it through the shared `<BstTable>` body (options forward via `...rest`) — **no
  adapter changes**. New exports: `computeCellSpans` + types `BstCellSpan`, `BstSpanContext`,
  `SpanPlan`, `SpanRow`, `SpanCol`; new `meta.rowSpan`.
### Notes
- **No new runtime dependencies.** Render-only, so it composes with sort/filter/pagination. Covered
  cells leave the DOM, so it's aimed at display grids (pair with editing/selection only where the
  spanned columns aren't the edited ones). Opt-in — a grid without `enableCellSpanning` is unchanged.

## [0.11.0] — 2026-08-11
### Added — Runtime settings sheet (per-table feature toggles, end-user customizable)
- **`useBstSettings` hook** (`@bloomskill/table-engine`) — a headless model that lets **end-users**
  turn a grid's features on/off **at runtime** instead of editing code, **per table**, persisted to
  `localStorage`. Returns `{ props, model }`: `props` is your options with the user's overrides
  applied (feed it straight to `useBstTable`), `model` is the grouped toggle list to render. Also
  exports `applySettingsOverrides` (pure merge) and `BST_SETTINGS_REGISTRY` (ordered metadata), and
  types `BstSettingKey`, `BstSettingsItem`, `BstSettingsGroup`, `BstSettingsModel`,
  `BstSettingsOptions`.
- **`showSettings` prop** on both adapters (`@bloomskill/table-mui`, `@bloomskill/table-shadcn`) —
  a gear that opens a **right-side settings sheet** (MUI `Drawer` · shadcn dependency-free
  slide-over) of feature switches. `boolean` or `{ features?, title?, persistKey?, persist? }`.
  Default off (opt-in). Disabling a switch actually turns the feature off — e.g. flip **Copy &
  paste** off to disable clipboard, no code change.
- **Which toggles appear:** default-on data/display features always show; opt-in features
  (editing, selection, clipboard, pinning, ordering, …) appear only once the developer has
  provisioned them, so a user can't enable something the grid isn't wired for. Pass `features` to
  curate the list.
### Notes
- **No new runtime dependencies.** The shadcn sheet is built from plain elements + CSS (a new
  `.sc-sheet*` / `.sc-switch-input` block); MUI uses its existing `Drawer`/`Switch`. Additive +
  backward compatible — a grid without `showSettings` is unchanged.

## [0.10.0] — 2026-08-11
### Added — Custom CSS / `className` support (K1/K2)
- **`classNames` / `styles` slot objects** (`@bloomskill/table-engine`) — bring-your-own CSS for
  every structural slot: `root` · `table` · `header` · `headerRow` · `headerCell` · `filterRow` ·
  `body` · `row` · `cell` · `empty`. `headerCell` / `row` / `cell` also accept a **function**
  (`row` → `{ row, rowId, index }`, `cell` → `CellRenderProps`, `headerCell` → `{ columnId }`) so
  rows/cells can be styled conditionally (K2 dynamic row styling, K1 dynamic cell styling). Every
  slot **composes with** the built-in `bst-*` classes — a consumer's CSS layers over a theme rather
  than forking the renderer.
- **Per-column header CSS** — `meta.headerClassName` / `meta.headerStyle` style one column's `<th>`,
  complementing the existing `meta.cellClassName` / `meta.cellStyle` for body cells. Per-column `meta`
  wins over the global `styles.*` slot (more specific).
- **Adapter outer-card CSS** — `@bloomskill/table-mui` and `@bloomskill/table-shadcn` now accept
  `className` / `style` on the outer card (`<Paper>` / `.sc-card`); `classNames` / `styles` forward
  straight through to the grid body.
- New exported types: `BstClassNames`, `BstStyles`, `BstRowContext`, `BstHeaderSlotContext`.
### Notes
- **No new runtime dependencies.** Additive + fully backward compatible — a grid that passes none of
  these is byte-for-byte unchanged.

## [0.9.1] — 2026-08-11
### Changed — visual polish (both adapters)
- Refreshed the grid look & feel across `@bloomskill/table-*` (no API changes):
  - **Headers** are uppercase, letter-spaced and muted, with a **faint sort arrow** that
    brightens on hover / when a column is sorted — a cleaner data-grid header.
  - **Single-select** cells now render as soft **status pills** tinted by the option color,
    and **multi-select chips** pick up the same tint (driven by a new `--opt-color` var +
    `.is-tinted` class on the option read-renderers).
  - Softer selection/active tints, smoother row hover, lighter row separators, a last-row
    border trim, refined action buttons, focus-ringed filter inputs, and a roomier empty state.
- **`@bloomskill/table-shadcn`** — the grid now uses a real **blue accent** for selection /
  active / links (was a flat grey ring), a proper **zinc primary** button, a toolbar divider,
  blue focus rings, and subtle button + card depth.
- **`@bloomskill/table-mui`** — softer (non-uppercase) toolbar buttons, a toolbar divider, and a
  subtle card shadow.

## [0.9.0] — 2026-08-11
### Fixed
- **Column resize now actually resizes.** The table lacked `table-layout: fixed`, so the browser
  sized columns to content and ignored the dragged width. The table now sets `table-layout: fixed`
  and an explicit width from `getTotalSize()`, so dragging a header's edge changes the column width
  (and it scrolls horizontally past the container, which is where pinning earns its keep).
### Added
- **Per-column filter row** (`@bloomskill/table-engine`) — `enableColumnFilterRow` renders a
  type-aware filter input under each header (text/number/date → contains, selects → dropdown,
  boolean → tri-state). It's the "**dual filter**": it and the `<BstFilterBuilder>` panel are two
  views of the same `columnFilters` state. Needs `enableColumnFilters`.
- **Column drag-to-reorder** — `enableColumnOrdering` now also enables **dragging a header** onto
  another to reorder (native HTML5 DnD → `setColumnOrder`), in addition to the adapter menu's move
  buttons. The resize handle is excluded from the drag so both gestures coexist.
- Both adapters inherit all three through the shared `<BstTable>` body — no adapter changes.
### Notes
- No new runtime dependencies. Row-level drag-reorder and row-height resize are still to come.
### Added — Phase 3 (part 6): filter-builder UI (E3)
- **Operator-aware filtering** (`@bloomskill/table-engine`) — a new `bstCondition` filterFn interprets a
  `{ op, value }` condition and is wired as the **default column filterFn**. Operators are picked by
  `meta.type`: text (contains / equals / starts-with / ends-with / is-empty…), number (= ≠ > ≥ < ≤
  between), date (on / after / before / between), select (is / is not), boolean (is/isn't checked).
- **`<BstFilterBuilder>`** — a neutral, theme-agnostic filter-builder component that reads/writes v9's
  `columnFilters` (one condition per column): add/remove rows, pick column + operator + value(s),
  clear all. New exports: `BstFilterBuilder`, `evalCondition`, `operatorsForType`, `operatorArity`,
  `filterFn_bstCondition`, the `*_OPERATORS` tables, and types `FilterOperator` / `FilterCondition`.
- **`enableColumnFilters`** toggle added (maps to v9, default true) — completes the earlier TODO.
- **`@bloomskill/table-mui` / `@bloomskill/table-shadcn`** — a **"Filters (n)"** toolbar button
  (`showFilterBuilder`) toggling a panel that hosts `<BstFilterBuilder>`.
### Notes
- No new runtime dependencies. One condition per column (multi-condition-per-column can layer on later).

## [0.7.0] — 2026-08-11
### Added — Phase 3 (part 5): column pinning, reordering & density
- **Column pinning** (`@bloomskill/table-engine`) — `enableColumnPinning`. Start-pinned columns render
  **sticky** (header + body) with accumulating left offsets (after the selection column when present).
  Maps to v9 `columnPinningFeature`; **note the v9 rename** — pin state is `{ start, end }` and
  `getIsPinned()` returns `'start'` / `'end'`.
- **Column reordering** — `enableColumnOrdering` registers v9's `columnOrderingFeature` and gates the
  adapter reorder chrome (move left/right → `setColumnOrder`).
- **Density** — a `data-bst-density` hook on `.bst-table-root` (`compact` / `comfortable`) driving
  `--bst-table-cell-pad-y`.
- **`@bloomskill/table-mui` / `@bloomskill/table-shadcn`** — the columns menu now carries per-column
  **pin** + **move left/right** controls (shown by `enableColumnPinning` / `enableColumnOrdering`), and
  a toolbar **density** button (`showDensityToggle`) cycling compact → normal → comfortable.
### Fixed
- `useBstTable` now seeds `columnPinning: { start, end }` and `columnOrder` in initial state, so v9's
  pin/order logic never reads `.length`/`.includes` on undefined.
### Notes
- No new runtime dependencies. Column reorder is menu-driven (drag reorder can layer on later).

## [0.6.0] — 2026-08-11
### Added — Phase 3 (part 4): undo / redo (C5)
- **Undo / redo** (`@bloomskill/table-engine`) — `enableUndoRedo` records a snapshot of the `data`
  array before every committed change (cell edits, paste, row add/delete/duplicate), so it needs a
  controlled `onDataChange`. **Ctrl/Cmd+Z** undoes, **Ctrl/Cmd+Shift+Z** / **Ctrl/Cmd+Y** redoes from
  the focused grid; a fresh change clears the redo stack. New runtime APIs `undo`, `redo`, `canUndo`,
  `canRedo`; reactive `undoDepth` / `redoDepth` on the interaction store. All committed mutations now
  route through one `commitData` path.
- **`@bloomskill/table-mui` / `@bloomskill/table-shadcn`** — toolbar **Undo/Redo** buttons (disabled
  when nothing to undo/redo) via the new `showUndoRedo` chrome flag (defaults to follow it).
### Changed
- `runtime.cancelAll()` ("Discard") now clears **only** draft/dirty/error state — it preserves the
  active selection and undo history (previously it reset the whole interaction store).
### Notes
- No new runtime dependencies. Opt-in; snapshot-based history (fine for the workflow tier).

## [0.5.0] — 2026-08-11
### Added — Phase 3 (part 3): row selection
- **Row selection** (`@bloomskill/table-engine`) — `enableRowSelection` adds a leading checkbox
  column: header **select-all** (indeterminate on a partial selection), per-row checkboxes, and a
  `bst-row-selected` highlight. Built on v9's **`rowSelectionFeature`** (now registered) — state
  lives in `table.state.rowSelection` keyed by `getRowId`; read/act via `table.getSelectedRowModel()`
  / `table.resetRowSelection()`. The checkbox column sits **outside the column model**, so it never
  joins cell-selection ranges, copy output, resizing, or reordering.
- **`@bloomskill/table-mui` / `@bloomskill/table-shadcn`** — a toolbar **"{n} selected"** chip + **Clear**
  when rows are selected, via the new `showSelectionInfo` chrome flag (defaults to follow
  `enableRowSelection`).
### Notes
- No new runtime dependencies. Opt-in — a grid without `enableRowSelection` is unchanged.

## [0.4.0] — 2026-08-11
### Added — Phase 3 (part 2): access-control cascade (F1–F4)
- **Disable cascade** (`@bloomskill/table-engine`) — interactivity now resolves through one
  **grid → row → column → cell** chain; the first disable wins. Completes the F-series:
  - `disabled` (F1, grid) and `rowDisabled` (F2, row) — shipped in 0.2.0, now part of the unified cascade.
  - **`meta.disabled`** (F3 whole column when `true`; F4 per-row/cell when a `(row) => boolean`).
  - **`cellDisabled({ row, rowId, columnId })`** (F4) — a grid-level, cross-cutting cell predicate.
- A disabled cell greys out (`bst-disabled`), can't be edited (**overrides `meta.editable`**), and
  disables its action-column buttons — but **stays selectable/copyable** (disable governs editing,
  not selection). New runtime APIs `getCellAccess` → `{ disabled, editable }`, `isCellDisabled`; new
  exported type `CellAccess`. `cell.api.isDisabled` now reflects the full cascade.
- **`@bloomskill/table-mui` / `@bloomskill/table-shadcn`** — inherit the cascade via the new
  `cellDisabled` option + `meta.disabled`; no adapter changes.
### Notes
- No new runtime dependencies. Opt-in — a grid that passes no disable predicates is unchanged.

## [0.3.0] — 2026-08-11
### Added — Phase 3 (part 1): cell/range selection, keyboard navigation & clipboard
- **Cell / range selection** (`@bloomskill/table-engine`) — `enableCellSelection`. Click sets the
  active cell; Shift-click selects a rectangle. Selection lives in the interaction store and the
  range is materialised **at paint** from the `activeCell` / `anchorCell` ids (§2.4), so moving the
  cursor re-renders only the cells whose state changed — never the whole grid. New runtime APIs:
  `setActiveCell`, `extendSelectionTo`, `moveActive`, `selectAll`, `clearSelection`,
  `getSelectionMatrix`, `visualIndexOf`.
- **Keyboard navigation** — folded into `enableCellSelection`: Arrow · **Shift+Arrow** (grow range) ·
  **Tab** (steps across, wraps to next row) · **Home / End** (row edges) · **Ctrl/Cmd+Home / End**
  (grid corners) · **Ctrl/Cmd+A** (select all); roving-tabindex focus on the active cell; **Enter /
  F2** to edit; **Esc** to clear.
- **Clipboard (H1–H4)** — `enableClipboard` (implies `enableCellSelection`). **Ctrl/Cmd+C** copies the
  selection as TSV (each value formatted by its cell type); **Ctrl/Cmd+V** pastes TSV from the active
  cell across as many rows/columns as it spans — parsed by the target cell type, validated, skipping
  read-only columns (invalid cells become flagged dirty drafts under `blockCommitOnError`). Paste
  requires `enableEditing`. Runtime APIs: `getSelectionClipboardText`, `copySelection`,
  `pasteFromText`. New exported types `CellRef`, `VisualIndex`, `MoveActiveOptions`.
- **`@bloomskill/table-mui` / `@bloomskill/table-shadcn`** — inherit selection + keyboard + clipboard
  by passing the two flags through to the shared `<BstTable/>` body; **no adapter chrome changes**.
### Notes
- **No new runtime dependencies.** Copy/paste ride the native DOM clipboard events.
- Opt-in (`enable*` default off) — a zero-config grid is unchanged.
- **Still to come in Phase 3:** row-selection column + checkbox chrome, the access-control cascade
  (column/cell enable-disable), and the layout chrome (column pin/reorder menu, E3 filter-builder UI,
  row resize + density, sampled auto-size).

## [0.2.0] — 2026-08-11
### Added — Phase 2: editing, validation & the cell-type registry
- **Cell-type registry** (`@bloomskill/table-engine`) — neutral read **and** edit renderers for the
  full B-series, selected via `columnDef.meta.type`: `text` · `longText` · `number` · `dateTime` ·
  `boolean` · `singleSelect` · `multiSelect` · `radio` · `hyperlink` · `files` · `action`.
  `columnDef.meta` is now typed as `BstColumnMeta`. New: `createCellTypeRegistry`, `defineCellType`,
  `createDefaultRegistry`, `defineCellType` helpers + each `*CellType`.
- **Inline editing feature** — `enableEditing` (`boolean | { mode, saveOn, policy }`). Cell mode +
  deferred **row-session** mode (C2 ≡ I2), save on Enter/Blur/Explicit, dirty tracking, write-back
  **by `rowId`** via `onDataChange`, Esc to cancel. Live keystrokes stay in local editor state and
  never touch table state (hot-path rule). New `useBstGrid` hook + `runtime` API
  (`commitCell`, `beginRowSession`/`commitRowSession`, `commitAll`, `getDirtyChanges`, …).
- **Validation feature** — `enableValidation` (`boolean | { policy }`). Cell/row/cross-column +
  **async** (last-write-wins per cell), commit policy `blockCommitOnError | commitButFlag`, inline
  error ring + message.
- **Row lifecycle** — `enableRowActions`: add / delete / duplicate with temp-id strategy; `createRow`.
- **Access control** — `disabled` (grid, F1) + `rowDisabled` (row, F2); `meta.editable` per column/row.
- **`@bloomskill/table-mui`** — `createMuiPreset()` MUI editors for every type (`TextField`, `Select`,
  multi-`Select`, `Radio`, `Checkbox`/`Switch`, `Dialog` popups for long-text/files); **Add row**
  button + **Save/Discard** unsaved-changes bar (`showAddRow`, `showSaveBar`).
- **`@bloomskill/table-shadcn`** — `createShadcnPreset()` editor parity via native controls + a
  dependency-free modal for long-text/file popups; **Add row** + **Save/Discard** chrome.
- Portability suite extended to prove an editing round-trip from the published tarballs.
### Notes
- **No new runtime dependencies.** Dates use native input types (no `@mui/x-date-pickers`); QR/barcode
  and charts remain deferred per plan.
- All new features are **opt-in** (`enable*` default off) — a zero-config grid is unchanged.

## [0.1.1] — 2026-08-11
### Added
- **READMEs** for all three packages (`@bloomskill/table-engine`, `-mui`, `-shadcn`) —
  features, install, usage examples, and props/options tables. These render on the npm pages.

## [0.1.0] — 2026-08-11
### Added
- Initial release.
- **`@bloomskill/table-engine`** — headless React table on TanStack Table v9: neutral
  `<BstTable>` renderer + `useBstTable` hook, themed via `--bst-table-*` CSS variables.
- **`@bloomskill/table-mui`** — Material UI skin (`<BstTableMui>`): toolbar, search,
  column-visibility menu, pagination; maps MUI theme → grid CSS vars.
- **`@bloomskill/table-shadcn`** — shadcn/Radix skin (`<BstTableShadcn>`): Radix column menu,
  shadcn-style CSS, `dark` mode; no Tailwind build required.
- **OOTB features:** sorting · column + global search · pagination · column visibility · column resizing.
- **Per-instance toggles:** engine `enable*` (behaviour) + adapter `show*` (chrome);
  `pagination: boolean | { pageSize }`; `pageSizeOptions`.
- Portability verified: packages install + build + run from published tarballs in a foreign app.
