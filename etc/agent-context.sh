#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

printf '%s\n' '# Dots agent context'
printf '\n%s\n' '## Repository state'
printf 'Branch: %s\n' "$(git branch --show-current)"
printf 'Latest commit: %s\n' "$(git log -1 --format='%h %s')"

if [[ -n "$(git status --porcelain)" ]]; then
  printf '%s\n' 'Worktree: changes present'
  git status --short
else
  printf '%s\n' 'Worktree: clean'
fi

printf '\n%s\n' '## Recent commits'
git log -5 --format='- %h %s'

printf '\n%s\n' '## Project scripts'
npm run

printf '\n%s\n' '## Workflow triggers'
for workflow in .github/workflows/*.yml .github/workflows/*.yaml; do
  [[ -f "$workflow" ]] || continue
  printf '\n### %s\n' "$workflow"
  awk '
    /^name:/ { print; next }
    /^on:/ { printing=1; print; next }
    printing && /^[^[:space:]#]/ { exit }
    printing { print }
  ' "$workflow"
done

printf '\n%s\n' '## Source map'
find src -maxdepth 2 -type f -not -path '*/__tests__/*' -print | sort

printf '\n%s\n' '## Agent guidance'
printf '%s\n' '- Always-loaded essentials: AGENTS.md'
printf '%s\n' '- Project architecture and validation: etc/agent-project-guide.md'
printf '%s\n' '- Handoff template: etc/agent-handoff.md'
