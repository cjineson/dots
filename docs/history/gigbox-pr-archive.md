# GigBox PR archive

Verbatim PR titles and descriptions from the original `cjineson/gigbox` repository (PRs #1 to #57), kept here when the project was renamed to Dots so the design context travels with the code. PR numbers refer to that old repository. Product names in the text say "GigBox"; the app is now Dots.

For the distilled rationale, read [../design-decisions.md](../design-decisions.md) first and search this file only for detail.

### #1 chore: upgrade Expo SDK to 57 (closed, not merged)


### #2 chore: bump Expo SDK to 57 (deps-only) (closed, not merged)
Deps-only PR for Expo SDK 57. CI validates Expo Doctor, typecheck, and export, and uploads logs. Do not merge until validation passes.

### #3 Upgrade to Expo SDK 57 and fix typecheck 
Upgrade Expo, React Native, React, and TypeScript to SDK 57, add CI validation for Expo Doctor, typecheck, and iOS/Android export, and restore the app source files to their intended paths to resolve the existing TypeScript errors.

Validation: npx expo-doctor passes (21/21); npm run typecheck passes; npx expo export --output-dir dist --platform ios --platform android succeeds.

Supersedes the deps-only PR #2 so the upgrade and required app fixes can be reviewed together.

### #4 Support device orientation and native back gestures 
Allow the app to rotate with the device and use a native navigation stack for standard back navigation, including the platform edge-swipe gesture. The performance screen now uses the native stack header, and returning from performance restores the screen the user came from.

Validation: Expo Doctor (21/21), TypeScript typecheck, and iOS/Android Expo export all pass.

### #5 Add song reordering and JSON library sharing 
Implement the three completed README roadmap items: drag-and-drop song ordering with persisted sort order, responsive font sizing for long performance cues, and versioned JSON export/import for the full setlist library. Imports are validated and added as new copies, preserving existing local data. The README now documents the shipped features.

Validation: TypeScript typecheck passes, Expo Doctor passes (21/21), iOS and Android Expo exports pass, and archive round-trip/unsupported-format validation passes.

### #6 Keep multiline song cues in one responsive box 
Fix performance view layout so the native song title/header flows above the content without overlapping the cue area in landscape. Each song now renders as one tappable box with original line breaks preserved. Add per-song A−/A+ controls; selected base font size is persisted locally and included in JSON export/import, while long content automatically scales down to fit. Existing databases migrate to the new font_size column, and older JSON exports remain importable.

Validation: TypeScript typecheck, Expo Doctor (21/21), iOS and Android export, plus focused multiline parsing and JSON compatibility checks.

### #7 Add branding and performance song swipes 
## Summary
- Add the supplied GigBox wordmark to the dashboard and configure the splash screen artwork.
- Enable left/right swipes in performance mode to move through songs in the current setlist, bounded at the first and last songs.
- Keep cue boxes display-only; remove the ineffective tap-to-activate behavior.
- Document performance swipe navigation in the README.

## Validation
- `npm run typecheck`
- `npx expo export --platform ios`
- `npx expo export --platform android`

### #8 Tidy workflows and add structured cue formatting 
## Summary
- Rename the validation workflow to CI and the EAS update workflow to Deploy; remove the debug workflow.
- Simplify Dashboard controls, group distinct colored import/export icons at bottom right, and move performance zoom controls into a custom top bar.
- Replace the setlist-name input with a quick `+ Setlist` action and remove the marketing strapline.
- Add Expo Go-compatible cue sections, per-block font sizes and colors, and editable tables. Store these in a versioned cue document while preserving existing plain-text cues.
- Export archive version 2 and continue importing version 1 archives.

## Validation
- `npm run typecheck`
- `npm test` (13 tests)
- `npx expo-doctor` (21/21)
- iOS and Android Expo exports

### #9 Add flow mode and import Apple Notes setlists 
## Summary
- Keep CI limited to PR open, reopen, and synchronize events targeting `main`; retain EAS publishing on pushes to `main` or manual dispatch.
- Add concise repository agent guidance and a compact context/handoff helper.
- Hold the native splash screen for at least two seconds.
- Add a vertical Flow view for whole setlists, setlist rename/delete actions, a rendered cue preview, and saved per-song zoom across Flow and single-song performance.
- Add `npm run convert:notes -- <input> [output]` for plain Markdown and ZIP-wrapped Apple Notes Markdown exports. It converts multiple setlists to a GigBox JSON archive for import through the dashboard. Validated against the supplied sample: 33 songs across two setlists.

## Validation
- `npm run typecheck`
- `npm test` (17 tests)
- `npx expo-doctor` (21/21 checks)
- `npx expo export --platform ios`
- `npx expo export --platform android`
- Converter run against the supplied Apple Notes export

### #10 Add setlist and song copy actions 
## Summary
- Fix splash startup behavior so the branded native splash is shown without a React spinner; display a retryable error if database initialization fails.
- Add a copy action to each setlist. Copies include independent song records so edits to the copy do not affect the original.
- Add a song copy icon that opens a destination setlist picker; choosing the current setlist creates a duplicate there.
- Replace the dashboard text Edit/Play actions with accessible icon buttons.
- Provide a standalone, standard-library Python converter for plain Markdown or ZIP-wrapped Apple Notes exports. It requires no `npm install`, third-party Python packages, or external `unzip` command. Run `python3 scripts/convert-notes.py "/path/to/Apple Notes Export.zip"`; then import the generated `.gigbox.json` in the app. The supplied Notes sample converts to 33 songs across two setlists.

## Validation
- `python3 -m unittest discover -s scripts -p 'test_*.py' -v` (3 tests)
- `npm run typecheck`
- `npm test` (17 tests)
- `npx expo-doctor` (21/21 checks)
- iOS and Android Expo exports
- Standalone converter run against the supplied Notes ZIP

### #11 Improve splash screen visibility 
## Summary
- Keep the branded splash visible for at least five seconds during startup.
- Increase the dedicated splash artwork width from 240 to 320 points so it is easier to see on iPhone and iPad.
- Use a short 200 ms fade-out transition.

## Validation
- npm run typecheck
- npx expo config --type public

### #12 Remove branded splash screen and startup delay 
## Summary
- Remove the custom splash image configuration while keeping the PNG asset in the repository.
- Remove the five-second startup hold and show the app as soon as database initialization finishes.
- Preserve the existing startup error and retry handling.

## Validation
- npm run typecheck
- npx expo config --type public

### #13 Make import errors easy to share (closed, not merged)
## Summary
Add an in-app import failure dialog that displays the full error, allows selecting its text, and provides a Copy error button. This makes JSON import failures easier to diagnose when device logs are difficult to retrieve.

## Validation
- npm run typecheck
- npm test (17 tests)
- npx expo install --check

### #14 Fix imports and improve dashboard performance 
## Summary
Combine the JSON import fixes and dashboard/performance updates into one deployable PR.

### JSON import and diagnostics
- Show import failures in an in-app dialog with selectable details and a Copy error action.
- Read picked files with the Expo File API; decode UTF-8 and UTF-16 explicitly.
- Recognize Apple binary property-list-wrapped GigBox archives and extract the embedded JSON; report unsupported formats with useful diagnostics.

### Dashboard and performance views
- Increase nested song-list drag activation distance so ordinary vertical scrolling is less likely to be captured as a reorder gesture; long-press drag handles remain available.
- Hide converter-generated Key / capo, Chords, Lyrics / cues, and Additional notes labels in Flow and Performance.
- Group their values into a single row of columns while preserving custom sections and existing tables.

## Validation
- npm run typecheck
- npm test (23 tests)
- npx expo install --check

### #15 Add standalone breaks and setlist event details 
## Summary
- Add first-class, ordered break items with optional display-only duration; breaks can be added, reordered, deleted, and shown as interstitials in Flow and Performance.
- Add optional location, date, and time fields to setlist details and show them in Dashboard, Flow, and Performance headers.
- Restore song deletion and keep song/setlist delete actions at the far right.
- Migrate local SQLite data safely and export archive version 4 while continuing to import versions 1–3.

Hover tooltips are not included: a consistent hover interaction is not available across the native iPad app and web without introducing a tooltip dependency. Existing button labels remain accessible, and the new break control has an accessibility hint.

## Validation
- `npm run typecheck`
- `npm test` (26 tests)
- `npx expo-doctor`
- iOS and Android Expo exports

### #16 Add song tags and improve editor preview 
## Summary
- Add multiple colored song tags, persist them with song records, include them in JSON archives, and show them in Flow and performance views.
- Link copied songs and setlist copies to the same song records so edits and tags are shared across setlists.
- Improve the song editor with multiline table cells, prominent Save/Cancel actions, a compact performance-style cue preview, and a full performance preview that returns to the unsaved editor draft.

## Validation
- `npm run typecheck`
- `npm test` (27 tests)
- iOS and Android Expo exports
- `git diff --check`

Expo Doctor reports the pre-existing Expo patch mismatch: installed 57.0.28, expected ~57.0.30.

### #17 Add grouped setlists and dashboard controls 
## Summary
Add one-level setlist groups and collapsible dashboard organization while keeping existing setlists and song data intact. This also includes the remaining song-tag and dashboard refinements developed after PR #16.

## Changes
- Add, rename, and remove groups; removing a group preserves its setlists at the dashboard root.
- Assign setlists to a group or keep them at the root, and persist collapsed/expanded group and setlist state.
- Extend JSON backups to version 5 for group data while preserving imports from versions 1–4.
- Add ranked quick-pick song tags, refine their performance header placement, and reorder dashboard song actions to Play, Edit, Copy, Delete.
- Label the dashboard Import and Export actions.

## Validation
- `npm run typecheck`
- `npm test` (30 tests)
- `npx expo-doctor`
- iOS and Android Expo exports

### #18 Move setlist and group editing to dedicated screens 
## Summary
Move setlist and group editing out of dashboard dialogs into dedicated screens, giving the forms room to grow and keeping fields accessible while the keyboard is open.

## Changes
- Add dedicated screens to edit setlist details and create or rename groups.
- Keep Add Break and Copy Song dialogs keyboard-aware and independently scrollable.
- Show song tags inline beside dashboard song titles and at the upper-right of Flow song titles to avoid adding vertical scrolling.

## Validation
- `npm run typecheck`
- `npm test` (30 tests)
- `npx expo-doctor`
- iOS and Android Expo exports

### #19 Refine setlist organization and performance views 
## Summary
Refine dashboard organization and stage-facing views for better focus and less wasted space.

## Changes
- Keep song tags inline with titles while giving them more room and spacing from dashboard actions.
- Move setlist and group editing to dedicated keyboard-aware screens; make remaining dashboard dialogs keyboard-aware.
- Compact and soften Flow headers, placing event details beside the setlist title.
- Remove setlist and event details from Performance so it focuses on the current song.
- Remove the accent-colored rail beside grouped setlists while retaining indentation to show hierarchy.

Songs copied between setlists continue to share the same database record; song edits and tags appear across every linked setlist.

## Validation
- `npm run typecheck`
- `npm test` (30 tests)
- Expo Doctor (21/21 checks)
- iOS and Android Expo exports

### #20 Refine performance controls and dashboard actions 
## Summary
- Group and right-align Performance song tags so they stay clear of controls.
- Add an expandable zoom slider with step controls to Performance.
- Remove visible text labels from dashboard action buttons while retaining Import/Export labels.
- Remove implicit song numbering from Flow titles.

## Validation
- npm run typecheck
- npm test (30 tests)
- npx expo-doctor (21/21)
- iOS and Android Expo exports

### #21 Add individual and setlist-wide zoom controls 
## Summary
- Keep visible zoom sliders and large step buttons in Performance and Flow.
- Add independent font-size controls for every song in Flow alongside a setlist-wide control.
- Increase supported song font size to 128 points and accept it in JSON archives.
- Keep Performance zoom scaling consistent with saved sizes.

## Validation
- npm run typecheck
- npm test (31 tests)
- npx expo-doctor (21/21)
- iOS and Android Expo exports

### #22 Revert "Add individual and setlist-wide zoom controls" 
Reverts cjineson/gigbox#21

### #23 Show zoom controls on demand and enlarge tags with text 
Zoom sliders appear only after tapping the zoom button (Flow setlist + per-song; Performance). Adds a separate global Tag size slider (12–48) in the Performance and Flow headers, saved locally in SQLite (new app_settings table; existing data untouched). Restores all content of reverted #21.

### #24 [WIP] Fix the failing GitHub Actions job 
- [x] Identify the failing Actions checks and resolve all committed conflict markers
- [x] Preserve the PR's on-demand zoom and persistent tag-size behavior
- [x] Run typecheck, tests, Expo Doctor, and platform exports

### #26 Separate tag size and zoom controls 
Adds a tag-icon button in the Performance and Flow headers that opens the Tag size slider on its own. Opening tag size closes any zoom slider and vice versa, so they never show together. Based on current main, which already includes the CI/validation fixes from #23 (typecheck, tests, Android export pass locally).

### #27 Fix slider NaN and centre song header zoom icon (closed, not merged)
- Sliders computed their value from nativeEvent.locationX, which is undefined on web, giving NaN. Now falls back to pageX relative to the measured slider and ignores non-finite values.
- Flow song header is vertically centred so the zoom/tag icon stays centred when tags are enlarged.

### #28 Setlist edit: date/time pickers, inline group add, location with map position (closed, not merged)
- Date and time use native pickers (@react-native-community/datetimepicker, Expo Go compatible); stored as YYYY-MM-DD / HH:mm, legacy free text still shown and clearable. Web falls back to text inputs.
- '+ New group' in setlist edit creates a group inline, even when none exist.
- Location keeps free text as an override, plus 'Use current location' and 'Find on map' (expo-location) to save a map position (new nullable latitude/longitude columns; also in JSON archives as optional fields, v1 imports unaffected). 'Open in Maps' opens the pin, or the typed text.

Validation: typecheck, 32 tests, expo-doctor 21/21, Android export.

### #29 Reorder setlists in groups; new setlists on top (closed, not merged)
- Up/down buttons on each setlist card reorder it among its siblings (same group, or ungrouped).
- New and copied setlists get an order index above the current minimum so they appear at the top. Imports keep archive order (appended).
- No schema change.

### #30 Settings page with dark/light/system theme and export/import (closed, not merged)
- Dashboard bottom bar now has a Settings button; Export/Import JSON moved into the new Settings screen.
- Theme is now dynamic (ThemeProvider/useTheme; styles built per theme). Dark / Light / System, saved locally in app_settings.
- Cue text saved as pure white maps to the theme's text colour so it stays readable in light mode.
- Validation: typecheck, 31 tests, expo-doctor 21/21, Android export.

### #31 Settings extras: keep awake, defaults, backup, high contrast, notes checklist, auto-scroll (closed, not merged)
Adds to the Settings page and performance views:
- Keep screen awake; default new-song text size and tag size; high-contrast mode
- Show song position, swipe sensitivity (normal/firm/off)
- Date-stamped export names, last-exported time, dashboard backup reminder
- Reset settings, delete all data (double confirm), About/version
- Setlist notes with tickable [ ] checklist in Flow (archive v5 optional field)
- Flow: Open in Maps, auto-scroll with persisted speed
- Perf/Flow logo now fills the header height as the home button

Note: this branch includes the commits of open PRs #27-#30 and will shrink once they merge. Verified with typecheck, 39 tests, expo-doctor and Android export; not tested on a device.

### #32 Settings, setlist editing, notes checklist, auto-scroll, unsaved-changes prompt (combined #27-#31) 
Combined PR replacing #27, #28, #29, #30 and #31.

- Fix slider NaN; centre Flow song header zoom icon (#27)
- Setlist edit: native date/time pickers, inline group add, location with map position and Open in Maps (#28)
- Reorder setlists within groups; new setlists on top (#29)
- Settings page with dark/light/system theme and export/import (#30)
- Settings extras: keep awake, default sizes, high contrast, swipe mode, position, backup reminder, reset/delete data, About; setlist notes checklist; Flow auto-scroll and Open in Maps; larger home logo (#31)
- Prompt before leaving song/setlist/group editors with unsaved changes

Typecheck, 39 tests, expo-doctor and Android export pass; not tested on a device.

### #33 Docs folder, backup snooze, setlist order handle, keep-ungrouped song removal 
Commits that landed after #32 merged:
- docs/ folder (user guide, settings, architecture, data/archives, development, CI) and slimmed README
- Backup reminder: Remind me later / Dismiss
- Bold ☰ setlist order handle; minus-circle delete icons
- Removing a song's last setlist: Keep ungrouped / Remove permanently
- Simplified Export/Import labels; updated agent guide

Not tested on a physical device.

### #34 Playwright web smoke test and tablet logo fix 
Stacked on #33.
- Fix Flow/Performance logo blowing up on tablets (fixed-width button, aspect-ratio height)
- Playwright setup: web export served with COOP/COEP headers, sql.js shim replaces expo-sqlite on web only, smoke test (Dashboard -> Settings)
- main now points to index.js (same behaviour as the Expo default entry); app.json gains the web platform

Not yet verified on a physical device; the entry-point change in particular should be checked in Expo Go.

### #35 Playwright web smoke test and fixed larger Flow/Performance logo 
Supersedes #34, which merged into a stale stacked branch instead of main.
- Fixed, slightly larger logo in Flow (96x27) and Performance (108x31); no dynamic sizing
- Playwright setup: web export served with COOP/COEP headers, sql.js shim replaces expo-sqlite on web only, smoke test
- package.json main now points to index.js; app.json gains the web platform; adds metro.config.js

Not verified on a device; check Expo Go still starts after the entry-point change.

### #36 Setlist reorder arrows and Settings label fix 
- Setlist reorder now uses up/down chevrons (shown only when all setlists are collapsed), left of the expand arrow, replacing the ☰ Move up/down alert.
- Settings button label shrinks instead of overflowing on small landscape screens.

Typecheck and tests pass. Not verified on a physical device.

### #37 Restore setlist reorder controls when groups are collapsed 
## Summary
- Show setlist reorder chevrons when all setlists currently visible on the dashboard are collapsed.
- Ignore expanded setlists hidden inside collapsed groups when determining whether controls are shown.

## Validation
- `npm run typecheck`
- `npm test` (39 tests passed)
- CodeQL: no alerts

### #38 Drag-reorder setlists, + add menus, tap song title to perform 
- Setlists reorder via a ☰ drag handle (same as songs), only when all setlists are collapsed (new `reorderSetlistSiblings`; `moveSetlist` removed).
- Per-setlist copy/add-song/add-break buttons merged into one + menu: add new song, copy song from another setlist, add break.
- Top-level + now offers add new setlist / add new setlist from existing (copy).
- Song rows: play button removed; tapping the title opens Performance.

Typecheck, tests and expo-doctor pass. Not verified on a physical device.

### #39 Compact setlist reorder handle; centre + menus 
- Setlist ☰ handle is narrower and header spacing tighter so controls sit further left.
- Add/copy menus and pickers are vertically centred instead of top-aligned.

Typecheck and tests pass. Not verified on a physical device.

### #40 Animated welcome empty state 
Replaces the plain 'No setlists yet' text with a lively empty state: bouncing GigBox logo, floating music notes, 'Your stage is set' headline and a pulsing 'Create your first setlist' button. Uses core Animated (Expo Go compatible) and respects the reduce-motion setting.

Typecheck and tests pass. Not verified on a physical device.

### #41 Play button for setlists; remove Maps pin from Flow 
- Dashboard setlist button is now a play-circle labelled "Play <setlist>" (no 'flow' wording).
- Removed the venue Maps pin from the Flow header (and its unused props). Open in Maps remains in the setlist editor.

Typecheck and tests pass. Not verified on a physical device.

### #42 Small Maps pin beside setlist location on dashboard 
Adds a small (13px) map-pin inline with the location/date subheader under each setlist name on the dashboard; tapping it opens the venue in Maps. Only shown when a location is set. Flow header is unchanged.

Typecheck and tests pass. Not verified on a physical device.

### #43 Dashboard: separate date line, right-aligned map pin clear of Play 
Setlist header: location on its own line, date/time below it, map pin right-aligned with a smaller tap target and a gap before the Play button. Improves narrow (iPhone) layouts. Typecheck and unit tests pass; not verified on a physical device.

### #44 Colour palettes, crawl control, dashboard header polish 
Follow-up to #43 (already merged).

- Colour palettes (Stage default, Girlie, Chill, Beige, Goth), each with dark/light variants following Dark/Light/System; button/icon colours are themed
- Auto-scroll range 1–200 with a slow-weighted slider; snail icon; new crawl control in Performance mode
- Dashboard: location text is the Maps link, date/time on its own line, header buttons/spacing scale with screen width, no play button on breaks
- New setlist opens the editor with the name selected
- First backup reminder delayed 7 days

Typecheck and unit tests pass. Not verified on a physical device.

### #45 Palettes: Pretty, Aqua, pastel Chill, darker Goth 
Follow-up to #44.

- Rename Girlie to Pretty and Chill to Aqua (stored 'girlie' setting migrates to Pretty)
- New pastel Chill palette with dark and light variants
- Darker purples for Goth in both variants

Typecheck and unit tests pass. Not verified on a physical device.

### #46 Expo SDK 58 upgrade, docs, and late changes 
## Summary
- Upgrade to Expo SDK 58 / React Native 0.88 / React 19.3 (required by current Expo Go); fix RN 0.88 ref typings.
- Add `.npmrc` with `legacy-peer-deps=true`: datetimepicker's optional `react-native-windows` peer conflicts with RN 0.88 and would break `npm ci`.
- Merge `docs-and-late-changes` (docs folder, settings, unsaved-changes prompt, etc.) and add docs index + publishing guide.
- `.gitignore`: ignore `dist/`, `web-dist/`, `test-results/`, `playwright-report/`. App Store listing copy (`store/`) and the public site (`site/`) are committed.

## Validation
`npm run typecheck`, `npm test` (39 pass), `expo-doctor` (20/20), `expo export` for iOS and Android all pass.

### #47 Flip snail icon to tortoise. Love ya Si x 


### #48 Export selected groups/setlists/songs, import overwrite warning, unsaved-prompt fix 
## Changes
- **Export**: Settings → Export library opens a checklist to pick groups, setlists and individual songs. Picking only some songs exports a `partial` setlist (still archive v5; older imports unaffected).
- **Import**: warns when setlists (or songs in partial setlists) already exist, with Replace / Add as copies / Cancel. Replacing a partial setlist only updates/adds the songs it contains.
- Only a full export resets the backup reminder.
- **Unsaved-changes prompt**: switched to `usePreventRemove` so native-stack blocks swipe/back instead of dismissing behind the alert; guards against stacked alerts. Group editor keeps its error alerts.
- Docs, e2e smoke label and unit tests updated.

## Validation
Typecheck and unit tests pass (45). Not verified on a physical device or in the browser; the unsaved-prompt fix in particular needs a device check (back gesture, header back, Keep editing/Discard/Save).

### #49 Import/Export labels, new palettes, wider tag colours, copy song in setlist 
## Changes
- Settings buttons renamed to **Export** / **Import**; import success alert simplified to 'Import complete.'
- New palettes: Forest, Slate, Clay, Mono (dark + light, toned down). Palette picker wraps into a grid.
- Tag colours widened from 4 to 13 soft colours (cue text colours unchanged). Older apps will reject archives using the new tag colours.
- Copy a song within its own setlist: creates an independent 'Title Copy N' right after the original. Copying to other setlists still links the same song.
- Docs and unit tests updated.

## Validation
Typecheck and unit tests pass (48). Not verified on a physical device or in the browser.

### #50 Tagged song versions in a setlist; t-shirt scroll/zoom bar sizes 
## Changes
- **Song versions**: copying a song within its own setlist now asks for a new tag (e.g. Piano/Guitar) and creates an independent version (own chords/notes) after the original. Replaces the 'Copy N' title suffix.
- Same title + same tags is blocked within a setlist (editor save, copy, version). Imports are not checked.
- Copy dialogs show song tags so the right version can be picked.
- **Bar size** setting now uses t-shirt sizes: XXS, XS, S, M (default), L, XL. Old normal/large/huge values map to M/L/XL.
- Docs and unit tests updated.

## Validation
Typecheck and unit tests pass. Not verified on a device or in the browser.

### #51 Inline performance editing, onboarding choices and standalone songs 
## Changes
- Guarded Edit mode in Performance and Flow (inline cue/section/table editing, Save/Cancel, unsaved-changes guard)
- Pencil and gear beside titles; tortoise crawl icon; Settings toggles for showing each
- First run offers Group, Setlist or Song; new setlists expanded on dashboard
- Clearer cue-layout and tag wording
- Standalone songs: Songs list on dashboard, play/edit/add to setlist/delete; legacy 'Ungrouped songs' setlist migrated
- Archive v6 with root songs list; v1-5 imports still work

## Validation
typecheck, 51 tests, expo-doctor 20/20, iOS and Android exports pass. Not verified on a physical device or in Expo Go.

### #52 Dashboard + menu: add song, group or setlist 
Replaces the three header buttons with a single + menu (Add song, Add group, Add new setlist, Add new setlist from existing). Stacked on #51; typecheck passes.

### #53 Group-level songs, ungrouped ordering, song search, perf-view tag editing and header cog 
## Features
**Songs at group level**
- A group's + menu offers "Add new setlist" or "Add new song"; songs can live inside a group (shown after its setlists, counted in the group badge).
- Ungrouped songs now sit at the bottom of the dashboard. New songs, and songs removed from their last setlist, default to the bottom of the top-level list.
- Songs can be reordered with a ☰ handle (while all setlists are collapsed), within a group or the top level, like setlists.
- Removing a group moves its songs to the bottom of the top-level list.

**Adding songs to setlists**
- A setlist's + menu now has "Add existing song", which can pick from another setlist or from the standalone Songs list.

**Search**
- Dashboard header search (title or tag): expands the song's group/setlist, scrolls to it and highlights it.
- Performance header search: opens the chosen song in performance, stepping through its setlist.
- The search box hides itself when it loses focus while empty.

**Performance view**
- Tags can be added/removed from the header in cue edit mode (name, colour, quick picks of library tags); saved or discarded with the cue edits, with the same duplicate-variant check as the song editor.

**UI**
- Settings cog now sits at the top right of every screen header (dashboard moved from the bottom bar; editors and export gained it).
- Header add-setlist button uses the playlist-plus icon so it is distinct from add-song.
- Widened the setlist expand/collapse button so the chevron isn't clipped.

**Dev tooling**
- `scripts/dev-web.sh` split into `web-dev-clean.sh` (empty DB) and `web-dev-live.sh` (preloads git-ignored `public/dev-seed.json`); documented in `docs/development.md`.
- Library import now works on the web build.
- Settings: "Default text size" applies to every song without its own size (not just new ones); new "Reset all song text sizes" button clears per-song and per-block sizes so everything follows the default.
- Zoom/scroll bars at XXS/XS are now genuinely compact (smaller buttons and padding; no label at XXS).

## Data / compatibility
- New `songs.group_id` and `songs.sort_order` columns (migrated automatically; existing standalone songs are ordered alphabetically).
- JSON archives are unchanged: v1–6 imports still work. Standalone-song group membership is not exported.

## Fixes
- Empty-dashboard "Add song" passed the press event as the group id; fixed and guarded.
- Bumped `expo` / `expo-file-system` patch versions so Expo Doctor passes (large `package-lock.json` diff comes from newer `@expo/*` sub-packages).

## Validation
- `npm run typecheck`, `npm test` (56 passing), Expo Doctor 20/20 and Android export pass locally.
- Not verified on a physical device or Expo Go; drag reorder, scroll-to-song and the e2e suite were not run by me.

### #54 Edit startup screen text 
Title: "Add your first song" replaces "Start with anything".
Subtitle: "Songs work on their own. Setlists and groups are optional, whenever you need them."
Buttons: one large "Add a song" button, with smaller "Setlist" and "Group" buttons on a row beneath it.
Import hint: "Restoring from a backup? Import it from Settings." is unchanged. I can turn it into a real button if you want, but that needs an import handler passed into the component.

### #55 Empty dashboard import button; simplify Flow header 
## What
- Empty dashboard title/subtitle are now general ("Welcome to GigBox"), with songs, setlists and groups all optional.
- The small "Restoring from a backup?" hint is now a prominent card that opens the import file picker directly (same `handleImportLibrary` as Settings → Import, including the replace/copy conflict prompt), skipping Settings.
- Add a song stays the primary button; Setlist and Group are secondary.
- Flow view header: removed the location/date/time line under the setlist name, along with its unused `setlistDetails` prop and helper.

## Checks
typecheck, 56 tests, expo-doctor (20/20) and android export pass.

Not verified on a physical device.

### #56 Song editor text-first layout; hide Flow zoom with no cues 
## What
Makes first-time use clearer, assuming people mostly paste lyrics, chords or guitar tabs.

**Song editor**
- Section heading renamed **Cue layout** → **Song text**, with helper text: paste or type lyrics, chords or guitar tabs.
- The main block is labelled **SONG TEXT** (was CUE), with placeholder "Paste or type lyrics, chords or guitar tabs".
- **Add more text** is the primary add button; **+ Heading** (was Section) and **+ Table** are smaller, under an "Optional" label.
- Preview empty-state text updated.

**Flow view**
- The per-song zoom button is hidden for a song with no cue text.
- The header (setlist) zoom button and its panel are hidden when no song in the setlist has cue text.

No data, archive or storage changes.

## Checks
typecheck, 56 tests, expo-doctor (20/20) and android export pass (the Flow commit was typecheck and tests only).

Not verified on a physical device. Guitar-tab column alignment depends on a monospace font, which is not used here; not changed.

### #57 Polish performance, Flow and Settings screens 
- Performance view: tags moved into the song box, right-aligned (no more overlap with the edit button on small screens)
- Flow: edit/save/cancel keeps the scroll position
- Settings: labels always shown, text/tag size previews, reset-sizes button beside the text preview, rounded option buttons, continuous scroll bar size slider (legacy named sizes still import), bar size and auto-scroll grouped under Defaults
- Settings cog icon is 24 everywhere

