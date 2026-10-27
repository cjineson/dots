#!/usr/bin/env bash
# Starts the Expo web dev server with an empty in-memory database and opens the app in a browser.
# Usage: scripts/web-dev-clean.sh [port]   (default 8081). See web-dev-live.sh to preload your own library.
set -euo pipefail

cd "$(dirname "$0")/.."
PORT="${1:-8081}"

if [ -n "${CODESPACE_NAME:-}" ]; then
  URL="https://${CODESPACE_NAME}-${PORT}.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}"
else
  URL="http://localhost:${PORT}"
fi

open_url() {
  if [ -n "${BROWSER:-}" ]; then "$BROWSER" "$1"
  elif command -v open >/dev/null; then open "$1"
  elif command -v xdg-open >/dev/null; then xdg-open "$1"
  else echo "Open $1 in your browser."; fi
}

[ -d node_modules ] || npm install

(
  for _ in $(seq 1 120); do
    if curl -s -o /dev/null "http://localhost:${PORT}"; then
      echo "Opening ${URL}"
      open_url "$URL" >/dev/null 2>&1 || echo "Open ${URL} in your browser."
      exit 0
    fi
    sleep 1
  done
  echo "Dev server did not start within 2 minutes." >&2
) &

exec npx expo start --web --port "$PORT"
