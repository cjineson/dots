# GigBox project guide

Read the section relevant to the current task rather than treating this as a second always-loaded instruction file.

## Architecture

- Expo 57 / React Native 0.86 app. UI screens are in `src/screens/`; app-wide navigation and data handling are in `App.tsx`.
- `src/lib/db.tsx` owns synchronous SQLite persistence and schema migrations.
- `src/types.ts` defines shared models.
- `src/lib/cueDocument.ts` validates and serializes structured cue blocks. Songs retain `notes_raw_text` for legacy/plain-text compatibility; structured content is stored in `cue_document`.
- `src/lib/setlistArchive.ts` handles JSON import/export. Exports use archive version 4; imports must continue to accept versions 1 through 3.
- `src/theme.ts` owns shared colors and layout tokens. Pure logic tests are colocated as `*.test.ts`.

## Implementation conventions

- Keep business/data logic out of screens when an existing `src/lib/` helper is appropriate.
- Prefer focused edits and existing dependencies; avoid unrelated cleanups and broad dependency upgrades.
- Surface errors using existing repository patterns rather than silently defaulting or swallowing them.
- Preserve existing behavior and UX except where the task explicitly requests a change.

## Validation

- Run `npm run typecheck` and `npm test` for TypeScript or logic changes.
- For Expo configuration or native UI/dependency changes, also run `npx expo-doctor` and `npx expo export --platform ios && npx expo export --platform android`.
- `.github/workflows/ci.yml` runs for PRs targeting `main` on `opened`, `reopened`, and `synchronize`.
- `.github/workflows/deploy.yml` publishes EAS updates on pushes to `main` or manual dispatch.
