import * as SQLite from 'expo-sqlite';

import { DEFAULT_TAG_SIZE, clampTagSize } from './fontSize';
import {
  parseSettings,
  serializeSetting,
  settingStorageKey,
} from './settings';
import type { AppSettings } from './settings';
import { UNGROUPED_SONGS_SETLIST_NAME } from './ungrouped';
import { parseStoredSongTags } from './songTags';
import { makeId } from './uuid';
import type {
  DashboardExpansionState,
  ImportedLibrary,
  Setlist,
  SetlistGroup,
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
      order_index INTEGER,
      group_id TEXT
    );

    CREATE TABLE IF NOT EXISTS setlist_groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL COLLATE NOCASE UNIQUE,
      order_index INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS dashboard_preferences (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      expanded_setlists TEXT NOT NULL,
      collapsed_groups TEXT NOT NULL
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

  db.execSync(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
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
  for (const column of ['location', 'date', 'time', 'group_id']) {
    if (!setlistColumns.some((existing) => existing.name === column)) {
      db.execSync(`ALTER TABLE setlists ADD COLUMN ${column} TEXT`);
    }
  }
  if (!setlistColumns.some((existing) => existing.name === 'notes')) {
    db.execSync('ALTER TABLE setlists ADD COLUMN notes TEXT');
  }
  for (const column of ['latitude', 'longitude']) {
    if (!setlistColumns.some((existing) => existing.name === column)) {
      db.execSync(`ALTER TABLE setlists ADD COLUMN ${column} REAL`);
    }
  }
}

export function getSetlistGroups(): SetlistGroup[] {
  return db.getAllSync<SetlistGroup>(
    'SELECT id, name, order_index FROM setlist_groups ORDER BY order_index ASC, name COLLATE NOCASE ASC',
  );
}

export function getAppSettings(): AppSettings {
  const rows = db.getAllSync<{ key: string; value: string }>('SELECT key, value FROM app_settings');
  return parseSettings(Object.fromEntries(rows.map((row) => [row.key, row.value])));
}

export function saveAppSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
  const stored = serializeSetting(key, value);
  const storageKey = settingStorageKey(key);
  if (stored === null) {
    db.runSync('DELETE FROM app_settings WHERE key = ?', [storageKey]);
    return;
  }
  db.runSync(
    `INSERT INTO app_settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [storageKey, stored],
  );
}

export function resetAppSettings(): void {
  db.runSync('DELETE FROM app_settings');
}

export function clearAllLibraryData(): void {
  db.withTransactionSync(() => {
    for (const table of [
      'setlist_songs',
      'setlist_breaks',
      'setlists',
      'setlist_groups',
      'songs',
      'dashboard_preferences',
    ]) {
      db.runSync(`DELETE FROM ${table}`);
    }
  });
}

export function updateSetlistNotes(setlistId: string, notes: string): void {
  db.runSync('UPDATE setlists SET notes = ? WHERE id = ?', [notes.trim() ? notes : null, setlistId]);
}

export function getThemePreference(): 'system' | 'dark' | 'light' {
  const row = db.getFirstSync<{ value: string }>(
    "SELECT value FROM app_settings WHERE key = 'theme_preference'",
  );
  return row?.value === 'light' || row?.value === 'dark' || row?.value === 'system'
    ? row.value
    : 'dark';
}

export function saveThemePreference(preference: 'system' | 'dark' | 'light'): void {
  db.runSync(
    `INSERT INTO app_settings (key, value) VALUES ('theme_preference', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [preference],
  );
}

export function getTagSize(): number {
  const row = db.getFirstSync<{ value: string }>(
    "SELECT value FROM app_settings WHERE key = 'tag_size'",
  );
  const size = row ? Number(row.value) : NaN;
  return Number.isFinite(size) ? clampTagSize(size) : DEFAULT_TAG_SIZE;
}

export function saveTagSize(size: number): void {
  db.runSync(
    `INSERT INTO app_settings (key, value) VALUES ('tag_size', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [String(clampTagSize(size))],
  );
}

export function getDashboardExpansionState(): DashboardExpansionState {
  const row = db.getFirstSync<{
    expanded_setlists: string;
    collapsed_groups: string;
  }>('SELECT expanded_setlists, collapsed_groups FROM dashboard_preferences WHERE id = 1');
  if (!row) {
    return { expandedSetlists: {}, collapsedGroups: {} };
  }

  const parseExpandedIds = (json: string, field: string): Record<string, true> => {
    let value: unknown;
    try {
      value = JSON.parse(json);
    } catch {
      throw new Error(`Saved dashboard ${field} preferences are not valid JSON.`);
    }
    if (
      typeof value !== 'object' ||
      value === null ||
      Array.isArray(value) ||
      Object.values(value).some((expanded) => expanded !== true)
    ) {
      throw new Error(`Saved dashboard ${field} preferences are invalid.`);
    }
    return value as Record<string, true>;
  };

  return {
    expandedSetlists: parseExpandedIds(row.expanded_setlists, 'setlist expansion'),
    collapsedGroups: parseExpandedIds(row.collapsed_groups, 'group expansion'),
  };
}

export function saveDashboardExpansionState(state: DashboardExpansionState): void {
  db.runSync(
    `INSERT INTO dashboard_preferences (id, expanded_setlists, collapsed_groups)
     VALUES (1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       expanded_setlists = excluded.expanded_setlists,
       collapsed_groups = excluded.collapsed_groups`,
    [JSON.stringify(state.expandedSetlists), JSON.stringify(state.collapsedGroups)],
  );
}

export function createSetlistGroup(name: string): SetlistGroup {
  const cleanedName = name.trim();
  if (!cleanedName) {
    throw new Error('Group name cannot be empty.');
  }
  const id = makeId();
  const orderIndex = db.getFirstSync<{ maxIndex: number | null }>(
    'SELECT MAX(order_index) AS maxIndex FROM setlist_groups',
  )?.maxIndex;
  db.runSync(
    'INSERT INTO setlist_groups (id, name, order_index) VALUES (?, ?, ?)',
    [id, cleanedName, (orderIndex ?? -1) + 1],
  );
  return { id, name: cleanedName, order_index: (orderIndex ?? -1) + 1 };
}

export function renameSetlistGroup(groupId: string, name: string): void {
  const cleanedName = name.trim();
  if (!cleanedName) {
    throw new Error('Group name cannot be empty.');
  }
  const result = db.runSync(
    'UPDATE setlist_groups SET name = ? WHERE id = ?',
    [cleanedName, groupId],
  );
  if (result.changes === 0) {
    throw new Error('The group to rename could not be found.');
  }
}

export function deleteSetlistGroup(groupId: string): void {
  db.withTransactionSync(() => {
    db.runSync('UPDATE setlists SET group_id = NULL WHERE group_id = ?', [groupId]);
    const result = db.runSync('DELETE FROM setlist_groups WHERE id = ?', [groupId]);
    if (result.changes === 0) {
      throw new Error('The group to remove could not be found.');
    }
  });
}

export function createSetlist(name: string, groupId?: string | null): Setlist {
  const cleanedName = name.trim() || 'New Setlist';
  const id = makeId();
  const orderIndex = getTopSetlistOrderIndex();
  const resolvedGroupId = groupId ?? null;
  if (resolvedGroupId) {
    const group = db.getFirstSync('SELECT id FROM setlist_groups WHERE id = ?', [resolvedGroupId]);
    if (!group) {
      throw new Error('The group for this setlist could not be found.');
    }
  }

  db.runSync(
    'INSERT INTO setlists (id, name, order_index, group_id) VALUES (?, ?, ?, ?)',
    [id, cleanedName, orderIndex, resolvedGroupId],
  );

  return {
    id,
    name: cleanedName,
    order_index: orderIndex,
    ...(resolvedGroupId ? { group_id: resolvedGroupId } : {}),
  };
}

export function renameSetlist(
  setlistId: string,
  name: string,
  details: {
    location?: string;
    latitude?: number | null;
    longitude?: number | null;
    notes?: string;
    date?: string;
    time?: string;
    groupId?: string | null;
  } = {},
): void {
  const cleanedName = name.trim();
  if (!cleanedName) {
    throw new Error('Setlist name cannot be empty.');
  }
  if (details.groupId) {
    const group = db.getFirstSync('SELECT id FROM setlist_groups WHERE id = ?', [details.groupId]);
    if (!group) {
      throw new Error('The group for this setlist could not be found.');
    }
  }

  db.runSync(
    'UPDATE setlists SET name = ?, location = ?, latitude = ?, longitude = ?, notes = ?, date = ?, time = ?, group_id = ? WHERE id = ?',
    [
      cleanedName,
      details.location?.trim() || null,
      details.latitude ?? null,
      details.longitude ?? null,
      details.notes?.trim() ? details.notes : null,
      details.date?.trim() || null,
      details.time?.trim() || null,
      details.groupId ?? null,
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
    order_index: getTopSetlistOrderIndex(),
    location: source.location,
    latitude: source.latitude ?? undefined,
    longitude: source.longitude ?? undefined,
    notes: source.notes ?? undefined,
    date: source.date,
    time: source.time,
    group_id: source.group_id,
  };

  db.withTransactionSync(() => {
    db.runSync(
      'INSERT INTO setlists (id, name, order_index, location, latitude, longitude, notes, date, time, group_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        copy.id,
        copy.name,
        copy.order_index,
        copy.location ?? null,
        copy.latitude ?? null,
        copy.longitude ?? null,
        copy.notes ?? null,
        copy.date ?? null,
        copy.time ?? null,
        copy.group_id ?? null,
      ],
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
  const setlists = db.getAllSync<Setlist & { group_name: string | null }>(
    `SELECT s.*, g.name AS group_name
     FROM setlists s
     LEFT JOIN setlist_groups g ON g.id = s.group_id
     ORDER BY s.order_index ASC, s.name COLLATE NOCASE ASC`,
  );

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
      latitude: setlist.latitude ?? undefined,
      longitude: setlist.longitude ?? undefined,
      notes: setlist.notes ?? undefined,
      date: setlist.date ?? undefined,
      time: setlist.time ?? undefined,
      group_id: setlist.group_id ?? undefined,
      group_name: setlist.group_name ?? undefined,
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

export function keepSongUngrouped(setlistId: string, songId: string): void {
  db.withTransactionSync(() => {
    const existing = db.getFirstSync<{ id: string }>(
      'SELECT id FROM setlists WHERE name = ? AND group_id IS NULL ORDER BY order_index ASC LIMIT 1',
      [UNGROUPED_SONGS_SETLIST_NAME],
    );
    const holderId = existing?.id ?? createSetlist(UNGROUPED_SONGS_SETLIST_NAME).id;
    if (holderId === setlistId) {
      return;
    }
    db.runSync(
      'INSERT OR IGNORE INTO setlist_songs (setlist_id, song_id, sort_order) VALUES (?, ?, ?)',
      [holderId, songId, getNextSortOrderForSetlist(holderId)],
    );
    db.runSync('DELETE FROM setlist_songs WHERE setlist_id = ? AND song_id = ?', [
      setlistId,
      songId,
    ]);
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
  font_size,
}: {
  setlistId: string;
  songId?: string;
  font_size?: number;
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
    db.runSync('INSERT INTO songs (id, title, notes_raw_text, cue_document, tags, font_size) VALUES (?, ?, ?, ?, ?, ?)', [
      id,
      cleanedTitle,
      notes_raw_text,
      cue_document,
      JSON.stringify(tags ?? []),
      font_size ?? 18,
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

export function importSetlists(library: ImportedLibrary): void {
  db.withTransactionSync(() => {
    let nextSetlistOrderIndex = getNextSetlistOrderIndex();
    const knownGroups = new Map(
      getSetlistGroups().map((group) => [group.name.toLocaleLowerCase(), group.id]),
    );
    const nextGroupOrder = db.getFirstSync<{ maxIndex: number | null }>(
      'SELECT MAX(order_index) AS maxIndex FROM setlist_groups',
    )?.maxIndex;
    let nextGroupOrderIndex = (nextGroupOrder ?? -1) + 1;
    for (const groupName of library.groups) {
      const normalizedName = groupName.toLocaleLowerCase();
      if (!knownGroups.has(normalizedName)) {
        const groupId = makeId();
        db.runSync(
          'INSERT INTO setlist_groups (id, name, order_index) VALUES (?, ?, ?)',
          [groupId, groupName.trim(), nextGroupOrderIndex++],
        );
        knownGroups.set(normalizedName, groupId);
      }
    }

    for (const setlist of library.setlists) {
      const setlistId = makeId();
      const groupId =
        setlist.group === null
          ? null
          : knownGroups.get(setlist.group.toLocaleLowerCase());
      if (setlist.group !== null && !groupId) {
        throw new Error(`Group "${setlist.group}" for setlist "${setlist.name}" is missing.`);
      }
      db.runSync(
        'INSERT INTO setlists (id, name, order_index, location, latitude, longitude, notes, date, time, group_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          setlistId,
          setlist.name.trim(),
          nextSetlistOrderIndex++,
          setlist.location?.trim() || null,
          setlist.latitude ?? null,
          setlist.longitude ?? null,
          setlist.notes?.trim() ? setlist.notes : null,
          setlist.date?.trim() || null,
          setlist.time?.trim() || null,
          groupId ?? null,
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

function getTopSetlistOrderIndex(): number {
  const min = db.getFirstSync('SELECT MIN(order_index) as minIndex FROM setlists') as { minIndex: number | null } | null;
  return min?.minIndex === null || min?.minIndex === undefined ? 0 : min.minIndex - 1;
}

export function moveSetlist(setlistId: string, direction: 'up' | 'down'): void {
  db.withTransactionSync(() => {
    const rows = db.getAllSync<{ id: string; group_id: string | null }>(
      'SELECT id, group_id FROM setlists ORDER BY order_index ASC, name COLLATE NOCASE ASC',
    );
    const current = rows.find((row) => row.id === setlistId);
    if (!current) {
      throw new Error('The setlist to move could not be found.');
    }
    const siblings = rows.filter((row) => (row.group_id ?? null) === (current.group_id ?? null));
    const siblingIndex = siblings.findIndex((row) => row.id === setlistId);
    const target = siblings[siblingIndex + (direction === 'up' ? -1 : 1)];
    if (!target) {
      return;
    }
    const currentIndex = rows.indexOf(current);
    const targetIndex = rows.indexOf(target);
    [rows[currentIndex], rows[targetIndex]] = [rows[targetIndex], rows[currentIndex]];
    rows.forEach((row, index) => {
      db.runSync('UPDATE setlists SET order_index = ? WHERE id = ?', [index, row.id]);
    });
  });
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
