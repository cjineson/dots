import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createSetlistArchive, parseSetlistArchive, restoreOmittedCues } from './setlistArchive';
import type { CueDocument, SetlistWithSongs, SongTag } from '../types';

const setlists: SetlistWithSongs[] = [
  {
    id: 'setlist-1',
    name: 'Friday Night',
    order_index: 0,
    group_id: 'group-1',
    group_name: 'The Band',
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

test('tab characters survive standalone song archive round trips', () => {
  const text = 'C\tG\nAm\tF';
  const cueDocument = { version: 1 as const, blocks: [{ id: 'cue', type: 'text' as const, text }] };
  const archive = createSetlistArchive([], [], [{
    id: 'song-with-tabs',
    title: 'Tabs',
    notes_raw_text: text,
    cue_document: JSON.stringify(cueDocument),
  }]);
  const imported = parseSetlistArchive(JSON.stringify(archive));
  assert.equal(imported.songs?.[0].notes_raw_text, text);
  assert.deepEqual(imported.songs?.[0].cue_document, cueDocument);
});

test('createSetlistArchive writes the current format and cue document', () => {
  const archive = createSetlistArchive(setlists, [
    { id: 'group-1', name: 'The Band', order_index: 0 },
  ]);

  assert.equal(archive.format, 'gigbox-setlists');
  assert.equal(archive.version, 6);
  assert.deepEqual(archive.groups, ['The Band']);
  assert.deepEqual(archive.songs, []);
  assert.ok(Number.isFinite(Date.parse(archive.exportedAt)));
  assert.deepEqual(archive.setlists, [
    {
      name: 'Friday Night',
      group: 'The Band',
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
  const archive = createSetlistArchive(setlists, [
    { id: 'group-1', name: 'The Band', order_index: 0 },
  ]);
  const parsed = parseSetlistArchive(JSON.stringify(archive));

  assert.deepEqual(parsed, {
    groups: ['The Band'],
    songs: [],
    setlists: [{
      name: 'Friday Night',
      group: 'The Band',
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
    }],
  });
});

test('parseSetlistArchive accepts version 1 archives without cue documents', () => {
  const archive = JSON.stringify({
    format: 'gigbox-setlists',
    version: 1,
    exportedAt: '2026-01-01T00:00:00.000Z',
    setlists: [{ name: 'Old Set', songs: [{ title: 'Old Song', notes_raw_text: 'Cue' }] }],
  });

  assert.deepEqual(parseSetlistArchive(archive), {
    groups: [],
    setlists: [{
      name: 'Old Set',
      group: null,
      items: [{ type: 'song', title: 'Old Song', notes_raw_text: 'Cue', font_size: undefined }],
    }],
  });
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

  assert.deepEqual(parseSetlistArchive(archive), {
    groups: [],
    setlists: [{
      name: 'Old Set',
      group: null,
      items: [
        { type: 'song', title: 'First', notes_raw_text: 'Cue', font_size: undefined },
        { type: 'break', duration_minutes: 10 },
      ],
    }],
  });
});

test('parseSetlistArchive accepts version 4 archives as ungrouped setlists', () => {
  const archive = JSON.stringify({
    format: 'gigbox-setlists',
    version: 4,
    exportedAt: '2026-01-01T00:00:00.000Z',
    setlists: [{ name: 'Old Set', items: [] }],
  });

  assert.deepEqual(parseSetlistArchive(archive), {
    groups: [],
    setlists: [{ name: 'Old Set', group: null, items: [] }],
  });
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

test('parseSetlistArchive rejects missing and unknown version 5 group references', () => {
  const base = {
    format: 'gigbox-setlists',
    version: 5,
    groups: ['Band'],
    setlists: [{ name: 'Set', group: 'Unknown', items: [] }],
  };
  assert.throws(() => parseSetlistArchive(JSON.stringify(base)), {
    message: 'Setlist "Set" has an invalid group.',
  });

  assert.throws(
    () =>
      parseSetlistArchive(JSON.stringify({
        ...base,
        setlists: [{ name: 'Set', items: [] }],
      })),
    { message: 'Setlist "Set" has an invalid group.' },
  );
});

test('parseSetlistArchive rejects invalid JSON', () => {
  assert.throws(() => parseSetlistArchive('{'), {
    message: 'The selected file is not valid JSON.',
  });
});

test('parseSetlistArchive rejects unsupported formats and versions', () => {
  for (const archive of [
    JSON.stringify({ format: 'other', version: 1, setlists: [] }),
    JSON.stringify({ format: 'gigbox-setlists', version: 7, setlists: [] }),
  ]) {
    assert.throws(() => parseSetlistArchive(archive), {
      message: 'This file is not a supported Dots setlist export.',
    });
  }
});

test('standalone songs round-trip in version 6 archives', () => {
  const archive = createSetlistArchive([], [], [{
    id: 'standalone-1',
    title: 'Standalone',
    notes_raw_text: 'Verse',
    font_size: 24,
    tags: [{ label: 'Acoustic', color: '#FFCC00' }],
  }]);
  const parsed = parseSetlistArchive(JSON.stringify(archive));

  assert.equal(archive.version, 6);
  assert.deepEqual(parsed.setlists, []);
  assert.deepEqual(parsed.songs, [{
    title: 'Standalone',
    notes_raw_text: 'Verse',
    font_size: 24,
    tags: [{ label: 'Acoustic', color: '#FFCC00' }],
  }]);
  assert.throws(
    () => parseSetlistArchive(JSON.stringify({
      format: 'gigbox-setlists',
      version: 6,
      groups: [],
      setlists: [],
    })),
    { message: 'The Dots export has an invalid standalone songs list.' },
  );
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
    message: 'The Dots export is missing its setlists.',
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
        { name: 'Set', songs: [{ title: 'Song', notes_raw_text: 'Cue', font_size: 129 }] },
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

test('parseSetlistArchive accepts the maximum performance font size', () => {
  assert.doesNotThrow(() =>
    parseSetlistArchive(
      JSON.stringify({
        format: 'gigbox-setlists',
        version: 1,
        setlists: [{
          name: 'Set',
          songs: [{ title: 'Song', notes_raw_text: 'Cue', font_size: 128 }],
        }],
      }),
    ),
  );
});

test('parseSetlistArchive rejects unsupported song tag colors', () => {
  assert.throws(
    () =>
      parseSetlistArchive(JSON.stringify({
        format: 'gigbox-setlists',
        version: 5,
        exportedAt: '2026-01-01T00:00:00.000Z',
        groups: [],
        setlists: [{
          name: 'Tagged Set',
          group: null,
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

test('setlist map position round-trips and invalid positions are rejected', () => {
  const base = { format: 'gigbox-setlists', version: 5, groups: [] };
  const parsed = parseSetlistArchive(JSON.stringify({
    ...base,
    setlists: [{ name: 'Set', group: null, location: 'Pub', latitude: 51.5, longitude: -0.12, items: [] }],
  }));
  assert.equal(parsed.setlists[0].latitude, 51.5);
  assert.equal(parsed.setlists[0].longitude, -0.12);

  assert.throws(
    () => parseSetlistArchive(JSON.stringify({
      ...base,
      setlists: [{ name: 'Set', group: null, latitude: 95, longitude: 0, items: [] }],
    })),
    { message: 'Setlist "Set" has an invalid map position.' },
  );
});

test('archive round-trips setlist notes and rejects non-string notes', () => {
  const archive = createSetlistArchive(
    [{ id: 's', name: 'Set', order_index: 0, notes: '[ ] Cables', items: [] }] as never,
    [],
  );
  assert.equal(archive.setlists[0].notes, '[ ] Cables');
  const parsed = parseSetlistArchive(JSON.stringify(archive));
  assert.equal(parsed.setlists[0].notes, '[ ] Cables');
  assert.throws(() =>
    parseSetlistArchive(
      JSON.stringify({ ...archive, setlists: [{ ...archive.setlists[0], notes: 5 }] }),
    ),
  );
});

test('song tags accept the extended tag colours', () => {
  const parsed = parseSetlistArchive(JSON.stringify({
    format: 'gigbox-setlists',
    version: 5,
    groups: [],
    setlists: [{
      name: 'Set',
      group: null,
      items: [{
        type: 'song',
        title: 'Song',
        notes_raw_text: '',
        tags: [{ label: 'ballad', color: '#B39DDB' }],
      }],
    }],
  }));
  assert.deepEqual(
    parsed.setlists[0].items[0].type === 'song' && parsed.setlists[0].items[0].tags,
    [{ label: 'ballad', color: '#B39DDB' }],
  );
});

test('createSetlistArchive without cues keeps titles and sizes but drops cues and tags', () => {
  const archive = createSetlistArchive(setlists, [{ id: 'group-1', name: 'The Band', order_index: 0 }], [], { includeCues: false });
  assert.equal(archive.cues, false);
  const first = archive.setlists[0].items[0];
  assert.equal(first.type, 'song');
  if (first.type === 'song') {
    assert.equal(first.title, 'First Song');
    assert.equal(first.notes_raw_text, '');
    assert.equal(first.cue_document, undefined);
    assert.equal(first.font_size, 24);
    assert.equal(first.tags, undefined);
  }
  assert.equal(archive.setlists[0].items[1].type, 'break');
});

test('a cue-less archive round-trips and flags that cues were omitted', () => {
  const parsed = parseSetlistArchive(
    JSON.stringify(createSetlistArchive(setlists, [{ id: 'group-1', name: 'The Band', order_index: 0 }], [], { includeCues: false })),
  );
  assert.equal(parsed.cuesOmitted, true);
  assert.equal(parsed.setlists[0].items.length, 4);
});

test('a normal archive does not carry the cues marker', () => {
  const archive = createSetlistArchive(setlists, [{ id: 'group-1', name: 'The Band', order_index: 0 }]);
  assert.equal('cues' in archive, false);
  assert.equal(parseSetlistArchive(JSON.stringify(archive)).cuesOmitted, undefined);
});

test('restoreOmittedCues copies cues from the matching existing song, once each', () => {
  const cueDocument = JSON.stringify({
    version: 1,
    blocks: [{ id: 'b', type: 'section', text: 'Chords', color: '#FFCC00' }],
  });
  const sources = [
    {
      title: 'First Song',
      notes_raw_text: 'Verse',
      cue_document: cueDocument,
      tags: JSON.stringify([{ label: 'loud', color: '#FF8A80' }]),
    },
    { title: 'first song', notes_raw_text: 'Second copy', cue_document: null },
  ];
  const used = new Set<(typeof sources)[number]>();
  const first = restoreOmittedCues<{ title: string; notes_raw_text: string; cue_document?: CueDocument; tags?: SongTag[] }>({ title: ' First Song ', notes_raw_text: '' }, sources, used);
  assert.equal(first.notes_raw_text, 'Verse');
  assert.equal(first.cue_document?.blocks.length, 1);
  assert.equal(first.tags?.[0].label, 'loud');
  const second = restoreOmittedCues<{ title: string; notes_raw_text: string; cue_document?: CueDocument; tags?: SongTag[] }>({ title: 'First Song', notes_raw_text: '' }, sources, used);
  assert.equal(second.notes_raw_text, 'Second copy');
  assert.equal(second.cue_document, undefined);
  const none = restoreOmittedCues({ title: 'Other', notes_raw_text: '' }, sources, used);
  assert.equal(none.notes_raw_text, '');
});
