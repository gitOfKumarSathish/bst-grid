# Bst-Table MCP server — setup, install & usage

Complete guide to [`@bloomskill/table-mcp`](../packages/mcp/README.md): the MCP server that
teaches AI coding agents how to use Bst-Table.

- **What it is:** a [Model Context Protocol](https://modelcontextprotocol.io) server exposing
  8 tools, 4 prompts and `bst://` resources over stdio.
- **Why it exists:** no language model has seen Bst-Table, so asked to "build a Bst-Table grid"
  an agent emits some **other grid library's** code — the libraries this project replaces.
  The server gives the agent accurate, version-pinned knowledge instead.
- **How it stays correct:** its knowledge base is **generated from this repo at build time**
  (the §12 toggle registry, `COVERAGE.md`, TSDoc, the built `.d.ts`, every README and example),
  so it can't drift from the packages it documents.

> **Want it in a project that isn't this one — or on a teammate's machine?** Jump to
> **§4 Use it in your own projects**. Short version: install route in §2, then register it at
> **user scope**, not project scope.

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

Three routes. **Pick the one that matches who you are.**

| Route | Who it's for | What it needs | Server command |
| --- | --- | --- | --- |
| **npm** | anyone, in any project | the package published to a registry | `npx -y @bloomskill/table-mcp` |
| **tarball** | sharing it before it's published | a `.tgz` handed to you | `bst-table-mcp` |
| **local build** | contributors working on Bst-Table itself | this repo, checked out | `node <checkout>/packages/mcp/dist/cli.js` |

All three run the same server over stdio. Only the launch command differs, so every client config
in §3 is the same shape with that one line swapped.

> ⚠️ **`@bloomskill/table-mcp` is not on the npm registry yet** — the three grid packages are, but
> this one has never been published. Until it is, `npx -y @bloomskill/table-mcp` fails with
> *404 Not Found*; use the **tarball** or **local build** route. Publishing it is one command —
> see §4.4.

### Route 1 — npm (`npx`)

The zero-setup path, and the one to give other people: nothing is cloned, nothing is installed
globally, and the client fetches the server on demand.

```bash
npx -y @bloomskill/table-mcp
```

The whole knowledge base ships inside the package, so this works in **any** project — the consuming
project does not need `@bloomskill/table-*` installed, an API key, or network access at run time.

### Route 2 — a shared tarball (no registry)

Use this to hand the server to a teammate before it's published. From this repo:

```bash
npm run build -w @bloomskill/table-engine     # the corpus reads the engine's build output
npm run build -w @bloomskill/table-mcp        # compile + generate dist/corpus.json
npm pack -w @bloomskill/table-mcp             # → bloomskill-table-mcp-<version>.tgz
```

Send them the `.tgz`. They install it once, globally, and get the `bst-table-mcp` binary on their
`PATH` — usable from any directory:

```bash
npm i -g ./bloomskill-table-mcp-<version>.tgz
bst-table-mcp --version        # sanity check
```

Their client config then uses `"command": "bst-table-mcp"` with no `args`. The catch: the corpus is
frozen at the tarball, so every docs/toggle change needs a fresh `.tgz` and a re-install. That is
exactly why Route 1 is better once you can publish.

### Route 3 — a local build from this checkout

For working **on** the server. Build it, then point the client at the built entry file.

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

**Inside this repo**, [`.mcp.json`](../.mcp.json) and [`.vscode/mcp.json`](../.vscode/mcp.json) are
already wired to this route via [`scripts/mcp-server.sh`](../scripts/mcp-server.sh) — a wrapper that
resolves both the checkout path and a `node` binary from its own location, so the committed config
works from any working directory even when the client's `PATH` has no nvm on it. That config is
**repo-local by design**: it names a path inside this checkout, so it does nothing in anyone else's
project. To use the server elsewhere, see §4.

---

## 3. Set it up in your client

The server is the same everywhere; only the config file and its key names differ. Name the server
**`bst-table`** so prompts can refer to it consistently.

Every config below is written with the **npm route**. To use another route, swap just the launch
command:

| Route | `command` | `args` |
| --- | --- | --- |
| npm | `"npx"` | `["-y", "@bloomskill/table-mcp"]` |
| tarball (installed globally) | `"bst-table-mcp"` | *(none)* |
| local build | `"node"` | `["/abs/path/packages/mcp/dist/cli.js"]` |

### Claude Code

Use the CLI — it writes the config for you.

```bash
# npm route:
claude mcp add bst-table -s user -- npx -y @bloomskill/table-mcp

# tarball route (after npm i -g the .tgz):
claude mcp add bst-table -s user -- bst-table-mcp

# local build — use your own absolute path:
claude mcp add bst-table -- node /abs/path/packages/mcp/dist/cli.js
```

**`-s user` is the flag that matters** if you want the server in *every* project on the machine —
without it the server is registered for the current directory only. Scopes: `-s local` (default,
this project, just you) · `-s project` (writes a shared `.mcp.json` checked into the repo, so
everyone who clones it gets the server) · `-s user` (all your projects). §4 covers when to use
which. List and remove with:

```bash
claude mcp list
claude mcp remove bst-table
```

> In this repository's shell the `claude` binary is not on `PATH`, so run these from an interactive
> `claude` terminal elsewhere, or edit the config file directly (below).

### Cursor

Write **`~/.cursor/mcp.json`** for all your projects, or `.cursor/mcp.json` inside one project:

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

VS Code's MCP config uses a **`servers`** key and an explicit `type`. For all projects, run
**MCP: Open User Configuration** from the Command Palette; for one project, create
**`.vscode/mcp.json`**:

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

Reload the window, then pick the server from the Copilot Chat tools menu.

### Claude Desktop

Edit **`claude_desktop_config.json`** (there is no per-project scope — this is always global):

- macOS `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows `%APPDATA%\Claude\claude_desktop_config.json`
- Linux `~/.config/Claude/claude_desktop_config.json`

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

Quit and reopen Claude Desktop. The tools appear under the 🔌 (plug) menu.

### Any other MCP client

Launch the server as a subprocess over **stdio**:

| Setting | Value |
| --- | --- |
| Command | `npx` · `bst-table-mcp` · `node` (per the route table above) |
| Args | `["-y", "@bloomskill/table-mcp"]` · *(none)* · `["/abs/path/packages/mcp/dist/cli.js"]` |
| Transport | stdio |
| Env | none required |

---

## 4. Use it in your own projects — and share it with others

§3 registered the server *somewhere*. This section is about **where** that registration lives, which
is the whole difference between "it works in the Bst-Table repo" and "it works in every project my
team touches".

The server itself is portable — it is self-contained, makes no network calls, needs no API key, and
does **not** require the consuming project to have `@bloomskill/table-*` installed. The only thing
that has to be right is the launch command and the scope.

### 4.1 Pick a scope

| Scope | Where it's written | Applies to | Use it when |
| --- | --- | --- | --- |
| **local** (Claude Code default) | your own client config, keyed by directory | one project, one machine, just you | trying it out |
| **project** | `.mcp.json` / `.cursor/mcp.json` / `.vscode/mcp.json` **committed to the repo** | that repo, for everyone who clones it | a team's app consumes Bst-Table |
| **user / global** | `claude mcp add -s user` · `~/.cursor/mcp.json` · VS Code *MCP: Open User Configuration* · `claude_desktop_config.json` | **every project on that machine** | you build Bst-Table grids in more than one repo |

"I want it wherever I'm working" means **user scope**. A project-scoped config only ever applies to
the repo it sits in — which is exactly why this repo's own [`.mcp.json`](../.mcp.json) does nothing
for anyone else.

### 4.2 What a teammate actually does (one time, ever)

Once the package is published (§4.4), the entire setup is one command per person:

```bash
claude mcp add bst-table -s user -- npx -y @bloomskill/table-mcp
claude mcp list        # bst-table → ✓ connected
```

Cursor / VS Code / Claude Desktop users paste the equivalent JSON from §3 into their **user-level**
config instead. Then, in any project:

> Using the bst-table tools, add copy/paste to this grid.

There is nothing to clone, nothing to build, and no repo path to keep in sync. Before publishing,
the same person can use the **tarball** route (§2, Route 2) — install the `.tgz` globally once and
register `bst-table-mcp` at user scope; everything downstream is identical.

### 4.3 Give it to a whole team at once

If a team shares one app repo, commit the server into **their** repo rather than asking each person
to register it. In the consuming project's root:

```json
// .mcp.json  — Claude Code picks this up for everyone who clones the repo
{
  "mcpServers": {
    "bst-table": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@bloomskill/table-mcp"]
    }
  }
}
```

Cursor uses the same shape at `.cursor/mcp.json`; VS Code uses the `servers` key at
`.vscode/mcp.json` (see §3). New teammates get the server on clone, pinned to whatever the registry
serves. Pin it harder with an exact version — `["-y", "@bloomskill/table-mcp@0.32.2"]` — when you
want the docs to match the grid version that project is on.

### 4.4 Publish it so `npx` works

Until `@bloomskill/table-mcp` is on a registry, everyone is stuck on the tarball or a checkout. To
publish:

```bash
npm run build -w @bloomskill/table-engine   # the corpus reads the engine's build output
npm run build -w @bloomskill/table-mcp      # compile + regenerate dist/corpus.json
npm run mcp                                 # §13 DoD gate: tests + stdio smoke + scaffold typecheck
npm publish -w @bloomskill/table-mcp
```

Two things to know:

- **`npm run release` publishes all four packages** and will fail with *403 Forbidden* on
  `table-engine` / `table-mui` / `table-shadcn` if they are already on the registry at the current
  `version.ini` version — npm never allows republishing a version. Either publish the MCP package
  alone as above (its version is free because the *name* has never been published), or
  `npm run version:patch` first and release all four together.
- **Publishing is public and irreversible.** The corpus contains every package README, the §12
  toggle registry, `COVERAGE.md` and all six examples. The three grid packages are already public
  on npm so this is consistent with them — but if Bst-Table is meant to stay internal, publish to a
  private registry / scope instead and have teammates `npm login` once. The client config is
  unchanged either way.

### 4.5 Keeping everyone current

The corpus is generated at build time and pinned to the release it ships with, so a teammate's
answers are only as current as their installed version.

- `npx -y @bloomskill/table-mcp` fetches the latest published version on each run — publish a new
  version after a feature lands and everyone picks it up.
- `bst_detect_version` reports a project's installed `@bloomskill/table-*` versions against what the
  server documents, so drift is visible rather than silent.
- Tarball users must be sent a new `.tgz`; checkout users must re-run
  `npm run build -w @bloomskill/table-mcp`. Both are reasons to prefer §4.4.

---

## 5. Verify it works

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

## 6. The tools

All tools are read-only and take a `response_format` of `markdown` (default) or `json`. Each also
declares an `outputSchema` and returns `structuredContent` validated against it, so a client that
consumes structured output gets typed data without re-parsing the prose. Every flag also carries the
version it shipped in (`since`); pass a project's installed version to `bst_get_feature` as
`installedVersion` and it says plainly whether that flag exists in that version.

| Tool | Use it to… | Example arguments |
| --- | --- | --- |
| `bst_search_docs` | Search everything (READMEs, features, cell types, coverage, API, examples). **Start here.** | `{ "query": "save all edits in one call" }` |
| `bst_get_feature` | Look up one flag, check a spec requirement, or ask if it exists in your version. | `{ "flag": "enableFind", "installedVersion": "0.30.0" }` |
| `bst_get_cell_type` | Get a `meta.type` renderer's value shape + `cellMeta`, or list all 17. | `{ "type": "singleSelect" }` |
| `bst_get_api` | Exact signature of a `@bloomskill/table-engine` export from its built `.d.ts`. | `{ "symbol": "useBstTable" }` |
| `bst_get_example` | Full source of a runnable example app. | `{ "name": "editing" }` |
| `bst_scaffold_grid` | Generate a complete component with dependencies pre-wired. | `{ "adapter": "mui", "features": ["editing","clipboard"], "columns": [{ "id": "name" }] }` |
| `bst_validate_config` | Lint a grid config for unmet dependencies + invented props. | `{ "code": "<BstTableMui showSearch enableGlobalFilter={false} />" }` |
| `bst_detect_version` | Compare a project's installed version to what the server documents. | `{ "path": "/abs/project" }` |

### What the checker catches

`bst_validate_config` exists because Bst-Table's two flag layers — `enable*` (engine behaviour)
and `show*` (adapter chrome) — fail **silently**, not loudly:

- `showSearch` while `enableGlobalFilter` is **off** → the box never renders (chrome never implies behaviour; `showSearch` alone is fine — search defaults on)
- `enableEditing` without `getRowId` → edits land on the wrong row after a sort
- `enableEditing: { mode: 'batch' }` without `onSave` → nothing is ever persisted
- `enableClipboard` → implies `enableCellSelection`; **paste** additionally needs `enableEditing`
- `manualPagination` without `rowCount` → no page count
- `enableLiveUpdates` → **there is no such prop** (I5 live/WebSocket merge isn't built — push updates by replacing `data`)

---

## 7. Prompts (guided workflows)

Prompts appear in the client as reusable actions (in Claude Code, as slash-command-style entries).
Each one hands the agent the right tool order so it doesn't fall back on another library's API.

In clients that support MCP completions, prompt arguments autocomplete to real names —
`bst-quick-start`'s `adapter` to the three skins, `bst-add-feature`'s `feature` to the actual flag
registry — as does the `bst://example/{name}` resource. (`bst-migrate`'s `from` is left free-text by
design — the naming guard keeps competitor product names out of the tree.)

