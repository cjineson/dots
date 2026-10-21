const shared = {
  typography: {
    font_family: 'Sans-Serif System',
    headline_size: 24,
    box_text_size: 18,
    font_weight_bold: 700,
  },
  layout: {
    box_padding: 16,
    grid_gap: 12,
    touch_target_minimum: 48,
  },
} as const;

export type ThemeColors = {
  background: string;
  surface: string;
  surface_card: string;
  text_primary: string;
  text_secondary: string;
  accent_highlight: string;
  box_active_state: string;
  border_contrast: string;
  overlay: string;
  action_primary: string;
  action_edit: string;
  action_danger: string;
  action_copy: string;
  action_extra: string;
  on_accent: string;
};

export type AppTheme = typeof shared & {
  theme: string;
  mode: 'dark' | 'light';
  colors: ThemeColors;
};

export const darkTheme: AppTheme = {
  ...shared,
  theme: 'Stage True Dark',
  mode: 'dark',
  colors: {
    background: '#000000',
    surface: '#121212',
    surface_card: '#1E1E1E',
    text_primary: '#FFFFFF',
    text_secondary: '#B3B3B3',
    accent_highlight: '#FFCC00',
    box_active_state: '#2C2C2C',
    border_contrast: '#333333',
    overlay: '#000000AA',
    action_primary: '#4FC3F7',
    action_edit: '#FFB74D',
    action_danger: '#FF8A80',
    action_copy: '#B39DDB',
    action_extra: '#4DD0B6',
    on_accent: '#0B1020',
  },
};

export const lightTheme: AppTheme = {
  ...shared,
  theme: 'Daylight',
  mode: 'light',
  colors: {
    background: '#FFFFFF',
    surface: '#F2F2F4',
    surface_card: '#E6E6EA',
    text_primary: '#111111',
    text_secondary: '#555555',
    accent_highlight: '#A06A00',
    box_active_state: '#D8D8DE',
    border_contrast: '#C4C4CC',
    overlay: '#000000AA',
    action_primary: '#0277BD',
    action_edit: '#B35C00',
    action_danger: '#C62828',
    action_copy: '#5E35B1',
    action_extra: '#00796B',
    on_accent: '#FFFFFF',
  },
};

export type PaletteId = 'stage' | 'girlie' | 'chill' | 'beige' | 'goth';

export const PALETTE_OPTIONS: Array<{ value: PaletteId; label: string }> = [
  { value: 'stage', label: 'Stage' },
  { value: 'girlie', label: 'Girlie' },
  { value: 'chill', label: 'Chill' },
  { value: 'beige', label: 'Beige' },
  { value: 'goth', label: 'Goth' },
];

type PaletteColors = Omit<ThemeColors, 'overlay'>;

const makePalette = (name: string, mode: 'dark' | 'light', colors: PaletteColors): AppTheme => ({
  ...shared,
  theme: name,
  mode,
  colors: { ...colors, overlay: '#000000AA' },
});

