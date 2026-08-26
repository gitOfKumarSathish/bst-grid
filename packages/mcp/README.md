# @bloomskill/table-mcp

**An MCP server that teaches AI coding agents Bst-Table.**

[Bst-Table](https://github.com/gitOfKumarSathish/bst-grid) is a React data grid
(`@bloomskill/table-engine` + MUI/shadcn skins). No language model was trained on it, so asked to
"build a Bst-Table grid with batch editing" an agent confidently writes some **other grid
library's** code — the very libraries this project exists to replace. Point your agent at this
server and it gets the real API instead: searchable docs, the full feature-toggle registry, every
cell type, exact type signatures, plus the ability to **scaffold** and **validate** working grids.

Works with **Claude Code · Cursor · VS Code (Copilot) · Claude Desktop** — anything that speaks MCP.

---

## Quick start

### 1. Register the server

Pick your client. Nothing to install first — `npx` fetches the package on first run.

<details open>
<summary><b>Claude Code</b> (one command)</summary>

```bash
claude mcp add bst-table -s user -- npx -y @bloomskill/table-mcp
```

`-s user` = available in **every project** on this machine. Drop it to register only the current
directory, or use `-s project` to write a `.mcp.json` your whole team gets on clone.
</details>

<details open>
<summary><b>Cursor</b> · <b>Claude Desktop</b> (<code>mcpServers</code> key)</summary>

Cursor: `~/.cursor/mcp.json` (all projects) or `.cursor/mcp.json` (one project).
Claude Desktop: `claude_desktop_config.json`.

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
</details>

<details>
<summary><b>VS Code / Copilot</b> (<code>servers</code> key — different shape)</summary>

Command Palette → *MCP: Open User Configuration* (all projects), or `.vscode/mcp.json` (one project).

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
</details>

### 2. Restart your client

MCP servers are read at startup. In Claude Code, confirm it connected:

```bash
claude mcp list          # → bst-table: npx -y @bloomskill/table-mcp - ✔ Connected
```

Other clients list connected servers in their MCP/settings panel.

### 3. Ask for a grid

Just talk to your agent normally — it picks the tools up on its own:

> Build me a Bst-Table grid of orders with inline editing, a status dropdown and CSV-style copy/paste.

Behind the scenes it calls `bst_scaffold_grid`, and the component it hands you **compiles** — every
flag dependency already satisfied. Two more prompts worth trying on day one:

> What Bst-Table flag turns on the filter builder, and what does it depend on?
> Check this grid config for mistakes: `{ showSearch: true, enableGlobalFilter: false, enableLiveUpdates: true }`

The second one returns two real errors: `showSearch` does nothing while `enableGlobalFilter` is
**off** (chrome never implies behaviour), and `enableLiveUpdates` **is not a real flag** —
live / WebSocket merge (I5) isn't built.

> **You do not need Bst-Table installed.** The whole knowledge base ships inside this package, so
> the server works in any project — including an empty folder where you are still deciding.

---

## What you get

| Tool | What it answers |
| --- | --- |
| `bst_search_docs` | Free-text search across every README, feature, cell type, coverage row, API signature and example. **Start here when unsure.** |
| `bst_get_feature` | One flag (layer · type · default · maps-to · status · **dependencies**), one spec leaf (`I5` → ❌ NOT BUILT + workaround), or the whole flag registry. |
| `bst_get_cell_type` | A `meta.type` renderer: value shape, editability, `cellMeta` fields. Or all 17. |
| `bst_get_api` | The exact signature of any `@bloomskill/table-engine` export, read from the built `.d.ts` (271 entries). |
| `bst_get_example` | Full source of one of the seven runnable example apps. |
| `bst_scaffold_grid` | A complete, compiling component from a feature list + column list. |
| `bst_validate_config` | Lints a config for unknown props, unmet dependencies, inert options and capabilities that don't exist. |
| `bst_detect_version` | Which `@bloomskill/table-*` versions a project has, vs. what this server documents. |
| `bst_list_versions` | The released version history (from the changelog) with the documented one marked — for upgrade/migration context. |

**Prompts** (slash commands in most clients) — `bst-quick-start` (new grid) · `bst-add-feature`
(switch a capability on, dependencies included) · `bst-new-cell-type` (author a custom
renderer/editor) · `bst-migrate` (port a table over from another grid library).

**Resources** — `bst://coverage` · `bst://features` · `bst://cell-types` · `bst://example/{name}`.

**Structured output** — every tool returns machine-readable `structuredContent` validated against a
declared `outputSchema` (advertised in `tools/list`), so a client can consume a result as typed data,
not just prose. **Argument completions** — `bst-quick-start`'s `adapter`, `bst-add-feature`'s
`feature`, and the `bst://example/{name}` resource autocomplete to **real** adapter / flag / example
names in clients that support MCP completions, so a name is picked from the registry rather than
guessed.

**Version-awareness** — every flag carries the version it shipped in (`since`, extracted from the
changelog). Pass a project's installed version to `bst_get_feature` as `installedVersion` (get it
from `bst_detect_version`) and it says plainly whether a flag exists there — **⚠️ NOT available** in
your version, with the version to upgrade to, or **✅ available** — so an agent never wires up a flag
the installed release doesn't have.