| Prompt | Does |
| --- | --- |
| `bst-quick-start` | Build a new grid from a plain-language description. |
| `bst-add-feature` | Switch a capability on with every dependency it needs. |
| `bst-new-cell-type` | Author + register a custom `CellType`. |
| `bst-migrate` | Port a table from another grid library to Bst-Table. |

---

## 8. Resources

Static, addressable views of the knowledge base — attach them to a conversation without a tool call:

| URI | Contents |
| --- | --- |
| `bst://coverage` | The 58-leaf requirement matrix (built / partial / missing). |
| `bst://features` | Every flag: layer, type, default, status. |
| `bst://cell-types` | All 17 `meta.type` renderers + value shapes. |
| `bst://example/{name}` | Full source of one example (`quick-start`, `editing`, …). |

---

## 9. Typical workflows

**Start a new grid** — invoke `bst-quick-start`, or just ask:

> Build a Bst-Table grid (MUI skin) of orders with inline editing, a status dropdown, and batch
> save. Use the bst-table tools.

The agent detects the version, confirms real flag names, scaffolds, and validates before showing
code — the generated component wires `getRowId`, `onDataChange` and a single-call `onSave` for you.

**Add a feature to an existing grid:**

> Add copy/paste to this grid. [paste your `<BstTableMui .../>`]

