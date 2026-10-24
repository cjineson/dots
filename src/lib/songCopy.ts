import type { SongTag } from '../types';

const normalize = (value: string) => value.trim().toLocaleLowerCase();

/** Order- and case-insensitive identity of a tag set, ignoring colours. */
export function tagSignature(tags: SongTag[] = []): string {
  return JSON.stringify([...new Set(tags.map((tag) => normalize(tag.label)))].sort());
}

/** Finds a song with the same title and the same tags, which would be an indistinguishable duplicate. */
export function findVariantConflict<T extends { id: string; title: string; tags?: SongTag[] }>(
  songs: T[],
  title: string,
  tags: SongTag[] = [],
  ignoreSongId?: string,
): T | undefined {
  const signature = tagSignature(tags);
  return songs.find(
    (song) =>
      song.id !== ignoreSongId &&
      normalize(song.title) === normalize(title) &&
      tagSignature(song.tags) === signature,
  );
}
