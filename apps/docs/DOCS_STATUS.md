# Bst-Table Docs — Status & Backlog

Single source of truth for **what is in the documentation site** (`apps/docs/`) and **what is still
missing**. Paste this into a new chat to resume without re-explaining. Branch: `docs/add-docusaurus-site`.

_Verified against the corpus + working tree on 2026-08-26. Everything below is committed + pushed._

---

## Numbers (verified against the corpus)

| Surface | Count | Documented |
| --- | --- | --- |
| **Corpus capabilities** | **90** | generated reference page each ✅ |
| ↳ `enable*` / `show*` toggle flags | **61** | page **+ prose guide each** ✅ (0 without a guide) |
| ↳ config props / cell-meta / notes | 29 | on the relevant feature / cell / API page |
| Cell types | **17** | page each ✅ (15 with a standalone image + live demo) |
| ↳ cellMeta sub-options | 38 | on each cell page |
| Engine API exports | **262** | page each ✅ (fn · hooks · iface · type · const) |
| Spec-coverage leaves | **58** | coverage matrix ✅ |
| Prose guides (hand-written) | **71** | 62 flag guides + 9 group overviews |
| Generated pages | 90 | 72 feature + 18 cell + API + coverage |
| **Live Sandpack demos** | **~34** | headline flags + 15 cells + 6 features + showcase + dark |
| **Screenshots** | **33** | see breakdown below |

Coverage gate (`check-docs-coverage.mjs`) is **green** — every flag, cell and export is accounted for.
**82 of the 90** corpus entries carry a `since:` version (0.1.0 → 0.42.0), so pages show when each landed.

---

## DONE ✅

### Generated reference (Phase 1)
- 90-capability reference: 72 feature-flag pages (9 groups) · 18 cell-type pages · 262 API-export pages ·
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
- `<BstSandbox>` renders editable grids from the published packages: 10 headline flags + 15 cell types
  + 6 distinct features + a cell-type showcase + dark mode. Chrome trimmed (`showOpenInCodeSandbox` off).

### Screenshots (33) — all headless-captured, each **labeled with an orange highlight** on the live feature
- **1** hero (Getting Started)
- **9** feature groups (each shows the feature active: menu open, cell editing, range selected, settings sheet…)
- **1** cell-types showcase + **1** dark mode
- **15** cell types (`text, longText, number, dateTime, boolean, singleSelect, multiSelect, radio,
  hyperlink, files, sparkline, kpi, qr, barcode, richText`)
- **6** distinct features (`conditional formatting, master-detail, grouping, filter builder, undo/redo, row actions`)
- **All 33 are committed + pushed** and render on every page (no pending/uncommitted images).

### Infrastructure
- Coverage gate wired; **`verify:naming` hardened** — the build fails on any third-party grid product name,
  its abbreviations, or licensing-tier ids. Positioning stays positive (MIT/Apache-only, no per-seat licensing).
- **`docs:sync` wired into `version:patch|minor|major`** — docs regenerate + gate runs on every bump.
- **Cloudflare-ready**: `apps/docs` isolated from the workspace, `.node-version` pinned, `npm ci && npm run build` verified on Node 20.
- API corpus re-extractable via `docs:api` (needs typescript@5).

---

## MISSING / BACKLOG ⬜ (pick up in future chats)

1. **`action` / `actionMenu` standalone cell images** — the **only 2** of the 17 cell types without their
   own screenshot (they need row-action wiring to render). Both ARE shown in the row-actions feature shot.
   _Add individual demos only if you want strict per-cell parity._
2. **Prose layer for Cell Types (17) and API Reference (262)** — complete *generated* reference exists, but
   no hand-written "when/why" prose like the 61 flag guides have. _Extend the injection to cell/API pages._
3. **~7 more distinct-feature images (optional)** — captured 6; not yet imaged: `density toggle, sticky
   header, row pinning, context menu, set filter, multi-filter, status-bar aggregates`.
4. **Animated hero GIF** — only a static hero exists. Needs a screen recording of the live grid.
5. **Actual Cloudflare Pages deploy** — needs the Cloudflare account. Settings are in `apps/docs/README.md`
   (root `apps/docs`, build `npm run build`, output `build`, domain `bst-grid.pages.dev`).
6. **Merge `docs/add-docusaurus-site` → `main`** — the branch holds everything above.
7. **Guides for any NEW flags** from future corpus re-dumps — the last re-dump grew the corpus to 90 and
   every toggle is now covered; a future flag needs a new `guides/<group>/<flag>.mdx` (the gate will flag it).
8. **Sandpack dep pins** in `src/components/BstSandbox.tsx` load a **published** package version — bump the
   pins when a newer version publishes so demos match the current docs.

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

Deploy: connect the repo to Cloudflare Pages → root dir `apps/docs`, build `npm run build`, output `build`.

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
