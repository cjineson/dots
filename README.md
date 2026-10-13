# GigBox

Local-first dark-mode live setlist app for musicians.

## Stack
- React Native + Expo + TypeScript
- expo-sqlite for local storage

## Features
- Dashboard with setlist list and add-setlist flow, plus bottom-bar JSON import/export
- Song editor with title + multiline note input
- Live performance view with one cue box per song, preserving cue line breaks
- Swipe left/right in performance mode to move through songs in the current setlist
- Dark theme tokens matching the stage-ready spec
- Reorder songs in a setlist by dragging the handle beside a song
- Long cue lines automatically scale down to fit the performance boxes
- Adjust performance text size per song from the performance bottom bar; preferences are saved locally and included in JSON archives
- Export the library to a shareable JSON file and import JSON exports as additional setlists

## Getting started

1. Install project dependencies:
   npm install
2. Start the Expo app:
   npx expo start
3. In the Expo UI, select a simulator or run on a device.

## Database behavior
The app uses SQLite locally on device with these tables:
- setlists
- songs
- setlist_songs

Song cue text is stored as entered, including line breaks, and displayed together in one performance box.

## Future phases
- Local P2P sync pathing
