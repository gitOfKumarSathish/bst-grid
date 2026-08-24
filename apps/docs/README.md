# Bst-Table documentation site

A [Docusaurus](https://docusaurus.io) site. Most pages are **generated from the repo's corpus**
(the MCP feature registry + the engine `.d.ts`) — never hand-edit generated pages; edit the source
or the `guides/` prose partials and regenerate.

## Run locally

```bash
npm install --no-workspaces   # first time — Docusaurus deps, isolated from the monorepo
npm run start                 # dev server at http://localhost:3000
```

`--no-workspaces` keeps Docusaurus's React 18 out of the monorepo's React 19 tree (a plain root
`npm install` can hit peer-dependency conflicts).

## Layout

- `docs/` — the pages. `features/`, `cell-types/`, `api/` and `coverage.mdx` are **generated**; the
  top-level `*.mdx` (getting-started, theming, ai-agents, migration) are hand-written.
- `guides/` — hand-written prose partials **injected** into the generated feature pages. Lives
  outside `docs/`, so it **survives regeneration**. `guides/<group>/<flag>.mdx` → a flag page;
  `guides/<group>/_overview.mdx` → a group index.
- `scripts/` — the generators and the corpus snapshots (`features.json`, `cells.json`,
  `api-sigs.json`, …).

## Regenerate

```bash
npm run gen:docs      # features + cell-types + api + coverage, from scripts/*.json
npm run check:docs    # coverage gate — fails if any flag / cell type / export is undocumented
```

`gen:reference` reads `api-sigs.json`, extracted from the engine `.d.ts` by `extract-api.mjs`. That
step needs **typescript@5** (the repo pins v7), so when the engine API changes, install it isolated
first: `npm i -D typescript@5 --no-workspaces`, then `node scripts/extract-api.mjs`. Snapshots must
use the current `X#` roadmap scheme (not the retired `AG#`) or the repo's neutral-naming guard
rejects them.

## Deploy (Cloudflare Pages)

| Setting | Value |
| --- | --- |
| Root directory | `apps/docs` |
| Build command | `npm install --no-workspaces && npm run build` |
| Build output | `build` |
| Domain | `bst-grid.pages.dev` (set in `docusaurus.config.js` → `url`) |

`npm run build` produces the static site in `build/`; `npm run serve` previews that build locally.
