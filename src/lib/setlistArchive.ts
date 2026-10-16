import type {
  CueDocument,
  ImportedLibrary,
  ImportedSetlist,
  SetlistArchive,
  SetlistGroup,
  SetlistItem,
  SetlistWithSongs,
} from '../types';
import { parseCueDocument, validateCueDocument } from './cueDocument';
import { validateSongTags } from './songTags';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function exportSong(song: SetlistItem & { kind: 'song' }) {
  return {
    type: 'song' as const,
    title: song.song.title,
    notes_raw_text: song.song.notes_raw_text,
    font_size: song.song.font_size,
    ...(song.song.cue_document
      ? { cue_document: parseCueDocument(song.song.cue_document) }
      : {}),
    ...(song.song.tags?.length ? { tags: song.song.tags } : {}),
  };
}

export function createSetlistArchive(
  setlists: SetlistWithSongs[],
  groups: SetlistGroup[] = [],
): SetlistArchive {
  return {
    format: 'gigbox-setlists',
    version: 5,
    exportedAt: new Date().toISOString(),
    groups: groups.map(({ name }) => name),
    setlists: setlists.map(({ name, group_name, location, date, time, items }) => ({
      name,
      group: group_name ?? null,
      ...(location ? { location } : {}),
      ...(date ? { date } : {}),
      ...(time ? { time } : {}),
      items: items.map((item) =>
        item.kind === 'song'
          ? exportSong(item)
          : {
              type: 'break' as const,
              ...(item.duration_minutes !== undefined
                ? { duration_minutes: item.duration_minutes }
                : {}),
            },
      ),
    })),
  };
}

function parseSong(song: unknown, setlistName: string, songIndex: number) {
  if (
    !isRecord(song) ||
    typeof song.title !== 'string' ||
    typeof song.notes_raw_text !== 'string' ||
    (song.font_size !== undefined &&
      (typeof song.font_size !== 'number' || song.font_size < 10 || song.font_size > 64))
  ) {
    throw new Error(`Song ${songIndex + 1} in "${setlistName}" is invalid.`);
  }

  let cueDocument: CueDocument | undefined;
  if (song.cue_document !== undefined) {
    try {
      cueDocument = validateCueDocument(song.cue_document);
    } catch (error) {
      const detail = error instanceof Error ? ` ${error.message}` : '';
      throw new Error(
        `Song ${songIndex + 1} in "${setlistName}" has invalid cue formatting.${detail}`,
      );
    }
  }

  let tags: ReturnType<typeof validateSongTags> | undefined;
  if (song.tags !== undefined) {
    try {
      tags = validateSongTags(song.tags);
    } catch (error) {
      const detail = error instanceof Error ? ` ${error.message}` : '';
      throw new Error(`Song ${songIndex + 1} in "${setlistName}" has invalid tags.${detail}`);
    }
  }

  return {
    type: 'song' as const,
    title: song.title,
    notes_raw_text: song.notes_raw_text,
    font_size: song.font_size,
    ...(cueDocument ? { cue_document: cueDocument } : {}),
    ...(tags?.length ? { tags } : {}),
  };
}

function parseItem(item: unknown, setlistName: string, itemIndex: number): ImportedSetlist['items'][number] {
  if (!isRecord(item)) {
    throw new Error(`Item ${itemIndex + 1} in "${setlistName}" is invalid.`);
  }
  if (item.type === 'song') {
    return parseSong(item, setlistName, itemIndex);
  }
  const durationMinutes = item.duration_minutes;
  if (item.type === 'break' && (
    durationMinutes === undefined ||
    typeof durationMinutes === 'number' &&
      Number.isSafeInteger(durationMinutes) &&
      durationMinutes > 0
  )) {
    return {
      type: 'break',
      ...(typeof durationMinutes === 'number'
        ? { duration_minutes: durationMinutes }
        : {}),
    };
  }
  throw new Error(`Item ${itemIndex + 1} in "${setlistName}" is invalid.`);
}

