export type Setlist = {
  id: string;
  name: string;
  order_index: number;
};

export type Song = {
  id: string;
  title: string;
  notes_raw_text: string;
};

export type SetlistSong = {
  setlist_id: string;
  song_id: string;
  sort_order: number;
};

export type SetlistWithSongs = Setlist & {
  songs: Song[];
};
