export const MIN_FONT_SIZE = 10;
export const MAX_FONT_SIZE = 128;
export const FONT_SIZE_STEP = 2;

export function clampFontSize(fontSize: number) {
  return Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, fontSize));
}
