import type { CueBlock, CueDocument, SetlistArchive } from '../types';
import { flattenCueDocument } from './cueDocument';
import { makeId } from './uuid';

type ImportedSetlist = SetlistArchive['setlists'][number];
type ImportedSong = Extract<ImportedSetlist['items'][number], { type: 'song' }>;
type MutableSetlist = {
  name: string;
  songs: ImportedSong[];
  headers?: string[];
};

function cleanMarkdownText(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\\([\\|*_`])/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/`([^`]+)`/g, '$1')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim();
}

function parseTableRow(lines: string[]): string[] {
  const text = lines.join('\n').trim();
  const cells: string[] = [];
  let cell = '';
  let escaped = false;

  for (const character of text) {
    if (character === '|' && !escaped) {
      cells.push(cell);
      cell = '';
    } else {
      cell += character;
    }

    if (character === '\\' && !escaped) {
      escaped = true;
    } else {
      escaped = false;
    }
  }
  cells.push(cell);

  if (text.startsWith('|')) {
    cells.shift();
  }
  if (text.endsWith('|')) {
    cells.pop();
  }

  return cells.map(cleanMarkdownText);
}

function isSeparatorRow(cells: string[]): boolean {
  return cells.every((cell) => /^[\s\-—–−:]*$/.test(cell));
}

function isHeaderRow(cells: string[]): boolean {
  return cells.some((cell) => /^(song|title|name)$/i.test(cell.trim()));
}

function createCueDocument(blocks: CueBlock[]): CueDocument {
  return { version: 1, blocks };
}

function textBlock(text: string): CueBlock {
  return { id: makeId(), type: 'text', text };
}

function sectionBlock(text: string): CueBlock {
  return { id: makeId(), type: 'section', text };
}

function appendSong(setlist: MutableSetlist, cells: string[]): void {
  if (setlist.headers && isHeaderRow(cells)) {
    return;
  }

  let titleColumn = 0;
  let keyColumn = -1;
  let chordColumn = 1;
  let lyricColumn = 2;
  let extraColumns: number[] = [];

  if (setlist.headers) {
    titleColumn = setlist.headers.findIndex((header) => /^(song|title|name)$/i.test(header));
    keyColumn = setlist.headers.findIndex((header) => /\b(key|capo)\b/i.test(header));
    chordColumn = setlist.headers.findIndex((header) => /chord/i.test(header));
    lyricColumn = setlist.headers.findIndex((header) => /(lyric|cue|prompt)/i.test(header));
    const recognized = new Set([titleColumn, keyColumn, chordColumn, lyricColumn]);
    extraColumns = cells.map((_, index) => index).filter((index) => !recognized.has(index));
  } else {
    extraColumns = cells.map((_, index) => index).filter((index) => index > 2);
  }

  const titleAndMetadata = cells[titleColumn] ?? '';
  const titleLines = titleAndMetadata.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const title = cleanMarkdownText(titleLines.shift() ?? '');
  if (!title) {
    if (cells.every((cell) => !cell)) {
      return;
    }
    throw new Error(`A table row in "${setlist.name}" contains content but has no song title.`);
  }

  const metadata = [
    ...titleLines,
    ...(keyColumn >= 0 && cells[keyColumn] ? [cells[keyColumn]] : []),
  ].filter(Boolean);
  const blocks: CueBlock[] = [];

  if (metadata.length > 0) {
    blocks.push(sectionBlock('Key / capo'), textBlock(metadata.join('\n')));
  }

  const chords = chordColumn >= 0 ? cells[chordColumn] : '';
  if (chords) {
    blocks.push(sectionBlock('Chords'), textBlock(chords));
  }

  const lyrics = lyricColumn >= 0 ? cells[lyricColumn] : '';
  if (lyrics) {
    blocks.push(sectionBlock('Lyrics / cues'), textBlock(lyrics));
  }

  const additionalNotes = extraColumns
    .map((column) => cells[column])
    .filter(Boolean);
  if (additionalNotes.length > 0) {
    blocks.push(sectionBlock('Additional notes'), textBlock(additionalNotes.join('\n')));
  }

  if (blocks.length === 0) {
    blocks.push(textBlock(''));
  }

  const cueDocument = createCueDocument(blocks);
  setlist.songs.push({
    type: 'song',
    title,
    notes_raw_text: flattenCueDocument(cueDocument),
    cue_document: cueDocument,
  });
}

function setlistHeading(line: string): string | null {
  const trimmed = line.trim();
  const boldHeading = trimmed.match(/^\*\*(.+)\*\*$/);
  if (boldHeading) {
    return cleanMarkdownText(boldHeading[1]);
  }

  const markdownHeading = trimmed.match(/^#{1,6}\s+(.+?)\s*#*$/);
  return markdownHeading ? cleanMarkdownText(markdownHeading[1]) : null;
}

export function convertNotesMarkdown(markdown: string): SetlistArchive {
  const setlists: MutableSetlist[] = [];
  let activeSetlist: MutableSetlist | undefined;
  let pendingRow: string[] = [];

  const flushRow = () => {
    if (!pendingRow.length) {
      return;
    }
    const cells = parseTableRow(pendingRow);
    pendingRow = [];
    if (cells.length === 0 || isSeparatorRow(cells)) {
      return;
    }
    if (!activeSetlist) {
      throw new Error('A song table was found before any setlist heading.');
    }
    if (isHeaderRow(cells)) {
      activeSetlist.headers = cells;
      return;
    }
    if (activeSetlist.headers && cells.length !== activeSetlist.headers.length) {
      throw new Error(
        `A table row in "${activeSetlist.name}" has ${cells.length} columns; expected ${activeSetlist.headers.length}.`,
      );
    }
    if (cells.length < 3 && !activeSetlist.headers) {
      throw new Error(
        `A song row in "${activeSetlist.name}" must have title, chords, and cue columns.`,
      );
    }
    appendSong(activeSetlist, cells);
  };

  const isCompleteTableRow = (line: string) => {
    if (!line.trimEnd().endsWith('|')) {
      return false;
    }
    const minimumColumns = activeSetlist?.headers?.length ?? 3;
    return parseTableRow(pendingRow).length >= minimumColumns;
  };

  for (const line of markdown.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const heading = setlistHeading(line);
    if (heading && !pendingRow.length) {
      activeSetlist = { name: heading, songs: [] };
      setlists.push(activeSetlist);
      continue;
    }

    if (!pendingRow.length) {
      if (line.trimStart().startsWith('|')) {
        pendingRow.push(line);
        if (isCompleteTableRow(line)) {
          flushRow();
        }
      }
      continue;
    }

    pendingRow.push(line);
    if (isCompleteTableRow(line)) {
      flushRow();
    }
  }
  flushRow();

  const populatedSetlists = setlists.filter((setlist) => setlist.songs.length > 0);
  if (populatedSetlists.length === 0) {
    throw new Error('No setlists with songs were found in the Markdown document.');
  }

  return {
    format: 'gigbox-setlists',
    version: 5,
    exportedAt: new Date().toISOString(),
    groups: [],
    setlists: populatedSetlists.map(({ name, songs }) => ({
      name,
      group: null,
      items: songs,
    })),
  };
}
