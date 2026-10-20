# Agent instructions

Before editing, read the relevant part of `README.md` and inspect only the files needed for the task.

## Shell commands

- If `rtk` is installed, prefix shell commands with it (e.g. `rtk git status`, `rtk npm test`). Use `rtk bypass <cmd>` only when condensed output is unusable. See `CLAUDE.md`.

## Preserve

- Keep the app compatible with Expo Go.
- Preserve existing songs and version 1 JSON archive imports.
- Do not commit, push, or open a PR unless the user asks.
- Do not include generated `dist/` exports in commits.

## References

- Human-facing docs are in [`docs/`](docs/README.md).
- Read [`etc/agent-project-guide.md`](etc/agent-project-guide.md) for the project map, implementation conventions, and validation commands.
- Run [`etc/agent-context.sh`](etc/agent-context.sh) to prepare a compact repository snapshot for a handoff.
- See [`etc/agent-handoff.md`](etc/agent-handoff.md) for efficient handoff and task-prompt guidance.
