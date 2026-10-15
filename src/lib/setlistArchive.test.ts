import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createSetlistArchive, parseSetlistArchive } from './setlistArchive';
import type { SetlistWithSongs } from '../types';

const setlists: SetlistWithSongs[] = [
  {
    id: 'setlist-1',
    name: 'Friday Night',
    order_index: 0,
    location: 'The Blue Room',
    date: 'Friday, May 8',
    time: '8:30 PM',
    songs: [
      {
        id: 'song-1',
        title: 'First Song',
        notes_raw_text: 'Verse\nChorus',
        font_size: 24,
        tags: [
          { label: 'electric', color: '#FFCC00' },
          { label: 'loud', color: '#FF8A80' },
        ],
        cue_document: JSON.stringify({
          version: 1,
          blocks: [
            { id: 'section', type: 'section', text: 'Chords', color: '#FFCC00' },
            { id: 'table', type: 'table', rows: [['Verse', 'Chorus'], ['C', 'G']] },
          ],
        }),
      },
      {
        id: 'song-2',
        title: 'Second Song',
        notes_raw_text: 'Intro',
      },
    ],
    items: [
      {
        kind: 'song',
        song: {
          id: 'song-1',
          title: 'First Song',
          notes_raw_text: 'Verse\nChorus',
          font_size: 24,
          tags: [
            { label: 'electric', color: '#FFCC00' },
            { label: 'loud', color: '#FF8A80' },
          ],
          cue_document: JSON.stringify({
            version: 1,
            blocks: [
              { id: 'section', type: 'section', text: 'Chords', color: '#FFCC00' },
              { id: 'table', type: 'table', rows: [['Verse', 'Chorus'], ['C', 'G']] },
            ],
          }),
        },
      },
      { kind: 'break', id: 'break-1', duration_minutes: 15 },
      {
        kind: 'song',
        song: {
          id: 'song-2',
          title: 'Second Song',
          notes_raw_text: 'Intro',
        },
      },
      { kind: 'break', id: 'break-2' },
    ],
  },
];

test('createSetlistArchive writes the current format and cue document', () => {
  const archive = createSetlistArchive(setlists);

  assert.equal(archive.format, 'gigbox-setlists');
  assert.equal(archive.version, 4);
  assert.ok(Number.isFinite(Date.parse(archive.exportedAt)));
  assert.deepEqual(archive.setlists, [
    {
      name: 'Friday Night',
      location: 'The Blue Room',
      date: 'Friday, May 8',
      time: '8:30 PM',
      items: [
        {
          type: 'song',
          title: 'First Song',
          notes_raw_text: 'Verse\nChorus',
          font_size: 24,
          cue_document: {
            version: 1,
            blocks: [
              { id: 'section', type: 'section', text: 'Chords', color: '#FFCC00' },
              { id: 'table', type: 'table', rows: [['Verse', 'Chorus'], ['C', 'G']] },
            ],
          },
          tags: [
            { label: 'electric', color: '#FFCC00' },
            { label: 'loud', color: '#FF8A80' },
          ],
        },
        { type: 'break', duration_minutes: 15 },
        { type: 'song', title: 'Second Song', notes_raw_text: 'Intro', font_size: undefined },
        { type: 'break' },
      ],
    },
  ]);
});

test('parseSetlistArchive reads current archives and preserves formatted cue blocks', () => {
  const archive = createSetlistArchive(setlists);
  const parsed = parseSetlistArchive(JSON.stringify(archive));

  assert.deepEqual(parsed, [
    {
      name: 'Friday Night',
      location: 'The Blue Room',
      date: 'Friday, May 8',
      time: '8:30 PM',
      items: [
        {
          type: 'song',
          title: 'First Song',
          notes_raw_text: 'Verse\nChorus',
          font_size: 24,
          cue_document: {
            version: 1,
            blocks: [
              { id: 'section', type: 'section', text: 'Chords', color: '#FFCC00' },
              { id: 'table', type: 'table', rows: [['Verse', 'Chorus'], ['C', 'G']] },
            ],
          },
          tags: [
            { label: 'electric', color: '#FFCC00' },
            { label: 'loud', color: '#FF8A80' },
          ],
        },
        { type: 'break', duration_minutes: 15 },
        { type: 'song', title: 'Second Song', notes_raw_text: 'Intro', font_size: undefined },
        { type: 'break' },
      ],
    },
  ]);
});

