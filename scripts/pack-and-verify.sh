#!/usr/bin/env bash
# Portability proof: pack @bloomskill/table-engine, @bloomskill/table-mui, @bloomskill/table-shadcn as real npm
# tarballs, install them into a throwaway project OUTSIDE this workspace, then
# build + test there. If this passes, the packages are portable to any app.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
PACKED="$ROOT/.packed"
rm -rf "$PACKED"; mkdir -p "$PACKED"

echo "==> Building packages"
npm run build -w @bloomskill/table-engine
npm run build -w @bloomskill/table-mui
npm run build -w @bloomskill/table-shadcn

echo "==> Packing tarballs -> $PACKED"
npm pack -w @bloomskill/table-engine --pack-destination "$PACKED" >/dev/null
npm pack -w @bloomskill/table-mui     --pack-destination "$PACKED" >/dev/null
npm pack -w @bloomskill/table-shadcn  --pack-destination "$PACKED" >/dev/null
ls -1 "$PACKED"

ENGINE_TGZ="file:$(ls "$PACKED"/bloomskill-table-engine-*.tgz)"
MUI_TGZ="file:$(ls "$PACKED"/bloomskill-table-mui-*.tgz)"
SHADCN_TGZ="file:$(ls "$PACKED"/bloomskill-table-shadcn-*.tgz)"

CONSUMER="$(mktemp -d)"
echo "==> Consumer project (outside workspace): $CONSUMER"
cp -r "$ROOT/scripts/consumer-template/." "$CONSUMER/"
sed -e "s|__ENGINE_TGZ__|$ENGINE_TGZ|" \
    -e "s|__MUI_TGZ__|$MUI_TGZ|" \
    -e "s|__SHADCN_TGZ__|$SHADCN_TGZ|" \
    "$ROOT/scripts/consumer-template/package.json" > "$CONSUMER/package.json"

cd "$CONSUMER"
echo "==> npm install (fresh, no workspace)"
npm install --no-audit --no-fund

echo "==> vitest (runtime portability)"
npx vitest run

echo "==> vite build (bundle portability)"
npx vite build

echo
echo "PORTABILITY VERIFIED ✅  (packed tarballs installed + built + tested in $CONSUMER)"

# --- MCP server: prove `npx @bloomskill/table-mcp` works with NO repo present ---
# Its knowledge base is generated at build time into dist/corpus.json; if that
# file were missing from the tarball the server would boot into an empty state,
# so install it standalone and make it answer a real tool call.
echo
echo "==> MCP server portability"
cd "$ROOT"
npm run build -w @bloomskill/table-mcp
npm pack -w @bloomskill/table-mcp --pack-destination "$PACKED" >/dev/null
MCP_TGZ="file:$(ls "$PACKED"/bloomskill-table-mcp-*.tgz)"

MCP_CONSUMER="$(mktemp -d)"
echo "==> MCP consumer (outside workspace): $MCP_CONSUMER"
cd "$MCP_CONSUMER"
npm init -y >/dev/null
npm install --no-audit --no-fund "$MCP_TGZ" >/dev/null

# Quoted heredoc delimiter — the script contains ${...} that bash must not expand.
cat > mcp-check.mjs <<'MCPCHECK'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

const client = new Client({ name: 'portability', version: '1.0.0' })
await client.connect(
  new StdioClientTransport({
    command: 'node',
    args: ['node_modules/@bloomskill/table-mcp/dist/cli.js'],
  }),
)

const { tools } = await client.listTools()
if (!tools.length) throw new Error('MCP server exposed no tools')

// A real answer proves the corpus shipped inside the tarball.
const res = await client.callTool({ name: 'bst_get_feature', arguments: { flag: 'enableClipboard' } })
const text = res.content.map((c) => c.text).join('')
if (!text.includes('enableCellSelection')) throw new Error('corpus missing from the published tarball')

await client.close()
console.log(`   ${tools.length} tools answered from the packaged corpus`)
MCPCHECK

node mcp-check.mjs

echo
echo "MCP PORTABILITY VERIFIED ✅  (npx-installable, corpus baked into the tarball)"
