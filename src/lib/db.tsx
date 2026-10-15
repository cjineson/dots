import * as SQLite from 'expo-sqlite';

import { parseStoredSongTags } from './songTags';
import { makeId } from './uuid';
import type {
  ImportedSetlist,
  Setlist,
  SetlistItem,
  SetlistWithSongs,
  Song,
} from '../types';

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
      cue_document TEXT,
      tags TEXT
    );

    CREATE TABLE IF NOT EXISTS setlist_songs (
      setlist_id TEXT,
      song_id TEXT,
      sort_order INTEGER,
      PRIMARY KEY (setlist_id, song_id),
      FOREIGN KEY (setlist_id) REFERENCES setlists(id),
      FOREIGN KEY (song_id) REFERENCES songs(id)
    );

    CREATE TABLE IF NOT EXISTS setlist_breaks (
      id TEXT PRIMARY KEY,
      setlist_id TEXT NOT NULL,
      sort_order INTEGER NOT NULL,
      duration_minutes INTEGER,
      FOREIGN KEY (setlist_id) REFERENCES setlists(id)
    );
  `);

  const songColumns = db.getAllSync<{ name: string }>('PRAGMA table_info(songs)');
  if (!songColumns.some((column) => column.name === 'font_size')) {
    db.execSync('ALTER TABLE songs ADD COLUMN font_size INTEGER NOT NULL DEFAULT 18');
  }
  if (!songColumns.some((column) => column.name === 'cue_document')) {
    db.execSync('ALTER TABLE songs ADD COLUMN cue_document TEXT');
  }
  if (!songColumns.some((column) => column.name === 'tags')) {
    db.execSync('ALTER TABLE songs ADD COLUMN tags TEXT');
  }
  const setlistColumns = db.getAllSync<{ name: string }>('PRAGMA table_info(setlists)');
  for (const column of ['location', 'date', 'time']) {
    if (!setlistColumns.some((existing) => existing.name === column)) {
      db.execSync(`ALTER TABLE setlists ADD COLUMN ${column} TEXT`);
    }
  }
}

export function createSetlist(name: string): Setlist {
  const cleanedName = name.trim() || 'New Setlist';
  const id = makeId();
  const orderIndex = getNextSetlistOrderIndex();

  db.runSync(
    'INSERT INTO setlists (id, name, order_index) VALUES (?, ?, ?)',
    [id, cleanedName, orderIndex],
  );

  return {
    id,
    name: cleanedName,
    order_index: orderIndex,
  };
}

export function renameSetlist(
  setlistId: string,
  name: string,
  details: { location?: string; date?: string; time?: string } = {},
): void {
  const cleanedName = name.trim();
  if (!cleanedName) {
    throw new Error('Setlist name cannot be empty.');
  }

  db.runSync(
    'UPDATE setlists SET name = ?, location = ?, date = ?, time = ? WHERE id = ?',
    [
      cleanedName,
      details.location?.trim() || null,
      details.date?.trim() || null,
      details.time?.trim() || null,
      setlistId,
    ],
  );
}

export function deleteSetlist(setlistId: string): void {
  db.withTransactionSync(() => {
    db.runSync('DELETE FROM setlist_songs WHERE setlist_id = ?', [setlistId]);
    db.runSync('DELETE FROM setlist_breaks WHERE setlist_id = ?', [setlistId]);
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

  const sourceSetlist = getSetlistsWithSongs().find((setlist) => setlist.id === setlistId);
  if (!sourceSetlist) {
    throw new Error('The setlist to copy could not be found.');
  }

  const copy: Setlist = {
    id: makeId(),
    name: `Copy of ${source.name}`,
    order_index: getNextSetlistOrderIndex(),
    location: source.location,
    date: source.date,
    time: source.time,
  };

  db.withTransactionSync(() => {
    db.runSync(
      'INSERT INTO setlists (id, name, order_index, location, date, time) VALUES (?, ?, ?, ?, ?, ?)',
      [copy.id, copy.name, copy.order_index, copy.location ?? null, copy.date ?? null, copy.time ?? null],
    );

    sourceSetlist.items.forEach((item, index) => {
      if (item.kind === 'song') {
        db.runSync(
          'INSERT INTO setlist_songs (setlist_id, song_id, sort_order) VALUES (?, ?, ?)',
          [copy.id, item.song.id, index],
        );
      } else {
        db.runSync(
          'INSERT INTO setlist_breaks (id, setlist_id, sort_order, duration_minutes) VALUES (?, ?, ?, ?)',
          [makeId(), copy.id, index, item.duration_minutes ?? null],
        );
      }
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

  db.runSync(
    'INSERT OR IGNORE INTO setlist_songs (setlist_id, song_id, sort_order) VALUES (?, ?, ?)',
    [targetSetlistId, source.id, getNextSortOrderForSetlist(targetSetlistId)],
  );
  return source;
}

export function getSetlistsWithSongs(): SetlistWithSongs[] {
  const setlists = db.getAllSync('SELECT * FROM setlists ORDER BY order_index ASC, name ASC') as Setlist[];

  return setlists.map((setlist) => {
    const rows = db.getAllSync<{
      kind: 'song' | 'break';
      id: string;
      sort_order: number;
      title: string | null;
      notes_raw_text: string | null;
      font_size: number | null;
      cue_document: string | null;
      tags: string | null;
      duration_minutes: number | null;
    }>(
      `SELECT 'song' AS kind, s.id, ss.sort_order, s.title, s.notes_raw_text,
              s.font_size, s.cue_document, s.tags, NULL AS duration_minutes
       FROM songs s
       INNER JOIN setlist_songs ss ON ss.song_id = s.id
       WHERE ss.setlist_id = ?
       UNION ALL
       SELECT 'break' AS kind, id, sort_order, NULL, NULL, NULL, NULL, NULL, duration_minutes
       FROM setlist_breaks
       WHERE setlist_id = ?
       ORDER BY sort_order ASC`,
      [setlist.id, setlist.id],
    );
    const items: SetlistItem[] = rows.map((row) => {
      if (row.kind === 'break') {
        return {
          kind: 'break',
          id: row.id,
          ...(row.duration_minutes !== null
            ? { duration_minutes: row.duration_minutes }
            : {}),
        };
      }
      if (row.title === null || row.notes_raw_text === null) {
        throw new Error(`Song ${row.id} in setlist "${setlist.name}" is incomplete.`);
      }
      return {
        kind: 'song',
        song: {
          id: row.id,
          title: row.title,
          notes_raw_text: row.notes_raw_text,
          font_size: row.font_size ?? undefined,
          cue_document: row.cue_document ?? undefined,
          tags: parseStoredSongTags(row.tags),
        },
      };
    });

    return {
      ...setlist,
      location: setlist.location ?? undefined,
      date: setlist.date ?? undefined,
      time: setlist.time ?? undefined,
      songs: items.flatMap((item) => item.kind === 'song' ? [item.song] : []),
      items,
    };
  });
}

export function createBreakForSetlist(
  setlistId: string,
  durationMinutes?: number,
): void {
  if (
    durationMinutes !== undefined &&
    (!Number.isSafeInteger(durationMinutes) || durationMinutes < 1)
  ) {
    throw new Error('Break duration must be a positive whole number of minutes.');
  }
  const setlist = db.getFirstSync('SELECT id FROM setlists WHERE id = ?', [setlistId]);
  if (!setlist) {
    throw new Error('The setlist to add a break to could not be found.');
  }
  db.runSync(
    'INSERT INTO setlist_breaks (id, setlist_id, sort_order, duration_minutes) VALUES (?, ?, ?, ?)',
    [
      makeId(),
      setlistId,
      getNextSortOrderForSetlist(setlistId),
      durationMinutes ?? null,
    ],
  );
}

export function deleteSongFromSetlist(setlistId: string, songId: string): void {
  db.withTransactionSync(() => {
    db.runSync('DELETE FROM setlist_songs WHERE setlist_id = ? AND song_id = ?', [
      setlistId,
      songId,
    ]);
    db.runSync(
      `DELETE FROM songs
       WHERE id = ?
       AND NOT EXISTS (
         SELECT 1 FROM setlist_songs WHERE setlist_songs.song_id = songs.id
       )`,
      [songId],
    );
  });
}

export function deleteBreakFromSetlist(setlistId: string, breakId: string): void {
  db.runSync('DELETE FROM setlist_breaks WHERE setlist_id = ? AND id = ?', [
    setlistId,
    breakId,
  ]);
}

export function getSongById(songId: string): Song | null {
  const row = db.getFirstSync<{
    id: string;
    title: string;
    notes_raw_text: string;
    font_size: number | null;
    cue_document: string | null;
    tags: string | null;
  }>('SELECT * FROM songs WHERE id = ?', [songId]);
  return row
    ? {
        id: row.id,
        title: row.title,
        notes_raw_text: row.notes_raw_text,
        font_size: row.font_size ?? undefined,
        cue_document: row.cue_document ?? undefined,
        tags: parseStoredSongTags(row.tags),
      }
    : null;
}

export function saveSongForSetlist({
  setlistId,
  songId,
  title,
  notes_raw_text,
  cue_document,
  tags,
}: {
  setlistId: string;
  songId?: string;
  title: string;
  notes_raw_text: string;
  cue_document: string;
  tags: Song['tags'];
}): Song {
  const id = songId ?? makeId();
  const cleanedTitle = title.trim() || 'Untitled Song';

  const existing = getSongById(id);

  if (existing) {
    db.runSync('UPDATE songs SET title = ?, notes_raw_text = ?, cue_document = ?, tags = ? WHERE id = ?', [
      cleanedTitle,
      notes_raw_text,
      cue_document,
      JSON.stringify(tags ?? []),
      id,
    ]);
  } else {
    db.runSync('INSERT INTO songs (id, title, notes_raw_text, cue_document, tags) VALUES (?, ?, ?, ?, ?)', [
      id,
      cleanedTitle,
      notes_raw_text,
      cue_document,
      JSON.stringify(tags ?? []),
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
    tags: tags ?? [],
  };
}

export function reorderItemsForSetlist(setlistId: string, items: SetlistItem[]): void {
  db.withTransactionSync(() => {
    items.forEach((item, index) => {
      if (item.kind === 'song') {
        db.runSync(
          'UPDATE setlist_songs SET sort_order = ? WHERE setlist_id = ? AND song_id = ?',
          [index, setlistId, item.song.id],
        );
      } else {
        db.runSync(
          'UPDATE setlist_breaks SET sort_order = ? WHERE setlist_id = ? AND id = ?',
          [index, setlistId, item.id],
        );
      }
    });
  });
}

export function importSetlists(setlists: ImportedSetlist[]): void {
  db.withTransactionSync(() => {
    let nextSetlistOrderIndex = getNextSetlistOrderIndex();

    for (const setlist of setlists) {
      const setlistId = makeId();
      db.runSync(
        'INSERT INTO setlists (id, name, order_index, location, date, time) VALUES (?, ?, ?, ?, ?, ?)',
        [
          setlistId,
          setlist.name.trim(),
          nextSetlistOrderIndex++,
          setlist.location?.trim() || null,
          setlist.date?.trim() || null,
          setlist.time?.trim() || null,
        ],
      );

      setlist.items.forEach((item, index) => {
        if (item.type === 'song') {
          const songId = makeId();
          db.runSync(
            'INSERT INTO songs (id, title, notes_raw_text, font_size, cue_document, tags) VALUES (?, ?, ?, ?, ?, ?)',
            [
              songId,
              item.title.trim() || 'Untitled Song',
              item.notes_raw_text,
              item.font_size ?? 18,
              item.cue_document ? JSON.stringify(item.cue_document) : null,
              JSON.stringify(item.tags ?? []),
            ],
          );
          db.runSync(
            'INSERT INTO setlist_songs (setlist_id, song_id, sort_order) VALUES (?, ?, ?)',
            [setlistId, songId, index],
          );
        } else {
          db.runSync(
            'INSERT INTO setlist_breaks (id, setlist_id, sort_order, duration_minutes) VALUES (?, ?, ?, ?)',
            [makeId(), setlistId, index, item.duration_minutes ?? null],
          );
        }
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
    `SELECT MAX(sort_order) as maxOrder FROM (
       SELECT sort_order FROM setlist_songs WHERE setlist_id = ?
       UNION ALL
       SELECT sort_order FROM setlist_breaks WHERE setlist_id = ?
     )`,
    [setlistId, setlistId],
  ) as { maxOrder: number | null } | null;

  return (max?.maxOrder ?? -1) + 1;
}

export { db };
