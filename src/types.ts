export type Setlist = {
  id: string;
  name: string;
  order_index: number;
  group_id?: string | null;
  group_name?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  date?: string;
  time?: string;
};

export type SetlistHeaderDetails = Pick<Setlist, 'name' | 'location' | 'date' | 'time'>;

export type SetlistGroup = {
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
  tags?: SongTag[];
  group_id?: string | null;
};

export type SongTag = {
  label: string;
  color: TagColor;
};

export type SetlistItem =
  | { kind: 'song'; song: Song }
  | { kind: 'break'; id: string; duration_minutes?: number };

export type CueBlockStyle = {
  font_size?: number;
  color?: CueTextColor;
};

export type CueTextColor = '#FFFFFF' | '#FFCC00' | '#4FC3F7' | '#FF8A80';

export type TagColor =
  | CueTextColor
  | '#FFB74D'
  | '#C5E1A5'
  | '#81C784'
  | '#4DB6AC'
  | '#90CAF9'
  | '#B39DDB'
  | '#F48FB1'
  | '#D7B98E'
  | '#B0BEC5';

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
  version: 5 | 6;
  exportedAt: string;
  groups: string[];
  songs?: ArchiveSong[];
  setlists: Array<{
    name: string;
    group: string | null;
    location?: string;
    latitude?: number;
    longitude?: number;
    notes?: string;
    date?: string;
    time?: string;
    partial?: true;
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

export type ArchiveSong = {
  title: string;
  notes_raw_text: string;
  font_size?: number;
  cue_document?: CueDocument;
  tags?: SongTag[];
};

export type ImportedSetlist = {
  name: string;
  group: string | null;
  location?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  date?: string;
  time?: string;
  partial?: boolean;
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

export type ImportedLibrary = {
  groups: string[];
  setlists: ImportedSetlist[];
  songs?: ArchiveSong[];
};

export type DashboardExpansionState = {
  expandedSetlists: Record<string, true>;
  collapsedGroups: Record<string, true>;
};
