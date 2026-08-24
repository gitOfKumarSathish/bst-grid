# Docs generators (corpus → MDX)

All pages under `apps/docs/docs/{features,cell-types,api,coverage}` are BUILD
ARTIFACTS generated from the Bst-Table corpus. Never hand-edit them — edit the
source (TSDoc, §12 registry, COVERAGE.md) and regenerate. Wire the four steps
into `version:*` so docs regenerate on every release and can't drift.

## Pipeline

1. Dump the MCP corpus → `features.json`, `cells.json`, `requirements.json`,
   and extract the dependency `RULES` → `rules.json`
   (the MCP exposes `bst_get_feature`, `bst_get_cell_type`).
2. Extract engine signatures from the built `.d.ts`:
   `node scripts/extract-api.mjs`  → `api-sigs.json`  (needs typescript@5.x)
3. Generate the sections:
   `node scripts/gen-features.mjs docs`     # 59 feature pages, 9 groups
   `node scripts/gen-reference.mjs docs`    # 17 cell types · 261 API · coverage
4. Enforce completeness (fails the build on any gap):
   `node scripts/check-docs-coverage.mjs docs`

## Coverage guarantee

`check-docs-coverage.mjs` asserts every toggle flag, every cell type, and every
engine export has a page/section. Adding a feature without documenting it fails
CI — same discipline `bst_validate_config` applies to configs.
