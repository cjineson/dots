import type {
  CueDocument,
  ImportedSetlist,
  SetlistArchive,
  SetlistItem,
  SetlistWithSongs,
} from '../types';
import { parseCueDocument, validateCueDocument } from './cueDocument';

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
  };
}

export function createSetlistArchive(setlists: SetlistWithSongs[]): SetlistArchive {
  return {
    format: 'gigbox-setlists',
    version: 4,
    exportedAt: new Date().toISOString(),
    setlists: setlists.map(({ name, location, date, time, items }) => ({
      name,
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

  return {
    type: 'song' as const,
    title: song.title,
    notes_raw_text: song.notes_raw_text,
    font_size: song.font_size,
    ...(cueDocument ? { cue_document: cueDocument } : {}),
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

export function parseSetlistArchive(json: string): ImportedSetlist[] {
  let value: unknown;

  try {
    value = JSON.parse(json);
  } catch {
    throw new Error('The selected file is not valid JSON.');
  }

  if (
    !isRecord(value) ||
    value.format !== 'gigbox-setlists' ||
    (value.version !== 1 && value.version !== 2 && value.version !== 3 && value.version !== 4)
  ) {
    throw new Error('This file is not a supported GigBox setlist export.');
  }

  if (!Array.isArray(value.setlists)) {
    throw new Error('The GigBox export is missing its setlists.');
  }

  const setlists = value.setlists.map((setlist, setlistIndex) => {
    if (!isRecord(setlist) || typeof setlist.name !== 'string' || !setlist.name.trim()) {
      throw new Error(`Setlist ${setlistIndex + 1} must have a name.`);
    }

    if (value.version === 3 || value.version === 4) {
      if (!Array.isArray(setlist.items)) {
        throw new Error(`Setlist "${setlist.name}" has an invalid items list.`);
      }
      if (
        value.version === 4 &&
        ['location', 'date', 'time'].some(
          (field) => setlist[field] !== undefined && typeof setlist[field] !== 'string',
        )
      ) {
        throw new Error(`Setlist "${setlist.name}" has invalid header details.`);
      }
      return {
        name: setlist.name,
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
      items: setlist.songs.map((song, songIndex) =>
        parseSong(song, setlist.name as string, songIndex),
      ),
    };
  });

  if (setlists.length === 0) {
    throw new Error('This export does not contain any setlists.');
  }

  return setlists;
}
