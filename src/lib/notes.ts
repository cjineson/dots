export type NoteLine =
  | { kind: 'text'; text: string }
  | { kind: 'check'; text: string; checked: boolean; lineIndex: number };

const CHECK_PATTERN = /^\s*\[( |x|X)\]\s?(.*)$/;

export function parseNotes(notes: string): NoteLine[] {
  return notes.split(/\r?\n/).map((line, lineIndex) => {
    const match = CHECK_PATTERN.exec(line);
    return match
      ? { kind: 'check', text: match[2], checked: match[1] !== ' ', lineIndex }
      : { kind: 'text', text: line };
  });
}

export function toggleChecklistLine(notes: string, lineIndex: number): string {
  const lines = notes.split(/\r?\n/);
  const match = CHECK_PATTERN.exec(lines[lineIndex] ?? '');
  if (!match) {
    return notes;
  }
  lines[lineIndex] = `[${match[1] === ' ' ? 'x' : ' '}] ${match[2]}`;
  return lines.join('\n');
}