export function parseSetlistArchive(json: string): ImportedLibrary {
  let value: unknown;

  try {
    value = JSON.parse(json);
  } catch {
    throw new Error('The selected file is not valid JSON.');
  }

  if (
    !isRecord(value) ||
    value.format !== 'gigbox-setlists' ||
    (value.version !== 1 &&
      value.version !== 2 &&
      value.version !== 3 &&
      value.version !== 4 &&
      value.version !== 5)
  ) {
    throw new Error('This file is not a supported GigBox setlist export.');
  }

  if (!Array.isArray(value.setlists)) {
    throw new Error('The GigBox export is missing its setlists.');
  }

  const groups: string[] = [];
  if (value.version === 5) {
    if (
      !Array.isArray(value.groups) ||
      value.groups.some((group) => typeof group !== 'string' || !group.trim())
    ) {
      throw new Error('The GigBox export has an invalid groups list.');
    }
    const normalizedGroups = new Set<string>();
    for (const group of value.groups) {
      const cleanedGroup = (group as string).trim();
      const normalizedGroup = cleanedGroup.toLocaleLowerCase();
      if (normalizedGroups.has(normalizedGroup)) {
        throw new Error('The GigBox export contains duplicate group names.');
      }
      normalizedGroups.add(normalizedGroup);
      groups.push(cleanedGroup);
    }
  }

  const setlists = value.setlists.map((setlist, setlistIndex) => {
    if (!isRecord(setlist) || typeof setlist.name !== 'string' || !setlist.name.trim()) {
      throw new Error(`Setlist ${setlistIndex + 1} must have a name.`);
    }

    if (value.version === 3 || value.version === 4 || value.version === 5) {
      if (!Array.isArray(setlist.items)) {
        throw new Error(`Setlist "${setlist.name}" has an invalid items list.`);
      }
      if (
        (value.version === 4 || value.version === 5) &&
        ['location', 'date', 'time'].some(
          (field) => setlist[field] !== undefined && typeof setlist[field] !== 'string',
        )
      ) {
        throw new Error(`Setlist "${setlist.name}" has invalid header details.`);
      }
      let setlistGroup: string | null = null;
      if (value.version === 5) {
        if (setlist.group !== null && typeof setlist.group !== 'string') {
          throw new Error(`Setlist "${setlist.name}" has an invalid group.`);
        }
        if (typeof setlist.group === 'string') {
          setlistGroup = setlist.group.trim();
          const normalizedGroup = setlistGroup.toLocaleLowerCase();
          if (
            !setlistGroup ||
            !groups.some((group) => group.toLocaleLowerCase() === normalizedGroup)
          ) {
            throw new Error(`Setlist "${setlist.name}" has an invalid group.`);
          }
        }
      }
      return {
        name: setlist.name,
        group: setlistGroup,
        ...(typeof setlist.location === 'string' && setlist.location.trim()
          ? { location: setlist.location.trim() }
          : {}),
        ...(typeof setlist.date === 'string' && setlist.date.trim()
          ? { date: setlist.date.trim() }
          : {}),
        ...(typeof setlist.time === 'string' && setlist.time.trim()
          ? { time: setlist.time.trim() }
          : {}),
        items: setlist.items.map((item, itemIndex) =>
          parseItem(item, setlist.name as string, itemIndex),
        ),
      };
    }

    if (!Array.isArray(setlist.songs)) {
      throw new Error(`Setlist "${setlist.name}" has an invalid songs list.`);
    }
    return {
      name: setlist.name,
      group: null,
      items: setlist.songs.map((song, songIndex) =>
        parseSong(song, setlist.name as string, songIndex),
      ),
    };
  });

  if (setlists.length === 0) {
    throw new Error('This export does not contain any setlists.');
  }

  return { groups, setlists };
}
