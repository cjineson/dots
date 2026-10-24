# Importing Apple Notes setlists

The standalone Python converter turns a Markdown setlist export from Apple Notes into a GigBox JSON archive. It is designed to run on an older Mac without installing GigBox, Node.js packages, or third-party Python libraries.

## On a Mac

1. Download or clone the GigBox repository, or download just [`scripts/convert-notes.py`](../scripts/convert-notes.py).
2. Open Terminal and change to the folder containing `convert-notes.py`. For example:

   ```sh
   cd ~/Downloads/gigbox
   ```

3. Run the converter with the path to the Notes ZIP file. Keep quotes around paths containing spaces:

   ```sh
   python3 scripts/convert-notes.py "/path/to/Apple Notes Export.zip"
   ```

You can also drag the ZIP file from Finder into the Terminal window after typing `python3 scripts/convert-notes.py `; Terminal will insert its full path.

## Output and importing into GigBox

- By default, the converter creates a file named after the input with `.gigbox.json` added, in the same folder. For example, `My Setlists.zip` produces `My Setlists.gigbox.json`.
- To choose a different output location or name, add it as the second argument:

  ```sh
  python3 scripts/convert-notes.py "/path/to/My Setlists.zip" "$HOME/Desktop/My Setlists.gigbox.json"
  ```

- The converter will not overwrite an existing output file. Rename or move the existing output, or choose a different destination before running it again.
- In GigBox, open **Settings** from the dashboard's bottom bar and tap **Import** and select the generated `.gigbox.json` file. Imported setlists are added to your library; if a setlist with the same name already exists, GigBox asks whether to replace it or add a copy.

## Supported Notes formatting

- Accepts Apple Notes ZIP exports containing exactly one `.md` document, as well as plain UTF-8 Markdown files.
- The input file may keep its `.zip` extension; the converter detects ZIP contents and extracts the Markdown itself. There is no need to unzip or rename the file.
- Setlists are identified by bold standalone names (for example, `**Friday set**`) or Markdown headings (for example, `# Friday set`).
- Song rows in Markdown tables become songs. The title cell is required; multiline title cells can include key/capo details. Other cells become separate key/capo, chords, and lyrics/cues blocks when column headings identify them. In tables without headings, the first three columns are interpreted as song title, chords, and lyrics/cues.
- The converter was checked against the supplied Notes export, which produced 33 songs across two setlists. Review the imported setlists and cues in GigBox, especially if your notes use a different table layout.

The script uses only the Python standard library, including ZIP support, and does not require `npm install`, extra Python packages, or the system `unzip` command. Check that Python 3 is available by running `python3 --version`.

If you have the GigBox repository and its npm dependencies installed, the equivalent command is `npm run convert:notes -- path/to/export.zip [output.json]`.
