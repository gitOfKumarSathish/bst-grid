# @bloomskill/table-mcp

**An MCP server that teaches AI coding agents Bst-Table.**

Bst-Table is a private React data grid. No language model has ever seen it, so asked to
"build a Bst-Table grid with batch editing" an agent will confidently produce **AG Grid** or
**MUI X DataGrid** code — the very libraries this project exists to replace. This server closes
that gap: it gives Claude Code, Cursor, Copilot or any MCP client accurate, version-pinned
knowledge of `@bloomskill/table-*`, plus the ability to scaffold and validate real configurations.

Its knowledge base is **generated from source at build time** — the engine's runtime toggle
registry, the `CLAUDE.md` §12 feature table, the `COVERAGE.md` status matrix, TSDoc, the built
`.d.ts`, every package README and all six runnable examples. Ship a Bst-Table feature and the
MCP server knows it; there is no second place to update and nothing to drift.

> 📖 **Full setup, install & usage guide:** [`docs/mcp-server.md`](../../docs/mcp-server.md) —
> install routes, per-client config (Claude Code · Cursor · VS Code · Claude Desktop), **how to use
> it in your own projects and share it with a team** (§4), verification, every tool with examples,
> workflows and troubleshooting. This README is the quick reference.

## Install

> ⚠️ **Not on npm yet.** Until it is published, `npx -y @bloomskill/table-mcp` fails with
> *404 Not Found*. Use the **tarball** or **local build** route below; publishing it is one command
> — [`docs/mcp-server.md`](../../docs/mcp-server.md) §4.4.

Three routes, same server over stdio — only the launch command changes:

| Route | Who it's for | `command` | `args` |
| --- | --- | --- | --- |
| **npm** | anyone, in any project | `npx` | `["-y", "@bloomskill/table-mcp"]` |
| **tarball** | sharing before publishing | `bst-table-mcp` | *(none)* |
| **local build** | contributors to this repo | `node` | `["/abs/path/packages/mcp/dist/cli.js"]` |

```bash
# tarball: build + pack here, then `npm i -g` the .tgz on the other machine
npm run build -w @bloomskill/table-engine   # the corpus reads the engine's build output
npm run build -w @bloomskill/table-mcp      # compile + generate dist/corpus.json
npm pack -w @bloomskill/table-mcp           # → bloomskill-table-mcp-<version>.tgz
```

**Claude Code** — `-s user` registers it for **every project** on the machine (omit it and you get
the current directory only):

```bash
claude mcp add bst-table -s user -- npx -y @bloomskill/table-mcp   # npm route
claude mcp add bst-table -s user -- bst-table-mcp                  # tarball route
claude mcp add bst-table -- node /abs/path/packages/mcp/dist/cli.js  # local build
```

**Cursor** (`~/.cursor/mcp.json` for all projects, `.cursor/mcp.json` for one) · **Claude Desktop**
(`claude_desktop_config.json`) — both use the `mcpServers` key:

```json
{
  "mcpServers": {
    "bst-table": {
      "command": "npx",
      "args": ["-y", "@bloomskill/table-mcp"]
    }
  }
}
```

**VS Code / Copilot** uses a different shape — a `servers` key and an explicit `type`. Command
Palette → *MCP: Open User Configuration* for all projects, or `.vscode/mcp.json` for one:

```json
{
  "servers": {
    "bst-table": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@bloomskill/table-mcp"]
    }
  }
}
```

Requires Node ≥ 18. The server runs over **stdio** and makes no network calls — the entire
knowledge base ships inside the package, so it works in **any** project, including ones that don't
have `@bloomskill/table-*` installed.

> **Sharing it with your team:** register at **user scope** (above) for "every project on my
> machine", or commit an `.mcp.json` with the npx form into the *consuming* app's repo so everyone
> gets it on clone. Both, plus publishing and version drift, are covered in
> [`docs/mcp-server.md`](../../docs/mcp-server.md) §4.

## Tools

