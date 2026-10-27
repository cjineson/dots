export const MIN_FONT_SIZE = 10;
export const MAX_FONT_SIZE = 128;
export const FONT_SIZE_STEP = 2;

export function clampFontSize(fontSize: number) {
  return Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, fontSize));
}

export const BASE_SONG_FONT_SIZE = 18;

// A stored size equal to the base means the song has no custom size and follows the default.
export function resolveSongFontSize(
  songSize: number | undefined,
  defaultSize: number,
  applyDefaultToAll: boolean,
) {
  if (applyDefaultToAll || songSize === undefined || songSize === BASE_SONG_FONT_SIZE) {
    return defaultSize;
  }
  return songSize;
}

export const DEFAULT_TAG_SIZE = 12;
export const MIN_TAG_SIZE = 12;
export const MAX_TAG_SIZE = 48;
export const TAG_SIZE_STEP = 2;

export function clampTagSize(size: number) {
  return Math.max(MIN_TAG_SIZE, Math.min(MAX_TAG_SIZE, size));
}
