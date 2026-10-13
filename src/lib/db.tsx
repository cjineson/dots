import * as SQLite from 'expo-sqlite';

import { makeId } from './uuid';
import type { Setlist, SetlistArchive, SetlistWithSongs, Song } from '../types';

const db = SQLite.openDatabaseSync('gigbox.db');

export function initializeDatabase(): void {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS setlists (
      id TEXT PRIMARY KEY,
      name TEXT,
      order_index INTEGER
    );

    CREATE TABLE IF NOT EXISTS songs (
      id TEXT PRIMARY KEY,
      title TEXT,
      notes_raw_text TEXT,
      font_size INTEGER NOT NULL DEFAULT 18,
      cue_document TEXT
    );

    CREATE TABLE IF NOT EXISTS setlist_songs (
      setlist_id TEXT,
      song_id TEXT,
      sort_order INTEGER,
      PRIMARY KEY (setlist_id, song_id),
      FOREIGN KEY (setlist_id) REFERENCES setlists(id),
      FOREIGN KEY (song_id) REFERENCES songs(id)
    );
  `);

  const songColumns = db.getAllSync<{ name: string }>('PRAGMA table_info(songs)');
  if (!songColumns.some((column) => column.name === 'font_size')) {
    db.execSync('ALTER TABLE songs ADD COLUMN font_size INTEGER NOT NULL DEFAULT 18');
  }
  if (!songColumns.some((column) => column.name === 'cue_document')) {
    db.execSync('ALTER TABLE songs ADD COLUMN cue_document TEXT');
  }
}

export function createSetlist(name: string): Setlist {
  const cleanedName = name.trim() || 'New Setlist';
  const id = makeId();
  const orderIndex = getNextSetlistOrderIndex();

  db.runSync('INSERT INTO setlists (id, name, order_index) VALUES (?, ?, ?)', [id, cleanedName, orderIndex]);

  return {
    id,
    name: cleanedName,
    order_index: orderIndex,
  };
}

export function getSetlistsWithSongs(): SetlistWithSongs[] {
  const setlists = db.getAllSync('SELECT * FROM setlists ORDER BY order_index ASC, name ASC') as Setlist[];

  return setlists.map((setlist) => {
    const songs = db.getAllSync(
      `SELECT s.*
       FROM songs s
       INNER JOIN setlist_songs ss ON ss.song_id = s.id
       WHERE ss.setlist_id = ?
       ORDER BY ss.sort_order ASC, s.title ASC`,
      [setlist.id],
    ) as Song[];

    return {
      ...setlist,
      songs,
    };
  });
}

export function getSongById(songId: string): Song | null {
  const row = db.getFirstSync('SELECT * FROM songs WHERE id = ?', [songId]) as Song | null;
  return row;
}

export function saveSongForSetlist({
  setlistId,
  songId,
  title,
  notes_raw_text,
  cue_document,
}: {
  setlistId: string;
  songId?: string;
  title: string;
  notes_raw_text: string;
  cue_document: string;
}): Song {
  const id = songId ?? makeId();
  const cleanedTitle = title.trim() || 'Untitled Song';

  const existing = getSongById(id);

  if (existing) {
    db.runSync('UPDATE songs SET title = ?, notes_raw_text = ?, cue_document = ? WHERE id = ?', [
      cleanedTitle,
      notes_raw_text,
      cue_document,
      id,
    ]);
  } else {
    db.runSync('INSERT INTO songs (id, title, notes_raw_text, cue_document) VALUES (?, ?, ?, ?)', [
      id,
      cleanedTitle,
      notes_raw_text,
      cue_document,
    ]);
  }

  db.runSync(
    'INSERT OR IGNORE INTO setlist_songs (setlist_id, song_id, sort_order) VALUES (?, ?, ?)',
    [setlistId, id, getNextSortOrderForSetlist(setlistId)],
  );

  return {
    id,
    title: cleanedTitle,
    notes_raw_text,
    cue_document,
  };
}

export function reorderSongsForSetlist(setlistId: string, songs: Song[]): void {
  db.withTransactionSync(() => {
    songs.forEach((song, index) => {
      db.runSync(
        'UPDATE setlist_songs SET sort_order = ? WHERE setlist_id = ? AND song_id = ?',
        [index, setlistId, song.id],
      );
    });
  });
}

export function importSetlists(setlists: SetlistArchive['setlists']): void {
  db.withTransactionSync(() => {
    let nextSetlistOrderIndex = getNextSetlistOrderIndex();

    for (const setlist of setlists) {
      const setlistId = makeId();
      db.runSync('INSERT INTO setlists (id, name, order_index) VALUES (?, ?, ?)', [
        setlistId,
        setlist.name.trim(),
        nextSetlistOrderIndex++,
      ]);

      setlist.songs.forEach((song, index) => {
        const songId = makeId();
        db.runSync(
          'INSERT INTO songs (id, title, notes_raw_text, font_size, cue_document) VALUES (?, ?, ?, ?, ?)',
          [
            songId,
            song.title.trim() || 'Untitled Song',
            song.notes_raw_text,
            song.font_size ?? 18,
            song.cue_document ? JSON.stringify(song.cue_document) : null,
          ],
        );
        db.runSync(
          'INSERT INTO setlist_songs (setlist_id, song_id, sort_order) VALUES (?, ?, ?)',
          [setlistId, songId, index],
        );
      });
    }
  });
}

export function updateSongFontSize(songId: string, fontSize: number): void {
  db.runSync('UPDATE songs SET font_size = ? WHERE id = ?', [fontSize, songId]);
}

function getNextSetlistOrderIndex(): number {
  const max = db.getFirstSync('SELECT MAX(order_index) as maxIndex FROM setlists') as { maxIndex: number | null } | null;
  return (max?.maxIndex ?? -1) + 1;
}

function getNextSortOrderForSetlist(setlistId: string): number {
  const max = db.getFirstSync(
    'SELECT MAX(sort_order) as maxOrder FROM setlist_songs WHERE setlist_id = ?',
    [setlistId],
  ) as { maxOrder: number | null } | null;

  return (max?.maxOrder ?? -1) + 1;
}

export { db };
