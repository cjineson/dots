# GigBox

Local-first dark-mode live setlist app for musicians.

## Stack
- React Native + Expo + TypeScript
- expo-sqlite for local storage

## Features
- Dashboard with setlist list and quick setlist creation, plus bottom-bar JSON import/export
- Song editor with title, cue sections, styled cue blocks, and editable tables
- Live performance view with one cue box per song, preserving cue line breaks
- Swipe left/right in performance mode to move through songs in the current setlist
- Dark theme tokens matching the stage-ready spec
- Reorder songs in a setlist by dragging the handle beside a song
- Long cue lines automatically scale down to fit the performance boxes
- Adjust performance text size per song from the performance top bar; preferences are saved locally and included in JSON archives
- Export the library to a shareable JSON file and import JSON exports as additional setlists

## Getting started

1. Install project dependencies:
   npm install
2. Start the Expo app:
   npx expo start
3. In the Expo UI, select a simulator or run on a device.

## Testing

Run the unit tests with:

```sh
npm test
```

## Database behavior
The app uses SQLite locally on device with these tables:
- setlists
- songs
- setlist_songs

New songs store a versioned cue document for sections, per-block text size/color, and tables. Older plain-text cues remain readable and are preserved as a single cue block; exports use archive version 2 and the importer continues to accept version 1.

## Future phases
- Local P2P sync pathing
