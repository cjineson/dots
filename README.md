# GigBox

Local-first dark-mode live setlist app for musicians.

## Stack
- React Native + Expo + TypeScript
- expo-sqlite for local storage

## Features
- Dashboard with setlist list and add-setlist flow
- Song editor with title + multiline note input
- Live performance view that turns each note line into a tap-to-activate box
- Dark theme tokens matching the stage-ready spec
- Reorder songs in a setlist by dragging the handle beside a song
- Long cue lines automatically scale down to fit the performance boxes
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

Notes are parsed on render by splitting on newline characters and filtering empty lines.

## Future phases
- Local P2P sync pathing
