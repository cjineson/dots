# Development

## Setup
```sh
npm install
npx expo start
```
Open in Expo Go, a simulator or the web build.

## Validation
Run before opening a PR:
```sh
npm run typecheck
npm test
npx expo-doctor                                   # expect 21/21
npx expo export --platform android --output-dir /tmp/exp && rm -rf /tmp/exp
```
CI (`.github/workflows/ci.yml`) runs on PRs to `main`; see [ci-and-releases.md](ci-and-releases.md). Nothing in CI exercises the UI, so test screens on a device or Expo Go, and say in the PR description when you have not.

## Browser (Playwright) tests
```sh
npx playwright install chromium   # once
npm run test:e2e
```
The suite in `e2e/` runs against the Expo **web** export (`web-dist/`, served by `e2e/serve.mjs` with cross-origin isolation headers). `expo-sqlite`'s web build can't handle the app's synchronous startup queries, so on web only, `metro.config.js` swaps it for an in-memory `sql.js` shim (`src/web/sqliteShim.ts`) and `index.web.js` waits for it before starting the app. Native builds are unaffected. Each page load starts with an empty database. `scripts/web-dev-clean.sh` starts the web dev server with that empty database; `scripts/web-dev-live.sh` first imports your own library: export it from the app and save the JSON as `public/dev-seed.json` (git-ignored; in a Codespace, drag the file into the `public/` folder in the Explorer, no push needed). Settings → Import also works in the web build for one-off loads, but the in-memory database is lost on reload. The seed is only loaded by the dev server, never by the e2e export. Native-only features (date pickers, haptics, location) are not covered.

## Workflow
- One branch and PR per request. Do not commit, push or open a PR unless asked.
- Commits include the trailer `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`.
- Never commit generated `dist/` output.
- Keep the app Expo Go compatible; add native-module dependencies with `npx expo install`.
- Preserve existing songs and version 1 archive imports.

## Gotchas
- After merging branches, check `package.json` and `package-lock.json` for conflict markers before `npm install`.
- A `git stash pop` after merges can conflict on `package.json`; restore with `git checkout HEAD -- package.json package-lock.json`, then `npm install`.
- Web has no `locationX` on touch events (the slider handles this) and no native date pickers (text fallback).

## Agent handoff
`./etc/agent-context.sh` prints a compact repo snapshot; see [`../etc/agent-handoff.md`](../etc/agent-handoff.md) and [`../etc/agent-project-guide.md`](../etc/agent-project-guide.md).

## Ideas not yet built
Open in Maps from the dashboard, real drag-and-drop for setlists, local P2P sync, checking light-mode contrast of fixed accent colours.
