# GigBox

Local-first dark-mode live setlist app for musicians.

## Stack
- React Native + Expo + TypeScript
- expo-sqlite for local storage

## Features
- Dashboard with collapsible setlists, groups, drag-to-reorder songs, drag-to-reorder setlists (when all are collapsed), a + menu to add or copy songs, breaks and setlists and a backup reminder
- Setlist details with date/time pickers, location (with map position and Open in Maps) and a notes/checklist
- Song editor with cue sections, styled blocks, tables and coloured tags
- Flow view (whole setlist) and Performance view (one song at a time) with zoom, tag size, auto-scroll and swipe navigation
- Settings: dark/light/system theme, high contrast, keep awake, defaults, export/import, reset
- Unsaved-changes prompts in the editors

See the [user guide](docs/user-guide.md) for details.

## Documentation
Start at [docs/README.md](docs/README.md): [user guide](docs/user-guide.md), [settings](docs/settings.md), [architecture](docs/architecture.md), [data and archives](docs/data-and-archives.md), [importing Apple Notes](docs/import-apple-notes.md), [development](docs/development.md) and [CI and releases](docs/ci-and-releases.md).

## Getting started

1. Install project dependencies:
   npm install
2. Start the Expo app:
   npx expo start
3. In the Expo UI, select a simulator or run on a device.

## Testing

Run the unit tests with (see [development](docs/development.md) for the full validation checklist):

```sh
npm test
```

## Database behavior
The app stores everything locally in SQLite and exports JSON archives (version 6; imports accept versions 1 through 6). See [Data and archives](docs/data-and-archives.md).

## Future phases
- Local P2P sync pathing
