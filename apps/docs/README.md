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

From **this package**:

```bash
npm run gen:api       # re-extract api-sigs.json from the engine's built .d.ts (needs the engine built)
npm run gen:docs      # features + cell-types + api + coverage, from scripts/*.json
npm run check:docs    # coverage gate — fails if any flag / cell type / export is undocumented
```

`gen:api` uses the pinned **typescript@5** devDependency (the repo's root TypeScript is v7, whose
rewritten compiler API `extract-api.mjs` can't use). Build the engine first
(`npm run build -w @bloomskill/table-engine`) so `packages/engine/dist/*.d.ts` exist —
`extract-api.mjs` finds them automatically.

From the **repo root** the pipeline is wired up:

```bash
npm run docs:build    # full: re-extract API -> regenerate -> gate
npm run docs:sync     # regenerate + gate (no API re-extract)
```

`version:patch` / `:minor` / `:major` **auto-run `docs:sync`**, so a version bump regenerates the
docs and fails if any flag / cell type / export is undocumented — the docs can't drift from the
code. (Run `docs:api` / `docs:build` after building the engine to also refresh the API signatures.)

## Deploy (GitHub Pages)

Configured in `docusaurus.config.js`: `url: https://gitofkumarsathish.github.io`,
`baseUrl: /bst-grid/`, `organizationName: gitOfKumarSathish`, `projectName: bst-grid`,
`deploymentBranch: gh-pages`.

| Setting | Value |
| --- | --- |
| Root directory | `apps/docs` |
| Install | `npm install --no-workspaces` |
| Build | `npm run build` → static site in `build/` (served under `/bst-grid/`) |
| Publish branch | `gh-pages` |
| Live URL | `https://gitofkumarsathish.github.io/bst-grid/` |

Publish by pushing the built `build/` to the **`gh-pages`** branch — Docusaurus's built-in deploy
(`GIT_USER=<github-user> npx docusaurus deploy` from `apps/docs`), or a GitHub Actions workflow — then
enable **repo → Settings → Pages → Source: `gh-pages` / root**. `npm run serve` previews the
production build locally before publishing.

## Media (screenshots / hero)

Images aren't captured automatically — drop files in `static/img/` and reference them by an
**absolute** path (`/img/<name>`); Docusaurus serves everything under `static/` at the site root.

Suggested shots:

| File | Referenced from | Capture |
| --- | --- | --- |
| `hero.png` / `hero.gif` | top of `docs/getting-started.mdx` | a populated grid, sorting / editing live |
| `editing.png` | `guides/editing/enableEditing.mdx` | a cell mid-edit |
| `selection.png` | `guides/selection-clipboard/enableCellSelection.mdx` | a selected range |
| `theming.png` | `docs/theming.mdx` | the MUI vs shadcn skins |

Add one by pasting Markdown where you want it — feature-guide shots go in the matching
`guides/<group>/<flag>.mdx` partial (which is injected into the generated page):

    ![A Bst-Table grid with inline editing](/img/hero.png)

Capture them from `npm run start` (or the demo app) with any screenshot tool; record a hero GIF the
same way. Nothing references these files yet, so the build stays green until you add them.