It looks up `enableClipboard`, learns it implies `enableCellSelection` (and paste needs editing),
applies the change, and re-validates.

**Migrate off another grid library:**

> Migrate this grid to Bst-Table. [paste code]

It maps each capability to a Bst-Table equivalent, flags anything with no equivalent, and notes
that master-detail / range-selection / clipboard — commonly paid-tier elsewhere — are included here.

---

## 10. How it stays accurate

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

1. Corpus generation **errors** (hard) if a toggle in `BST_SETTINGS_REGISTRY` has no `CLAUDE.md` §12 row.
2. `packages/mcp/src/__tests__/rules.test.ts` **fails** (hard) if a toggle has no entry in
   `packages/mcp/src/rules.ts` (the hand-authored flag-dependency table).
3. A freshness check **warns** (soft) if any indexed source's mtime is newer than the corpus's
   `generatedAt` — i.e. a doc or README was edited without rebuilding the corpus (`findStaleSources`).
   It's a warning, not a failure, so editing docs doesn't break `npm test`; `npm run mcp` builds
   first, so the corpus is always fresh there anyway.

So the rule for adding any Bst-Table feature is unchanged (`CLAUDE.md` §13) — add the §12 row and a
`rules.ts` entry, and the MCP server updates itself.

---

## 11. Build & develop from source

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

