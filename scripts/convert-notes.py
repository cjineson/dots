#!/usr/bin/env python3
"""Convert Apple Notes Markdown exports to Dots' JSON setlist archive."""

import argparse
import json
import re
import sys
import uuid
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional


def clean_markdown_text(value: str) -> str:
    value = re.sub(r"<br\s*/?>", "\n", value, flags=re.IGNORECASE)
    value = re.sub(r"\\([\\|*_`])", r"\1", value)
    value = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", value)
    value = re.sub(r"(\*\*|__)(.*?)\1", r"\2", value)
    value = re.sub(r"(\*|_)(.*?)\1", r"\2", value)
    value = re.sub(r"`([^`]+)`", r"\1", value)
    return "\n".join(line.strip() for line in value.splitlines()).strip()


def parse_table_row(lines: List[str]) -> List[str]:
    text = "\n".join(lines).strip()
    cells: List[str] = []
    cell: List[str] = []
    escaped = False

    for character in text:
        if character == "|" and not escaped:
            cells.append("".join(cell))
            cell = []
        else:
            cell.append(character)
        if character == "\\" and not escaped:
            escaped = True
        else:
            escaped = False
    cells.append("".join(cell))

    if text.startswith("|"):
        cells.pop(0)
    if text.endswith("|"):
        cells.pop()
    return [clean_markdown_text(value) for value in cells]


def is_separator_row(cells: List[str]) -> bool:
    return all(re.fullmatch(r"[\s\-—–−:]*", cell) for cell in cells)


def is_header_row(cells: List[str]) -> bool:
    return any(re.fullmatch(r"(song|title|name)", cell.strip(), re.IGNORECASE) for cell in cells)


def block(block_type: str, text: str) -> Dict[str, Any]:
    return {"id": str(uuid.uuid4()), "type": block_type, "text": text}


def setlist_heading(line: str) -> Optional[str]:
    trimmed = line.strip()
    match = re.fullmatch(r"\*\*(.+)\*\*", trimmed)
    if match:
        return clean_markdown_text(match.group(1))
    match = re.fullmatch(r"#{1,6}\s+(.+?)\s*#*", trimmed)
    return clean_markdown_text(match.group(1)) if match else None


def append_song(setlist: Dict[str, Any], cells: List[str]) -> None:
    headers = setlist.get("headers")
    if headers and is_header_row(cells):
        return

    title_column = 0
    key_column = -1
    chord_column = 1
    lyric_column = 2
    extra_columns: List[int] = []

    if headers:
        title_column = next(
            (i for i, value in enumerate(headers) if re.fullmatch(r"(song|title|name)", value, re.I)),
            -1,
        )
        key_column = next(
            (i for i, value in enumerate(headers) if re.search(r"\b(key|capo)\b", value, re.I)),
            -1,
        )
        chord_column = next(
            (i for i, value in enumerate(headers) if re.search(r"chord", value, re.I)),
            -1,
        )
        lyric_column = next(
            (i for i, value in enumerate(headers) if re.search(r"(lyric|cue|prompt)", value, re.I)),
            -1,
        )
        recognized = {title_column, key_column, chord_column, lyric_column}
        extra_columns = [i for i in range(len(cells)) if i not in recognized]
    else:
        extra_columns = list(range(3, len(cells)))

    title_cell = cells[title_column] if 0 <= title_column < len(cells) else ""
    title_lines = [line.strip() for line in title_cell.splitlines() if line.strip()]
    title = clean_markdown_text(title_lines.pop(0) if title_lines else "")
    if not title:
        if not any(cells):
            return
        raise ValueError(
            'A table row in "{}" contains content but has no song title.'.format(setlist["name"])
        )

    metadata = title_lines
    if 0 <= key_column < len(cells) and cells[key_column]:
        metadata.append(cells[key_column])

    blocks: List[Dict[str, Any]] = []
    if metadata:
        blocks.extend([block("section", "Key / capo"), block("text", "\n".join(metadata))])

    chords = cells[chord_column] if 0 <= chord_column < len(cells) else ""
    if chords:
        blocks.extend([block("section", "Chords"), block("text", chords)])

    lyrics = cells[lyric_column] if 0 <= lyric_column < len(cells) else ""
    if lyrics:
        blocks.extend([block("section", "Lyrics / cues"), block("text", lyrics)])

    additional_notes = [cells[i] for i in extra_columns if cells[i]]
    if additional_notes:
        blocks.extend([block("section", "Additional notes"), block("text", "\n".join(additional_notes))])

    if not blocks:
        blocks.append(block("text", ""))

    notes_raw_text = "\n".join(item["text"] for item in blocks)
    cue_document = {"version": 1, "blocks": blocks}
    setlist["songs"].append(
        {
            "title": title,
            "notes_raw_text": notes_raw_text,
            "cue_document": cue_document,
        }
    )


