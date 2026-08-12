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
