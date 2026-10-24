const COPY_SUFFIX = /\s+Copy \d+$/i;

/** Returns "Title Copy N" with the lowest N not already used by a title in the setlist. */
export function nextCopyTitle(title: string, existingTitles: string[]): string {
  const base = title.replace(COPY_SUFFIX, '').trim() || 'Untitled Song';
  const used = new Set(existingTitles.map((existing) => existing.trim().toLocaleLowerCase()));
  let copyNumber = 1;
  while (used.has(`${base} Copy ${copyNumber}`.toLocaleLowerCase())) {
    copyNumber += 1;
  }
  return `${base} Copy ${copyNumber}`;
}
