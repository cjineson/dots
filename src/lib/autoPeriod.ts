/** Reverts the OS "double space inserts a period" shortcut at the end of a line, which corrupts chord entry like `A  B`. */
export function undoAutoPeriod(previous: string, next: string): string {
  if (next.length !== previous.length + 1) {
    return next;
  }
  let i = 0;
  while (i < previous.length && previous[i] === next[i]) {
    i += 1;
  }
  const rest = previous.slice(i + 1);
  const atLineEnd = rest === '' || rest.startsWith('\n');
  if (previous[i] === ' ' && next.slice(i, i + 2) === '. ' && next.slice(i + 2) === rest && atLineEnd) {
    return `${previous.slice(0, i)}  ${rest}`;
  }
  return next;
}
