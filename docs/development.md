# Development

## Setup
```sh
git clone https://github.com/cjineson/dots.git
cd dots
npm install
npx expo start
```
Open in Expo Go, a simulator or the web build.

The Expo display name and project slug are now `Dots`/`dots`, with new iOS and Android
application identifiers `com.cjineson.dots`. The SQLite filename and archive discriminator
are intentionally retained so existing local libraries and backups remain compatible; see
[Data and archives](data-and-archives.md).

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
The suite in `e2e/` runs against the Expo **web** export (`web-dist/`, served by `e2e/serve.mjs` with cross-origin isolation headers). `expo-sqlite`'s web build can't handle the app's synchronous startup queries, so on web only, `metro.config.js` swaps it for an in-memory `sql.js` shim (`src/web/sqliteShim.ts`) and `index.web.js` waits for it before starting the app. Native builds are unaffected. Each page load starts with an empty database. Native-only features (date pickers, haptics, location) are not covered.

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
Local P2P sync, checking light-mode contrast of fixed accent colours, and an up/down fallback for reordering long setlists if drag auto-scroll stays unreliable on iOS. Open in Maps from the dashboard and drag-and-drop reordering already exist.

## Web dev server with your own library

The web build keeps its database in memory, so it starts empty on every page load. Two scripts start the dev server:

- `scripts/web-dev-clean.sh [port]` starts with an empty database.
- `scripts/web-dev-live.sh [port]` first imports `public/dev-seed.json` (default port 8081). It exits with a message if that file is missing.

To preload your own setlists:

1. In the real Dots app, go to Settings → Export and save the JSON archive to your computer.
2. Put it at `public/dev-seed.json` in the repository, creating `public/` if needed. The file is git-ignored, so it is never committed or pushed.
   - Locally: copy or save the file to that path.
   - In a Codespace: in the VS Code Explorer, right-click the `public` folder and choose **Upload…**, pick the file, then rename it to `dev-seed.json` (F2). Drag and drop may not work; alternatively right-click `public` → **New File…**, name it `dev-seed.json` and paste the JSON contents.
3. Run `scripts/web-dev-live.sh`. The library is re-imported on every page reload, so edits made in the browser are lost on reload.

The seed is only loaded when `EXPO_PUBLIC_DEV_SEED=1` (set by `web-dev-live.sh`) in the dev server, never by the e2e export or a production build. Settings → Import also works in the web build for a one-off load without a seed file.
