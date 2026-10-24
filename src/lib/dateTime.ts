const pad = (value: number) => String(value).padStart(2, '0');

export function formatDateValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatTimeValue(date: Date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Older setlists may hold free-text values, so anything unparseable falls back to now.
export function parseDateValue(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (match) {
    const parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return new Date();
}

export function parseTimeValue(value: string): Date {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  const base = new Date();
  if (match && Number(match[1]) < 24 && Number(match[2]) < 60) {
    base.setHours(Number(match[1]), Number(match[2]), 0, 0);
  }
  return base;
}
