import type { Song } from '../types';

export function displaySongTitle(song: Pick<Song, 'title' | 'artist'>): string {
  const artist = song.artist?.trim();
  return artist ? `${song.title} - ${artist}` : song.title;
}
