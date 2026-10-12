export const theme = {
  theme: 'Stage True Dark',
  colors: {
    background: '#000000',
    surface: '#121212',
    surface_card: '#1E1E1E',
    text_primary: '#FFFFFF',
    text_secondary: '#B3B3B3',
    accent_highlight: '#FFCC00',
    box_active_state: '#2C2C2C',
    border_contrast: '#333333',
  },
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