### The 17 cell types it knows

`text` · `longText` · `number` · `dateTime` · `boolean` · `singleSelect` · `multiSelect` · `radio` ·
`hyperlink` · `files` · `sparkline` · `kpi` · `qr` · `barcode` · `richText` · `action` · `actionMenu`

### Why validation matters

Bst-Table's flags live in two layers — `enable*` (engine behaviour) and `show*` (adapter chrome) —
and a wrong combination fails **silently** rather than loudly. `bst_validate_config` catches what
code review usually doesn't:

- `showSearch` while `enableGlobalFilter` is off — the box never renders; chrome never implies behaviour (on its own `showSearch` is fine — search is on by default)
- `enableEditing` without `getRowId` — edits land on the wrong row after a sort
- `enableEditing: { mode: 'batch' }` without `onSave` — nothing is ever persisted
- `enableClipboard` — implies `enableCellSelection`, but **paste** also needs `enableEditing`
- `manualPagination` without `rowCount` — no page count
- `enableLiveUpdates` — **there is no such flag**; live / WebSocket merge (I5) isn't built (push updates by replacing `data`)

### It will also tell you what *doesn't* exist

The most valuable thing this server does is say **no**. Of the 58 spec requirements, **almost all are
built** — a handful are partial, and I5 (live/WebSocket merge) is the standing gap — and an agent
working from the READMEs alone would never guess which. `bst_get_feature({ requirement: 'I5' })`
returns ❌ NOT BUILT plus the documented workaround, and `bst_validate_config` rejects code that
assumes otherwise. The exact split is read live from `COVERAGE.md`, so it never drifts.

---

## How it stays current

The knowledge base is **generated from source at build time** — the engine's runtime toggle registry
(`BST_SETTINGS_REGISTRY`), the `CLAUDE.md` §12 feature table, the `COVERAGE.md` status matrix,
`types.ts` TSDoc, the built `.d.ts`, all six READMEs and all seven example apps. Ship a Bst-Table
feature and the server knows it; there is no second place to update and nothing to drift.

Two guards **fail the build** if that slips: corpus generation errors when a toggle has no §12 row,
and `rules.test.ts` fails when a toggle has no dependency entry in `src/rules.ts`.

The version tracks the library it documents — **`@bloomskill/table-mcp@0.32.4` documents
`@bloomskill/table-*@0.32.4`.** Keep them in step; `bst_detect_version` reports any gap.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Server shows as failed / not connected | Check Node ≥ 18 (`node -v`). Run `npx -y @bloomskill/table-mcp` in a terminal — it should start and wait silently on stdio (Ctrl+C to exit). Any error prints there. |
| `command not found: npx` in the client | GUI apps don't always inherit your shell `PATH` (common with nvm). Use an absolute path as `command`, e.g. `/Users/you/.nvm/versions/node/v22.0.0/bin/npx`. |
| Registered but the agent ignores it | Restart the client — servers are read at startup. Then ask explicitly: *"use the bst-table MCP server to …"*. |
| Agent still writes another library's grid code | It answered from memory instead of calling a tool. Say *"check with bst_search_docs first"* once; it sticks for the session. |
| Advice doesn't match your installed version | Run `bst_detect_version`, then align — `npm i @bloomskill/table-mcp@<your table version>`. |
| Corporate registry / offline | `npm i -g @bloomskill/table-mcp` once, then use `bst-table-mcp` (no args) as the `command`. |

The server runs over **stdio**, makes **no network calls** and needs **no API key** — everything it
knows is baked into the package.

---

## Requirements

Node ≥ 18 (developed on 24). Runtime dependencies: `@modelcontextprotocol/sdk` and `zod` — search is
a hand-written BM25 index, so there is no vector store, no embedding model and no API key.

## Development

From the repo root:

```bash
npm run build -w @bloomskill/table-engine   # the corpus generator reads the engine's build output
npm run build -w @bloomskill/table-mcp      # compile + regenerate dist/corpus.json
npm run mcp                                 # the full gate — build + tests + smoke + scaffold typecheck
```

| Check | Command | Proves |
| --- | --- | --- |
| Unit + corpus | `npx vitest run packages/mcp` | Extractors work; the corpus covers every toggle, leaf and cell type |
| Smoke | `npm run smoke -w @bloomskill/table-mcp` | A real MCP client can connect and every tool answers |
| Scaffold typecheck | `npm run typecheck:scaffold -w @bloomskill/table-mcp` | Every generated component **compiles** against the built packages |
| Portability | `npm run verify:portability` | `npx`-installable outside the repo, with the corpus baked in |

## License

MIT
