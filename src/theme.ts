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
