# Changelog

All notable changes to the **`@bloomskill/table-*`** packages
(`table-engine`, `table-mui`, `table-shadcn`, `table-mcp`). Versions are kept **in lockstep** —
all four bump together. Format loosely follows [Keep a Changelog](https://keepachangelog.com);
this project uses [Semantic Versioning](https://semver.org).

> Per `CLAUDE.md` §13: every feature/behaviour change must add an entry here **and** update the
> affected package README(s) **and** bump the version, in the same change.

## [Unreleased]

## [0.44.0] — 2026-08-26

### Added — MCP server: `bst_list_versions` (9th tool)
- New **`bst_list_versions`** tool lists the released version history — parsed from `CHANGELOG.md`
  into the corpus (`versions`, via `extractVersions` in `src/generate/since.ts`), newest first with
  dates and the documented version marked. Gives an agent upgrade / migration context, pairing with
  `bst_detect_version` and `bst_get_feature({ installedVersion })`. It stays honest about the offline
  model — this server documents exactly one version per corpus; another version needs its own pinned
  install (`npx @bloomskill/table-mcp@<version>`). Brings the tool count to 9; smoke + the two parity
  tests updated accordingly.

### Fixed — MCP doc counts pinned to the corpus
- Corrected stale counts in `packages/mcp/README.md` and `docs/mcp-server.md` (API exports 150 → 262,
  example apps six → seven, indexed READMEs five → six) and added a `generate.test.ts` parity guard
  that pins every quoted count to the generated corpus, so the prose can't drift again.

## [0.43.0] — 2026-08-26

### Added — MCP server (`@bloomskill/table-mcp`): structured output, completions & version-awareness
- **`outputSchema` on all 8 tools** — each tool already returned `structuredContent`; that payload is
  now validated against a declared output schema and advertised in `tools/list`, so an MCP client can
  consume results as typed, machine-readable data instead of re-parsing prose. Shared
  `FindingSchema` / `ValidationReportSchema` fragments (`src/tools/shared.ts`) keep
  `bst_validate_config` and the scaffolder's built-in self-check in one declared shape. Multi-shape
  tools (`bst_get_feature`, `bst_get_api`, `bst_get_example`) use optional/`passthrough` branches so
  every response path validates without dropping fields.
- **Argument completions** — `bst-quick-start`'s `adapter` (mui / shadcn / engine),
  `bst-add-feature`'s `feature` (the real flag registry), and the `bst://example/{name}` resource
  variable now autocomplete to real names via MCP's completions capability, so a name is picked from
  the corpus rather than guessed. `bst-migrate`'s `from` is intentionally left free-text (naming
  guard: no competitor product names anywhere in the tree).
- **Version-awareness** — each feature now carries a `since` version, extracted at build time from
  the earliest `CHANGELOG.md` section that names the flag in code formatting (`src/generate/since.ts`;
  release discipline §13 makes this a faithful "first shipped in"). `bst_get_feature` renders a
  **Since** row and accepts a new `installedVersion` argument: given a project's version (from
  `bst_detect_version`), it states plainly whether a flag exists there — **⚠️ NOT available** with the
  version to upgrade to, **✅ available**, or ℹ️ "predates the tracked changelog" for the oldest
  defaults (which fail safe: no `since` → never a false "unavailable"). `bst_detect_version` now nudges
  the agent to pass `installedVersion`. `CHANGELOG.md` joined the corpus's freshness-tracked sources.
  New unit tests cover the extractor and a numeric `compareSemver`.
- No grid engine/adapter code or capability changed; the corpus gains a `since` field but tools,
  resources and prompts are otherwise behaviour-compatible. Verified with `npm run mcp` (build +
  parity guards + stdio smoke + 28-component scaffold typecheck) plus direct checks of both no-arg
  listing paths, all three completions, and the availability verdict (old vs new version) against the
  built server.

### Changed — Docs generate from the corpus (no more hand-frozen snapshots) + coverage enforcement
- **The missing corpus→docs bridge.** `apps/docs/scripts/{features,cells,requirements,rules}.json`
  were static, hand-frozen snapshots that no script regenerated — so a new feature never reached the
  docs until someone re-dumped them by hand (the root cause of docs drift). New
  `apps/docs/scripts/dump-corpus.mjs` regenerates all four from `packages/mcp/dist/corpus.json` (+ the
  built `RULES`); `gen:docs` runs it first, so the chain is engine → MCP corpus → JSON → MDX with no
  hand-maintained middle. Feature pages now also carry richer generated content (maps-to, TSDoc,
  related props, spec coverage) and a **Since** version row.
- **`npm run docs:build`** now rebuilds the engine + MCP corpus, extracts the API, dumps the corpus,
  regenerates every MDX page and runs the coverage gate; `version:*` runs it on release.
- **Enforced, not convention.** New `npm run docs:verify` regenerates the docs and fails if the
  committed output is stale — dependency-free (no docusaurus / TS5 install), wired into CI
  (`.github/workflows/verify.yml`). CLAUDE.md §13 DoD gains a required "regenerate the generated docs"
  step. Regenerated the whole site from the corpus (72 files); Docusaurus builds clean.
- **MCP coverage cross-check.** New `npm run verify:mcp` (`scripts/verify-mcp-coverage.mjs`, in
  `npm run mcp` + CI) asserts the corpus covers every engine capability — cell types, settings
  toggles, validation rules (both directions), **every `enable*`/`show*` flag declared anywhere in the
  engine + both adapters** (the adapter-prop surface the compile-time settings guard doesn't reach,
  with a documented allowlist for TanStack per-column option names), and the full agent surface
  (coverage matrix, API, examples, install guide, per-flag `since`). It caught **`showFind`**: a shipped chrome flag with a
  validation rule but no §12 registry row, so `bst_get_feature` couldn't resolve it — now added as a
  first-class row.

### Added — Documentation site (`apps/docs`)
- **Docusaurus documentation site** under `apps/docs` — the generated reference for Bst-Table:
  59 feature-flag pages (9 groups), 17 cell types, 261 engine API exports (signatures read from the
  built `.d.ts`), and a 58-leaf coverage matrix. All 94 pages are **generated from the MCP corpus** +
  engine types (`scripts/gen-features.mjs`, `gen-reference.mjs`, `extract-api.mjs`) — never
  hand-edited — with a build-time coverage gate (`scripts/check-docs-coverage.mjs`) that fails if any
  flag / cell type / export is undocumented. No engine/adapter code or capability changed.
- **Human quality layer (Phase 2)** — hand-written prose partials in `apps/docs/guides/` are
  **injected** into the generated feature pages by `gen-features.mjs` and survive regeneration: a
  "when to use / how it works / gotchas" guide for **every one of the 58 feature flags** across all 9
  groups, plus a per-group overview — each dependency-accurate (requires / implies / sub-toggle) from
  the §12 registry.
- **Authored pages + ship setup (Phase 3)** — hand-written **Getting Started**, **Styling &
  Theming**, **AI Agents & MCP**, and a vendor-neutral **Migration** guide; Coverage moved last;
  `docusaurus.config.js` pointed at `bst-grid.pages.dev`; an `apps/docs/README.md` with run /
  regenerate / Cloudflare Pages deploy steps; and a docs link in the root README. The full site
  builds clean (0 broken links / anchors); actual Cloudflare deploy still needs the account.
