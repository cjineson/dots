import { importSetlists } from '../lib/db';
import { parseSetlistArchive } from '../lib/setlistArchive';

// Web dev only (scripts/web-dev-live.sh): loads public/dev-seed.json, a normal Dots JSON export, into an empty database.
export async function loadDevSeedArchive(databaseIsEmpty: boolean): Promise<boolean> {
  if (!databaseIsEmpty) {
    return false;
  }
  const response = await fetch('/dev-seed.json');
  const type = response.headers.get('content-type') ?? '';
  // Expo's dev server falls back to index.html when the file does not exist.
  if (!response.ok || !type.includes('json')) {
    throw new Error('public/dev-seed.json was not found. Save a Dots JSON export there.');
  }
  importSetlists(parseSetlistArchive(await response.text()), 'copy');
  return true;
}
