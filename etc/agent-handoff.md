# Low-context agent handoff

## Prepare a handoff

From the repository root, run:

```sh
./etc/agent-context.sh
```

The output contains the current branch and worktree state, recent commit subjects, project scripts, workflow trigger summaries, a compact source-file map, and links to the small set of project guidance files. It deliberately avoids printing file contents, environment variables, credentials, or the full Git diff.

Paste that output into the next agent conversation, then give one concrete task and its constraints. The next agent can read `AGENTS.md` for essential guardrails and consult `etc/agent-project-guide.md` only when project-specific architecture or validation details are needed. For example:

> Use the repository context below. Please fix [specific behavior] in [known screen/module]. Preserve [compatibility requirement]. First inspect only relevant files, implement the change, and run `npm run typecheck` and `npm test`. Do not commit or push. Report changed files, validation, and remaining concerns.

## Keep requests efficient

- State the expected behavior and how it can be verified.
- Name known files or symbols when you have them; otherwise ask for a focused search.
- Mention any task-specific constraints once rather than repeating the whole project history; essential project guardrails are already in `AGENTS.md`.
- For a single continuous issue, ask the agent to trace it end-to-end rather than splitting it into parallel research tasks.
- Ask for a short progress/result summary; request code excerpts only when needed.
- Keep `AGENTS.md` short because it is loaded for routine repository work. Put detailed, opt-in project guidance in `etc/agent-project-guide.md` and link to it rather than copying it into prompts.
