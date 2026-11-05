const MAX_DERIVED_TITLE = 60;

export const NOTE_ICON = 'chat-outline';
export const SONG_ICON = 'music-note';

/** Name for a note without its own title: the first line of its text. */
export function deriveNoteTitle(notesRawText: string): string {
  const firstLine = notesRawText.split('\n').map((line) => line.trim()).find(Boolean);
  if (!firstLine) {
    return 'Empty note';
  }
  return firstLine.length > MAX_DERIVED_TITLE ? `${firstLine.slice(0, MAX_DERIVED_TITLE - 1)}\u2026` : firstLine;
}
