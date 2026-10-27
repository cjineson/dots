import type { SetlistGroup, SetlistItem, SetlistWithSongs, Song } from '../types';

export type SongSearchEntry = {
  key: string;
  song: Song;
  // Where the song lives, e.g. "Friday gig · Weddings" or "Songs".
  location: string;
  setlistId: string | null;
  groupId: string | null;
  // The list a performance should step through, and the song's position in it.
  items: SetlistItem[];
  index: number;
};

export function buildSongSearchEntries(
  setlists: SetlistWithSongs[],
  standaloneSongs: Song[],
  groups: SetlistGroup[],
): SongSearchEntry[] {
  const groupNames = new Map(groups.map((group) => [group.id, group.name]));
  const entries: SongSearchEntry[] = [];

  for (const setlist of setlists) {
    const groupName = setlist.group_id ? groupNames.get(setlist.group_id) : undefined;
    setlist.items.forEach((item, index) => {
      if (item.kind !== 'song') {
        return;
      }
      entries.push({
        key: `setlist-${setlist.id}-${item.song.id}`,
        song: item.song,
        location: groupName ? `${setlist.name} · ${groupName}` : setlist.name,
        setlistId: setlist.id,
        groupId: setlist.group_id ?? null,
        items: setlist.items,
        index,
      });
    });
  }

  for (const song of standaloneSongs) {
    const groupName = song.group_id ? groupNames.get(song.group_id) : undefined;
    entries.push({
      key: `song-${song.id}`,
      song,
      location: groupName ?? 'Songs',
      setlistId: null,
      groupId: song.group_id ?? null,
      items: [{ kind: 'song', song }],
      index: 0,
    });
  }

  return entries;
}

export function searchSongEntries(entries: SongSearchEntry[], query: string): SongSearchEntry[] {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) {
    return [];
  }
  return entries
    .filter((entry) => {
      const haystack = [entry.song.title, ...(entry.song.tags ?? []).map((tag) => tag.label)]
        .join(' ')
        .toLocaleLowerCase();
      return terms.every((term) => haystack.includes(term));
    })
    .sort((a, b) => {
      const first = Number(!a.song.title.toLocaleLowerCase().startsWith(terms[0]));
      const second = Number(!b.song.title.toLocaleLowerCase().startsWith(terms[0]));
      return first - second || a.song.title.localeCompare(b.song.title, undefined, { sensitivity: 'base' });
    });
}
