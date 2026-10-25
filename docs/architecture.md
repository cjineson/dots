# Architecture

Expo SDK 57 / React Native 0.86 / TypeScript. Local-first: everything lives in SQLite on the device. The app must stay **Expo Go compatible** (use `npx expo install` for dependencies).

## Layout
- `App.tsx` – navigation (react-navigation native stack: Dashboard, Settings, SetlistDetails, GroupEditor, Editor, Flow, Performance), global state (setlists, groups, settings, theme, tag size) and all data handlers. Screens receive state and callbacks as props.
- `src/screens/` – one file per screen.
- `src/components/` – `FontSizeZoomControl` (custom slider with +/- buttons, reused for text size, tag size and auto-scroll speed), `DateTimeField`, `PerformanceCueContent`, `SongTags`.
- `src/lib/` – logic and persistence:
  - `db.tsx` – synchronous SQLite access and migrations
  - `setlistArchive.ts` – JSON export/import
  - `cueDocument.ts` – structured cue blocks (legacy plain text in `notes_raw_text` stays readable)
  - `settings.ts`, `notes.ts`, `maps.ts`, `fontSize.ts`, `songTags.ts`, `dateTime.ts`, `keepAwake.ts`, `useUnsavedChangesPrompt.ts`, `ungrouped.ts`
  - `parser.ts`, `notesMarkdown.ts`, `textEncoding.ts` – Apple Notes import helpers
- `src/theme.ts`, `src/themeContext.tsx` – theming.
- `scripts/` – Apple Notes converter (Python and TypeScript).
- Pure logic tests are colocated as `src/lib/*.test.ts` and run with `npm test`.

## Theming
`darkTheme`, `lightTheme`, the extra `palettes` (pretty, aqua, chill, beige, goth, forest, slate, clay, mono, each with a dark and a light variant) and `withHighContrast` are defined in `theme.ts`. The `palette` app setting defaults to `stage` (dark/light per the theme preference); other palettes pick their dark or light variant from the same preference. `resolveTheme(preference, systemScheme, highContrast, palette)` picks one and `ThemeProvider` supplies it. Screens call `useTheme()` and build styles with `createStyles(theme)` inside `useMemo`; avoid hard-coded text/background colours. Button/icon colours come from `action_primary`, `action_edit`, `action_danger`, `action_copy`, `action_extra` and `on_accent` in the theme; only custom cue colours are fixed. A cue text colour of `#FFFFFF` is treated as "theme text colour".

## Conventions
- Keep business/data logic in `src/lib/`, not screens.
- Surface errors with `Alert` like existing code; do not swallow them silently.
- Prefer focused edits and existing dependencies.
- Preserve existing songs and every archive version when changing storage.
- Editors use `useUnsavedChangesPrompt` (react-navigation `usePreventRemove`, so native-stack blocks the iOS swipe and back button); wrap explicit saves in `runSave` so they are not intercepted.

## Notable behaviours
- Auto-scroll in Flow uses a 50 ms interval with a virtual Y position (avoids Android rounding stalls); it stops at the end and on drag.
- The slider uses `pageX` + `measureInWindow` when `locationX` is undefined (web) to avoid NaN values.
- Songs may be standalone rows in `songs` or linked to setlists through `setlist_songs`. Removing the last setlist link leaves the song standalone; permanent deletion is explicit.
