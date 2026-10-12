# GigBox

Local-first dark-mode live setlist app for musicians.

## Stack
- React Native + Expo + TypeScript
- expo-sqlite for local storage

## Features in this Phase 1 scaffold
- Dashboard with setlist list and add-setlist flow
- Song editor with title + multiline note input
- Live performance view that turns each note line into a tap-to-activate box
- Dark theme tokens matching the stage-ready spec

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

Notes are parsed on render by splitting on newline characters and filtering empty lines.

## Future phases
- Reordering songs with drag-and-drop
- Responsive text scaling for long cue lines
- JSON export/import for file sharing
- Local P2P sync pathing
