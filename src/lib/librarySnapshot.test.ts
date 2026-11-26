import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  copyLibrarySnapshot,
  getSnapshotConflicts,
  mergeLibrarySnapshots,
  parseLibrarySnapshot,
  snapshotConflictKey,
} from './librarySnapshot';
import type { LibrarySnapshot } from './librarySnapshot';

function library(): LibrarySnapshot {
  return {
    format: 'dots-library-snapshot', version: 1, exportedAt: '2026-01-01T00:00:00.000Z',
    groups: [{ id: 'group', name: 'Band', order_index: 0 }],
    songs: [
      { id: 'song', title: 'Song', notes_raw_text: 'C G', font_size: 18, cue_document: null, tags: null, group_id: null, sort_order: null, is_note: 0 },
      { id: 'standalone', title: 'Solo', notes_raw_text: '', font_size: 18, cue_document: null, tags: null, group_id: 'group', sort_order: 2, is_note: 0 },
    ],
    setlists: ['one', 'two'].map((id, order_index) => ({
      id, name: id, order_index, group_id: 'group', location: null, latitude: null, longitude: null,
      notes: null, date: null, time: null, items: [{ kind: 'song', id: 'song', sort_order: 0 }],
    })),
  };
}

test('snapshot preserves grouped standalone songs and shared song references', () => {
  const original = library();
  assert.deepEqual(parseLibrarySnapshot(JSON.stringify(original)), original);
  const invalid = library();
  invalid.setlists[0].items.push({ kind: 'song', id: 'missing', sort_order: 1 });
  assert.throws(() => parseLibrarySnapshot(JSON.stringify(invalid)), /invalid or duplicate setlist item/);
  invalid.setlists[0].items.pop();
  invalid.setlists[0].latitude = 91;
  assert.throws(() => parseLibrarySnapshot(JSON.stringify(invalid)), /invalid setlist/);
  invalid.setlists[0].latitude = null;
  invalid.songs[0].font_size = 10000;
  assert.throws(() => parseLibrarySnapshot(JSON.stringify(invalid)), /invalid song/);
});

test('merge requires choices and retains additions and items on either side', () => {
  const local = library();
  const incoming = library();
  incoming.songs[0].notes_raw_text = 'Am F';
  local.setlists[0].items.push({ kind: 'break', id: 'local-break', sort_order: 1, duration_minutes: 5 });
  incoming.setlists[0].items.push({ kind: 'break', id: 'remote-break', sort_order: 1, duration_minutes: 10 });
  incoming.songs.push({ ...incoming.songs[1], id: 'remote', title: 'Incoming' });
  const conflicts = getSnapshotConflicts(local, incoming);
  assert.deepEqual(conflicts.map(({ kind }) => kind), ['song', 'setlist']);
  assert.throws(() => mergeLibrarySnapshots(local, incoming, {}), /every conflict/);
  const result = mergeLibrarySnapshots(local, incoming, {
    [snapshotConflictKey('song', 'song')]: 'incoming',
    [snapshotConflictKey('setlist', 'one')]: 'incoming',
  }).snapshot;
  assert.equal(result.songs.find(({ id }) => id === 'song')?.notes_raw_text, 'Am F');
  assert.ok(result.songs.some(({ id }) => id === 'standalone'));
  assert.ok(result.songs.some(({ id }) => id === 'remote'));
  assert.deepEqual(result.setlists[0].items.map(({ id }) => id), ['song', 'remote-break', 'local-break']);
  assert.equal(result.setlists[1].items[0].id, 'song');
});

test('copies remap shared links and grouped songs without modifying the original', () => {
  const local = library();
  const incoming = library();
  let counter = 0;
  const { snapshot, renamed } = copyLibrarySnapshot(local, incoming, () => `copy-${++counter}`);
  assert.deepEqual(renamed, ['Band → Band (2)']);
  assert.equal(snapshot.groups.length, 2);
  assert.equal(snapshot.songs.find(({ title, group_id }) => title === 'Solo' && group_id !== 'group')?.group_id, snapshot.groups[1].id);
  assert.equal(snapshot.setlists[2].items[0].id, snapshot.setlists[3].items[0].id);
  assert.notEqual(snapshot.setlists[2].items[0].id, 'song');
  assert.deepEqual(local, library());
});

test('merge reports group name collisions rather than overwriting either group', () => {
  const local = library();
  const incoming = library();
  incoming.groups[0].id = 'another-group';
  incoming.setlists.forEach((setlist) => { setlist.group_id = 'another-group'; });
  incoming.songs[1].group_id = 'another-group';
  const choices = Object.fromEntries(getSnapshotConflicts(local, incoming).map(({ kind, id }) => [snapshotConflictKey(kind, id), 'local' as const]));
  const result = mergeLibrarySnapshots(local, incoming, choices);
  assert.deepEqual(result.renamed, ['Band → Band (2)']);
  assert.equal(result.snapshot.groups.length, 2);
});

test('snapshot group uniqueness follows SQLite NOCASE without rejecting non-ASCII names', () => {
  const original = library();
  original.groups = [
    { id: 'group', name: 'Été', order_index: 0 },
    { id: 'other', name: 'été', order_index: 1 },
  ];
  assert.deepEqual(parseLibrarySnapshot(JSON.stringify(original)), original);
  original.groups[1].name = 'ÉTé';
  assert.throws(() => parseLibrarySnapshot(JSON.stringify(original)), /duplicate group/);
});
