import * as SQLite from 'expo-sqlite';

import { makeId } from './uuid';
import type { Setlist, SetlistWithSongs, Song } from '../types';

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
      notes_raw_text TEXT
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
}: {
  setlistId: string;
  songId?: string;
  title: string;
  notes_raw_text: string;
}): Song {
  const id = songId ?? makeId();
  const cleanedTitle = title.trim() || 'Untitled Song';

  const existing = getSongById(id);

  if (existing) {
    db.runSync('UPDATE songs SET title = ?, notes_raw_text = ? WHERE id = ?', [
      cleanedTitle,
      notes_raw_text,
      id,
    ]);
  } else {
    db.runSync('INSERT INTO songs (id, title, notes_raw_text) VALUES (?, ?, ?)', [
      id,
      cleanedTitle,
      notes_raw_text,
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
  };
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
