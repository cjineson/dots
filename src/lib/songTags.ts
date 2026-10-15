import { CUE_COLORS } from './cueDocument';
import type { CueTextColor, SongTag } from '../types';

function isCueTextColor(value: unknown): value is CueTextColor {
  return CUE_COLORS.some((color) => color === value);
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
      !isCueTextColor(tag.color)
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