def convert_markdown(markdown: str) -> Dict[str, Any]:
    setlists: List[Dict[str, Any]] = []
    active_setlist: Optional[Dict[str, Any]] = None
    pending_row: List[str] = []

    def flush_row() -> None:
        nonlocal pending_row
        if not pending_row:
            return
        cells = parse_table_row(pending_row)
        pending_row = []
        if not cells or is_separator_row(cells):
            return
        if active_setlist is None:
            raise ValueError("A song table was found before any setlist heading.")
        if is_header_row(cells):
            active_setlist["headers"] = cells
            return
        headers = active_setlist.get("headers")
        if headers and len(cells) != len(headers):
            raise ValueError(
                'A table row in "{}" has {} columns; expected {}.'.format(
                    active_setlist["name"], len(cells), len(headers)
                )
            )
        if not headers and len(cells) < 3:
            raise ValueError(
                'A song row in "{}" must have title, chords, and cue columns.'.format(
                    active_setlist["name"]
                )
            )
        append_song(active_setlist, cells)

    def is_complete_table_row(line: str) -> bool:
        if not line.rstrip().endswith("|"):
            return False
        minimum_columns = len(active_setlist["headers"]) if active_setlist and active_setlist.get("headers") else 3
        return len(parse_table_row(pending_row)) >= minimum_columns

    for line in markdown.lstrip("\ufeff").splitlines():
        heading = setlist_heading(line)
        if heading and not pending_row:
            active_setlist = {"name": heading, "songs": []}
            setlists.append(active_setlist)
            continue

        if not pending_row:
            if line.lstrip().startswith("|"):
                pending_row.append(line)
                if is_complete_table_row(line):
                    flush_row()
            continue

        pending_row.append(line)
        if is_complete_table_row(line):
            flush_row()
    flush_row()

    populated = [item for item in setlists if item["songs"]]
    if not populated:
        raise ValueError("No setlists with songs were found in the Markdown document.")

    return {
        "format": "gigbox-setlists",
        "version": 2,
        "exportedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "setlists": [
            {"name": item["name"], "songs": item["songs"]} for item in populated
        ],
    }


def read_markdown(path: Path) -> str:
    if zipfile.is_zipfile(str(path)):
        with zipfile.ZipFile(str(path)) as archive:
            entries = [
                name
                for name in archive.namelist()
                if name.lower().endswith(".md") and not name.endswith("/")
            ]
            if len(entries) != 1:
                raise ValueError(
                    "Expected one Markdown document in the Notes ZIP archive, found {}.".format(
                        len(entries)
                    )
                )
            try:
                return archive.read(entries[0]).decode("utf-8-sig")
            except UnicodeDecodeError as error:
                raise ValueError("The Markdown document is not valid UTF-8.") from error

    try:
        return path.read_text(encoding="utf-8-sig")
    except UnicodeDecodeError as error:
        raise ValueError("The Markdown document is not valid UTF-8.") from error


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Convert a plain Markdown or ZIP-wrapped Apple Notes export to Dots JSON."
    )
    parser.add_argument("input", help="Apple Notes ZIP export or plain Markdown file")
    parser.add_argument(
        "output",
        nargs="?",
        help="output JSON path (defaults to <input-name>.dots.json beside the input)",
    )
    args = parser.parse_args()

    input_path = Path(args.input).expanduser().resolve()
    output_path = (
        Path(args.output).expanduser().resolve()
        if args.output
        else input_path.with_name(input_path.stem + ".dots.json")
    )
    if not input_path.is_file():
        raise ValueError("Input file does not exist: {}".format(input_path))
    if output_path.exists():
        raise ValueError("Output already exists; choose a different path: {}".format(output_path))

    archive = convert_markdown(read_markdown(input_path))
    with output_path.open("x", encoding="utf-8") as output:
        json.dump(archive, output, ensure_ascii=False, indent=2)
        output.write("\n")

    songs = sum(len(item["songs"]) for item in archive["setlists"])
    print(
        "Converted {} songs across {} setlists to {}".format(
            songs, len(archive["setlists"]), output_path
        )
    )
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (OSError, ValueError, zipfile.BadZipFile) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