// 'stage' is handled by darkTheme/lightTheme. Every other palette has both a dark and a light variant.
export const palettes: Record<Exclude<PaletteId, 'stage'>, { dark: AppTheme; light: AppTheme }> = {
  girlie: {
    light: makePalette('Girlie', 'light', {
      background: '#FFF0F6',
      surface: '#FFE0EC',
      surface_card: '#FFD0E2',
      text_primary: '#4A1230',
      text_secondary: '#8A4A68',
      accent_highlight: '#C2185B',
      box_active_state: '#F8BBD5',
      border_contrast: '#F0A0C0',
      action_primary: '#D81B60',
      action_edit: '#AD1457',
      action_danger: '#B71C1C',
      action_copy: '#8E24AA',
      action_extra: '#EC407A',
      on_accent: '#FFFFFF',
    }),
    dark: makePalette('Girlie Night', 'dark', {
      background: '#1C0A14',
      surface: '#2B1220',
      surface_card: '#3A1A2D',
      text_primary: '#FFE4F0',
      text_secondary: '#D79AB8',
      accent_highlight: '#FF80AB',
      box_active_state: '#4D2139',
      border_contrast: '#6B3050',
      action_primary: '#FF80AB',
      action_edit: '#F8BBD0',
      action_danger: '#FF8A80',
      action_copy: '#E1A6F0',
      action_extra: '#FF4081',
      on_accent: '#2B0A1A',
    }),
  },
  chill: {
    dark: makePalette('Chill', 'dark', {
      background: '#0B1F26',
      surface: '#12303A',
      surface_card: '#183D49',
      text_primary: '#E6F6F5',
      text_secondary: '#9CC3C6',
      accent_highlight: '#5EEAD4',
      box_active_state: '#1F4D5B',
      border_contrast: '#2A5F6E',
      action_primary: '#5EEAD4',
      action_edit: '#7DD3FC',
      action_danger: '#FDA4AF',
      action_copy: '#A5B4FC',
      action_extra: '#86EFAC',
      on_accent: '#062A30',
    }),
    light: makePalette('Chill Day', 'light', {
      background: '#EAF7F6',
      surface: '#D6EEEC',
      surface_card: '#C3E5E2',
      text_primary: '#0B3A40',
      text_secondary: '#3F6F74',
      accent_highlight: '#00796B',
      box_active_state: '#B0DAD6',
      border_contrast: '#9CCBC7',
      action_primary: '#00838F',
      action_edit: '#0277BD',
      action_danger: '#C62828',
      action_copy: '#4527A0',
      action_extra: '#2E7D32',
      on_accent: '#FFFFFF',
    }),
  },
  beige: {
    light: makePalette('Beige', 'light', {
      background: '#F5EFE3',
      surface: '#EBE2D0',
      surface_card: '#E0D5BF',
      text_primary: '#3B3224',
      text_secondary: '#6F6450',
      accent_highlight: '#8C5A2B',
      box_active_state: '#D3C6AB',
      border_contrast: '#C4B697',
      action_primary: '#8C5A2B',
      action_edit: '#A0701F',
      action_danger: '#A33A2A',
      action_copy: '#6B5B7B',
      action_extra: '#5E7A4A',
      on_accent: '#FFFFFF',
    }),
    dark: makePalette('Beige Dusk', 'dark', {
      background: '#1F1A12',
      surface: '#2A2318',
      surface_card: '#352C1F',
      text_primary: '#F2E8D5',
      text_secondary: '#B8A98B',
      accent_highlight: '#D9A441',
      box_active_state: '#463A28',
      border_contrast: '#5C4D36',
      action_primary: '#E0B864',
      action_edit: '#D9A441',
      action_danger: '#E08A7A',
      action_copy: '#C0A9D6',
      action_extra: '#A8C48A',
      on_accent: '#1F1A12',
    }),
  },
  goth: {
    dark: makePalette('Goth', 'dark', {
      background: '#050008',
      surface: '#12091A',
      surface_card: '#1C0F28',
      text_primary: '#EDE3F7',
      text_secondary: '#A794BD',
      accent_highlight: '#B388FF',
      box_active_state: '#2B1740',
      border_contrast: '#3F2760',
      action_primary: '#B388FF',
      action_edit: '#E040FB',
      action_danger: '#FF5C8A',
      action_copy: '#9FA8FF',
      action_extra: '#7C4DFF',
      on_accent: '#0B0010',
    }),
    light: makePalette('Goth Day', 'light', {
      background: '#EFE8F7',
      surface: '#E0D4F0',
      surface_card: '#D2C2E8',
      text_primary: '#1E0F33',
      text_secondary: '#5A4676',
      accent_highlight: '#5E2CA5',
      box_active_state: '#C4B0E0',
      border_contrast: '#AE96D2',
      action_primary: '#5E2CA5',
      action_edit: '#8E24AA',
      action_danger: '#B0003A',
      action_copy: '#3949AB',
      action_extra: '#6A1B9A',
      on_accent: '#FFFFFF',
    }),
  },
};

export function withHighContrast(base: AppTheme): AppTheme {
  const dark = base.mode === 'dark';
  return {
    ...base,
    colors: {
      ...base.colors,
      background: dark ? '#000000' : '#FFFFFF',
      surface: dark ? '#000000' : '#FFFFFF',
      surface_card: dark ? '#0A0A0A' : '#F5F5F5',
      text_primary: dark ? '#FFFFFF' : '#000000',
      text_secondary: dark ? '#FFFFFF' : '#000000',
      accent_highlight: dark ? '#FFE033' : '#7A4F00',
      border_contrast: dark ? '#FFFFFF' : '#000000',
      box_active_state: dark ? '#262626' : '#DCDCDC',
    },
  };
}

export const theme = darkTheme;
