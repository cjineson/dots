import React, { createContext, useContext } from 'react';

import { darkTheme, lightTheme, withHighContrast } from './theme';
import type { AppTheme } from './theme';

export type ThemePreference = 'system' | 'dark' | 'light';

const ThemeContext = createContext<AppTheme>(darkTheme);

export function resolveTheme(
  preference: ThemePreference,
  systemScheme: string | null | undefined,
  highContrast = false,
): AppTheme {
  const mode = preference === 'system' ? systemScheme : preference;
  const base = mode === 'light' ? lightTheme : darkTheme;
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
