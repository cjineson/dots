import { flattenCueDocument, parseCueDocument, validateCueDocument } from './cueDocument';
import { MAX_FONT_SIZE, MIN_FONT_SIZE } from './fontSize';
import { validateSongTags } from './songTags';
import { isGroupImage } from './groupDetails';

export type SnapshotGroup = { id: string; name: string; order_index: number; description?: string | null; image?: string | null };
export type SnapshotSong = {
  id: string;
  title: string;
  notes_raw_text: string;
  font_size: number;
  cue_document: string | null;
  tags: string | null;
  group_id: string | null;
  sort_order: number | null;
  is_note: number;
};
export type SnapshotItem =
  | { kind: 'song'; id: string; sort_order: number }
  | { kind: 'break'; id: string; sort_order: number; duration_minutes: number | null };
export type SnapshotSetlist = {
  id: string;
  name: string;
  order_index: number;
  group_id: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  date: string | null;
  time: string | null;
  items: SnapshotItem[];
};
export type LibrarySnapshot = {
  format: 'dots-library-snapshot';
  version: 1;
  exportedAt: string;
  groups: SnapshotGroup[];
  songs: SnapshotSong[];
  setlists: SnapshotSetlist[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isId(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

function nullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function nullableInteger(value: unknown): value is number | null {
  return value === null || isInteger(value);
}

function nullableNumber(value: unknown): value is number | null {
  return value === null || typeof value === 'number' && Number.isFinite(value);
}

function groupNameKey(name: string): string {
  return name.replace(/[A-Z]/g, (character) => character.toLowerCase());
}

export function parseLibrarySnapshot(json: string): LibrarySnapshot {
  const value: unknown = JSON.parse(json);
  if (!isRecord(value) || value.format !== 'dots-library-snapshot' || value.version !== 1 ||
      typeof value.exportedAt !== 'string' || !Number.isFinite(Date.parse(value.exportedAt)) ||
      !Array.isArray(value.groups) || !Array.isArray(value.songs) || !Array.isArray(value.setlists)) {
    throw new Error('This is not a supported Dots library snapshot.');
  }

  const groupIds = new Set<string>();
  const groupNames = new Set<string>();
  for (const group of value.groups) {
    if (!isRecord(group) || !isId(group.id) || !isId(group.name) || group.name.includes('\0') || !isInteger(group.order_index) ||
        groupIds.has(group.id) || groupNames.has(groupNameKey(group.name)) ||
        group.description !== undefined && !nullableString(group.description) ||
        group.image !== undefined && group.image !== null && !isGroupImage(group.image)) {
      throw new Error('The snapshot contains an invalid or duplicate group.');
    }
    groupIds.add(group.id);
    groupNames.add(groupNameKey(group.name));
  }

  const songIds = new Set<string>();
  for (const song of value.songs) {
    if (!isRecord(song) || !isId(song.id) || songIds.has(song.id) ||
        typeof song.title !== 'string' || typeof song.notes_raw_text !== 'string' ||
        typeof song.font_size !== 'number' || !Number.isFinite(song.font_size) ||
        song.font_size < MIN_FONT_SIZE || song.font_size > MAX_FONT_SIZE || !nullableString(song.cue_document) ||
        !nullableString(song.tags) || !nullableString(song.group_id) ||
        song.group_id !== null && !groupIds.has(song.group_id) ||
        !nullableInteger(song.sort_order) || (song.is_note !== 0 && song.is_note !== 1)) {
      throw new Error('The snapshot contains an invalid song.');
    }
    try {
      if (song.cue_document !== null) validateCueDocument(JSON.parse(song.cue_document));
      if (song.tags !== null) validateSongTags(JSON.parse(song.tags));
    } catch (error) {
      throw new Error(`The snapshot contains invalid song formatting: ${error instanceof Error ? error.message : String(error)}`);
    }
    songIds.add(song.id);
  }

  const setlistIds = new Set<string>();
  const breakIds = new Set<string>();
  for (const setlist of value.setlists) {
    if (!isRecord(setlist) || !isId(setlist.id) || setlistIds.has(setlist.id) ||
        !isId(setlist.name) || !isInteger(setlist.order_index) ||
        !nullableString(setlist.group_id) || setlist.group_id !== null && !groupIds.has(setlist.group_id) ||
        !nullableString(setlist.location) || !nullableNumber(setlist.latitude) ||
        setlist.latitude !== null && Math.abs(setlist.latitude) > 90 ||
        !nullableNumber(setlist.longitude) || setlist.longitude !== null && Math.abs(setlist.longitude) > 180 ||
        !nullableString(setlist.notes) ||
        !nullableString(setlist.date) || !nullableString(setlist.time) || !Array.isArray(setlist.items)) {
      throw new Error('The snapshot contains an invalid setlist.');
    }
    const linkedSongs = new Set<string>();
    for (const item of setlist.items) {
      if (!isRecord(item) || !isId(item.id) || !isInteger(item.sort_order)) {
        throw new Error('The snapshot contains an invalid setlist item.');
      }
      if (item.kind === 'song' && songIds.has(item.id) && !linkedSongs.has(item.id)) {
        linkedSongs.add(item.id);
      } else if (item.kind === 'break' && !breakIds.has(item.id) &&
          (item.duration_minutes === null || isInteger(item.duration_minutes) && item.duration_minutes > 0)) {
        breakIds.add(item.id);
      } else {
        throw new Error('The snapshot contains an invalid or duplicate setlist item.');
      }
    }
    setlistIds.add(setlist.id);
  }
  return value as LibrarySnapshot;
}

export type SnapshotConflict = {
  kind: 'group' | 'song' | 'setlist';
  id: string;
  local: SnapshotGroup | SnapshotSong | SnapshotSetlist;
  incoming: SnapshotGroup | SnapshotSong | SnapshotSetlist;
};

export function getSnapshotConflicts(local: LibrarySnapshot, incoming: LibrarySnapshot): SnapshotConflict[] {
  const conflicts: SnapshotConflict[] = [];
  function compare<T extends SnapshotGroup | SnapshotSong | SnapshotSetlist>(
    kind: SnapshotConflict['kind'], current: T[], received: T[],
  ) {
    const byId = new Map(current.map((item) => [item.id, item]));
    for (const item of received) {
      const existing = byId.get(item.id);
      if (existing && JSON.stringify(existing) !== JSON.stringify(item)) {
        conflicts.push({ kind, id: item.id, local: existing, incoming: item });
      }
    }
  }
  compare('group', local.groups, inheritGroupDetails(local.groups, incoming.groups));
  compare('song', local.songs, incoming.songs);
  compare('setlist', local.setlists, incoming.setlists);
  return conflicts;
}

function inheritGroupDetails(local: SnapshotGroup[], incoming: SnapshotGroup[]): SnapshotGroup[] {
  const byId = new Map(local.map((group) => [group.id, group]));
  return incoming.map((group) => {
    const current = byId.get(group.id);
    if (!current) return group;
    return {
      ...group,
      ...(group.description === undefined && current.description !== undefined ? { description: current.description } : {}),
      ...(group.image === undefined && current.image !== undefined ? { image: current.image } : {}),
    };
  });
}

export type SnapshotChoices = Record<string, 'local' | 'incoming'>;

export function snapshotConflictKey(kind: SnapshotConflict['kind'], id: string): string {
  return `${kind}:${id}`;
}

export type SnapshotMatch = {
  kind: SnapshotConflict['kind'];
  local: SnapshotGroup | SnapshotSong | SnapshotSetlist;
  incoming: SnapshotGroup | SnapshotSong | SnapshotSetlist;
};

const matchName = (name: string) => name.trim().toLocaleLowerCase();

export function suggestSnapshotMatches(local: LibrarySnapshot, incoming: LibrarySnapshot): SnapshotMatch[] {
  const matches: SnapshotMatch[] = [];
  function suggest<T extends SnapshotGroup | SnapshotSong | SnapshotSetlist>(
    kind: SnapshotMatch['kind'], current: T[], received: T[], key: (item: T) => string,
  ) {
    const currentIds = new Set(current.map(({ id }) => id));
    const receivedIds = new Set(received.map(({ id }) => id));
    const available = current.filter(({ id }) => !receivedIds.has(id));
    const newItems = received.filter(({ id }) => !currentIds.has(id));
    for (const item of newItems) {
      const name = key(item);
      if (!name) continue;
      const candidates = available.filter((candidate) => key(candidate) === name);
      if (candidates.length === 1 && newItems.filter((candidate) => key(candidate) === name).length === 1) {
        matches.push({ kind, local: candidates[0], incoming: item });
      }
    }
  }
  suggest('group', local.groups, incoming.groups, (group) => matchName(group.name));
  suggest('song', local.songs, incoming.songs, (song) =>
    song.title.trim() ? `${song.is_note}:${matchName(song.title)}` : '');
  suggest('setlist', local.setlists, incoming.setlists, (setlist) => matchName(setlist.name));
  const claimedLocal = new Set(matches.filter((match) => match.kind === 'song').map((match) => match.local.id));
  const claimedIncoming = new Set(matches.filter((match) => match.kind === 'song').map((match) => match.incoming.id));
  suggest('song', local.songs.filter(({ id }) => !claimedLocal.has(id)),
    incoming.songs.filter(({ id }) => !claimedIncoming.has(id)), (song) => {
      const text = song.cue_document ? flattenCueDocument(parseCueDocument(song.cue_document)) : song.notes_raw_text;
      return text.trim() ? `${song.is_note}:${text.trim()}` : '';
    });
  return matches;
}

export function mapSnapshotMatches(
  local: LibrarySnapshot, incoming: LibrarySnapshot, matches: SnapshotMatch[],
): LibrarySnapshot {
  const suggestions = suggestSnapshotMatches(local, incoming);
  const ids = { group: new Map<string, string>(), song: new Map<string, string>(), setlist: new Map<string, string>() };
  for (const match of matches) {
    if (!suggestions.some((candidate) => candidate.kind === match.kind &&
        candidate.local.id === match.local.id && candidate.incoming.id === match.incoming.id) ||
        ids[match.kind].has(match.incoming.id) ||
        [...ids[match.kind].values()].includes(match.local.id)) {
      throw new Error('The selected matches are invalid. Review the snapshot again.');
    }
    ids[match.kind].set(match.incoming.id, match.local.id);
  }
  const groupId = (id: string | null) => id === null ? null : ids.group.get(id) ?? id;
  return {
    ...incoming,
    groups: incoming.groups.map((group) => ({ ...group, id: ids.group.get(group.id) ?? group.id })),
    songs: incoming.songs.map((song) => ({
      ...song, id: ids.song.get(song.id) ?? song.id, group_id: groupId(song.group_id),
    })),
    setlists: incoming.setlists.map((setlist) => ({
      ...setlist, id: ids.setlist.get(setlist.id) ?? setlist.id, group_id: groupId(setlist.group_id),
      items: setlist.items.map((item) => item.kind === 'song'
        ? { ...item, id: ids.song.get(item.id) ?? item.id }
        : item),
    })),
  };
}

function uniqueGroupNames(groups: SnapshotGroup[]): { groups: SnapshotGroup[]; renamed: string[] } {
  const used = new Set<string>();
  const renamed: string[] = [];
  return {
    groups: groups.map((group) => {
      let name = group.name;
      let suffix = 2;
      while (used.has(groupNameKey(name))) {
        name = `${group.name} (${suffix++})`;
      }
      used.add(groupNameKey(name));
      if (name !== group.name) renamed.push(`${group.name} → ${name}`);
      return { ...group, name };
    }),
    renamed,
  };
}

export function mergeLibrarySnapshots(
  local: LibrarySnapshot,
  incoming: LibrarySnapshot,
  choices: SnapshotChoices,
): { snapshot: LibrarySnapshot; renamed: string[] } {
  for (const conflict of getSnapshotConflicts(local, incoming)) {
    if (!choices[snapshotConflictKey(conflict.kind, conflict.id)]) {
      throw new Error('Choose a version for every conflict before merging.');
    }
  }
  function mergeRecords<T extends SnapshotGroup | SnapshotSong | SnapshotSetlist>(
    kind: SnapshotConflict['kind'], current: T[], received: T[],
  ): T[] {
    const result = [...current];
    const positions = new Map(current.map((item, index) => [item.id, index]));
    for (const item of received) {
      const position = positions.get(item.id);
      if (position === undefined) {
        result.push(item);
      } else if (choices[snapshotConflictKey(kind, item.id)] === 'incoming') {
        result[position] = item;
      }
    }
    return result;
  }
  const currentSetlists = new Map(local.setlists.map((setlist) => [setlist.id, setlist]));
  const receivedSetlists = new Map(incoming.setlists.map((setlist) => [setlist.id, setlist]));
  const setlists = mergeRecords('setlist', local.setlists, incoming.setlists).map((selected) => {
    const current = currentSetlists.get(selected.id);
    const received = receivedSetlists.get(selected.id);
    if (!current || !received) return selected;
    const other = selected === received ? current : received;
    const keys = new Set(selected.items.map((item) => `${item.kind}:${item.id}`));
    const missing = other.items.filter((item) => !keys.has(`${item.kind}:${item.id}`));
    return {
      ...selected,
      items: [...selected.items, ...missing].map((item, sort_order) => ({ ...item, sort_order })),
    };
  });
  const named = uniqueGroupNames(mergeRecords('group', local.groups, inheritGroupDetails(local.groups, incoming.groups)));
  const snapshot: LibrarySnapshot = {
    ...local,
    groups: named.groups,
    songs: mergeRecords('song', local.songs, incoming.songs),
    setlists,
  };
  parseLibrarySnapshot(JSON.stringify(snapshot));
  return { snapshot, renamed: named.renamed };
}

export function copyLibrarySnapshot(
  local: LibrarySnapshot,
  incoming: LibrarySnapshot,
  makeId: () => string,
): { snapshot: LibrarySnapshot; renamed: string[] } {
  const groupIds = new Map(incoming.groups.map(({ id }) => [id, makeId()]));
  const songIds = new Map(incoming.songs.map(({ id }) => [id, makeId()]));
  const mappedId = (ids: Map<string, string>, id: string): string => {
    const mapped = ids.get(id);
    if (!mapped) throw new Error('The snapshot contains a missing reference.');
    return mapped;
  };
  const groupId = (id: string | null): string | null => {
    if (id === null) return null;
    return mappedId(groupIds, id);
  };
  const named = uniqueGroupNames([
    ...local.groups,
    ...incoming.groups.map((group) => ({ ...group, id: mappedId(groupIds, group.id) })),
  ]);
  const snapshot: LibrarySnapshot = {
    ...local,
    groups: named.groups,
    songs: [
      ...local.songs,
      ...incoming.songs.map((song) => ({ ...song, id: mappedId(songIds, song.id), group_id: groupId(song.group_id) })),
    ],
    setlists: [
      ...local.setlists,
      ...incoming.setlists.map((setlist) => ({
        ...setlist,
        id: makeId(),
        group_id: groupId(setlist.group_id),
        items: setlist.items.map((item): SnapshotItem => item.kind === 'song'
          ? { ...item, id: mappedId(songIds, item.id) }
          : { ...item, id: makeId() }),
      })),
    ],
  };
  parseLibrarySnapshot(JSON.stringify(snapshot));
  return { snapshot, renamed: named.renamed };
}
