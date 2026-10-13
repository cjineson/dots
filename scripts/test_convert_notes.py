import json
import importlib.util
import subprocess
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

CONVERTER_PATH = Path(__file__).with_name("convert-notes.py")
SPEC = importlib.util.spec_from_file_location("convert_notes", CONVERTER_PATH)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError("Unable to load the Notes converter for testing.")
CONVERTER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(CONVERTER)
convert_markdown = CONVERTER.convert_markdown


SAMPLE = """# Rehearsal notes

**Friday set**

| Song name
E
Capo 2 | Am
G | Count in
Hold the last chord |
| ---------------- | -------- | ---------------- |
| Second song | D | D
A | Verse one
Verse two |

**Saturday set**

| Song | Key | Chords | Lyrics |
| --- | --- | --- | --- |
| Third song | G | G
C | Start here |
"""


class ConvertNotesTests(unittest.TestCase):
    def test_converts_multiple_setlists_and_multiline_cells(self):
        result = convert_markdown(SAMPLE)
        self.assertEqual(
            [(item["name"], [song["title"] for song in item["songs"]]) for item in result["setlists"]],
            [
                ("Friday set", ["Song name", "Second song"]),
                ("Saturday set", ["Third song"]),
            ],
        )
        blocks = result["setlists"][0]["songs"][0]["cue_document"]["blocks"]
        self.assertEqual(
            [item["text"] for item in blocks],
            [
                "Key / capo",
                "E\nCapo 2",
                "Chords",
                "Am\nG",
                "Lyrics / cues",
                "Count in\nHold the last chord",
            ],
        )
        self.assertEqual(result["version"], 2)

    def test_converts_zip_input_without_requiring_a_markdown_filename(self):
        with tempfile.TemporaryDirectory() as directory:
            input_path = Path(directory) / "Apple Notes Export.zip"
            output_path = Path(directory) / "gigbox.json"
            with zipfile.ZipFile(str(input_path), "w") as archive:
                archive.writestr("Export/Notes.md", SAMPLE)

            subprocess.run(
                [sys.executable, str(CONVERTER_PATH), str(input_path), str(output_path)],
                check=True,
                capture_output=True,
                text=True,
            )

            result = json.loads(output_path.read_text(encoding="utf-8"))
            self.assertEqual(len(result["setlists"]), 2)
            self.assertEqual(sum(len(item["songs"]) for item in result["setlists"]), 3)

    def test_rejects_markdown_without_setlists(self):
        with self.assertRaisesRegex(ValueError, "No setlists with songs were found"):
            convert_markdown("# Notes\n\nSome plain text")


if __name__ == "__main__":
    unittest.main()