## 12. Troubleshooting

| Symptom | Cause & fix |
| --- | --- |
| *404 Not Found* on `npx -y @bloomskill/table-mcp` | Not published yet — use the **tarball** or **local build** route (§2), or publish it (§4.4). |
| *403 Forbidden* on `npm run release` | A package is already on the registry at this version; npm never republishes a version. Publish the MCP package alone, or bump first (§4.4). |
| Server works in the Bst-Table repo but not in my app | That repo's `.mcp.json` is **project-scoped** and points inside the checkout. Register at **user scope** instead (§4.1). |
| Teammate's answers are out of date | Their corpus is pinned to their installed version — publish a new version, or re-send the `.tgz` (§4.5). |
| `corpus not found at …/corpus.json` | Built without the generate step. Run `npm run build -w @bloomskill/table-engine && npm run build -w @bloomskill/table-mcp`. |
| Client shows the server as failed / red | Wrong path in config, or `dist/` not built. Confirm `node /abs/packages/mcp/dist/cli.js` prints `bst-table-mcp-server vX.Y.Z ready (stdio)` then waits. |
| `node: command not found` in this repo's shell | Node lives under nvm here — `export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:$PATH"` first. |
| Tools don't appear after editing config | Fully restart the client (Claude Desktop/Cursor/VS Code cache MCP config at startup). |
| Answers look stale after a feature landed | Rebuild the package so the corpus regenerates: `npm run build -w @bloomskill/table-mcp`. |

Nothing logs to stdout (stdio owns it); the server prints its ready line and any errors to
**stderr**, which the client surfaces in its MCP logs.

---

## 13. Uninstall

- **Claude Code:** `claude mcp remove bst-table`
- **Cursor / VS Code / Claude Desktop:** delete the `bst-table` block from the config file and
  restart the client.

Nothing is installed globally (with `npx`) or outside the repo (with the local build), so removing
the config is a complete uninstall. The **tarball** route is the exception — it installs a global
binary, so also run `npm rm -g @bloomskill/table-mcp`.
