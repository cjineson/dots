# GigBox project guide

Read the section relevant to the current task rather than treating this as a second always-loaded instruction file.

## Architecture

- Expo 57 / React Native 0.86 app. UI screens are in `src/screens/`; app-wide navigation and data handling are in `App.tsx`.
- `src/lib/db.tsx` owns synchronous SQLite persistence and schema migrations.
- `src/types.ts` defines shared models.
- `src/lib/cueDocument.ts` validates and serializes structured cue blocks. Songs retain `notes_raw_text` for legacy/plain-text compatibility; structured content is stored in `cue_document`.
- `src/lib/setlistArchive.ts` handles JSON import/export. Exports use archive version 6 (standalone songs plus optional per-setlist `location`, `latitude`, `longitude`, `notes`, `date`, `time`); imports must continue to accept versions 1 through 6.
- `src/theme.ts` owns `darkTheme`/`lightTheme`/`withHighContrast`; `src/themeContext.tsx` provides `ThemeProvider`/`useTheme`/`resolveTheme`. Screens build styles with `createStyles(theme)` inside `useMemo`; avoid hard-coding text/background colours. Pure logic tests are colocated as `*.test.ts`.
- Settings: `src/lib/settings.ts` (`AppSettings`, parse/serialize, backup reminder rules) persisted in the SQLite `app_settings` key/value table via `getAppSettings`/`saveAppSetting`; `tag_size` and `theme_preference` are separate keys. App-wide state and handlers live in `App.tsx` and are passed to screens as props.
- Other helpers: `notes.ts` (`[ ]` checklist parsing/toggle), `maps.ts` (Open in Maps), `keepAwake.ts`, `useUnsavedChangesPrompt.ts` (react-navigation `beforeRemove` prompt used by the song, setlist and group editors; wrap save actions in `runSave`), `ungrouped.ts` (name of the holding setlist for songs kept ungrouped).
- Songs may be standalone (`songs` row without a `setlist_songs` link) or linked to one or more setlists. Removing a song from its last setlist keeps it standalone unless the user explicitly deletes it.
- Flow view has mutually exclusive header panels (tag size, zoom, auto-scroll). Setlists are reordered by dragging a ☰ handle, shown only while every setlist is collapsed (`reorderSetlistSiblings`).

## Implementation conventions

- Keep business/data logic out of screens when an existing `src/lib/` helper is appropriate.
- Prefer focused edits and existing dependencies; avoid unrelated cleanups and broad dependency upgrades.
- Surface errors using existing repository patterns rather than silently defaulting or swallowing them.
- Keep the app Expo Go compatible; add dependencies with `npx expo install`.
- Preserve existing behavior and UX except where the task explicitly requests a change.

## Validation

- Run `npm run typecheck` and `npm test` for TypeScript or logic changes.
- For Expo configuration or native UI/dependency changes, also run `npx expo-doctor` and `npx expo export --platform ios && npx expo export --platform android`.
- `.github/workflows/ci.yml` runs for PRs targeting `main` on `opened`, `reopened`, and `synchronize`.
- `.github/workflows/deploy.yml` publishes EAS updates on pushes to `main` or manual dispatch.

## Workflow notes

- The user usually wants each request on its own branch and PR, and asks for it explicitly; otherwise do not commit, push or open a PR. Add the `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>` trailer to commits and never commit `dist/`.
- Before opening a PR run typecheck, tests, `npx expo-doctor` (expect 21/21) and `npx expo export --platform android --output-dir /tmp/exp` (delete the directory afterwards). Nothing has been verified on a physical device, so say so in PR descriptions.
- After merging branches, check `package.json` for conflict markers before `npm install`.