| Tool | What it answers |
| --- | --- |
| `bst_search_docs` | Free-text search across READMEs, features, cell types, coverage, API signatures and examples. **Start here.** |
| `bst_get_feature` | One flag (layer · type · default · maps-to · status · dependencies), one spec leaf (`D1` → ❌ NOT BUILT + workaround), or the whole registry. |
| `bst_get_cell_type` | A `meta.type` renderer: value shape, editability, `cellMeta` fields. Or all 17. |
| `bst_get_api` | The exact signature of a `@bloomskill/table-engine` export, read from its built `.d.ts`. |
| `bst_get_example` | Full source of one of the six runnable example apps. |
| `bst_scaffold_grid` | A complete, compiling component with every flag dependency already satisfied. |
| `bst_validate_config` | Lints a config for unknown props, unmet dependencies, inert options and capabilities that don't exist. |
| `bst_detect_version` | Which `@bloomskill/table-*` versions a project has, vs. what this server documents. |

### Why validation matters

Bst-Table's flags live in two layers — `enable*` (engine behaviour) and `show*` (adapter chrome)
— and they fail **silently** rather than loudly. `bst_validate_config` catches what a review
usually doesn't:

- `showSearch` without `enableGlobalFilter` — the box never renders; chrome never implies behaviour
- `enableEditing` without `getRowId` — edits land on the wrong row after a sort
- `enableEditing: { mode: 'batch' }` without `onSave` — nothing is ever persisted
- `enableClipboard` — implies `enableCellSelection`, but **paste** also needs `enableEditing`
- `manualPagination` without `rowCount` — no page count
- `enableVirtualization` — **there is no such thing**; D1 is not implemented (use the server `DataSource`)

## Prompts

`bst-quick-start` (new grid) · `bst-add-feature` (switch a capability on, dependencies included) ·
`bst-new-cell-type` (author a custom renderer/editor) · `bst-migrate` (port an AG Grid or MUI X
DataGrid table over).

## Resources

`bst://coverage` · `bst://features` · `bst://cell-types` · `bst://example/{name}`

## What it will tell you *doesn't* exist

The most valuable thing this server does is say **no**. Of the 58 spec leaves, 51 are built, 5 are
partial and 2 are missing — and an agent working from the READMEs alone would never guess which.
`bst_get_feature({ requirement: 'D1' })` returns ❌ NOT BUILT plus the documented workaround, and
`bst_validate_config` rejects code that assumes otherwise. Coverage is read from `COVERAGE.md`, so
it is exactly as current as the repo.

## Development

```bash
npm run build -w @bloomskill/table-engine   # the corpus generator reads the engine's build output
npm run build -w @bloomskill/table-mcp      # compile + regenerate dist/corpus.json
npm run mcp                                 # build + smoke + scaffold typecheck (from the repo root)
```

| Check | Command | Proves |
| --- | --- | --- |
| Unit + corpus | `npx vitest run packages/mcp` | Extractors work; the corpus covers every toggle, leaf and cell type |
| Smoke | `npm run smoke -w @bloomskill/table-mcp` | A real MCP client can connect and every tool answers |
| Scaffold typecheck | `npm run typecheck:scaffold -w @bloomskill/table-mcp` | Every generated component **compiles** against the built packages |
| Portability | `npm run verify:portability` | `npx`-installable outside the repo, with the corpus baked in |

Two parity guards keep the server honest, in the same spirit as the engine's compile-time
settings-sheet check (`CLAUDE.md` §12):

1. **Corpus parity** — corpus generation *fails the build* if a toggle in `BST_SETTINGS_REGISTRY`
   has no `CLAUDE.md` §12 row.
2. **Rule parity** — `rules.test.ts` fails if a toggle has no entry in `src/rules.ts`, so a new
   feature can't slip past the validator.

## Requirements

Node ≥ 18 (developed on 24). Runtime dependencies: `@modelcontextprotocol/sdk` and `zod` — search
is a hand-written BM25 index, so there is no vector store, no embedding model and no API key.

## License

MIT
