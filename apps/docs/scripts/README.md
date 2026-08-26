# Docs generators (corpus → MDX)

All pages under `apps/docs/docs/{features,cell-types,api,coverage}` are BUILD
ARTIFACTS generated from the Bst-Table corpus. Never hand-edit them — edit the
source (TSDoc, §12 registry, COVERAGE.md) and regenerate. Wire the four steps
into `version:*` so docs regenerate on every release and can't drift.

## Pipeline

1. Dump the MCP corpus → `features.json`, `cells.json`, `requirements.json`,
   `rules.json`:
   `node scripts/dump-corpus.mjs`  (reads `packages/mcp/dist/corpus.json` + the
   built `RULES`; build the MCP package first so the corpus is current).
   **This is automated** — `gen:docs` runs it first, so the four JSONs are never
   hand-maintained and cannot drift from the code.
2. Extract engine signatures from the built `.d.ts`:
   `node scripts/extract-api.mjs`  → `api-sigs.json`  (needs typescript@5.x)
3. Generate the sections:
   `node scripts/gen-features.mjs docs`     # one page per feature toggle, grouped
   `node scripts/gen-reference.mjs docs`    # cell types · API · coverage
4. Enforce completeness (fails the build on any gap):
   `node scripts/check-docs-coverage.mjs docs`

**One command for all of it:** `npm run docs:build` (from the repo root) rebuilds
the engine + MCP corpus, extracts the API, dumps the corpus, regenerates every
MDX page, and runs the coverage gate. That is what `version:*` runs on release.

## Coverage guarantee

`check-docs-coverage.mjs` asserts every toggle flag, every cell type, and every
engine export has a page/section. Adding a feature without documenting it fails
CI — same discipline `bst_validate_config` applies to configs.