- **Reproducible corpus + release wiring** — `extract-api.mjs` now resolves the engine `.d.ts` from
  the workspace (via a pinned **typescript@5** devDep, since the repo's root TypeScript is v7 whose
  compiler API it can't use); `api-sigs.json` was re-extracted from the live engine, which surfaced
  the previously-missing `BstFindOptions` (now **262** exports). Root `docs:sync` / `docs:build`
  orchestrate regeneration, and `version:patch|minor|major` **auto-run `docs:sync`**, so the docs
  regenerate and the coverage gate runs on every bump — they can't drift from the code.
- **Live examples (Sandpack)** — a `<BstSandbox>` component renders **editable, runnable** Bst-Table
  grids inside the guides, loaded from the published `@bloomskill` packages via the npm CDN
  (SSR-safe via `BrowserOnly`). At least one per feature group + both editing modes (10 total).
- **Guide placement** — the hand-written partials now inject under a `## Guide` heading **before**
  the generated reference tables (was after), with `###` sub-sections — matching the docs spec.
- **Stricter neutral-naming** — `verify:naming` now bans two further third-party grid product names
  (a React table library and its acronym) in addition to those already caught, so the
  no-competitor-names policy is **enforced**, not just followed (see `scripts/verify-naming.mjs` for
  the list). The Migration guide is now a fully-neutral "coming from any grid" concept map +
  five-step porting checklist, with the remaining soft references removed; no product is named.
- **Deploy-ready + hero image** — `apps/docs` is isolated from the npm workspace (`apps/*` →
  `apps/demo`) so a Cloudflare / CI install is clean and fast, with a pinned Node version
  (`.node-version`). A real captured **hero screenshot** leads Getting Started (`static/img/`), and
  the live-example chrome is trimmed (`showOpenInCodeSandbox` / refresh off).

## [0.42.0] — 2026-08-24

### Added — Per-cell commit hook (`onCellCommit`) + edit log (`enableEditLog`)
- **`onCellCommit(change)`** (engine) — the **inline counterpart to `onSave`**. Fires **once per
  committed cell** the moment an edit writes through: an inline edit saved on **Enter / blur** (edit a
  cell, click out), or **each cell of a paste**, in the default `'cell'` editing mode. The payload is
  the single **`BstCellEdit`** — `rowId` · `columnId` · `field` · `oldValue` → `newValue` · formatted
  `oldText` / `newText` · the `row`. Emitted from `persist()` (downstream of `commitCell`), so it also
  covers Enter/Tab commit-and-move and paste. Deferred `'row'` / `'batch'` modes still batch through
  `onSave`. Opt-in by presence, like `onSave`; forwarded through both adapters (`...rest`).
- **`enableEditLog`** (engine, default `false`) — a zero-wiring **debug companion** that
  `console.log`s each committed cell edit. If an `onCellCommit` handler is supplied it takes precedence
  and this stays quiet (no double signal). Needs `enableEditing`; a settings-sheet toggle ("Editing").

### Added — Find (X8): highlight + jump between matches, without hiding rows
- **`enableFind`** (engine) adds an in-grid **find bar** that **highlights every match and jumps
  between them** (Next / Prev with an "n / m" counter) — the browser-`Ctrl+F` experience *inside*
  the grid. It is **distinct from global search** (`enableGlobalFilter`): Find **hides nothing**, so
  the surrounding rows stay visible while you locate a value. Off by default.
- **Keyboard** — ⌘/Ctrl+F opens (independent of `enableCellSelection`); **Enter / Shift+Enter** cycle
  in the box, **F3 / Shift+F3** cycle from the grid, **Esc** closes. A new **Find** shortcut group is
  listed in the `showShortcuts` overlay.
- **Matching + highlight** — matches are computed over each cell's *display* text (the same
  `formatValue` ∘ `draftAwareValue` used by copy / export, so "what you find" == "what you copy").
  **Every matched cell gets the same whole-cell tint** (`bst-find-hit`) so text and rich cells
  (chips / selects / links) read consistently; **plain-text cells additionally** get in-place
  `<mark>`s on the matched letters, and the **current** match is stronger + outlined
  (`bst-find-current`) and scrolled into view (virtualized `scrollToIndex` + `scrollIntoView`). Match
  state lives in the interaction store and is painted per-cell via the `CellSlice`, so typing /
  stepping re-renders **only** the matched cells.
