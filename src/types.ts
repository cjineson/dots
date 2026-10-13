export type Setlist = {
  id: string;
  name: string;
  order_index: number;
};

export type Song = {
  id: string;
  title: string;
  notes_raw_text: string;
  font_size?: number;
  cue_document?: string;
};

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
};

export type SetlistArchive = {
  format: 'gigbox-setlists';
  version: 2;
  exportedAt: string;
  setlists: Array<{
    name: string;
    songs: Array<{
      title: string;
      notes_raw_text: string;
      font_size?: number;
      cue_document?: CueDocument;
    }>;
  }>;
};
