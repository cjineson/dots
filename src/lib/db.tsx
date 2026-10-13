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

export function renameSetlist(setlistId: string, name: string): void {
  const cleanedName = name.trim();
  if (!cleanedName) {
    throw new Error('Setlist name cannot be empty.');
  }

  db.runSync('UPDATE setlists SET name = ? WHERE id = ?', [cleanedName, setlistId]);
}

export function deleteSetlist(setlistId: string): void {
  db.withTransactionSync(() => {
    db.runSync('DELETE FROM setlist_songs WHERE setlist_id = ?', [setlistId]);
    db.runSync('DELETE FROM setlists WHERE id = ?', [setlistId]);
    db.runSync(
      `DELETE FROM songs
       WHERE NOT EXISTS (
         SELECT 1 FROM setlist_songs WHERE setlist_songs.song_id = songs.id
       )`,
    );
  });
}

export function copySetlist(setlistId: string): Setlist {
  const source = db.getFirstSync('SELECT * FROM setlists WHERE id = ?', [setlistId]) as Setlist | null;
  if (!source) {
    throw new Error('The setlist to copy could not be found.');
  }

  const copy: Setlist = {
    id: makeId(),
    name: `Copy of ${source.name}`,
    order_index: getNextSetlistOrderIndex(),
  };

  db.withTransactionSync(() => {
    db.runSync('INSERT INTO setlists (id, name, order_index) VALUES (?, ?, ?)', [
      copy.id,
      copy.name,
      copy.order_index,
    ]);

    const songs = db.getAllSync(
      `SELECT s.*
       FROM songs s
       INNER JOIN setlist_songs ss ON ss.song_id = s.id
       WHERE ss.setlist_id = ?
       ORDER BY ss.sort_order ASC, s.title ASC`,
      [setlistId],
    ) as Song[];

    songs.forEach((song, index) => {
      const songId = makeId();
      db.runSync(
        'INSERT INTO songs (id, title, notes_raw_text, font_size, cue_document) VALUES (?, ?, ?, ?, ?)',
        [
          songId,
          song.title,
          song.notes_raw_text,
          song.font_size ?? 18,
          song.cue_document ?? null,
        ],
      );
      db.runSync(
        'INSERT INTO setlist_songs (setlist_id, song_id, sort_order) VALUES (?, ?, ?)',
        [copy.id, songId, index],
      );
    });
  });

  return copy;
}

export function copySongToSetlist(songId: string, targetSetlistId: string): Song {
  const source = getSongById(songId);
  if (!source) {
    throw new Error('The song to copy could not be found.');
  }

  const target = db.getFirstSync('SELECT id FROM setlists WHERE id = ?', [
    targetSetlistId,
  ]) as { id: string } | null;
  if (!target) {
    throw new Error('The destination setlist could not be found.');
  }

  const copy: Song = {
    ...source,
    id: makeId(),
  };

  db.withTransactionSync(() => {
    db.runSync(
      'INSERT INTO songs (id, title, notes_raw_text, font_size, cue_document) VALUES (?, ?, ?, ?, ?)',
      [
        copy.id,
        copy.title,
        copy.notes_raw_text,
        copy.font_size ?? 18,
        copy.cue_document ?? null,
      ],
    );
    db.runSync(
      'INSERT INTO setlist_songs (setlist_id, song_id, sort_order) VALUES (?, ?, ?)',
      [targetSetlistId, copy.id, getNextSortOrderForSetlist(targetSetlistId)],
    );
  });

  return copy;
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
