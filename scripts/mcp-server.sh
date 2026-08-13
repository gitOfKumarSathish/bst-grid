#!/usr/bin/env bash
# Launch the @bloomskill/table-mcp stdio server for MCP clients (Claude Code, VS Code, ...).
#
# Why a wrapper instead of `node packages/mcp/dist/cli.js` straight from the config:
#   - clients spawn the server with THEIR cwd, which is not always the repo root, so a
#     relative script path can resolve to nothing;
#   - clients spawn it with THEIR PATH, which under nvm frequently has no `node` at all
#     (nvm lives in an interactive shell rc, not in a GUI/daemon environment).
# Both are resolved here from the script's own location, so one committed config works
# from any directory on any machine.
#
# stdout is the JSON-RPC channel: every diagnostic below MUST go to stderr.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVER="$ROOT/packages/mcp/dist/cli.js"

find_node() {
  if command -v node >/dev/null 2>&1; then
    command -v node
    return 0
  fi
  local dir latest
  for dir in "${NVM_DIR:-$HOME/.nvm}" "$HOME/.nvm" /home/*/.nvm; do
    [ -d "$dir/versions/node" ] || continue
    latest="$(ls -1 "$dir/versions/node" 2>/dev/null | sort -V | tail -1)"
    if [ -n "$latest" ] && [ -x "$dir/versions/node/$latest/bin/node" ]; then
      echo "$dir/versions/node/$latest/bin/node"
      return 0
    fi
  done
  for dir in /usr/local/bin /opt/homebrew/bin /usr/bin; do
    if [ -x "$dir/node" ]; then
      echo "$dir/node"
      return 0
    fi
  done
  return 1
}

if ! NODE="$(find_node)"; then
  echo "bst-table-mcp: no node found on PATH, \$NVM_DIR, ~/.nvm or /usr/local/bin." >&2
  exit 127
fi

if [ ! -f "$SERVER" ]; then
  echo "bst-table-mcp: $SERVER is missing — run: npm run build -w @bloomskill/table-mcp" >&2
  exit 1
fi

exec "$NODE" "$SERVER" "$@"
