# GigBox

Local-first dark-mode live setlist app for musicians.

## Stack
- React Native + Expo + TypeScript
- expo-sqlite for local storage

## Features
- Dashboard with collapsible setlists, root-level setlist groups, quick creation, and labeled JSON import/export actions
- Rename setlists and add optional location, date, and time details; delete setlists and browse the full setlist in a vertically scrolling Flow view
- Add standalone breaks with optional display-only durations, reorder them with songs, and see them in Flow and performance mode
- Copy complete setlists or individual songs between setlists; songs stay linked, so edits and tags are shared across setlists
- Song editor with title, colored song tags and quick picks from tags currently used in the library, cue sections, styled cue blocks, and editable tables
- Performance-styled cue preview while editing, with a separate performance preview that returns to the unsaved editor
- Live performance view with one cue box per song, preserving cue line breaks
- Song tags are shown with song titles in Flow and performance views
- Swipe left/right in performance mode to move through songs and breaks in the current setlist
- Dark theme tokens matching the stage-ready spec
- Reorder songs and breaks in a setlist by dragging their handles
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

The standalone Python converter turns a Markdown setlist export from Apple Notes into a GigBox JSON archive. It is designed to run on an older Mac without installing GigBox, Node.js packages, or third-party Python libraries.

### On a Mac

1. Download or clone the GigBox repository, or download just [`scripts/convert-notes.py`](scripts/convert-notes.py).
2. Open Terminal and change to the folder containing `convert-notes.py`. For example:

   ```sh
   cd ~/Downloads/gigbox
   ```

3. Run the converter with the path to the Notes ZIP file. Keep quotes around paths containing spaces:

   ```sh
   python3 scripts/convert-notes.py "/path/to/Apple Notes Export.zip"
   ```

You can also drag the ZIP file from Finder into the Terminal window after typing `python3 scripts/convert-notes.py `; Terminal will insert its full path.

### Output and importing into GigBox

- By default, the converter creates a file named after the input with `.gigbox.json` added, in the same folder. For example, `My Setlists.zip` produces `My Setlists.gigbox.json`.
- To choose a different output location or name, add it as the second argument:

  ```sh
  python3 scripts/convert-notes.py "/path/to/My Setlists.zip" "$HOME/Desktop/My Setlists.gigbox.json"
  ```

- The converter will not overwrite an existing output file. Rename or move the existing output, or choose a different destination before running it again.
- In GigBox, tap the dashboard's **Import JSON** icon and select the generated `.gigbox.json` file. Imported setlists are added to your library; they do not replace existing setlists.

### Supported Notes formatting

- Accepts Apple Notes ZIP exports containing exactly one `.md` document, as well as plain UTF-8 Markdown files.
- The input file may keep its `.zip` extension; the converter detects ZIP contents and extracts the Markdown itself. There is no need to unzip or rename the file.
- Setlists are identified by bold standalone names (for example, `**Friday set**`) or Markdown headings (for example, `# Friday set`).
- Song rows in Markdown tables become songs. The title cell is required; multiline title cells can include key/capo details. Other cells become separate key/capo, chords, and lyrics/cues blocks when column headings identify them. In tables without headings, the first three columns are interpreted as song title, chords, and lyrics/cues.
- The converter was checked against the supplied Notes export, which produced 33 songs across two setlists. Review the imported setlists and cues in GigBox, especially if your notes use a different table layout.

The script uses only the Python standard library, including ZIP support, and does not require `npm install`, extra Python packages, or the system `unzip` command. Check that Python 3 is available by running `python3 --version`.

If you have the GigBox repository and its npm dependencies installed, the equivalent command is `npm run convert:notes -- path/to/export.zip [output.json]`.

## Database behavior
The app uses SQLite locally on device with these tables:
- setlists
- setlist_groups
- songs
- setlist_songs
- setlist_breaks

New songs store a versioned cue document for sections, per-block text size/color, and tables, plus colored tags attached to each song. Older plain-text cues remain readable and are preserved as a single cue block. Setlists can be assigned to one-level groups or remain at the dashboard root. JSON exports use archive version 5, including groups, ordered song/break items, optional setlist details, and optional song tags; imports continue to accept versions 1 through 5.

## Future phases
- Local P2P sync pathing
