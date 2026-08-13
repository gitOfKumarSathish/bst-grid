# Bst-Table — one headless grid engine + two swappable skins

A React data grid built on **TanStack Table v9**, packaged as four real npm packages:
**one headless engine**, **two style adapters** (MUI and shadcn/Radix) that render the identical
grid from the same data and columns, and an **MCP server** so AI coding agents know the API.

**MIT/Apache dependencies only** — no per-seat licence, and no Enterprise paywall on
master-detail, range selection or clipboard.

| Package | What it is |
| --- | --- |
| [`@bloomskill/table-engine`](packages/engine) | Headless engine — TanStack v9 wiring, the cell-type registry, editing/validation/selection/clipboard, a neutral `<BstTable>` body, CSS-var tokens. No UI library inside. |
| [`@bloomskill/table-mui`](packages/mui) | Material UI skin — toolbar, menus, pagination, MUI editors, theme mapping. |
| [`@bloomskill/table-shadcn`](packages/shadcn) | shadcn / Radix skin — inherits your design tokens and icon library, ships its own CSS (no Tailwind build needed). |
| [`@bloomskill/table-mcp`](packages/mcp) | MCP server — gives AI coding agents (Claude Code, Cursor, Copilot) accurate knowledge of this library: docs search, the feature registry, config validation and grid scaffolding. |

Full per-package docs live in each package README. Start with the
**[engine README](packages/engine/README.md)** — it documents every option, cell type and feature.

## What it does

Every capability is a **per-instance toggle** in one of two layers: `enable*` = engine
behaviour, `show*` = adapter chrome. Data features default **on**; heavy features default **off**.

- **Data operations** — sorting · global search · column filters (operator-aware) + filter-builder UI ·
  pagination · multi-column grouping with aggregates.
- **Columns** — show/hide · resize · double-click auto-size · pinning · reordering (menu + drag) ·
  fit-to-viewport · responsive priority hiding.
- **Rows** — row selection · add/delete/duplicate · master-detail panels · row pinning · row resize.
- **Editing** — inline cell / row / **batch** modes, sync · async · cross-column validation,
  undo/redo, and a single batched `onSave` per save action.
- **Selection & clipboard** — cell/range selection, Excel-like keyboard navigation, copy/paste (TSV),
  whole-column and whole-row copy.
- **Cells** — 17 built-in cell types incl. select/multi-select/radio, files, hyperlink, **sparkline**,
  **KPI**, **QR**, **barcode**, **rich text**, action buttons and an action overflow menu — all
  dependency-free inline SVG, extensible via a cell-type registry.
- **Styling** — conditional formatting rules (+ a runtime rule builder), per-slot `classNames`/`styles`,
  per-column CSS, injectable icons, density.
- **Scale** — a `DataSource` contract (`useBstDataSource`) puts sort/filter/paginate on the server, so
  the same grid runs client-side or against millions of rows.
- **Runtime settings sheet** — end-users flip a grid's features on/off themselves (persisted per table).

See [`COVERAGE.md`](COVERAGE.md) for the requirement-by-requirement status matrix, and
[`CLAUDE.md`](CLAUDE.md) §12 for the full feature-toggle registry.

## AI coding agents (MCP)

No model was trained on this library, so an agent asked for "a Bst-Table grid with batch editing"
writes **AG Grid** or **MUI X DataGrid** code — the APIs this project exists to replace.
[`@bloomskill/table-mcp`](packages/mcp) closes that gap: an MCP server carrying searchable docs, the
61-flag toggle registry, all 17 cell types, 150 API signatures, plus grid **scaffolding** and config
**validation**. Register it once, at user scope so it covers every project on the machine:

```bash
claude mcp add bst-table -s user -- npx -y @bloomskill/table-mcp
```

