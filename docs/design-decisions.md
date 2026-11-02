# Design decisions

Why Dots works the way it does, distilled from the project's history (56 PRs in the original `cjineson/gigbox` repository, before the rename to Dots). Read this before changing a behaviour listed here, and add to it when you make a decision a future contributor or agent would otherwise have to rediscover.

PR numbers (`#n`) refer to the old `cjineson/gigbox` repo. The full PR descriptions are archived in [history/gigbox-pr-archive.md](history/gigbox-pr-archive.md), and the commits themselves are in this repo's Git history.

## Product principles

- **Stage-first.** The Performance and Flow views exist to be read at a glance, in poor light, on a phone or tablet. Readability beats density: large text, high contrast, no overlap with controls on small screens (#6, #19, #57).
- **Local-first, no account.** All data lives in on-device SQLite. There is no login, analytics or cloud. Future sync should add to this, not require a service (README, #5).
- **Never lose a user's library.** Schema changes are additive migrations; every archive version stays importable; destructive actions are confirmed twice (#6, #15, #32).
- **Expo Go compatible.** No custom native modules. Add dependencies with `npx expo install` (#3, #8).
- **Musicians paste text.** The song editor is text-first: lyrics, chords or tabs pasted in one block, with headings and tables optional (#56).

## Data model

- **Songs are shared by default.** Copying a song to another setlist, or copying a setlist, links the *same* song row, so edits and tags show everywhere (#16, #19). Copying within the same setlist creates an independent **version** (own chords/notes) and asks for a distinguishing tag such as Piano/Guitar (#49, #50).
- **Same title plus the same tags is blocked within a setlist** (editor save, copy, version). Imports are not checked (#50).
- **Songs can be standalone.** A `songs` row with no `setlist_songs` link is valid, and can sit at top level or in a group (`songs.group_id`, `songs.sort_order`). Removing a song from its last setlist keeps it standalone unless the user explicitly deletes it. The old "Ungrouped songs" holding setlist was migrated away (#33, #51, #53).
- **Groups are one level deep** and removing a group never deletes its setlists or songs; they move to the top level (#17, #53).
- **Cue content is a versioned `cue_document`** (blocks, styles, tables). Plain-text `notes_raw_text` is kept for legacy songs. Cue text saved as pure white (`#FFFFFF`) means "theme text colour" so it stays readable in light mode (#8, #30).
- **Text size**: songs without their own size follow the default setting; per-song and per-block sizes can be cleared with "Reset all song text sizes". Maximum size is 128 (#21, #53).
- **Tags** have 13 soft colours. Older app versions reject archives using the newer colours (#49).
- **SQLite file is still `gigbox.db`** and the archive format string is still `gigbox-setlists`. Both were kept deliberately in the Dots rebrand so existing libraries and backups keep working. Do not rename them without a migration.

## Archives (JSON)

- Versions: v2 structured cues, v3 breaks, v4 setlist location/date/time, v5 groups plus map position and notes, v6 standalone songs. **Imports accept v1 to v6**; exports are v6 (#5, #8, #15, #17, #51).
- Export is a checklist (groups, setlists, individual songs). Choosing only some songs of a setlist writes a `partial` setlist, still valid v5/v6 (#48).
- Import warns on name clashes and offers **Replace / Add as copies / Cancel**. Replacing a partial setlist only updates or adds the songs it contains. Only a *full* export resets the backup reminder (#48).
- The importer decodes UTF-8 and UTF-16 explicitly and can extract JSON from an Apple binary property list, because files arriving via iCloud/Files were wrapped that way. Failures show a selectable error dialog (#14).
- Standalone-song group membership is not stored in archives (#53).
- Any format change needs tests in `setlistArchive.test.ts` and must keep v1 import working.

## Views and interaction

- **Dashboard**: collapsible groups and setlists; their expanded/collapsed state persists. Reordering (drag handle) is only offered when all visible setlists are collapsed, because dragging inside expanded lists fought with scrolling. The nested drag activation distance was raised for the same reason (#14, #38, #37).
- **One "+" menu per level** instead of many buttons: top level (song, group, setlist, setlist from existing), group (setlist, song) and setlist (new song, copy song, existing song, break) (#38, #52, #53). Tapping a song title opens Performance (no separate play button on songs); setlists have a play-circle button, breaks have none (#38, #41, #44).
- **Flow** (whole setlist, vertical) and **Performance** (one song, swipe between) are distinct on purpose. Flow carries the setlist notes/checklist and auto-scroll; Performance focuses on the current song, so setlist and event details were removed from it (#19, #32).
- **Zoom and tag-size controls are on demand**, mutually exclusive header panels. A visible always-on slider cost too much screen (#20, #21, #23, #26). Zoom is hidden when no song has cue text (#56).
- **Editing during a gig is deliberate**: inline editing in Flow/Performance sits behind a pencil toggle with Save/Cancel; swiping and crawl are disabled while editing. Flow keeps its scroll position across edit/save/cancel (#51, #57).
- **Auto-scroll** in Flow uses a 50 ms tick and a virtual Y position, because Android rounds small scroll offsets to zero and stalls. The speed slider is weighted to the slow end (range 1 to 200), with a separate crawl control in Performance (tortoise icon) (#32, #44).
- **Sliders** fall back to `pageX` with `measureInWindow` when `locationX` is undefined (web), to avoid NaN (#27, #32).
- **Unsaved changes**: editors use `usePreventRemove` so native-stack blocks the iOS edge swipe and header back; explicit saves go through `runSave` so they are not intercepted. Needs a device check when touched (#32, #48).
- **Navigation**: native stack, so platform back gestures work and the app rotates with the device (#4).
- **Settings cog is top-right on every screen** (#53). Bar sizes use T-shirt sizes XXS to XL; old normal/large/huge map to M/L/XL (#50).
- **Search** (title or tag) on the dashboard jumps to and highlights a song; in Performance it opens the chosen song (#53).
- **Hover tooltips were skipped**: no consistent hover model across iPad and web without adding a dependency. Buttons keep accessibility labels instead (#15).

## Location and dates

- Date and time use native pickers (Expo Go compatible) stored as `YYYY-MM-DD` and `HH:mm`; legacy free text still displays and can be cleared. Web falls back to text inputs (#32).
- Location keeps free text as an override, plus "Use current location" and "Find on map" which save optional `latitude`/`longitude`. Open in Maps uses the pin, else the typed text (#32).
- The Maps pin was removed from Flow and lives with the dashboard location text; dashboard headers put location, then date/time, on separate lines for narrow iPhones (#41, #42, #43, #44).

## Theming

- `ThemeProvider`/`useTheme`; styles are built per theme with `createStyles(theme)` in `useMemo`. Never hard-code text or background colours (#30).
- Palettes (stage, pretty, aqua, chill, beige, goth, forest, slate, clay, mono) each have dark and light variants chosen by the Dark/Light/System preference, plus a high-contrast overlay (#44, #45, #49). A stored `girlie` palette value migrates to Pretty.

## Things tried and reversed

Useful so they are not repeated blindly:

- **Branded splash screen with a minimum display time** (2 s, then 5 s): removed. It delayed startup for no benefit, and the app now shows as soon as the database is ready, with a retryable error if initialisation fails (#9 to #12).
- **Always-visible zoom sliders in Flow and Performance** (#21): reverted (#22) and replaced with on-demand zoom plus a separate tag-size slider (#23, #26).
- **Setlist reorder via up/down chevrons** (#36, #37): replaced by the drag handle (#38).
- **Hard-coded "Copy N" title suffix** for copied songs: replaced by a tag-based version prompt (#50).
- **Branded wordmark as a full-width splash image and large dynamic logo sizing**: a fixed-size logo in Flow and Performance avoids tablet blow-up (#34, #35).
- **Stacked PRs**: #34 merged into a stale branch instead of main and was redone as #35. Prefer branches off `main`.

## Known gaps and ideas

- Nothing has been verified on a physical device or in Expo Go for most recent work; say so in PR descriptions.
- Guitar-tab alignment needs a monospace font, which is not used (#56).
- Not built: Open in Maps from the dashboard card beyond the pin, local peer-to-peer sync, light-mode contrast checks for fixed accent colours (see [development.md](development.md)).
- Publishing prerequisites: square app icon and splash, `userInterfaceStyle` set to `automatic`, `eas.json` production and submit profiles (see [publishing.md](publishing.md)).

## Validation habits that held up

Typecheck, `npm test`, `npx expo-doctor`, and `npx expo export` for iOS and Android were run on almost every PR. `.npmrc` sets `legacy-peer-deps=true` because `@react-native-community/datetimepicker` has an optional `react-native-windows` peer that conflicts with React Native 0.88 and would break `npm ci` (#46). After merging branches, check `package.json` for conflict markers before `npm install`.
