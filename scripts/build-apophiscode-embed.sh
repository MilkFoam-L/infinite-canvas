#!/usr/bin/env bash
# Build the copy embedded in ApophisCode (new-api) under /canvas-app/.
# Usage: scripts/build-apophiscode-embed.sh <new-api>/web/public/canvas-app
set -euo pipefail
out="$(cd "$(dirname "${1:?target directory required}")" && pwd)/$(basename "$1")"
cd "$(dirname "$0")/../web"
bun install --frozen-lockfile
rm -rf dist
VITE_BASE=/canvas-app/ VITE_APOPHISCODE_EMBED=true bunx vite build
rm -rf dist/plugins
# Go's FileServer redirects directory and /index.html requests, so the host loads app.html.
cp dist/index.html dist/app.html
cp ../LICENSE dist/LICENSE.txt
rm -rf "$out"
cp -R dist "$out"