For Cursor, VS Code/Copilot and Claude Desktop (each wants a slightly different JSON shape), see the
[MCP README](packages/mcp/README.md#quick-start). Then just ask for what you want — the agent picks
the tools up on its own:

> Build me a Bst-Table grid of orders with inline editing, a status dropdown and copy/paste.

The component it returns **compiles**, with every flag dependency already satisfied. It also knows
what *doesn't* exist here (`enableVirtualization` is not a flag) and which combinations fail
silently (`showSearch` does nothing without `enableGlobalFilter`).

Two properties make it trustworthy: the knowledge base is **generated from this repo at build
time** — the §12 registry, `COVERAGE.md`, TSDoc, the built `.d.ts`, every README and example — so it
cannot drift from the code; and it is **self-contained** (no network, no API key), working in any
project, including ones that don't have `@bloomskill/table-*` installed. Its version matches the
library it documents.

## Structure

```text
bst-table/
├─ packages/
│  ├─ engine/     @bloomskill/table-engine   — headless TanStack v9 wiring + neutral <BstTable> + CSS-var tokens
│  ├─ mui/        @bloomskill/table-mui      — Material UI toolbar/menu/pagination chrome + editors
│  ├─ shadcn/     @bloomskill/table-shadcn   — Radix primitives + shadcn-style CSS chrome + editors
│  └─ mcp/        @bloomskill/table-mcp      — MCP server for AI agents; corpus generated from this repo at build time
├─ apps/
│  └─ demo/       @bloomskill/demo           — Vite app rendering BOTH skins over the same data
├─ examples/                                 — six standalone runnable apps (also open in StackBlitz)
├─ docs/                                     — long-form guides (settings sheet)
└─ scripts/
   ├─ consumer-template/                     — a foreign app used by the portability check
   └─ pack-and-verify.sh                     — packs tarballs → installs externally → build + test
```

## Prerequisites

Node 20+ (developed on Node 24 via nvm) and npm 10+. If you use nvm:

```bash
nvm use 24 || nvm install 24
```

## Commands

```bash
npm install            # install workspace deps
npm run build          # build all four packages (tsc → dist)
npm test               # engine unit + adapter integration tests (Vitest/jsdom)
npm run demo           # start the Vite demo (both skins) at http://localhost:5173
npm run verify:portability   # pack tarballs, install into a fresh external app, build + test
npm run mcp            # MCP server gate: stdio smoke test + scaffolded-output typecheck
```

The suite is **35 test files / ~245 tests** (32 engine · 1 MUI · 2 shadcn) covering every
feature area — editing, validation, selection, clipboard, spanning, grouping, DataSource,
settings, styling and the adapters' chrome.

## Using the packages (consumer view)

```tsx
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { BstTableMui } from '@bloomskill/table-mui'
// import { BstTableShadcn } from '@bloomskill/table-shadcn'   // ← same props, different skin
import type { BstTableColumn } from '@bloomskill/table-engine'
import '@bloomskill/table-engine/styles.css'
// import '@bloomskill/table-shadcn/styles.css'               // ← only for the shadcn skin

type Row = { id: string; name: string; age: number }
const columns: BstTableColumn<Row>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name', sortFn: 'alphanumeric' },
  { id: 'age', accessorKey: 'age', header: 'Age', sortFn: 'basic' },
]

;<ThemeProvider theme={createTheme()}>
  <BstTableMui data={rows} columns={columns} getRowId={(r) => r.id} pagination={{ pageSize: 10 }} />
</ThemeProvider>
```

Swap `BstTableMui` → `BstTableShadcn` (and the CSS import) to change the entire look
with no other change.

### Runnable examples

Six self-contained apps in [`examples/`](examples) import the **published** packages from npm —
`quick-start` · `editing` · `cell-types` · `conditional-formatting` · `cell-spanning` · `server-mode`.
Open one in StackBlitz from the [engine README](packages/engine/README.md#live-examples), or:

```bash
cd examples/quick-start && npm install && npm run dev
```

## Releasing & versioning

The four packages are versioned **in lockstep** from a single source of truth,
[`version.ini`](version.ini). Don't hand-edit versions in `package.json` — use the scripts,
which bump `version.ini`, sync all four `package.json`s (version + the adapters' internal
`@bloomskill/table-engine` range), and run `npm install`. The MCP server rides the same version
because its corpus documents exactly the release it ships with.

```bash
# 1. bump — preview first with:  node scripts/bump-version.mjs <level> --dry
npm run version:patch    # bug fix / docs     0.1.1 → 0.1.2
npm run version:minor    # new feature        0.1.1 → 0.2.0
npm run version:major    # breaking change    0.1.1 → 1.0.0

# 2. record it (see CLAUDE.md §13): update CHANGELOG.md + the affected README(s)

# 3. publish all four (engine first — adapters peer-depend on it)
npm run release
```

- **Source of truth:** `version.ini` → `[bloomskill-table] version = X.Y.Z`. Use `npm run version:*`,
  **not** `npm version` (which would touch only `package.json` and drift from `version.ini`).
- **Order matters:** bump *then* release. `release` publishes the current versions, so releasing
  without a bump fails with `cannot publish over <version>`.
- npm can't republish a version — every release needs a bump. Full Definition-of-Done
  (demo + README + CHANGELOG + §12 registry + version) is in `CLAUDE.md` §13; the running log is
  [`CHANGELOG.md`](CHANGELOG.md).

## Portability

`npm run verify:portability` packs the engine + adapter tarballs, installs them into a throwaway
project **outside** the workspace ([`scripts/consumer-template/`](scripts/consumer-template)), then
builds and runs tests there — proving the packages work as real npm dependencies, not just as
workspace links. It then packs `@bloomskill/table-mcp` and boots it with **no repo present**,
proving the corpus really is baked into the published tarball.

## How a new skin is added

Create `@bloomskill/<lib>` implementing the same tiny surface the MUI/shadcn adapters do:
call `useBstTable(...)`, render your toolbar/menus/pagination, and drop the engine's
`<BstTable table={table} />` for the body (theme it by setting `--bst-table-*` CSS vars).
No engine change required.

## Not built yet

**Virtualization** (D1 — row/column windowing on `@tanstack/react-virtual`, plus an `onReachEnd`
infinite-scroll hook) is **implemented and 🟡 in progress** (`enableVirtualization` +
`enableColumnVirtualization`) — wired into `BstTable`, yielding to master-detail / grouping / spanning /
row-pinning, not yet released. Still open: **live/WebSocket merge** (I5), PDF thumbnails (B5, needs
`pdf.js`), and file **upload/delete** DataSource verbs (I3). See [`COVERAGE.md`](COVERAGE.md) and
[`Plan.md`](Plan.md).

## License

MIT
