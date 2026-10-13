import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createSetlistArchive, parseSetlistArchive } from './setlistArchive';
import type { SetlistWithSongs } from '../types';

const setlists: SetlistWithSongs[] = [
  {
    id: 'setlist-1',
    name: 'Friday Night',
    order_index: 0,
    songs: [
      {
        id: 'song-1',
        title: 'First Song',
        notes_raw_text: 'Verse\nChorus',
        font_size: 24,
      },
      {
        id: 'song-2',
        title: 'Second Song',
        notes_raw_text: 'Intro',
      },
    ],
  },
];

test('createSetlistArchive writes the supported format and song data', () => {
  const archive = createSetlistArchive(setlists);

  assert.equal(archive.format, 'gigbox-setlists');
  assert.equal(archive.version, 1);
  assert.ok(Number.isFinite(Date.parse(archive.exportedAt)));
  assert.deepEqual(archive.setlists, [
    {
      name: 'Friday Night',
      songs: [
        { title: 'First Song', notes_raw_text: 'Verse\nChorus', font_size: 24 },
        { title: 'Second Song', notes_raw_text: 'Intro', font_size: undefined },
      ],
    },
  ]);
});

test('parseSetlistArchive reads current archives and preserves cue text and font sizes', () => {
  const archive = createSetlistArchive(setlists);
  const parsed = parseSetlistArchive(JSON.stringify(archive));

  assert.deepEqual(parsed, [
    {
      name: 'Friday Night',
      songs: [
        { title: 'First Song', notes_raw_text: 'Verse\nChorus', font_size: 24 },
        { title: 'Second Song', notes_raw_text: 'Intro', font_size: undefined },
      ],
    },
  ]);
});

test('parseSetlistArchive accepts older songs without font sizes', () => {
  const archive = JSON.stringify({
    format: 'gigbox-setlists',
    version: 1,
    exportedAt: '2026-01-01T00:00:00.000Z',
    setlists: [{ name: 'Old Set', songs: [{ title: 'Old Song', notes_raw_text: 'Cue' }] }],
  });

  assert.deepEqual(parseSetlistArchive(archive), [
    {
      name: 'Old Set',
      songs: [{ title: 'Old Song', notes_raw_text: 'Cue', font_size: undefined }],
    },
  ]);
});

test('parseSetlistArchive rejects invalid JSON', () => {
  assert.throws(() => parseSetlistArchive('{'), {
    message: 'The selected file is not valid JSON.',
  });
});

test('parseSetlistArchive rejects unsupported formats and versions', () => {
  for (const archive of [
    JSON.stringify({ format: 'other', version: 1, setlists: [] }),
    JSON.stringify({ format: 'gigbox-setlists', version: 2, setlists: [] }),
  ]) {
    assert.throws(() => parseSetlistArchive(archive), {
      message: 'This file is not a supported GigBox setlist export.',
    });
  }
});

test('parseSetlistArchive rejects missing or empty setlist collections', () => {
  const base = { format: 'gigbox-setlists', version: 1 };

  assert.throws(() => parseSetlistArchive(JSON.stringify(base)), {
    message: 'The GigBox export is missing its setlists.',
  });
  assert.throws(() => parseSetlistArchive(JSON.stringify({ ...base, setlists: [] })), {
    message: 'This export does not contain any setlists.',
  });
});

test('parseSetlistArchive rejects malformed setlists and songs', () => {
  const invalidArchives = [
    { setlists: [{ name: '  ', songs: [] }] },
    { setlists: [{ name: 'Set', songs: {} }] },
    { setlists: [{ name: 'Set', songs: [{ title: 'Song' }] }] },
    {
      setlists: [
        { name: 'Set', songs: [{ title: 'Song', notes_raw_text: 'Cue', font_size: 9 }] },
      ],
    },
    {
      setlists: [
        { name: 'Set', songs: [{ title: 'Song', notes_raw_text: 'Cue', font_size: 65 }] },
      ],
    },
  ];

  for (const invalidSetlistData of invalidArchives) {
    assert.throws(() =>
      parseSetlistArchive(
        JSON.stringify({ format: 'gigbox-setlists', version: 1, ...invalidSetlistData }),
      ),
    );
  }
});
