# Bst-Table Docs — Status & Backlog

Single source of truth for **what is in the documentation site** (`apps/docs/`) and **what is still
missing**. Paste this into a new chat to resume without re-explaining. Branch: `main` (the docs work is merged; the old `docs/add-docusaurus-site` branch was deleted).

_Verified against the corpus + working tree on 2026-08-26. Everything below is committed + pushed._

---

## Numbers (verified against the corpus)

| Surface | Count | Documented |
| --- | --- | --- |
| **Corpus capabilities** | **90** | generated reference page each ✅ |
| ↳ `enable*` / `show*` toggle flags | **61** | page **+ prose guide each** ✅ (0 without a guide) |
| ↳ config props / cell-meta / notes | 29 | on the relevant feature / cell / API page |
| Cell types | **17** | page **+ prose guide + live demo + standalone screenshot each** ✅ (all 17 imaged) |
| ↳ cellMeta sub-options | 38 | on each cell page |
| Engine API exports | **263** | page each ✅ (fn · hooks · iface · type · const) |
| Spec-coverage leaves | **58** | coverage matrix ✅ |
| Prose guides (hand-written) | **88** | 62 flag guides + 9 group overviews + 17 cell-type guides |
| Generated pages | 90 | 72 feature + 18 cell + API + coverage |
| **Live Sandpack demos** | **~60** | a live demo on **every feature page** + 17 cells + showcase + dark |
| **Screenshots** | **59** | see breakdown below |

Coverage gate (`check-docs-coverage.mjs`) is **green** — every flag, cell and export is accounted for.
**82 of the 90** corpus entries carry a `since:` version (0.1.0 → 0.42.0), so pages show when each landed.

---

## DONE ✅

### Generated reference (Phase 1)
- 90-capability reference: 72 feature-flag pages (9 groups) · 18 cell-type pages · 263 API-export pages ·
  58-leaf coverage matrix — all generated from the MCP corpus + engine `.d.ts`.
- **Never hand-edit** the generated pages — edit the corpus source / the `guides/` partials and regenerate.
- Build-time gate fails CI if any flag / cell / export is undocumented.

### Human quality layer (Phase 2)
- **A prose guide for every one of the 61 toggle flags** (`## Guide` → when to use / how it works /
  gotchas), dependency-accurate from the corpus rules. In `apps/docs/guides/<group>/<flag>.mdx`, injected
  into the generated pages (survives regeneration). Cross-checked: **0 toggles without a guide.**
- Per-group overview prose on all 9 group index pages.

### Authored pages (Phase 3)
- **Getting Started**, **Styling & Theming**, **AI Agents & MCP**, **Migration** (vendor-neutral).

### Live interactive demos (Sandpack)
- `<BstSandbox>` renders editable grids from the published packages: a live demo on **every feature page**
  + all 17 cell types + a cell-type showcase + dark mode. Chrome trimmed (`showOpenInCodeSandbox` off).

### Screenshots (59) — all headless-captured, each **labeled with an orange highlight** on the live feature
- **1** hero (Getting Started)
- **9** feature groups (each shows the feature active: menu open, cell editing, range selected, settings sheet…)
- **1** cell-types showcase + **1** dark mode
- **17** cell types — all of them, incl. `action` / `actionMenu`
- **30** distinct features — the 6 original (`conditional formatting, master-detail, grouping, filter builder,
  undo/redo, row actions`) **+ 24 more**: `column/row pinning, sticky header, row & cell/range selection,
  set/multi filter, per-column filter row, status bar, find, row numbers, pagination, density, auto row
  height, row resize, fit columns, context menu, settings sheet, export menu, format builder, shortcuts
  overlay, loading overlay, cell spanning, batch review`
- **All 59 are committed + pushed**; the build resolves every image ref (0 missing). Interaction/scroll
  shots (find, shortcuts, status bar, density, pinning, range selection) came from `apps/demo` (0.44.0,
  where those features render); the rest from the feature pages' Sandpack demos.

### Infrastructure
- Coverage gate wired; **`verify:naming` hardened** — the build fails on any third-party grid product name,
  its abbreviations, or licensing-tier ids. Positioning stays positive (MIT/Apache-only, no per-seat licensing).
- **`docs:sync` wired into `version:patch|minor|major`** — docs regenerate + gate runs on every bump.
- **Live on GitHub Pages**: served at `https://gitofkumarsathish.github.io/bst-grid/` (config `deploymentBranch: gh-pages`, `baseUrl: /bst-grid/`); `apps/docs` isolated from the workspace, `.node-version` pinned.
- API corpus re-extractable via `docs:api` (needs typescript@5).