- **Shortcuts overlay** — the `showShortcuts` overlay now derives its active-flag set **from the
  shortcut registry itself** (reads each shortcut's `requires` off the handle), so the new **Find**
  group shows correctly and no future group can be silently dropped from a hand-kept list.
- **Config + API** — object form `enableFind={{ caseSensitive?, scope?: 'view' | 'all' }}`
  (`'view'` = current page/window, `'all'` = every filtered row). Programmatic:
  `runtime.openFind()` / `closeFind()` / `setFindQuery(q)` / `refreshFind()` / `findNext()` /
  `findPrev()`. New type `BstFindOptions`.
- **Adapters** — both **MUI** and **shadcn** add a toolbar **Find** button (`showFind`, follows
  `enableFind`). In the settings sheet under **Data operations** (always shown). Registered in the MCP
  rules corpus (`enableFind` / `showFind`).
- Tested in `find.test.tsx` (matches without removing rows · cycle + wrap · numeric cells ·
  case-sensitivity · close clears). No API break — purely additive.

### Fixed
- **React `key`-in-spread warning** — the column-virtualization spacer
  (`enableColumnVirtualization`) built `{ key, className, style, aria-hidden }` and spread it into
  its `<td>` / `<th>`; `key` is now passed to JSX directly (React 19 warns on spread keys). No
  behaviour change.
- **MUI page-size `<Select>` "out-of-range value" warning** — a grid whose `pagination.pageSize`
  isn't one of `pageSizeOptions` (e.g. `pageSize: 8` with the default `[5, 10, 20, 50]`) rendered a
  Select value with no matching option. `resolvePageSizeChoices` now **surfaces the current page
  size as its own choice** (kept sorted) when it isn't listed and there's no `'all'` fallback, so the
  control's value always matches an option. Engine-level fix — benefits both adapters, any consumer
  `pageSize`. Covered in `stickyHeader.test.tsx`.

### Added — Type-to-edit (C5/C6): spreadsheet-style data entry
- **`enableTypeToEdit`** (engine) — with cell selection + editing on, **start typing on a selected
  cell to overwrite it**: a printable keystroke opens the inline editor **seeded with that character**
  (via the cell type's `parse`, so text *and* number cells work). Off by default; a no-op unless both
  `enableEditing` and `enableCellSelection` are on (resolved together on the runtime handle).
- **Commit-and-move** — while editing, **Enter commits and moves down** (⇧ up) and **Tab commits and
  moves right** (⇧ left, wrapping rows) — like a spreadsheet. Single-cell edits only; a row session
  keeps its native field-to-field flow. Both route through the existing `commitCell`, so there is **no
  new write path** (validation, dirty-tracking, batch/undo and any `onDataChange`/save hooks all fire
  exactly as before).
- **Safe seeding** — only **non-overlay** editors that expose `parse` (text / number) seed; keys the
  cell type can't represent (e.g. a letter typed into a number cell → `NaN`) are **declined** rather
  than opening an editor on a garbage value. Modifier chords (Ctrl+A select-all, Ctrl/Shift+Space
  column/row select) still reach the nav handler unchanged.
- **Discoverability** — three new **Edit** entries in the `showShortcuts` overlay (gated on
  `enableTypeToEdit`); a **Type to edit** toggle in the settings sheet under **Editing** (disabled
  until its prerequisites are on). Registered in the MCP rules corpus.
- Tested in `typeToEdit.test.tsx` (seed text + number · decline NaN · Enter / Shift+Enter / Tab
  commit-and-move · off when the flag or editing is absent · modifier chords unaffected). No API
  break — purely additive.

## [0.41.1] — 2026-08-24
### Changed — neutral naming (docs, comments and shipped strings)
- Bst-Table now describes its **own** capabilities in its **own** words. Every reference to a
  third-party grid product — and to its commercial licensing tiers — has been removed from the
  repository: documentation, source comments, the settings-sheet hints shipped to end users, and
  the MCP server's prompts and tool descriptions shipped to AI agents.
- **Roadmap IDs renamed `AG*` → `X1`–`X29`** ("extended capability matrix", beyond the original
  `A1–M2` spec) across `COVERAGE.md`, `Plan.md`, `CLAUDE.md`, source comments, tests and the demo.
  The IDs were **removed entirely** from user-visible settings hints and agent-visible MCP rule
  notes — a roadmap ID has no business in an end-user settings sheet.
- The old vendor gap-analysis doc is now **[`docs/capability-roadmap.md`](docs/capability-roadmap.md)**,
  rewritten from Bst-Table's own feature registry rather than from anyone else's feature matrix.
  Vendor tier columns dropped; several stale statuses re-synced with `COVERAGE.md` in the process.
- **`COVERAGE.md`** — the second matrix is now the **"Extended capability matrix"**; the vendor-tier
  column is gone from both of its tables.
- **New guard: `npm run verify:naming`** (`scripts/verify-naming.mjs`) fails the build if a banned
  term reappears in any tracked file, and is now part of the `CLAUDE.md` §13 Definition of Done and
  release flow.
- **Fixed: a stale build artifact was shipping to npm.** `packages/engine/dist/BstColumnPanel.{js,d.ts}`
  — the compiled remains of the sidebar prototype whose source was reverted in 2026-08-17 — survived in
  `dist/` because `tsc` never deletes stale outputs and the package publishes `files: ["dist"]`. It was
  dead code in the tarball (unreferenced by `index.js`) **and** it carried the last old-scheme ID. All
  four packages now **wipe `dist/` before compiling**, and `verify:naming` scans the **publish payload**
  (`packages/*/{dist,styles}`), not only git-tracked sources — the scope that let this through.
- **No API change.** No exported symbol, flag, CSS class or data attribute was touched — every edit
  was a comment, doc, test title or display string. Existing code needs no changes.

## [0.41.0] — 2026-08-24
### Added — Save view / Reset view controls in the settings sheet (X21)
- The **settings-sheet footer** now shows grid-state **view** controls in **both** adapters when
  `gridState` is configured: a **Reset view** button always, and a **Save view** button in
  **manual mode** (`gridState={{ key, persist: false }}`). Manual mode still restores the saved view
  on mount but writes **only when the user clicks Save view** (auto mode keeps the debounced
  `<GridStatePersist>`). Save calls `saveGridState(getGridState(table))`; Reset calls
  `resetGridState(table)` + `clearGridState(key)` — clearing the live arrangement **and** forgetting
  the snapshot. These sit below, and visually separate from, the settings **Reset** (which clears
  *feature* toggles).
- **No new flag** — pure adapter chrome over the existing `gridState` API, so no settings-sheet or
  MCP-rules change. The demo's **Grid state** section now uses `persist: false` + `showSettings` to
  show it live. Tested in `mui.test.tsx` + `shadcn.test.tsx` (Save writes the snapshot, Reset clears
  it; auto mode shows Reset view but not Save view).
- **Sheet footer is now stacked, and says which half saves how.** The view controls previously shared
  one flex row with their caption, so in the ~320px sheet the caption wrapped to four lines and
  squeezed both buttons. Caption now sits on its own line above a right-aligned button row
  (`white-space: nowrap`), under a **"Saved view"** heading matching the sheet's other section
  headings. Captions name what each half covers and how it saves — feature toggles read
  *"saved automatically"*, the view reads *"Sort, filters and column layout — saved on click"* (or
  *"saved automatically"* in auto mode) — because the two persist to **separate** keys
  (`bst-table:settings:*` auto, `bst-table:state:*` manual) with separate Resets, which read as a bug
  when unlabelled. shadcn adds `.sc-view-footer` / `.sc-view-heading` / `.sc-view-actions`.
- **Demo:** the primary **MUI** and **shadcn** grids now pass `gridState` too, so the view controls
  are demonstrable on the main tables (own keys, `persist: false`). Both — and the X21 section —
  wrap `localStorage` in a small logging `gridState.storage`, so clicking **Save view** logs the exact
  persisted snapshot to the console. Uses the public `BstGridStateStorage` contract; no library change.

## [0.40.0] — 2026-08-20
### Added — Row numbers (X9) · loading/error overlays (X23) · auto-generate columns (X27)
- **Row-number column (`X9`) — `enableRowNumbers`** (+ **`rowNumberHeader`**). A leading,
  non-interactive `#` column numbering the **current view** — continuous across pages, reflecting the
  active sort + filter (not the raw data order). It's injected as a real leaf column under the reserved
  `__bst` id prefix, so it stays out of sorting, the filter row, the columns menu and export **by
  construction**; the number is read from the live painted row model (cached per model, O(n)). It is
  **pinned to the start** by default (sticky-left), so it stays the leftmost data column — ahead of any
  user-pinned column — and stays visible during horizontal scroll (the pin is seeded even when a
  consumer `initialState` / `gridState` sets its own column pinning). In the runtime settings sheet
  under **Columns → "Row numbers"** (always shown). Both skins inherit it.
- **Loading / error overlays (`X23`) — `enableOverlays`** (default **on**) + **`loading`** / **`error`**
  (+ **`overlayText`** / **`renderLoadingOverlay`** / **`renderErrorOverlay`**). A formal overlay paints
  over the grid while `loading` is true or when `error` is set (error wins), instead of a blank / stale
  body. `useBstDataSource` **and** `useBstInfiniteDataSource` now surface `loading` + `error` on their
  `tableProps`, so a server-wired grid shows the overlays with no extra code. Default content is a
  spinner + "Loading…" / the error message; fully replaceable via the render props. Settings sheet:
  **Display → "Loading / error overlays"**.
- **Auto-generate columns (`X27`) — `enableAutoColumns`** (+ **`autoColumns`**). When **no `columns`**
  are supplied (empty array), the grid infers one column per key found across a sample of rows
  (first-seen order), guessing the cell type (number / boolean / date, else text) and humanizing the
  header (`unitPrice` → "Unit Price"). Ignored the moment `columns` is non-empty — explicit columns
  always win. New engine export **`autoGenerateColumns(data, opts)`** (+ `humanizeKey`, `inferCellType`,
  `ROW_NUMBER_COLUMN_ID`, `RESERVED_COLUMN_PREFIX`). Settings sheet: **Columns → "Auto-generate columns"**.
- New engine module `columns.ts`; overlay + row-number CSS in `bst-table.css` (`.bst-table-viewport` /
  `.bst-overlay*` / `.bst-rownum-cell`). Settings-sheet parity + MCP flag-rules entries added for all
  three flags; §12 registry rows added. Tested in `columns.test.tsx` (17 cases: auto-column inference,
  row-number ordering/pagination continuity, overlay states). Demo: `enableRowNumbers` on the main grid
  + dedicated **X27** and **X23** sections.

### Marked optional (kept, out of scope) — X18 / X19 / X24
- **Cell notes / comments (`X18`)**, **i18n / localeText (`X19`)** and **RTL (`X24`)** are moved to a
  new **"Optional — kept but out of scope"** section in [`COVERAGE.md`](COVERAGE.md) (and flagged in
  `Plan.md`). They stay documented but are **not scheduled** and no longer counted as missing work.

### Added — Sticky-header viewport (`enableStickyHeader`) + an "All" rows-per-page choice
- **`enableStickyHeader`** (engine, G3/G4) caps the scrollable body to a bounded height so the rows
  scroll **inside** the grid under a header (and per-column filter row) that stays pinned — instead
  of the whole table growing taller as the page size grows. Fixes the "increase rows per page → no
  scroll, header scrolls away, height just grows" behaviour. `true` uses a default height (440px);
  pass an object to size it by pixels (`{ maxHeight: 500 }` / `{ maxHeight: '60vh' }`) or by a row
  count (`{ maxRows: 10 }`). Opt-in (default off), and **always listed in the runtime settings sheet**
  under **Rows → "Sticky header"**, so an end-user can switch it on per table without developer wiring.
- Row virtualization (`enableVirtualization`) already caps the body + sticks the header, so the engine
  adds the standalone `bst-sticky-header` class only when windowing is **off** — the two never stack.
  Height comes from the `--bst-max-height` CSS var (set inline), overridable via `styles.root`.
- New engine exports: pure **`resolveStickyHeader`** helper + `BstStickyHeaderOptions` /
  `ResolvedStickyHeader` types + the `STICKY_*` constants.
- **"Rows per page" now accepts an `'all'` choice.** `pageSizeOptions` may include the string `'all'`
  (e.g. `[10, 25, 50, 'all']`) to offer an **All** entry that shows every (filtered) row — the natural
  companion to the sticky-header viewport (show everything, scroll inside a fixed box). Resolved by the
  new pure engine helpers **`resolvePageSizeChoices`** / **`pageSizeForChoice`** (+ `BstPageSizeOption`
  type), so MUI and shadcn behave identically. `pageSizeOptions` is now typed `(number | 'all')[]`
  (backward compatible with `number[]`).
- Settings-sheet parity (`enableStickyHeader`) + MCP flag-rules entry added; new tests in
  `stickyHeader.test.tsx` (pure resolvers + render: class/height applied, yields to virtualization),
  `mui.test.tsx` / `shadcn.test.tsx` (settings toggle wires through; the "All" option shows every row).

### Added — Per-column hide/show (eye) toggle in the Columns menu
- The **Columns menu** now gives every column a one-click **eye / eye-off** visibility toggle
  (aria `Hide <col>` / `Show <col>`) beside the existing pin / reorder / copy / edit controls, in
  **both** the MUI and shadcn adapters. It sits next to — and stays in sync with — the per-column
  visibility checkbox, and calls the engine's `col.toggleVisibility()`. Hidden columns stay listed
  in the menu (it iterates `getAllLeafColumns`) so they can be restored. Gated by the existing
  **`enableHiding`** flag (on by default); the runtime settings sheet already exposes the same
  capability as **Show / hide columns** (unchanged).
- shadcn: two new pluggable icon slots — **`eye`** / **`eyeOff`** — added to every preset
  (`default`, `lucide`, `tabler`, `phosphor`, `remix`, `hugeicons`) and to `ICON_SLOTS`. MUI uses
  `@mui/icons-material` `Visibility` / `VisibilityOff`.
- No new flag (reuses `enableHiding`), so no settings-sheet or MCP-rules change. Tested in
  `mui.test.tsx` + `shadcn.test.tsx` (hide drops the column from the header; the toggle flips to
  Show); `icons.test.tsx` now covers the two new slots across all presets.

## [0.39.0] — 2026-08-17
### Added — Multi-filter (X11): stack filter types on one column
- `enableMultiFilter` lets a column **stack several filter types** in its filter row. A column opts in
  with an **array** `meta.filter` (e.g. `['condition', 'set']`), which renders those filters stacked;
  a row must satisfy **all** of them (**AND**). Closes X11 (parity now ✅ 9 / 🟡 4 / ❌ 15).
- Stored as a compound **`{ op: 'and', conditions }`** value the existing `bstCondition` filterFn
  understands — so it composes with the filter builder and server mode. New engine exports:
  **`combineFilterConditions`** + type **`FilterConditionGroup`**; `evalCondition` / `isConditionActive`
  now handle the group (AND/OR of the active slots; inactive slots don't restrict).
- `BstSetFilter` gained an optional controlled `value` / `onChange` so it can be one **slot** of a
  stacked filter (backward compatible — standalone mode unchanged). The condition input was extracted
  to a reusable `ConditionInput`. Needs `enableColumnFilters` + `enableColumnFilterRow` (a `'set'` part
  needs `enableSetFilter`); with `enableMultiFilter` off, an array `meta.filter` falls back to its first
  entry.
- Settings-sheet toggle ("Data operations"); demo shows it in a **dedicated "Multi-filter (X11)"
  section** (Name column stacks a "contains" input + a distinct-names checklist) so the main grids keep
  their single filters. Verified in a headless browser (popup opens correctly below the trigger). Tested
  in `multiFilter.test.tsx` (10 cases).

## [0.38.0] — 2026-08-17
### Changed — B5 in-cell PDF thumbnails now render via pdf.js (reliable)
- The native-`<iframe>` thumbnail (0.36.0–0.37.1) **did not paint** in Chrome — the browser won't
  render a PDF in a tiny frame, and its newer viewer ignores the chrome-hiding params. Replaced it
  with a **pdf.js**-rendered raster `<img>` (the tool `CLAUDE.md` §6 named for this all along), which
  renders page 1 reliably in every browser.
- The engine stays **dependency-free** — it never imports `pdf.js`. The app provides it (and owns its
  worker) and injects a renderer:
  - **`createPdfjsThumbnailer(pdfjs, opts?)`** — renders page 1 to a canvas → a cached PNG `data:` URL.
    Accepts the pdf.js module or a `() => import('pdfjs-dist')` loader (lazy). `opts`: `scale`, `cache`,
    `createCanvas`.
  - **`<BstPdfThumbnailerProvider renderer={…}>`** — supplies the renderer grid-wide (any adapter);
    `useBstPdfThumbnailer()` reads it.
  - `cellMeta.pdfThumbnail` now accepts `true` (use the provider's renderer) **or a
    `PdfThumbnailRenderer` function** (per-column). With no renderer, PDFs keep the file-type icon —
    nothing breaks.
- The full-size click **preview** (`BstFilePreview`) still uses the native `<iframe>` (with the
  `data:`→`blob:` fix from 0.37.1 — that path *does* work at full size).
- New engine exports: `BstPdfThumbnailerProvider`, `useBstPdfThumbnailer`, `createPdfjsThumbnailer` +
  types `PdfThumbnailRenderer`, `PdfThumbnailerOptions`. Demo wires pdf.js (`pdfjs-dist` devDep, Vite
  `?worker`) and shows real PDF thumbnails in the MUI + shadcn + headless grids. Tested:
  `pdfThumbnail.test.ts` (render flow, data: decode, cache, lazy load, failure) + `filePreview.test.tsx`.
- **Docs:** new step-by-step **"Files columns — images & PDFs"** guide (engine README) — how to
  configure a `files` column, the `FileRef` shape, the image path (zero setup) and the PDF path
  (install pdf.js → provider → `pdfThumbnail: true`), incl. worker setup per bundler. Both adapter
  READMEs get the adapter-specific quick setup.

## [0.37.1] — 2026-08-17
### Fixed — B5 PDF thumbnail/preview: render `data:` PDFs in Chrome
- Chrome & Edge refuse to render a `data:application/pdf` URL inside an `<iframe>` (data: gets an
  opaque origin and the built-in PDF viewer is blocked), so an in-cell **PDF thumbnail** — or the
  full **preview** — came up blank for offline/data-URL PDFs while images (which use `<img>`) rendered
  fine. The engine now converts a `data:` PDF URL to a same-document **`blob:` URL** (which Chrome
  renders reliably) for both the thumbnail and `BstFilePreview`; `http(s):` / `blob:` URLs pass
  through unchanged, and the blob is revoked on unmount. Tested in `filePreview.test.tsx`.
- Demo: the shared `files` column (People grid — MUI **and** shadcn adapters) now sets
  `cellMeta.pdfThumbnail: true`, and its demo PDFs are valid one-page docs (correct xref), so PDF
  thumbnails show in the main grids, not just the dedicated Files section.

## [0.37.0] — 2026-08-17
### Added — Grid-state save/restore (X21): per-user view snapshots
- New engine module: **`getGridState`** / **`applyGridState`** / **`resetGridState`** /
  **`emptyGridState`** snapshot and restore a grid's **view** — sort · filter · global filter · column
  order/size/visibility/pinning · grouping · expansion · row pinning · selection · pagination — as
  plain, version-stamped JSON (`BstGridState`). This is the X21 gap; it complements the settings
  sheet (which toggles *features*, not view layout).
- **`applyGridState` drops entries for columns that no longer exist**, so a saved view survives a
  column-set change instead of wedging the grid. `include` / `exclude` narrow which slices are
  captured/restored.
- Persistence: **`loadGridState`** / **`saveGridState`** / **`clearGridState`** (namespaced under
  `bst-table:state:<key>` in `localStorage`; any `storage` accepted) + the **`useBstGridState(table, {
  key })`** hook that auto-persists on change (debounced) and returns
  `{ getState, applyState, save, clear, reset, storageKey }`. Feed `loadGridState(key)` into
  `useBstTable({ initialState })` for a flash-free restore.
- **Adapters:** one-line **`gridState={{ key }}`** on `<BstTableMui>` / `<BstTableShadcn>` seeds
  `initialState` from storage **and** persists changes — via a null-rendering child, so grids that
  don't use it pay nothing.
- v9 detail: v9 removed `table.getState()`; this reads `table.store.state` and restores through the
  per-slice setters. New demo section "Grid state — save / restore view"; tested in
  `gridState.test.tsx` (12 cases). Closes **X21** in `COVERAGE.md` (parity now ✅ 8 / 🟡 4 / ❌ 16).

### Fixed — MCP corpus: stale "PDF thumbnails not built" claim
- Removed the `NOT_BUILT` rule for in-cell PDF thumbnails (`packages/mcp/src/rules.ts`) — they shipped
  in v0.36.0 (`cellMeta.pdfThumbnail`), so the MCP server no longer tells agents the feature is missing.

## [0.36.0] — 2026-08-17
### Added — Files: in-cell PDF thumbnail (`cellMeta.pdfThumbnail`) — completes B5
- The **`files`** read cell now renders a **PDF as an in-cell page-1 thumbnail** when a column sets
  **`cellMeta.pdfThumbnail: true`** — drawn by the browser's **native PDF viewer** in a clipped
  `<iframe>`, **dependency-free (no `pdf.js`)**. Previously a PDF only showed a generic file-type icon
  while images already showed an `<img>` thumbnail; this brings PDFs to parity.
- The thumbnail frame is `pointer-events:none` (a click still opens the full-screen `BstFilePreview`),
  `loading="lazy"` (offscreen rows don't fetch), and keeps the PDF icon behind it as a fallback for
  browsers that can't inline-render.
- A **server-generated raster** in `thumbnailUrl` still wins — it renders as a plain `<img>`, so
  backends that pre-generate crisp thumbnails are unaffected.
- **Opt-in per column** (default `false`), so grids with many PDFs don't pay for N live renders unless
  asked. Both the **MUI** and **shadcn** skins inherit it (read renderer lives in the engine). New demo
  section "Files & attachments"; tested in `filePreview.test.tsx`.
- Closes the **last B5 gap** in `COVERAGE.md` — the original 58-leaf spec is now **55 ✅ / 2 🟡 / 1 ❌**
  (only I5 live/WebSocket updates remains missing).

### Changed — Smart header: toolbar declutter + responsive overflow (Phases 1–2)
- **Add row moved out of the toolbar to a footer bar** under the table (both skins) — it's a data
  action, so it now sits with the rows, not the view controls.
- **Responsive toolbar** — the action buttons (**Filters · Export · Undo/Redo · Formats · Density**)
  are **shown inline when there's room and collapse into a single "⋯ More" menu** (lowest priority
  first) only as the width shrinks, promoting back as it widens. Driven by a `ResizeObserver` + the
  pure, priority-ranked **`partitionToolbar`** (new engine exports `partitionToolbar` /
  `useToolbarOverflow`), so the header fits any width — leaner when tight, nothing needlessly hidden
  when wide. Menu chrome: MUI `Menu` / shadcn Radix `DropdownMenu`.

### Added — In-UI keyboard-shortcuts overlay (`showShortcuts`)
- A toolbar **"?" button** + a dependency-free, theme-aware **overlay** that lists the keyboard
  shortcuts **active on this grid** — grouped (Navigate · Edit · Clipboard · History), searchable,
  platform-aware (⌘ vs Ctrl). Also opens on the **`?`** key. The list is filtered to what's actually
  wired: `enableCellSelection` / `enableClipboard` / `enableEditing` / `enableUndoRedo` /
  `enableCopyColumn` / `enableCopyRow`.
- New engine exports: **`BstShortcuts`** (component), **`BST_SHORTCUTS_REGISTRY`**,
  **`resolveActiveShortcuts(flags, query)`**, **`formatShortcutToken`**. The registry mirrors the real
  `onKeyDown` handler and is guarded by `shortcuts.test.tsx`.
- Both skins add the `showShortcuts` toolbar button (off by default, opt-in). `@bloomskill/table-mui` +
  `@bloomskill/table-shadcn`.
- **Mac-aware:** keys auto-detect (⌘/⇧ on Mac); `showShortcuts={{ platform: 'mac' | 'pc' | 'auto' }}`
  forces it when detection is unreliable, and the `⌘Y` redo-alt (a Windows convention) is hidden on Mac.

### Added — Context menu (Phase 6, X6)
- **`enableContextMenu`** — a dependency-free **right-click menu** at the cursor. Default items: Copy /
  Copy row / Copy column (with `enableClipboard`), Export CSV / Excel (with `enableExport`), Autosize
  column. Reshape or extend via **`getContextMenuItems(ctx) => BstContextMenuItem[]`** (spread
  `ctx.defaultItems`, add your own). Event-delegated on the scroll box (`data-bst-rowid` / `-colid`);
  right-click selects the cell. Settings-sheet toggle ("Selection & clipboard"). Tested
  (`contextMenu.test.tsx`). Closes COVERAGE `X6`. `@bloomskill/table-engine` (both adapters inherit it).
### Added — Settings sheet: section dividers + dependency cascade
- **Section dividers** — a hairline rule now separates each settings group (both skins), so
  "Data operations / Columns / Rows / …" read as distinct sections (paired with the prominent
  uppercase section headings).
- **Dependency cascade** — a toggle whose prerequisite is off now renders **disabled** (dimmed,
  non-interactive) and shows "Needs \<parent\>": CSV / Excel / Print disable when **Export** is off;
  Copy column / row when **Copy & paste** is off; the per-column filter row + Set filter when
  **Column filters** is off; Batch editing + Validation when **Inline editing** is off; Column
  virtualization when **Row virtualization** is off; the filter / format builders behind their
  engines. Resolution is **transitive** and reverses — turning the parent back on re-enables the
  dependents. Backed by a new `requires` edge on the settings registry (mirrors the flag graph in
  `packages/mcp/src/rules.ts`) and a new pure export **`isSettingActive(key, props)`**.
- **Dependency tree connectors** — where a parent and its dependents share a section, the sheet now
  draws a **dotted branch connector** (Bitbucket-commit-graph style) from the parent down into each
  child, so the grouping reads at a glance (Export → CSV / Excel / Print; Inline editing → Batch
  editing / Validation; Copy & paste → Copy column / row; Row virtualization → Column virtualization;
  Conditional formatting → Format builder). Cross-section prerequisites stay text-only. The model
  exposes `parentKey` / `lastChild` on each `BstSettingsItem`; adapters render the branch (MUI dotted
  pseudo-elements, shadcn `.sc-dep-child` / `.sc-dep-last`).

## [0.35.0] — 2026-08-17
### Added — Auto row height (Phase 8, X26)
- **`enableAutoRowHeight`** — body cells wrap and each row grows to fit its content, **browser-measured
  (no JS)**. Opt individual columns in with **`meta.wrapText`**. Keeps `overflow: hidden`, so a
  manually-resized row (`enableRowResize`) still clips to its set height while auto rows grow.
  Settings-sheet toggle ("Rows", always shown). Tested (`autoRowHeight.test.tsx`). Closes COVERAGE
  `X26`. `@bloomskill/table-engine` (both adapters inherit it).
### Added — Set Filter + status bar (Phase 6, X4–X5)
- **Set Filter (`enableSetFilter`, X4)** — an Excel-style **checklist of distinct values** per column
  in the filter row (`BstSetFilter`: search · select-all / clear · per-value counts · a "(Blanks)"
  bucket). A new `{ op: 'set' }` condition on the existing `bstCondition` filterFn, so it composes with
  the filter builder; multi-value cells match on any element; selecting every value clears the filter,
  an empty selection matches nothing. Categorical columns (`singleSelect`/`multiSelect`/`radio`/
  `boolean`) are auto-eligible; `meta.filter: 'set' | 'condition'` forces or opts out. Needs
  `enableColumnFilters` + `enableColumnFilterRow`. Exported `BstSetFilter`. `@bloomskill/table-engine`.
- **Status bar (`showStatusBar`, X5)** — an adapter footer with total / filtered row counts and, when
  a cell range is selected, the **sum · avg · min · max · count** of its numeric cells via new
  **`runtime.getSelectionStats()`** (exported `BstSelectionStats`). MUI + shadcn.
- Both are settings-sheet toggles (`enableSetFilter` → "Data operations", `showStatusBar` → "Display").
  Tested (`setFilter.test.tsx`, `selectionStats.test.ts`). Closes COVERAGE `X4`–`X5`; see `Plan.md`
  PART 3 "Phase 6".
### Fixed — engine
- Set Filter popover no longer inherits the header cell's centred / bold typography — the panel owns
  its own text layout, so each value's label is left-aligned immediately beside its checkbox.
### Added — Settings sheet: search box + highlighted header
- The runtime settings sheet (`showSettings`) now renders a **highlighted header band**, **prominent
  uppercase section headings** (Data operations, Columns, …), and — because the sheet can list 30+
  toggles — a **search box** that filters the list by **label / hint / group name**. Search is on by
  default (appears once the sheet has more than a handful of items); hide it with
  `showSettings={{ search: false }}`, force it with `search: true`.
- New pure, headless helpers on `@bloomskill/table-engine`, shared by both adapters:
  **`filterSettingsGroups(groups, query)`** and **`shouldShowSettingsSearch(search, itemCount)`**.
- Both skins updated: MUI (Drawer — `primary` header bar + `TextField` search) and shadcn
  (`.sc-sheet-header` soft muted-accent band + `.sc-sheet-search` input); each shows a "No settings
  match …" empty state and clears the query when the sheet closes.

> Builds on the **0.34.0** Export slice documented below; shipped together in this publish.

## [0.34.0] — 2026-08-17
### Added — Export: CSV / Excel / print (Phase 5, X1–X3)
- **`enableExport`** (`boolean | BstExportOptions`) adds a toolbar **Export** menu (`showExport`) and
  the runtime API `runtime.exportCsv()` / `exportExcel()` / `printTable()`. Values are formatted
  **per cell type** (the file matches the grid and copy output); the default scope is **every filtered
  + sorted row across all pages** (pre-pagination), configurable to the current page via
  `scope: 'page'`. `@bloomskill/table-engine`.
- **Dependency-free** serializers, all exported: `toCsv` (RFC-4180 + UTF-8 BOM), `toXlsx` (a real
  `.xlsx` — a hand-built store-only ZIP + SpreadsheetML with typed numeric cells, **no `exceljs` /
  `sheetjs`**), `buildPrintHtml`, plus `downloadBlob` / `printHtml` DOM glue (both SSR-safe no-ops).
- Per-format sub-toggles **`enableCsvExport` / `enableExcelExport` / `enablePrint`** (default on) gate
  each menu item and `runtime.export*` method, and are **settings-sheet switches** (new "Export"
  group, always shown) so an end-user can switch export on and choose formats themselves.
- Adapters render the menu — MUI `Menu`, shadcn Radix `DropdownMenu` (`@bloomskill/table-mui`,
  `@bloomskill/table-shadcn`). Action columns and grouped / aggregate rows are skipped automatically.
- Tested (`export.test.ts`: CSV escaping/BOM/scope, `.xlsx` ZIP + OOXML structure, print HTML,
  per-format gating). Closes COVERAGE `X1`–`X3`; see `Plan.md` PART 3 "Phase 5".

### Changed — `@bloomskill/table-engine`
- **Row resize (G2) is now always shown in the settings sheet** (`enableRowResize`, "Rows" group,
  `alwaysShow: true`). Like row/column virtualization, an end-user can switch row resizing on from
  the ⚙ settings sheet without any developer wiring — previously the toggle only appeared once a
  developer had already enabled it in code, so it looked missing. Also wired into the demo
  (`apps/demo`) so the behaviour is visible live.

### Fixed — `@bloomskill/table-mcp` (stale coverage in tool docs / validator)
- `bst_get_feature`'s description and examples no longer claim **D1 row/column virtualization** is
  "NOT implemented" — it (and A2 infinite scroll) shipped in 0.33.0. The not-built example now cites
  **I5** (live/WebSocket merge), the one standing ❌ leaf.
- `bst_validate_config` no longer flags **`uploadFile`/`deleteFile`** as not-built — the formal
  `DataSource` file verbs (I3) shipped, so the stale `NOT_BUILT` rule is removed.
- The **PDF** `NOT_BUILT` rule is narrowed to *thumbnails* only (the in-cell pdf.js render, still
  deferred); PDF **preview** is built (`BstFilePreview`), so "pdf preview" is no longer refused.
- Stale `enableVirtualization`-as-not-built examples in `validate.ts` comments swapped for genuine
  gaps (`onWebSocketUpdate` / I5).

## [0.33.1] — 2026-08-13
### Fixed — coordinate-space refactor (Tier 2; `@bloomskill/table-engine`)
- Cell selection / keyboard nav / paste now build their coordinate space from the **painted**
  body-row order (top → center → bottom under row pinning) and skip grouped / aggregated / phantom
  rows via a single `isDataRow` guard consulted by `isCellEditable`, `moveActive` and the paste loop.
  Fixes: Enter on a group header no longer kills the keyboard; arrow-nav and multi-row paste no
  longer write into the wrong records with rows pinned; navigating onto a group row no longer loses
  the active cell or empties the clipboard; a paste crossing a group boundary no longer fires a
  no-op `onDataChange` + undo entry. (Audit defects #3 / #9 / #21 / #22 / #23.) Tested
  (`tier2CoordSpace.test.tsx`).

### Docs & packaging
- Corrected the **virtualization (D1)** status across the root + engine READMEs — it shipped in
  0.33.0, so the "🟡 not yet released" banner and the "Not built yet" entry are gone (the genuine
  remaining gaps are I5 live merge, I4 backend write-back, and the B5 in-cell PDF thumbnail).
- Engine README documents **`@tanstack/react-virtual`** as a bundled dependency (it was still
  claiming "only `@tanstack/react-table`").
- Added **`keywords`** to `@bloomskill/table-engine` / `-mui` / `-shadcn` `package.json` (were empty;
  `-mcp` already had them).

## [0.33.0] — 2026-08-13
### Added — DataSource file verbs (I3, formal): `uploadFile` / `deleteFile` / `getFileUrl`
- The **`DataSource` contract** (`@bloomskill/table-engine`) gains three optional file verbs
  (Plan.md §2.2) so file storage can move server-side: **`uploadFile(file, ctx?)`** → a stored
  **`BstFileRef`**, **`deleteFile(ref, ctx?)`**, and **`getFileUrl(ref, ctx?)`** → a fresh
  short-lived view URL (so B5 thumbnails never embed a permanent URL in row data).
  **`createFileHandlers(source, ctx?)`** bridges them to a `files` cell's `cellMeta.onUpload` /
  `onDelete`, so ONE server contract drives both the grid query and file storage; a source without
  the verbs yields no handlers (the cell keeps its local object-URL preview fallback). New exports:
  `createFileHandlers`, types `BstFileRef`, `DataSourceFileContext`, `BstFileCellHandlers`. Tested
  (`dataSourceFiles.test.ts`). Completes I3 alongside the cell-level upload/delete below.

### Added — File preview + configurable upload/delete (B5/I3)
- **Click-to-preview for the `files` cell** (`@bloomskill/table-engine`) — clicking a file opens a
  **dependency-free preview overlay** (`BstFilePreview`, exported): **images** render inline, **PDFs
  open in the browser's native viewer** (`<iframe>` — no `pdf.js`), anything else offers an
  open/download link. Closes on Escape / backdrop click. Opt out per column with `cellMeta.preview:
  false` (a file needs a `url` to preview).
- **Configurable upload / delete in the adapters' file editor** (`@bloomskill/table-mui` +
  `@bloomskill/table-shadcn`) — `cellMeta.onUpload(file) => FileRef | Promise<FileRef>` uploads each
  picked file (busy state shown; errors surfaced) and `cellMeta.onDelete(file) => void |
  Promise<void>` runs before removal, so real backends wire in with two callbacks. Without `onUpload`
  the editor keeps a **local object URL** so preview still works offline; `cellMeta.accept` /
  `multiple` tune the picker, and file names in the editor are click-to-preview too. New
  `filePreview.test.tsx`; demo's Files column gains previewable docs + mock upload/delete. Both skins
  reach parity (shadcn's dep-free modal + MUI's Dialog).

### Added — ERP field formats: `cellMeta.pattern` (Aadhaar / PAN / GSTIN / IFSC / …) (B1/B2)
- **`cellMeta.pattern`** (`@bloomskill/table-engine`) — a Frappe-style **field-format preset** on a
  plain `text` or `number` cell that brings its own **validation + input mask + normalizer**, so the
  identity / finance fields an ERP form needs validate and display consistently without a
  hand-written `meta.validate` per column. Built-ins: **`aadhaar`** (12-digit, real **Verhoeff**
  checksum, masked `#### #### ####`) · **`pan`** · **`gstin`** (15-char, **mod-36** checksum) · `tan`
  · `ifsc` · `email` · `phone` (India mobile) · `pincode` · `url` · `upi` · **`passport`** ·
  **`iec`** · **`esic`** (17-digit) · **`pf`** (12-digit UAN) · **`iban`** (**mod-97** checksum,
  grouped) · **`swift`** (BIC) · **`creditCard`** (**Luhn**, grouped). `pattern` accepts a built-in
  **name**, a **`RegExp`** (+ `cellMeta.patternMessage`), or a custom **`FieldFormat`** object;
  register reusable ones with **`defineFieldFormat`** / by adding to **`FIELD_FORMATS`**. The editor
  normalizes as you type (Aadhaar → digits only, PAN → upper-case) and the read cell shows the mask
  (bypassing numeric grouping for an id). New exports: `FIELD_FORMATS`, `resolveFieldFormat`,
  `defineFieldFormat`, and standalone validators `verhoeffValid` / `verhoeffChecksum` /
  `isValidAadhaar` / `isValidPan` / `isValidGstin` / `gstinCheckDigit` / `isValidIfsc` /
  `isValidPassport` / `isValidIec` / `isValidEsic` / `isValidUan` / `isValidSwift` / `isValidIban` /
  `luhnValid`; types `FieldFormat`, `FieldPattern`. **Opt-in + backward compatible** (a cell without
  `pattern` is unchanged) and inherited by both adapters. New `formats.test.tsx` (checksums + grid
  integration); demo's **ERP field formats** KYC section covers all presets; new runnable
  **`examples/field-formats`** (Vite + StackBlitz) demonstrates a KYC grid end-to-end.

### Added — Row & column virtualization (D1) + infinite scroll (A2)
- **`enableVirtualization`** (`@bloomskill/table-engine`, `boolean | { overscan, estimateRowSize, estimateColumnSize }`)
  — row virtualization on **`@tanstack/react-virtual`**: paints only the rows in the scroll viewport
  (plus overscan) with **dynamic row measurement** (composes with row-resize / variable content), a
  **sticky header**, spacer rows, and a bounded scroll-box height (applied by default; override via
  `styles.root`). A 20k×42 grid stays at 60fps with a few dozen rows in the DOM. **Yields** (renders
  un-windowed, one-time dev warning) when master-detail, grouping, cell spanning or row pinning is on
  (`virtualizationBypassReason`).
- **`enableColumnVirtualization`** — sub-toggle (needs `enableVirtualization`) that also windows
  columns horizontally for very wide grids, keeping header / filter row / body aligned via spacer
  cells. Falls back to all-columns under column pinning, `fitColumns`, grouped headers or cell spanning.
- **`useBstInfiniteDataSource(source, { pageSize })`** + **`<BstTable onReachEnd>`** (A2) —
  fetch-on-scroll **append** over a server `DataSource`: accumulates windows, resets on sort/filter
  change, exposes `fetchNextPage` / `hasNextPage` / `isFetchingNextPage` / `rows` / `totalCount` +
  `tableProps` (manual mode). Pair with `enableVirtualization` + `pagination={false}`.
- Both toggles are **settings-sheet** entries (new "Performance" group, **always shown** so an
  end-user can switch virtualization on for a large grid without developer wiring), flow through both
  adapters unchanged, and carry `rules.ts` dependency rules; `bst_validate_config` accepts them. New exports:
  `resolveVirtualization`, `virtualizationBypassReason`, `useBstInfiniteDataSource` (+ types). Tests:
  `virtualization.test.tsx` (12) + `infiniteDataSource.test.tsx` (6). Demo adds **Virtualization**
  (20k×42) and **Infinite scroll** sections. Closes A2; COVERAGE tally now 53 ✅ · 4 🟡 · 1 ❌.

### Fixed — `bst_validate_config` robustness (5 verified bugs)
A review found the validator's lexical matching produced false positives, a false "all clear", and
a stale version check. All fixed with regression tests:

- **String values no longer trip the not-built / prop detection** — a new single-pass `scrub()`
  strips comments and string *values* (keeping keys), so a column literally named `liveUpdatedAt` or
  `header: "PDF preview"` no longer emits a bogus I5/B5 error, and a `//`-commented prop is ignored.
- **JSON passed as `code` is read correctly** — the value regexes tolerate a quoted key, so
  `{ "enableGlobalFilter": false }` is detected the same as the JS-literal form.
- **Batch editing without `onSave` is caught** — whether requested via `enableBatchEditing` **or**
  inline as `enableEditing={{ mode: 'batch' }}` (the mode is read before scrubbing).
- **A not-built prop yields one useful error**, not the redundant "unknown option" + "not built" pair.
- **`bst_detect_version`** now honours `>=`, `>`, `<=`, `<` and `x`-ranges (`0.32.x`), so a project
  on `>=0.32.0` is no longer falsely warned as a version mismatch.
- **Docs** — the README Quick-Start example + the "doesn't exist" bullets use `enableLiveUpdates`
  (I5, genuinely unbuilt) now that `enableVirtualization` is real; the loose "`showSearch` without
  `enableGlobalFilter`" phrasing is corrected (search is on by default).

### Docs — `@bloomskill/table-mcp` README rewritten for first-time users; root README documents MCP support
The npm page still carried a "⚠️ Not on npm yet — `npx` fails with 404" banner after the package
went live at 0.32.4, and pointed at `docs/mcp-server.md`, which is not in the published tarball.

- **`packages/mcp/README.md`** — replaced the banner with a real **Quick start**: per-client
  registration (Claude Code · Cursor · Claude Desktop · VS Code/Copilot, in collapsible blocks),
  how to verify the server connected, and a first prompt to type. Added the 17 cell-type names, a
  **troubleshooting table** (PATH/nvm, restart-required, version mismatch, offline registry), and
  the version-parity rule (`table-mcp@X` documents `table-*@X`). Removed all links to files that
  are not in the published package.
- **`README.md`** — new **"AI coding agents (MCP)"** section (registration command, per-client
  pointer, why it's trustworthy: generated-from-source, self-contained). Corrected "three packages"
  → four in the intro, build command, versioning and release notes; portability note now mentions
  the no-repo MCP boot check. Dropped the broken `docs/mcp-server.md` link.

### Fixed — adoption-audit correctness pass (14 defects; `@bloomskill/table-engine` + `@bloomskill/table-shadcn`)
Defects reproduced against a live 9,568-row register and re-verified against source; each fix ships
with a regression test (`packages/*/src/__tests__/tier*.test.tsx`). Full tracker in `AUDIT_FIXES.md`.

- **Sorting (`table-engine`)** — the `text` sort fn is now registered, so plain-string columns
  (which v9 auto-resolves to `text`) no longer fall back to an inconsistent comparator that left
  null-containing columns unsorted.
- **Filtering (`table-engine`)** — empty cells (`null` / `''` / whitespace / `[]`) no longer coerce
  to `0` (the Unix epoch) and silently match `before` / `<` / `<=` or zero-spanning ranges; date
  `equals` / `between` now compare by **local calendar day** (an "on <day>" filter matched no
  ISO-timestamp cell before, returning zero rows); a half-filled `between` now filters on the one
  bound present (open-ended) instead of building a `<= NaN` predicate that emptied the grid to
  "No rows".
- **Editing — `saveOn` honored (`table-engine`)** — the inline editor now consults the resolved
  `saveOn`, so `saveOn: 'explicit'` actually suppresses the blur/Enter auto-commit (it was resolved
  and documented but never read). `runtime.saveOn` is now exposed.
- **Editing — row-edit Cancel discards drafts (`table-engine`)** — cancelling a row-edit session now
  clears its drafts, so a subsequent Save no longer persists the value the user cancelled.
- **Editing — paste clears the stale draft (`table-engine`)** — `pasteFromText` now clears any
  pre-existing draft on the target cell (as `commitCell` does), so the pasted value is no longer
  shadowed by a stale draft and the unsaved-changes counter no longer sticks.
- **Keyboard trap fixed (`table-engine`)** — the table-level key handler now ignores events that
  originate in the grid's own form controls (column-filter inputs, `<select>`, an open editor), so
  Arrow / Home / End / Tab / Ctrl+A / Enter and Ctrl+C/V reach those inputs natively (WCAG 2.1.2).
- **Sortable headers keyboard-operable (`table-engine`)** — `role="button"` sort headers now toggle
  on **Enter / Space**, not only click (WCAG 2.1.1).
- **Cell spanning (`table-engine`)** — the explicit-span planner now pre-scans its footprint and
  refuses a span that would swallow a group-merge origin, so rows no longer render one `<td>` short
  with values shifted under the wrong headers.
- **Settings-sheet focus trap (`table-shadcn`)** — the settings and review-changes slide-overs
  (`role="dialog" aria-modal`) now move focus into the sheet on open, cycle Tab within it, and
  restore focus to the opener on close (MUI's `Drawer` already did this natively).
- **Columns-menu escape hatch (`table-shadcn`)** — the Columns menu now stays available whenever
  column pinning, ordering or grouping is on (not only when hiding is on), so turning hiding off no
  longer strands an already-pinned/grouped grid with no UI to undo it.

## [0.32.4] — 2026-08-13
### Added — `@bloomskill/table-mcp`: an MCP server for AI coding agents (new package)
A fourth package, published alongside the other three and versioned in lockstep with them.
No language model has seen Bst-Table, so an agent asked to build one of these grids emits some
other grid library's code instead. This server gives any MCP client (Claude Code, Cursor, Copilot)
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
- **Two hard parity guards + one soft freshness check**, in the spirit of the engine's compile-time
  settings-sheet check: corpus generation fails the build if an engine toggle has no §12 row;
  `rules.test.ts` fails if a toggle has no flag-dependency entry; and a freshness check **warns**
  (not fails) when an indexed source's mtime is newer than the corpus's `generatedAt` (a full ISO
  timestamp), so editing docs doesn't break `npm test` while still surfacing a stale corpus. A new
  feature cannot slip past the validator.
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
