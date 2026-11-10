# Handoff: richer cue formatting

## Goal

Extend the **full song editor** with selection-level colour, cell-level text size
and alignment controls, while keeping the interface uncluttered. Keep
Flow/Performance quick edit simple, but add a route from it to full edit.

## Agreed behaviour

- **Default alignment is centre** for existing and new content unless explicitly
  changed.
- **Colour:** apply to selected text within a text block, heading or table cell.
  Retain a way to set the whole block's or cell's colour.
- **Size:** apply to a whole text block/heading or an individual table cell.
  **Do not implement mixed sizes within a block or cell.**
- **Alignment:** left, centre or right per text block/heading or table cell.
- **Tabs:** try inserting a real tab character at the cursor first. Preserve
  pasted tabs. Provide a **Tab** action in the full editor and investigate
  physical Tab-key support without trapping keyboard or accessibility navigation.
- **Monospace:** offer an optional mode for alignment-sensitive content.
- **Format menu:** put colour, size, alignment, Tab and monospace controls in an
  on-demand menu for the active block or cell; avoid a permanently large toolbar.
- **Quick edit:** retain its existing lightweight role. Add a **Full edit** link
  for the relevant song. Editing text there must not silently erase or corrupt
  selection colours.

Real tabs are the preferred first approach, but their display must be validated on
iOS, Android and web. If they cannot be made consistent, discuss a
spaces-to-next-tab-stop fallback with the user rather than silently changing the
agreed behaviour. A Tab action that inserts spaces programmatically should also
avoid the keyboard's double-space-to-full-stop shortcut.

## Implementation work

1. **Read project guidance first:** relevant sections of `README.md`,
   `etc/agent-project-guide.md` and `docs/design-decisions.md`.

2. **Choose and prototype the editor approach.** Assess whether native React
   Native text input can reliably display and edit mixed-colour selections,
   preserve selection when opening Format, insert tabs and handle keyboard
   interactions. If not, evaluate a locally bundled rich-text editor in a
   WebView. Keep Expo Go, offline use and the web build working. Test on actual
   target platforms before relying on unverified selection or Tab-key behaviour.

3. **Extend the cue document model** in `src/types.ts` and
   `src/lib/cueDocument.ts`:
   - Represent inline colour and per-cell style without losing existing block
     styles or plain text.
   - Define inheritance and explicit reset behaviour, including the existing
     `#FFFFFF` meaning of theme text colour.
   - Preserve old songs and version 1 JSON archive imports. Ensure new formatting
     survives validation, serialization and archive round trips; assess what
     older app versions will do with new exports and avoid silent formatting loss.
   - Preserve text and formatting through insertion, deletion, selection
     replacement and paste. Consider Unicode selection offsets and formatting
     boundaries.
   - Review generated cue columns in `getVisibleCueBlocks`, plain-text flattening,
     and the existing reset-all-text-sizes behaviour.

4. **Update full editing** in `src/screens/SongEditorScreen.tsx`:
   - Track the active block/cell and selection; make Format actions apply to the
     intended target.
   - Keep paste-first editing, existing headings/tables and performance preview.
   - Ensure Tab inserts at the cursor or replaces a selection, and provide
     accessible labels and usable keyboard focus.

5. **Update rendering and quick edit** in
   `src/components/PerformanceCueContent.tsx`, `src/screens/FlowScreen.tsx` and
   `src/screens/LivePerformanceScreen.tsx`:
   - Render inline colours, cell sizes, alignment, monospace and tabs consistently
     in preview, Flow and Performance.
   - Preserve zoom behaviour and readability across themes.
   - Ensure quick edits update formatting ranges correctly rather than stripping
     them. If a safe edit cannot be supported, explicitly prevent it or direct
     the user to full edit; do not silently discard formatting.

6. **Wire navigation** in `App.tsx`:
   - Full edit must open the correct song, including in multi-song Flow.
   - Explicitly handle unsaved quick-edit drafts before navigation.
   - On save/cancel, return to the originating stage view with correct fresh data
     and preserve context/scroll position where practical. The existing editor
     save returns to the dashboard, so this needs deliberate handling.

7. **Update directly related documentation**, including the user guide and design
   decisions once the implementation approach is settled.

## Validation

- Add focused tests for legacy and new document validation, archive imports/round
  trips, inline-colour range edits, per-cell styles, reset behaviour, generated cue
  columns, whitespace and pasted tabs.
- Run `npm run typecheck` and `npm test`; for UI/dependency changes also follow the
  Expo validation commands in the project guide.
- Check **iOS, Android and web** for selection, format-menu focus, actual tab
  insertion and rendering, physical-keyboard navigation, quick-edit preservation,
  preview/Flow/Performance consistency, zoom and light/dark readability. Report
  any device checks that could not be performed.

**Constraints:** keep Expo Go compatibility and existing libraries safe; do not
commit, push or open a PR unless asked. No implementation has been started in
this session.
