# Bst-Table — POC (engine + two skins + portability)

A working proof-of-concept for the Bst-Table architecture: **one headless engine**
on TanStack Table **v9**, with **two swappable style adapters** (MUI and
shadcn/Radix), packaged as real npm packages and **verified portable** into a
fresh external project.

This POC deliberately uses only **easy, out-of-the-box** features so the focus is
the architecture (engine ⇄ adapter split + portability), not feature depth.

## What it proves

- ✅ **Headless engine** (`@bloomskill/table-engine`) wraps TanStack v9 (`useTable` +
  `tableFeatures`) with OOTB features: **sorting, global search, pagination,
  column visibility, resizing** — no UI library inside.
- ✅ **Two skins, one engine, same data/columns**: `@bloomskill/table-mui` and `@bloomskill/table-shadcn`
  render the identical grid; switching adapters changes **no** engine or data code.
- ✅ **Portability**: packages are `npm pack`ed and installed into a throwaway
  project outside the workspace, where they build and pass runtime tests.

## Structure

```
bst-table/
├─ packages/
│  ├─ engine/     @bloomskill/table-engine   — headless TanStack v9 wiring + neutral <BstTable> + CSS-var tokens
│  ├─ mui/        @bloomskill/table-mui      — Material UI toolbar/menu/pagination chrome
│  └─ shadcn/     @bloomskill/table-shadcn   — Radix primitives + shadcn-style CSS chrome
├─ apps/
│  └─ demo/       @bloomskill/demo     — Vite app rendering BOTH skins over the same data
└─ scripts/
   ├─ consumer-template/        — a foreign app used by the portability check
   └─ pack-and-verify.sh        — packs tarballs → installs externally → build + test
```

## Prerequisites

Node 20+ (developed on Node 24 via nvm) and npm 10+. If you use nvm:

```bash
nvm use 24 || nvm install 24
```

## Commands

```bash
npm install            # install workspace deps
npm run build          # build all three packages (tsc → dist)
npm test               # engine unit + adapter integration tests (Vitest/jsdom)
npm run demo           # start the Vite demo (both skins) at http://localhost:5173
npm run verify:portability   # pack tarballs, install into a fresh external app, build + test
```

## Releasing & versioning

The three packages are versioned **in lockstep** from a single source of truth,
[`version.ini`](version.ini). Don't hand-edit versions in `package.json` — use the scripts,
which bump `version.ini`, sync all three `package.json`s (version + the adapters' internal
`@bloomskill/table-engine` range), and run `npm install`.

```bash
# 1. bump — preview first with:  node scripts/bump-version.mjs <level> --dry
npm run version:patch    # bug fix / docs     0.1.1 → 0.1.2
npm run version:minor    # new feature        0.1.1 → 0.2.0
npm run version:major    # breaking change    0.1.1 → 1.0.0

# 2. record it (see CLAUDE.md §13): update CHANGELOG.md + the affected README(s)

# 3. publish all three (engine first — adapters peer-depend on it)
npm run release
```

- **Source of truth:** `version.ini` → `[bloomskill-table] version = X.Y.Z`. Use `npm run version:*`,
  **not** `npm version` (which would touch only `package.json` and drift from `version.ini`).
- **Order matters:** bump *then* release. `release` publishes the current versions, so releasing
  without a bump fails with `cannot publish over <version>`.
- npm can't republish a version — every release needs a bump. Full Definition-of-Done
  (README + CHANGELOG + §12 registry + version) is in `CLAUDE.md` §13; the running log is [`CHANGELOG.md`](CHANGELOG.md).

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

## Verified in this POC

- `npm test` → **7/7** pass (engine sort; MUI + shadcn search/pagination; feature-toggle behaviour).
- `npm run verify:portability` → external consumer **installs + builds + tests 2/2**.
- `npm run build -w @bloomskill/demo` → Vite production bundle succeeds.

## How a new skin is added (later)

Create `@bloomskill/<lib>` implementing the same tiny surface the MUI/shadcn adapters do:
call `useBstTable(...)`, render your toolbar/menus/pagination, and drop the engine's
`<BstTable table={table} />` for the body (theme it by setting `--bst-table-*` CSS vars).
No engine change required.

## Not in scope yet (next, per Plan.md)

Editing, validation, cell/range selection + clipboard, virtualization, the
server-mode DataSource (1M rows), and the rich cell-type registry. This POC is the
Phase-1 engine spike + portability gate; features come next.
