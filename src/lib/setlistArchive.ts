import type { CueDocument, SetlistArchive, SetlistWithSongs } from '../types';
import { parseCueDocument, validateCueDocument } from './cueDocument';

type ImportedSetlist = SetlistArchive['setlists'][number];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function createSetlistArchive(setlists: SetlistWithSongs[]): SetlistArchive {
  return {
    format: 'gigbox-setlists',
    version: 2,
    exportedAt: new Date().toISOString(),
    setlists: setlists.map(({ name, songs }) => ({
      name,
      songs: songs.map(({ title, notes_raw_text, font_size, cue_document }) => ({
        title,
        notes_raw_text,
        font_size,
        ...(cue_document ? { cue_document: parseCueDocument(cue_document) } : {}),
      })),
    })),
  };
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
    (value.version !== 1 && value.version !== 2)
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

    if (!Array.isArray(setlist.songs)) {
      throw new Error(`Setlist "${setlist.name}" has an invalid songs list.`);
    }

    const songs = setlist.songs.map((song, songIndex) => {
      if (
        !isRecord(song) ||
        typeof song.title !== 'string' ||
        typeof song.notes_raw_text !== 'string' ||
        (song.font_size !== undefined &&
          (typeof song.font_size !== 'number' || song.font_size < 10 || song.font_size > 64))
      ) {
        throw new Error(`Song ${songIndex + 1} in "${setlist.name}" is invalid.`);
      }

      let cueDocument: CueDocument | undefined;
      if (song.cue_document !== undefined) {
        try {
          cueDocument = validateCueDocument(song.cue_document);
        } catch (error) {
          const detail = error instanceof Error ? ` ${error.message}` : '';
          throw new Error(`Song ${songIndex + 1} in "${setlist.name}" has invalid cue formatting.${detail}`);
        }
      }

      return {
        title: song.title,
        notes_raw_text: song.notes_raw_text,
        font_size: song.font_size,
        ...(cueDocument ? { cue_document: cueDocument } : {}),
      };
    });

    return {
      name: setlist.name,
      songs,
    };
  });

  if (setlists.length === 0) {
    throw new Error('This export does not contain any setlists.');
  }

  return setlists;
}
