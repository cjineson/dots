import assert from 'node:assert/strict';
import test from 'node:test';

import { parseCueDocument } from './cueDocument';
import { convertNotesMarkdown } from './notesMarkdown';
import { parseSetlistArchive } from './setlistArchive';

const markdown = `# Rehearsal notes

**Friday set**

| First song
E
Capo 2 | Am
G
C | Count in
Hold the last chord |
| ---------------- | -------- | ---------------- |
| Second song | D | D
A | Verse one
Verse two |
| ——————— | — | — |

**Saturday set**

| Song | Key | Chords | Lyrics |
| --- | --- | --- | --- |
| Third song | G | G
C | Start here |
`;

test('converts multiple Markdown setlists and multiline cue table cells', () => {
  const archive = convertNotesMarkdown(markdown);

  assert.equal(archive.format, 'gigbox-setlists');
  assert.equal(archive.version, 5);
  assert.deepEqual(
    parseSetlistArchive(JSON.stringify(archive)).setlists.map(({ name, items }) => [
      name,
      items.flatMap((item) => item.type === 'song' ? [item.title] : []),
    ]),
    [
      ['Friday set', ['First song', 'Second song']],
      ['Saturday set', ['Third song']],
    ],
  );
  assert.deepEqual(
    archive.setlists.map(({ name, items }) => [
      name,
      items.flatMap((item) => item.type === 'song' ? [item.title] : []),
    ]),
    [
      ['Friday set', ['First song', 'Second song']],
      ['Saturday set', ['Third song']],
    ],
  );

  const firstSong = archive.setlists[0].items[0];
  assert.equal(firstSong.type, 'song');
  const firstCueDocument = parseCueDocument(JSON.stringify(
    firstSong.type === 'song' ? firstSong.cue_document : undefined,
  ));
  assert.deepEqual(
    firstCueDocument.blocks.map((block) => block.type === 'table' ? '' : block.text),
    ['Key / capo', 'E\nCapo 2', 'Chords', 'Am\nG\nC', 'Lyrics / cues', 'Count in\nHold the last chord'],
  );
  assert.equal(
    firstSong.type === 'song' ? firstSong.notes_raw_text : '',
    'Key / capo\nE\nCapo 2\nChords\nAm\nG\nC\nLyrics / cues\nCount in\nHold the last chord',
  );

  const headerSong = archive.setlists[1].items[0];
  assert.equal(headerSong.type, 'song');
  const headerCueDocument = parseCueDocument(JSON.stringify(
    headerSong.type === 'song' ? headerSong.cue_document : undefined,
  ));
  assert.deepEqual(
    headerCueDocument.blocks.map((block) => block.type === 'table' ? '' : block.text),
    ['Key / capo', 'G', 'Chords', 'G\nC', 'Lyrics / cues', 'Start here'],
  );
});

test('rejects content rows without a title instead of silently losing cue data', () => {
  assert.throws(
    () =>
      convertNotesMarkdown(`**Rehearsal**

| Song | Chords | Cues |
| --- | --- | --- |
|  | Em | Keep this cue |
`),
    /contains content but has no song title/,
  );
});

test('keeps an empty final table cell when its closing pipe is on a continuation line', () => {
  const archive = convertNotesMarkdown(`**Rehearsal**

| Song name
Key | Chords
Am |
 |
`);

  assert.deepEqual(
    archive.setlists[0].items.flatMap((item) => item.type === 'song' ? [item.title] : []),
    ['Song name'],
  );
});

test('rejects documents without a recognizable setlist and song table', () => {
  assert.throws(
    () => convertNotesMarkdown('# Notes\n\nSome plain text'),
    /No setlists with songs were found/,
  );
});
