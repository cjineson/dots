# GigBox

Local-first dark-mode live setlist app for musicians.

## Stack
- React Native + Expo + TypeScript
- expo-sqlite for local storage

## Features
- Dashboard with setlist list and quick setlist creation, plus bottom-bar JSON import/export
- Rename and delete setlists, and browse a complete setlist in a vertically scrolling Flow view
- Copy complete setlists or individual songs between setlists; copied songs can be edited independently
- Song editor with title, cue sections, styled cue blocks, and editable tables
- Rendered cue preview while editing
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

## Importing Apple Notes setlists

Convert a Markdown file or Apple Notes Markdown export into a GigBox JSON archive:

```sh
npm run convert:notes -- path/to/setlists.md
```

The converter also accepts the ZIP-packaged Markdown export from Apple Notes (including files whose extension does not match their ZIP contents). It writes a `.gigbox.json` file beside the input; pass a second path to choose a different output filename. Import the resulting JSON in GigBox using the import button. Setlists are recognized from bold standalone names or Markdown headings, and Markdown tables are converted into song titles with separate key/capo, chord, and lyric/cue blocks. ZIP input requires the system `unzip` command.

## Database behavior
The app uses SQLite locally on device with these tables:
- setlists
- songs
- setlist_songs

New songs store a versioned cue document for sections, per-block text size/color, and tables. Older plain-text cues remain readable and are preserved as a single cue block; exports use archive version 2 and the importer continues to accept version 1.

## Future phases
- Local P2P sync pathing
