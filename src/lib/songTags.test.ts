import assert from 'node:assert/strict';
import { test } from 'node:test';

import { addOrRecolorTag, getCommonSongTags } from './songTags';
import type { SetlistWithSongs, Song, SongTag } from '../types';

function song(id: string, tags: SongTag[] = []): Song {
  return { id, title: id, notes_raw_text: '', tags };
}

function setlist(id: string, songs: Song[]): SetlistWithSongs {
  return {
    id,
    name: id,
    order_index: 0,
    songs,
    items: songs.map((item) => ({ kind: 'song', song: item })),
  };
}

test('common song tags are ranked by usage across unique songs', () => {
  const sharedSong = song('shared', [{ label: 'Electric', color: '#FFCC00' }]);
  const result = getCommonSongTags([
    setlist('first', [
      sharedSong,
      song('acoustic-one', [{ label: 'Acoustic', color: '#4FC3F7' }]),
    ]),
    setlist('second', [
      sharedSong,
      song('electric-two', [{ label: 'electric', color: '#FFFFFF' }]),
      song('quiet', [{ label: 'Quiet', color: '#FF8A80' }]),
    ]),
  ]);

  assert.deepEqual(result, [
    { label: 'Electric', color: '#FFCC00' },
    { label: 'Acoustic', color: '#4FC3F7' },
    { label: 'Quiet', color: '#FF8A80' },
  ]);
});

test('addOrRecolorTag adds new tags and recolours existing ones case-insensitively', () => {
  const start: SongTag[] = [{ label: 'Piano', color: '#FFFFFF' }];
  assert.deepEqual(addOrRecolorTag(start, ' Guitar ', '#FFCC00'), [
    { label: 'Piano', color: '#FFFFFF' },
    { label: 'Guitar', color: '#FFCC00' },
  ]);
  assert.deepEqual(addOrRecolorTag(start, 'piano', '#FFCC00'), [{ label: 'Piano', color: '#FFCC00' }]);
  assert.equal(addOrRecolorTag(start, '   ', '#FFCC00'), start);
});