test('parseSetlistArchive accepts version 1 archives without cue documents', () => {
  const archive = JSON.stringify({
    format: 'gigbox-setlists',
    version: 1,
    exportedAt: '2026-01-01T00:00:00.000Z',
    setlists: [{ name: 'Old Set', songs: [{ title: 'Old Song', notes_raw_text: 'Cue' }] }],
  });

  assert.deepEqual(parseSetlistArchive(archive), [
    {
      name: 'Old Set',
      items: [{ type: 'song', title: 'Old Song', notes_raw_text: 'Cue', font_size: undefined }],
    },
  ]);
});

test('parseSetlistArchive accepts version 3 archives with ordered breaks', () => {
  const archive = JSON.stringify({
    format: 'gigbox-setlists',
    version: 3,
    exportedAt: '2026-01-01T00:00:00.000Z',
    setlists: [
      {
        name: 'Old Set',
        items: [
          { type: 'song', title: 'First', notes_raw_text: 'Cue' },
          { type: 'break', duration_minutes: 10 },
        ],
      },
    ],
  });

  assert.deepEqual(parseSetlistArchive(archive), [
    {
      name: 'Old Set',
      items: [
        { type: 'song', title: 'First', notes_raw_text: 'Cue', font_size: undefined },
        { type: 'break', duration_minutes: 10 },
      ],
    },
  ]);
});

test('parseSetlistArchive rejects malformed optional setlist header details', () => {
  const archive = JSON.stringify({
    format: 'gigbox-setlists',
    version: 4,
    setlists: [{ name: 'Set', location: 42, items: [] }],
  });

  assert.throws(() => parseSetlistArchive(archive), {
    message: 'Setlist "Set" has invalid header details.',
  });
});

test('parseSetlistArchive rejects invalid JSON', () => {
  assert.throws(() => parseSetlistArchive('{'), {
    message: 'The selected file is not valid JSON.',
  });
});

test('parseSetlistArchive rejects unsupported formats and versions', () => {
  for (const archive of [
    JSON.stringify({ format: 'other', version: 1, setlists: [] }),
    JSON.stringify({ format: 'gigbox-setlists', version: 5, setlists: [] }),
  ]) {
    assert.throws(() => parseSetlistArchive(archive), {
      message: 'This file is not a supported GigBox setlist export.',
    });
  }
});

test('parseSetlistArchive rejects invalid break durations', () => {
  const archive = JSON.stringify({
    format: 'gigbox-setlists',
    version: 4,
    setlists: [
      {
        name: 'Set',
        items: [{ type: 'break', duration_minutes: 0 }],
      },
    ],
  });

  assert.throws(() => parseSetlistArchive(archive), {
    message: 'Item 1 in "Set" is invalid.',
  });
});

test('parseSetlistArchive rejects invalid cue document structures', () => {
  const archive = JSON.stringify({
    format: 'gigbox-setlists',
    version: 2,
    setlists: [
      {
        name: 'Set',
        songs: [
          {
            title: 'Song',
            notes_raw_text: 'Cue',
            cue_document: { version: 1, blocks: [{ id: 'table', type: 'table', rows: [['only one cell']] }] },
          },
        ],
      },
    ],
  });

  assert.throws(() => parseSetlistArchive(archive), {
    message:
      'Song 1 in "Set" has invalid cue formatting. Table in cue block 1 must contain at least two text cells per row.',
  });
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

test('parseSetlistArchive rejects unsupported song tag colors', () => {
  assert.throws(
    () =>
      parseSetlistArchive(JSON.stringify({
        format: 'gigbox-setlists',
        version: 4,
        exportedAt: '2026-01-01T00:00:00.000Z',
        setlists: [{
          name: 'Tagged Set',
          items: [{
            type: 'song',
            title: 'Song',
            notes_raw_text: '',
            tags: [{ label: 'electric', color: '#000000' }],
          }],
        }],
      })),
    /has invalid tags/,
  );
});
