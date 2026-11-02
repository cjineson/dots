const EXTENSION = '.json';
const ILLEGAL_CHARACTERS = /[\\/:*?"<>|\u0000-\u001f]/g;

const pad = (value: number) => String(value).padStart(2, '0');

export function defaultExportFileName(now: Date = new Date()): string {
  const date = `${pad(now.getDate())}${pad(now.getMonth() + 1)}${now.getFullYear()}`;
  return `dots-export-${date}-${pad(now.getHours())}${pad(now.getMinutes())}`;
}

// Returns a safe file name ending in .json, falling back to the default when the input is blank.
export function exportFileName(input: string, fallback: string): string {
  let base = input.replace(ILLEGAL_CHARACTERS, '').trim();
  if (base.toLowerCase().endsWith(EXTENSION)) {
    base = base.slice(0, -EXTENSION.length).trim();
  }
  base = base.replace(/^\.+/, '');
  return `${base || fallback}${EXTENSION}`;
}
