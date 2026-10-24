import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  EMPTY_SELECTION,
  findImportConflicts,
  isSetlistSelected,
  selectArchiveContent,
  toggleGroupSelection,
  toggleSetlistSelection,
  toggleSongSelection,
} from './archiveSelection';
import { createSetlistArchive, parseSetlistArchive } from './setlistArchive';
import type { SetlistGroup, SetlistWithSongs, Song } from '../types';

const song = (id: string, title: string): Song => ({ id, title, notes_raw_text: title });

const makeSetlist = (
  id: string,
  name: string,
  group: SetlistGroup | null,
  songs: Song[],
): SetlistWithSongs => ({
  id,
  name,
  order_index: 0,
  group_id: group?.id ?? null,
  group_name: group?.name,
  songs,
  items: songs.map((item) => ({ kind: 'song' as const, song: item })),
});

const band: SetlistGroup = { id: 'g1', name: 'Band', order_index: 0 };
const solo: SetlistGroup = { id: 'g2', name: 'Solo', order_index: 1 };
const a = makeSetlist('s1', 'Friday', band, [song('a1', 'One'), song('a2', 'Two')]);
const b = makeSetlist('s2', 'Saturday', band, [song('b1', 'Three')]);
const c = makeSetlist('s3', 'Acoustic', null, [song('c1', 'Four')]);
const all = [a, b, c];
const groups = [band, solo];

const select = (partial: Partial<typeof EMPTY_SELECTION>) => ({ ...EMPTY_SELECTION, ...partial });

test('selecting a group exports it with its setlists', () => {
  const content = selectArchiveContent(all, groups, select({ groupIds: new Set(['g1']) }));
  assert.deepEqual(content.groups.map((g) => g.name), ['Band']);
  assert.deepEqual(content.setlists.map((s) => s.name), ['Friday', 'Saturday']);
});

test('selecting an empty group exports just the group', () => {
  const content = selectArchiveContent(all, groups, select({ groupIds: new Set(['g2']) }));
  assert.deepEqual(content.groups.map((g) => g.name), ['Solo']);
  assert.equal(content.setlists.length, 0);
  const archive = createSetlistArchive(content.setlists, content.groups);
  assert.deepEqual(parseSetlistArchive(JSON.stringify(archive)).groups, ['Solo']);
});

test('selecting a setlist includes its group so the archive stays valid', () => {
  const content = selectArchiveContent(all, groups, select({ setlistIds: new Set(['s2']) }));
  assert.deepEqual(content.groups.map((g) => g.name), ['Band']);
  const parsed = parseSetlistArchive(
    JSON.stringify(createSetlistArchive(content.setlists, content.groups)),
  );
  assert.equal(parsed.setlists[0].group, 'Band');
  assert.equal(parsed.setlists[0].partial, undefined);
});

test('selecting some songs exports a partial setlist', () => {
  const content = selectArchiveContent(all, groups, select({ songIds: new Set(['a2']) }));
  assert.equal(content.setlists.length, 1);
  assert.equal(content.setlists[0].partial, true);
  const parsed = parseSetlistArchive(
    JSON.stringify(createSetlistArchive(content.setlists, content.groups)),
  );
  assert.equal(parsed.setlists[0].partial, true);
  assert.deepEqual(
    parsed.setlists[0].items.map((item) => item.type === 'song' && item.title),
    ['Two'],
  );
});

test('toggle helpers keep group, setlist and song selections consistent', () => {
  let selection = toggleGroupSelection(EMPTY_SELECTION, band, all);
  assert.ok(isSetlistSelected(selection, a) && isSetlistSelected(selection, b));

  selection = toggleSetlistSelection(selection, a, all);
  assert.ok(!isSetlistSelected(selection, a));
  assert.ok(isSetlistSelected(selection, b));
  assert.equal(selection.groupIds.has('g1'), false);

  selection = toggleSongSelection(selection, b, 'b1', all);
  assert.ok(!isSetlistSelected(selection, b));
  assert.equal(selection.songIds.has('b1'), false);

  selection = toggleSongSelection(EMPTY_SELECTION, a, 'a1', all);
  assert.deepEqual([...selection.songIds], ['a1']);
});

test('findImportConflicts reports matching setlists and partial songs', () => {
  const full = parseSetlistArchive(JSON.stringify(createSetlistArchive([a, c], [band])));
  assert.deepEqual(findImportConflicts(full, all).setlists, ['Friday', 'Acoustic']);
  assert.deepEqual(findImportConflicts(full, [b]), { setlists: [], songs: [] });

  const partialContent = selectArchiveContent(all, groups, select({ songIds: new Set(['a1']) }));
  const partial = parseSetlistArchive(
    JSON.stringify(createSetlistArchive(partialContent.setlists, partialContent.groups)),
  );
  assert.deepEqual(findImportConflicts(partial, all), { setlists: [], songs: ['One (in Friday)'] });
  assert.deepEqual(findImportConflicts(partial, [makeSetlist('x', 'other', band, [])]).songs, []);
});
