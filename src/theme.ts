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

const makePalette = (
  name: string,
  mode: 'dark' | 'light',
  colors: Omit<ThemeColors, 'overlay'>,
): AppTheme => ({ ...shared, theme: name, mode, colors: { ...colors, overlay: '#000000AA' } });

// 'stage' is handled by darkTheme/lightTheme so it follows the Dark/Light/System choice.
export const palettes: Record<Exclude<PaletteId, 'stage'>, AppTheme> = {
  girlie: makePalette('Girlie', 'light', {
    background: '#FFF0F6',
    surface: '#FFE0EC',
    surface_card: '#FFD0E2',
    text_primary: '#4A1230',
    text_secondary: '#8A4A68',
    accent_highlight: '#C2185B',
    box_active_state: '#F8BBD5',
    border_contrast: '#F0A0C0',
  }),
  chill: makePalette('Chill', 'dark', {
    background: '#0B1F26',
    surface: '#12303A',
    surface_card: '#183D49',
    text_primary: '#E6F6F5',
    text_secondary: '#9CC3C6',
    accent_highlight: '#5EEAD4',
    box_active_state: '#1F4D5B',
    border_contrast: '#2A5F6E',
  }),
  beige: makePalette('Beige', 'light', {
    background: '#F5EFE3',
    surface: '#EBE2D0',
    surface_card: '#E0D5BF',
    text_primary: '#3B3224',
    text_secondary: '#6F6450',
    accent_highlight: '#8C5A2B',
    box_active_state: '#D3C6AB',
    border_contrast: '#C4B697',
  }),
  goth: makePalette('Goth', 'dark', {
    background: '#050008',
    surface: '#12091A',
    surface_card: '#1C0F28',
    text_primary: '#EDE3F7',
    text_secondary: '#A794BD',
    accent_highlight: '#B388FF',
    box_active_state: '#2B1740',
    border_contrast: '#3F2760',
  }),
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
