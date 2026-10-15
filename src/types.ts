export type Setlist = {
  id: string;
  name: string;
  order_index: number;
  location?: string;
  date?: string;
  time?: string;
};

export type SetlistHeaderDetails = Pick<Setlist, 'name' | 'location' | 'date' | 'time'>;

export type Song = {
  id: string;
  title: string;
  notes_raw_text: string;
  font_size?: number;
  cue_document?: string;
  tags?: SongTag[];
};

export type SongTag = {
  label: string;
  color: CueTextColor;
};

export type SetlistItem =
  | { kind: 'song'; song: Song }
  | { kind: 'break'; id: string; duration_minutes?: number };

export type CueBlockStyle = {
  font_size?: number;
  color?: CueTextColor;
};

export type CueTextColor = '#FFFFFF' | '#FFCC00' | '#4FC3F7' | '#FF8A80';

export type CueTextBlock = CueBlockStyle & {
  id: string;
  type: 'text' | 'section';
  text: string;
};

export type CueTableBlock = CueBlockStyle & {
  id: string;
  type: 'table';
  rows: string[][];
};

export type CueBlock = CueTextBlock | CueTableBlock;

export type CueDocument = {
  version: 1;
  blocks: CueBlock[];
};

export type SetlistSong = {
  setlist_id: string;
  song_id: string;
  sort_order: number;
};

export type SetlistWithSongs = Setlist & {
  songs: Song[];
  items: SetlistItem[];
};

export type SetlistArchive = {
  format: 'gigbox-setlists';
  version: 4;
  exportedAt: string;
  setlists: Array<{
    name: string;
    location?: string;
    date?: string;
    time?: string;
    items: Array<
      | {
          type: 'song';
          title: string;
          notes_raw_text: string;
          font_size?: number;
          cue_document?: CueDocument;
          tags?: SongTag[];
        }
      | { type: 'break'; duration_minutes?: number }
    >;
  }>;
};

export type ImportedSetlist = {
  name: string;
  location?: string;
  date?: string;
  time?: string;
  items: Array<
    | {
        type: 'song';
        title: string;
        notes_raw_text: string;
        font_size?: number;
        cue_document?: CueDocument;
        tags?: SongTag[];
      }
    | { type: 'break'; duration_minutes?: number }
  >;
};
