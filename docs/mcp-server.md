# Bst-Table MCP server — setup, install & usage

Complete guide to [`@bloomskill/table-mcp`](../packages/mcp/README.md): the MCP server that
teaches AI coding agents how to use Bst-Table.

- **What it is:** a [Model Context Protocol](https://modelcontextprotocol.io) server exposing
  8 tools, 4 prompts and `bst://` resources over stdio.
- **Why it exists:** no language model has seen Bst-Table, so asked to "build a Bst-Table grid"
  an agent emits **AG Grid** or **MUI X DataGrid** code — the libraries this project replaces.
  The server gives the agent accurate, version-pinned knowledge instead.
- **How it stays correct:** its knowledge base is **generated from this repo at build time**
  (the §12 toggle registry, `COVERAGE.md`, TSDoc, the built `.d.ts`, every README and example),
  so it can't drift from the packages it documents.

Related docs: package README [`packages/mcp/README.md`](../packages/mcp/README.md) · toggle
registry `CLAUDE.md` §12 · coverage matrix [`COVERAGE.md`](../COVERAGE.md).

---

## 1. Prerequisites

- **Node ≥ 18** (the rest of the repo develops on Node 24 via nvm). Check with `node -v`.
- An **MCP-capable client**: Claude Code, Cursor, VS Code (GitHub Copilot / Continue),
  Claude Desktop, or anything that speaks MCP over stdio.
- Nothing else. The server makes **no network calls** and needs **no API key** — the entire
  knowledge base ships inside the package.

---

## 2. Install

There are two ways to run it. **Pick one.**

### Option A — from a local build (works today, no publish needed)

The package isn't on npm yet, so this is the path that works **right now**. Build it once, then
point your client at the built entry file.

```bash
# from the repo root
export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:$PATH"   # only if node lives under nvm, as it does in this repo
npm run build -w @bloomskill/table-engine                   # the corpus reads the engine's build output
npm run build -w @bloomskill/table-mcp                      # compiles + generates dist/corpus.json
```

That produces the runnable server at `<your-checkout>/packages/mcp/dist/cli.js`. The client configs
below use **`/abs/path/packages/mcp/dist/cli.js`** as a placeholder — replace it with your own
absolute path (`realpath packages/mcp/dist/cli.js` prints it).

Rebuild (`npm run build -w @bloomskill/table-mcp`) whenever the docs, toggles or examples change,
so the corpus stays current.

### Option B — from npm (once published)

After the first `npm run release`, this becomes the zero-setup path: your client runs it on demand
with `npx`, nothing installed globally.

```bash
npx -y @bloomskill/table-mcp
```

> ⚠️ Until `@bloomskill/table-mcp` is on the npm registry, `npx` fails with *404 Not Found*. Use
> Option A until then; once published, swap the `command`/`args` in your client config to the npx
> form shown alongside each section below.

---

## 3. Set it up in your client

The server is the same everywhere; only the config file and its key names differ. Name the server
**`bst-table`** so prompts can refer to it consistently.

### Claude Code

Use the CLI — it writes the config for you.

```bash
# Local build (works today) — use your own absolute path:
claude mcp add bst-table -- node /abs/path/packages/mcp/dist/cli.js

# Once published:
claude mcp add bst-table -- npx -y @bloomskill/table-mcp
```

Scope flags: add `-s user` to make it available in every project, or `-s project` (writes a
shared `.mcp.json` checked into the repo). List and remove with:

```bash
claude mcp list
claude mcp remove bst-table
```

> In this repository's shell the `claude` binary is not on `PATH`, so run these from an interactive
> `claude` terminal elsewhere, or edit the config file directly (below).

### Cursor

Create **`.cursor/mcp.json`** in the project (or `~/.cursor/mcp.json` for all projects):

```json
{
  "mcpServers": {
    "bst-table": {
      "command": "node",
      "args": ["/abs/path/packages/mcp/dist/cli.js"]
    }
  }
}
```

Once published, switch to the npx form:

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

Then open **Cursor Settings → MCP** and confirm `bst-table` shows a green dot.

### VS Code (GitHub Copilot / Continue)

VS Code's MCP config uses a **`servers`** key and an explicit `type`. Create **`.vscode/mcp.json`**:

```json
{
  "servers": {
    "bst-table": {
      "type": "stdio",
      "command": "node",
      "args": ["/abs/path/packages/mcp/dist/cli.js"]
    }
  }
}
```

Once published, swap to `"command": "npx"`, `"args": ["-y", "@bloomskill/table-mcp"]`.
Reload the window, then pick the server from the Copilot Chat tools menu.

### Claude Desktop

Edit **`claude_desktop_config.json`**:

- macOS `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "bst-table": {
      "command": "node",
      "args": ["/abs/path/packages/mcp/dist/cli.js"]
    }
  }
}
```

Once published, swap to `"command": "npx"`, `"args": ["-y", "@bloomskill/table-mcp"]`.
Quit and reopen Claude Desktop. The tools appear under the 🔌 (plug) menu.

### Any other MCP client

Launch the server as a subprocess over **stdio**:

| Setting | Value |
| --- | --- |
| Command | `node` (local build, works today) or `npx` (once published) |
| Args | `["/abs/path/packages/mcp/dist/cli.js"]` or `["-y", "@bloomskill/table-mcp"]` |
| Transport | stdio |
| Env | none required |

---

## 4. Verify it works

**Without any client** — the repo ships a smoke test that connects a real MCP client over stdio,
lists everything and calls every tool:

```bash
npm run build -w @bloomskill/table-mcp   # ensure dist/ is current
npm run smoke -w @bloomskill/table-mcp
```

Expected tail:

```text
prompts/list → 4
tools/call → 13
  ✓ …
all good — 8 tools, 13 calls
```

**Inside a client** — ask it something only this server can answer correctly:

> Using the bst-table tools, is row virtualization supported in Bst-Table?

A correct setup replies **no** — requirement **D1** is not built — and offers the server
`DataSource` workaround, instead of inventing a `virtualized` prop.

**With the MCP Inspector** (visual tool explorer):

```bash
npx @modelcontextprotocol/inspector node /abs/path/packages/mcp/dist/cli.js
```

---

## 5. The tools

All tools are read-only and take a `response_format` of `markdown` (default) or `json`.

| Tool | Use it to… | Example arguments |
| --- | --- | --- |
| `bst_search_docs` | Search everything (READMEs, features, cell types, coverage, API, examples). **Start here.** | `{ "query": "save all edits in one call" }` |
| `bst_get_feature` | Look up one flag, check a spec requirement, or list the registry. | `{ "flag": "enableClipboard" }` · `{ "requirement": "D1" }` |
| `bst_get_cell_type` | Get a `meta.type` renderer's value shape + `cellMeta`, or list all 17. | `{ "type": "singleSelect" }` |
| `bst_get_api` | Exact signature of a `@bloomskill/table-engine` export from its built `.d.ts`. | `{ "symbol": "useBstTable" }` |
| `bst_get_example` | Full source of a runnable example app. | `{ "name": "editing" }` |
| `bst_scaffold_grid` | Generate a complete component with dependencies pre-wired. | `{ "adapter": "mui", "features": ["editing","clipboard"], "columns": [{ "id": "name" }] }` |
| `bst_validate_config` | Lint a grid config for unmet dependencies + invented props. | `{ "code": "<BstTableMui showSearch enableGlobalFilter={false} />" }` |
| `bst_detect_version` | Compare a project's installed version to what the server documents. | `{ "path": "/abs/project" }` |

### What the checker catches

`bst_validate_config` exists because Bst-Table's two flag layers — `enable*` (engine behaviour)
and `show*` (adapter chrome) — fail **silently**, not loudly:

- `showSearch` without `enableGlobalFilter` → the box never renders (chrome never implies behaviour)
- `enableEditing` without `getRowId` → edits land on the wrong row after a sort
- `enableEditing: { mode: 'batch' }` without `onSave` → nothing is ever persisted
- `enableClipboard` → implies `enableCellSelection`; **paste** additionally needs `enableEditing`
- `manualPagination` without `rowCount` → no page count
- `enableVirtualization` → **there is no such prop** (D1 isn't built — use the server `DataSource`)

---

## 6. Prompts (guided workflows)

Prompts appear in the client as reusable actions (in Claude Code, as slash-command-style entries).
Each one hands the agent the right tool order so it doesn't fall back on another library's API.

| Prompt | Does |
| --- | --- |
| `bst-quick-start` | Build a new grid from a plain-language description. |
| `bst-add-feature` | Switch a capability on with every dependency it needs. |
| `bst-new-cell-type` | Author + register a custom `CellType`. |
| `bst-migrate` | Port an AG Grid / MUI X DataGrid table to Bst-Table. |

---

## 7. Resources

Static, addressable views of the knowledge base — attach them to a conversation without a tool call:

| URI | Contents |
| --- | --- |
| `bst://coverage` | The 58-leaf requirement matrix (built / partial / missing). |
| `bst://features` | Every flag: layer, type, default, status. |
| `bst://cell-types` | All 17 `meta.type` renderers + value shapes. |
| `bst://example/{name}` | Full source of one example (`quick-start`, `editing`, …). |

---

## 8. Typical workflows

**Start a new grid** — invoke `bst-quick-start`, or just ask:

> Build a Bst-Table grid (MUI skin) of orders with inline editing, a status dropdown, and batch
> save. Use the bst-table tools.

The agent detects the version, confirms real flag names, scaffolds, and validates before showing
code — the generated component wires `getRowId`, `onDataChange` and a single-call `onSave` for you.

**Add a feature to an existing grid:**

> Add copy/paste to this grid. [paste your `<BstTableMui .../>`]

It looks up `enableClipboard`, learns it implies `enableCellSelection` (and paste needs editing),
applies the change, and re-validates.

**Migrate off AG Grid / MUI X:**

> Migrate this AG Grid table to Bst-Table. [paste code]

It maps each capability to a Bst-Table equivalent, flags anything with no equivalent, and notes
that master-detail / range-selection / clipboard — paid in AG Grid Enterprise — are included here.

---

## 9. How it stays accurate

The server never hand-maintains what it knows. At build time (`npm run build -w @bloomskill/table-mcp`)
a generator reads the repo and writes `dist/corpus.json`:

| Source | Feeds |
| --- | --- |
| `packages/engine/dist/settings.js` (`BST_SETTINGS_REGISTRY`) | feature toggles (runtime truth) |
| `CLAUDE.md` §12 registry table | flag type · maps-to · status |
| `packages/engine/src/types.ts` TSDoc | flag prose |
| `COVERAGE.md` | the 58-leaf built/partial/missing matrix |
| `packages/engine/dist/index.d.ts` | API signatures |
| root · examples · `engine` · `mui` · `shadcn` · **`mcp`** READMEs | searchable docs |
| **every `docs/*.md`** (globbed — this guide included) | searchable docs, self-indexing |
| `examples/*/src` | runnable example source |

The doc set is **self-indexing**: the four package READMEs are named, but every `docs/*.md` is
discovered by glob — so this very guide is searchable (`bst_search_docs("install mcp")` finds it),
and a new guide needs no code change to join the corpus.

**Three guards keep the server honest** — the same discipline the engine uses for its settings
sheet (`CLAUDE.md` §12):

1. Corpus generation errors if a toggle in `BST_SETTINGS_REGISTRY` has no `CLAUDE.md` §12 row.
2. `packages/mcp/src/__tests__/rules.test.ts` fails if a toggle has no entry in
   `packages/mcp/src/rules.ts` (the hand-authored flag-dependency table).
3. A freshness test fails if any indexed source's mtime is newer than the corpus's `generatedAt`
   — i.e. a doc or README was edited without rebuilding the corpus (`findStaleSources`). The
   `npm run mcp` gate builds first, so it always passes there; it catches a stale corpus during
   local edits and in review.

So the rule for adding any Bst-Table feature is unchanged (`CLAUDE.md` §13) — add the §12 row and a
`rules.ts` entry, and the MCP server updates itself.

---

## 10. Build & develop from source

```bash
export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:$PATH"

npm run build -w @bloomskill/table-engine   # prerequisite — the corpus reads its build output
npm run build -w @bloomskill/table-mcp      # compile src/ → dist/ + regenerate dist/corpus.json
```

Quality gates (all part of the release flow):

| Command (from repo root) | Proves |
| --- | --- |
| `npm test -- packages/mcp` | Extractors + the two parity guards; the corpus covers every toggle, leaf, cell type |
| `npm run smoke -w @bloomskill/table-mcp` | A real MCP client connects and every tool answers |
| `npm run typecheck:scaffold -w @bloomskill/table-mcp` | Every scaffolded component **compiles** against the built packages |
| `npm run mcp` | Build + all three of the above in one gate (the DoD stand-in for the demo step) |
| `npm run verify:portability` | `npx`-installable outside the repo, corpus baked into the tarball |

Source layout:

```text
packages/mcp/
├─ src/
│  ├─ cli.ts            # stdio entry point (the bin)
│  ├─ server.ts         # builds the McpServer, wires tools/resources/prompts
│  ├─ tools/            # one file per tool
│  ├─ generate/         # corpus extractors (features, coverage, cells, docs, api, examples)
│  ├─ search/           # hand-written BM25 index
│  ├─ rules.ts          # flag-dependency table (the one hand-authored part)
│  ├─ validate.ts       # bst_validate_config logic
│  └─ scaffold.ts       # bst_scaffold_grid logic
├─ scripts/             # smoke.mjs, typecheck-scaffold.mjs
└─ dist/                # built JS + corpus.json (published; git-ignored otherwise)
```

---

## 11. Troubleshooting

| Symptom | Cause & fix |
| --- | --- |
| *404 Not Found* on `npx -y @bloomskill/table-mcp` | Not published yet — use the **local build** config (Option B). |
| `corpus not found at …/corpus.json` | Built without the generate step. Run `npm run build -w @bloomskill/table-engine && npm run build -w @bloomskill/table-mcp`. |
| Client shows the server as failed / red | Wrong path in config, or `dist/` not built. Confirm `node /abs/packages/mcp/dist/cli.js` prints `bst-table-mcp-server vX.Y.Z ready (stdio)` then waits. |
| `node: command not found` in this repo's shell | Node lives under nvm here — `export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:$PATH"` first. |
| Tools don't appear after editing config | Fully restart the client (Claude Desktop/Cursor/VS Code cache MCP config at startup). |
| Answers look stale after a feature landed | Rebuild the package so the corpus regenerates: `npm run build -w @bloomskill/table-mcp`. |

Nothing logs to stdout (stdio owns it); the server prints its ready line and any errors to
**stderr**, which the client surfaces in its MCP logs.

---

## 12. Uninstall

- **Claude Code:** `claude mcp remove bst-table`
- **Cursor / VS Code / Claude Desktop:** delete the `bst-table` block from the config file and
  restart the client.

Nothing is installed globally (with `npx`) or outside the repo (with the local build), so removing
the config is a complete uninstall.
