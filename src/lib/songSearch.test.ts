import test from 'node:test';
import assert from 'node:assert/strict';

import { buildSongSearchEntries, searchSongEntries } from './songSearch';
import { displaySongTitle } from './songTitle';
import type { SetlistWithSongs, Song } from '../types';

const song = (id: string, title: string, extra: Partial<Song> = {}): Song => ({
  id,
  title,
  notes_raw_text: '',
  ...extra,
});

const alpha = song('a', 'Alpha Song', { tags: [{ label: 'Acoustic', color: '#FFFFFF' }] });
const beta = song('b', 'Beta');
const solo = song('c', 'Solo Alpha', { group_id: 'g1' });

const setlists: SetlistWithSongs[] = [
  {
    id: 's1',
    name: 'Friday',
    order_index: 0,
    group_id: 'g1',
    songs: [alpha, beta],
    items: [
      { kind: 'song', song: beta },
      { kind: 'break', id: 'br' },
      { kind: 'song', song: alpha },
    ],
  },
];
const groups = [{ id: 'g1', name: 'Weddings', order_index: 0 }];

test('builds entries with location and list position', () => {
  const entries = buildSongSearchEntries(setlists, [solo], groups);
  assert.equal(entries.length, 3);
  const alphaEntry = entries.find((entry) => entry.song.id === 'a');
  assert.equal(alphaEntry?.index, 2);
  assert.equal(alphaEntry?.location, 'Friday · Weddings');
  assert.equal(alphaEntry?.setlistId, 's1');
  const soloEntry = entries.find((entry) => entry.song.id === 'c');
  assert.equal(soloEntry?.location, 'Weddings');
  assert.equal(soloEntry?.setlistId, null);
  assert.equal(soloEntry?.groupId, 'g1');
});

test('matches titles and tags, prefix matches first', () => {
  const entries = buildSongSearchEntries(setlists, [solo], groups);
  assert.deepEqual(searchSongEntries(entries, 'alpha').map((entry) => entry.song.id), ['a', 'c']);
  assert.deepEqual(searchSongEntries(entries, 'acoustic').map((entry) => entry.song.id), ['a']);
  assert.deepEqual(searchSongEntries(entries, '  ').length, 0);
  assert.equal(searchSongEntries(entries, 'zzz').length, 0);
});

test('displays and searches the optional artist', () => {
  const withArtist = song('d', 'A Song', { artist: 'The Artist' });
  const entries = buildSongSearchEntries([], [withArtist], []);
  assert.equal(displaySongTitle(withArtist), 'A Song - The Artist');
  assert.equal(displaySongTitle(song('e', 'A Song', { artist: '  ' })), 'A Song');
  assert.deepEqual(searchSongEntries(entries, 'song artist').map((entry) => entry.song.id), ['d']);
});
