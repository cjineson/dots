import type { ImportedLibrary, SetlistGroup, SetlistWithSongs } from '../types';

export type ExportSelection = {
  groupIds: ReadonlySet<string>;
  setlistIds: ReadonlySet<string>;
  songIds: ReadonlySet<string>;
};

export type ArchiveContent = {
  groups: SetlistGroup[];
  setlists: Array<SetlistWithSongs & { partial?: boolean }>;
};

export type ImportConflicts = {
  setlists: string[];
  songs: string[];
};

const normalize = (value: string) => value.trim().toLocaleLowerCase();

export function countSelection(selection: ExportSelection) {
  return selection.groupIds.size + selection.setlistIds.size + selection.songIds.size;
}

/**
 * Resolves a checklist selection into archive content. Selecting a group
 * includes its setlists; a setlist with only some songs selected is exported as
 * `partial` so that importing it never discards the songs that were left out.
 */
export function selectArchiveContent(
  setlists: SetlistWithSongs[],
  groups: SetlistGroup[],
  selection: ExportSelection,
): ArchiveContent {
  const selectedSetlists: ArchiveContent['setlists'] = [];
  for (const setlist of setlists) {
    const wholeSetlist =
      selection.setlistIds.has(setlist.id) ||
      (setlist.group_id != null && selection.groupIds.has(setlist.group_id));
    if (wholeSetlist) {
      selectedSetlists.push(setlist);
      continue;
    }
    const items = setlist.items.filter(
      (item) => item.kind === 'song' && selection.songIds.has(item.song.id),
    );
    if (items.length > 0) {
      selectedSetlists.push({
        ...setlist,
        songs: items.flatMap((item) => (item.kind === 'song' ? [item.song] : [])),
        items,
        partial: true,
      });
    }
  }

  const usedGroupNames = new Set(
    selectedSetlists.flatMap((setlist) => (setlist.group_name ? [normalize(setlist.group_name)] : [])),
  );
  return {
    groups: groups.filter(
      (group) => selection.groupIds.has(group.id) || usedGroupNames.has(normalize(group.name)),
    ),
    setlists: selectedSetlists,
  };
}

/** Finds existing setlists (and songs inside partial setlists) an import would replace. */
export function findImportConflicts(
  library: ImportedLibrary,
  existing: SetlistWithSongs[],
): ImportConflicts {
  const conflicts: ImportConflicts = { setlists: [], songs: [] };
  for (const imported of library.setlists) {
    const match = findMatchingSetlist(existing, imported.name, imported.group);
    if (!match) {
      continue;
    }
    if (!imported.partial) {
      conflicts.setlists.push(match.name);
      continue;
    }
    const titles = new Set(match.songs.map((song) => normalize(song.title)));
    for (const item of imported.items) {
      if (item.type === 'song' && titles.has(normalize(item.title))) {
        conflicts.songs.push(`${item.title} (in ${match.name})`);
      }
    }
  }
  return conflicts;
}

export function findMatchingSetlist<T extends { name: string; group_name?: string }>(
  existing: T[],
  name: string,
  group: string | null,
): T | undefined {
  return existing.find(
    (setlist) =>
      normalize(setlist.name) === normalize(name) &&
      (setlist.group_name ? normalize(setlist.group_name) : null) === (group ? normalize(group) : null),
  );
}

export const EMPTY_SELECTION: ExportSelection = {
  groupIds: new Set(),
  setlistIds: new Set(),
  songIds: new Set(),
};

const withToggled = (set: ReadonlySet<string>, id: string, on: boolean) => {
  const next = new Set(set);
  if (on) {
    next.add(id);
  } else {
    next.delete(id);
  }
  return next;
};

export function isSetlistSelected(selection: ExportSelection, setlist: SetlistWithSongs) {
  return (
    selection.setlistIds.has(setlist.id) ||
    (setlist.group_id != null && selection.groupIds.has(setlist.group_id))
  );
}

export function isSongSelected(
  selection: ExportSelection,
  setlist: SetlistWithSongs,
  songId: string,
) {
  return isSetlistSelected(selection, setlist) || selection.songIds.has(songId);
}

export function toggleGroupSelection(
  selection: ExportSelection,
  group: SetlistGroup,
  setlists: SetlistWithSongs[],
): ExportSelection {
  const on = !selection.groupIds.has(group.id);
  let setlistIds = selection.setlistIds;
  for (const setlist of setlists.filter((item) => item.group_id === group.id)) {
    setlistIds = withToggled(setlistIds, setlist.id, on);
  }
  return { ...selection, groupIds: withToggled(selection.groupIds, group.id, on), setlistIds };
}

export function toggleSetlistSelection(
  selection: ExportSelection,
  setlist: SetlistWithSongs,
  setlists: SetlistWithSongs[],
): ExportSelection {
  const on = !isSetlistSelected(selection, setlist);
  let setlistIds = withToggled(selection.setlistIds, setlist.id, on);
  let groupIds = selection.groupIds;
  if (!on && setlist.group_id != null && groupIds.has(setlist.group_id)) {
    // Unticking one setlist unticks its group but keeps the sibling setlists selected.
    groupIds = withToggled(groupIds, setlist.group_id, false);
    for (const sibling of setlists.filter((item) => item.group_id === setlist.group_id)) {
      setlistIds = withToggled(setlistIds, sibling.id, sibling.id !== setlist.id);
    }
  }
  return { groupIds, setlistIds, songIds: selection.songIds };
}

export function toggleSongSelection(
  selection: ExportSelection,
  setlist: SetlistWithSongs,
  songId: string,
  setlists: SetlistWithSongs[],
): ExportSelection {
  const on = !isSongSelected(selection, setlist, songId);
  let next = selection;
  const songIds = new Set(selection.songIds);
  if (isSetlistSelected(selection, setlist)) {
    // Narrowing a whole setlist to individual songs.
    next = toggleSetlistSelection(selection, setlist, setlists);
    for (const song of setlist.songs) {
      songIds.add(song.id);
    }
  }
  if (on) {
    songIds.add(songId);
  } else {
    songIds.delete(songId);
  }
  return { ...next, songIds };
}
