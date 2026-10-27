#!/usr/bin/env bash
# Like web-dev-clean.sh, but preloads your library from public/dev-seed.json (a GigBox JSON export).
# Usage: scripts/web-dev-live.sh [port]   (default 8081)
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f public/dev-seed.json ]; then
  echo "public/dev-seed.json not found. Export your library from GigBox and save the JSON there (it is git-ignored)." >&2
  exit 1
fi

export EXPO_PUBLIC_DEV_SEED=1
exec scripts/web-dev-clean.sh "$@"