---

## MISSING / BACKLOG ⬜ (pick up in future chats)

1. **Prose layer for API Reference (263)** — the API-export pages still have no hand-written "when/why"
   prose. _Extend the guide injection to API pages._ (Cell Types are **done** — a guide for all 17 in
   `guides/cell-types/`; feature flags all have guides too.)
2. **Animated hero GIF** — only a static hero exists. Needs a screen recording of the live grid.
3. **Guides for any NEW flags** from future corpus re-dumps — the last re-dump grew the corpus to 90 and
   every toggle is now covered; a future flag needs a new `guides/<group>/<flag>.mdx` (the gate will flag it).

**Recently completed** (2026-08-26, "worth-it" docs pass): **compiler-checked snippets**
(`docs:snippets` → `scripts/check-snippets.mjs`; 8 complete examples verified against the built
packages, 115 intentional fragments tagged `no-check`) ✅ · **Installation** + **Recipes** pages ✅ ·
**static SSR `<CodeBlock>` above every Sandpack** (example code now in the server-rendered HTML) ✅ ·
**shadcn examples** in `examples.ts` (was 0) ✅ · **spec codes out of feature titles** + a Spec-coverage
legend ✅ · **`enableEditing` page mis-map fixed** (dedupe in `dump-corpus` → "Inline editing") ✅ ·
**real server-rendered landing page** (`src/pages/index.js`) ✅ ·
**`llms.txt` + `llms-full.txt`** for AI tools (`scripts/dump-llms.mjs`, generated into `static/` during `gen:docs`) ✅.

**Live-demo dependency fix** (2026-08-26): Sandpack now resolves the registry's **`latest` published tag**
instead of the workspace version from `version.ini`. This keeps a docs deployment made between a version
bump and `npm publish` from requesting a nonexistent package and showing Sandpack's opaque `null.match`
dependency error ✅.

**Earlier** (was on this list): **deployed live on GitHub Pages**
(`https://gitofkumarsathish.github.io/bst-grid/`) ✅ · **merged to `main`** + branch deleted ✅ ·
`action`/`actionMenu` cell screenshots ✅ · the 24 distinct-feature screenshots (pinning, selection,
filters, status bar, find, context menu, overlays, spanning, …) ✅ · a live demo on every feature page ✅ ·
Mac/Windows keyboard-shortcuts reference ✅.

> **Per-flag screenshots (61) were deliberately skipped** — most flags render as the same grid, so the group
> + cell + feature images cover the actual visual variety. This is a choice, not a gap.

---

## How to run / regenerate / deploy

```bash
# run locally (isolated from the monorepo's React 19)
cd apps/docs && npm install --no-workspaces && npm run start   # http://localhost:3000

# regenerate the generated pages from the corpus
npm run gen:docs      # features + cell-types + api + coverage
npm run check:docs    # coverage gate (must stay green)

# from the repo root — full pipeline
npm run docs:build    # re-extract API (needs typescript@5) → regenerate → gate
```

Deploy: **live on GitHub Pages** at `https://gitofkumarsathish.github.io/bst-grid/` — build `apps/docs`
(`npm run build`) → publish `build/` to the `gh-pages` branch (details in `apps/docs/README.md`).

---

## Key rules & gotchas
- **Never hand-edit generated pages** (`docs/features/**`, `docs/cell-types/**`, `docs/api/**`, `docs/coverage.mdx`)
  or the dumped `scripts/{features,cells,requirements,rules}.json` — they are build artifacts. Edit the corpus
  source or the `guides/` partials and regenerate.
- **MCP corpus is the source of truth** — verify flags/cells/API via `bst_get_feature` / `bst_get_cell_type` /
  the engine `.d.ts`; never invent an API.
- **Neutral naming is enforced** — no third-party grid product names anywhere (build fails). Migration docs
  are concept-based, not vendor-named.
- **MDX-safe**: escape stray `<`, `{`, `}` outside code; escape `|` in inline code inside table cells; use
  absolute `/img/…` for images (with `onBrokenMarkdownImages: 'warn'`).
- `extract-api.mjs` needs **typescript@5** (repo pins v7). Corpus roadmap IDs use the `X#` scheme, not `AG#`.
- Real repo is `/home/sathish/projects/projects` (docs at `apps/docs`); the `Downloads/{bst,check}` folders
  are unzipped deliverable copies, not the repo.
