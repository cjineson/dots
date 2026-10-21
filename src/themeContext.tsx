import React, { createContext, useContext } from 'react';

import { darkTheme, lightTheme, palettes, withHighContrast } from './theme';
import type { AppTheme, PaletteId } from './theme';

export type ThemePreference = 'system' | 'dark' | 'light';

const ThemeContext = createContext<AppTheme>(darkTheme);

export function resolveTheme(
  preference: ThemePreference,
  systemScheme: string | null | undefined,
  highContrast = false,
  palette: PaletteId = 'stage',
): AppTheme {
  const mode = preference === 'system' ? systemScheme : preference;
  const base = palette !== 'stage' ? palettes[palette] : mode === 'light' ? lightTheme : darkTheme;
  return highContrast ? withHighContrast(base) : base;
}

export function ThemeProvider({
  value,
  children,
}: {
  value: AppTheme;
  children: React.ReactNode;
}) {
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
