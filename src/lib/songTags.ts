import { TAG_COLORS } from './cueDocument';
import type { TagColor, SetlistWithSongs, SongTag } from '../types';

function isTagColor(value: unknown): value is TagColor {
  return TAG_COLORS.some((color) => color === value);
}

export function validateSongTags(value: unknown): SongTag[] {
  if (!Array.isArray(value)) {
    throw new Error('Song tags must be a list.');
  }

  return value.map((tag) => {
    if (
      typeof tag !== 'object' ||
      tag === null ||
      typeof tag.label !== 'string' ||
      !tag.label.trim() ||
      !isTagColor(tag.color)
    ) {
      throw new Error('Each song tag must have a label and a supported color.');
    }
    return { label: tag.label.trim(), color: tag.color };
  });
}

export function parseStoredSongTags(value: string | null): SongTag[] {
  if (value === null) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error('Saved song tags are not valid JSON.');
  }
  return validateSongTags(parsed);
}

export function getCommonSongTags(setlists: SetlistWithSongs[]): SongTag[] {
  const songs = new Map(
    setlists.flatMap((setlist) => setlist.songs.map((song) => [song.id, song] as const)),
  );
  const tagCounts = new Map<string, { tag: SongTag; count: number }>();

  for (const song of songs.values()) {
    const labelsOnSong = new Set<string>();
    for (const tag of song.tags ?? []) {
      const normalizedLabel = tag.label.trim().toLocaleLowerCase();
      if (labelsOnSong.has(normalizedLabel)) {
        continue;
      }
      labelsOnSong.add(normalizedLabel);
      const existing = tagCounts.get(normalizedLabel);
      if (existing) {
        existing.count += 1;
      } else {
        tagCounts.set(normalizedLabel, { tag, count: 1 });
      }
    }
  }

  return [...tagCounts.values()]
    .sort((left, right) => right.count - left.count || left.tag.label.localeCompare(right.tag.label))
    .map(({ tag }) => tag);
}
