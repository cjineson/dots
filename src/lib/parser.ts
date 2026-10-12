export function parseBoxes(notesRawText: string): string[] {
  return notesRawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
