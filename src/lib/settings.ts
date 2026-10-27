import { clampFontSize } from './fontSize';
import type { PaletteId } from '../theme';

export type SwipeMode = 'normal' | 'firm' | 'off';
export type BarSize = 'xxs' | 'xs' | 's' | 'm' | 'l' | 'xl';

export const BAR_SIZES: BarSize[] = ['xxs', 'xs', 's', 'm', 'l', 'xl'];

// Earlier versions stored normal/large/huge.
const LEGACY_BAR_SIZES: Record<string, BarSize> = { normal: 'm', large: 'l', huge: 'xl' };

export type AppSettings = {
  keepAwake: boolean;
  defaultFontSize: number;
  showPosition: boolean;
  showPerformanceEditButton: boolean;
  showPerformanceSettingsButton: boolean;
  swipeMode: SwipeMode;
  highContrast: boolean;
  palette: PaletteId;
  autoScrollSpeed: number;
  barSize: BarSize;
  lastExportAt: string | null;
  backupSnoozedUntil: string | null;
};

export const MIN_AUTO_SCROLL_SPEED = 1;
export const MAX_AUTO_SCROLL_SPEED = 200;
export const AUTO_SCROLL_SPEED_STEP = 1;
export const AUTO_SCROLL_SLIDER_CURVE = 3;
export const BACKUP_REMINDER_DAYS = 30;
export const BACKUP_REMIND_LATER_DAYS = 3;
export const INITIAL_BACKUP_REMINDER_DELAY_DAYS = 7;

export const DEFAULT_SETTINGS: AppSettings = {
  keepAwake: true,
  defaultFontSize: 18,
  showPosition: true,
  showPerformanceEditButton: true,
  showPerformanceSettingsButton: true,
  swipeMode: 'normal',
  highContrast: false,
  palette: 'stage',
  autoScrollSpeed: 40,
  barSize: 'm',
  lastExportAt: null,
  backupSnoozedUntil: null,
};

const PALETTE_IDS: string[] = ['stage', 'pretty', 'aqua', 'chill', 'beige', 'goth', 'forest', 'slate', 'clay', 'mono'];

// 'girlie' was renamed to 'pretty'.
function parsePalette(raw: string | undefined): PaletteId {
  const id = raw === 'girlie' ? 'pretty' : raw;
  return PALETTE_IDS.includes(id as string) ? (id as PaletteId) : DEFAULT_SETTINGS.palette;
}

export const SWIPE_DISTANCE: Record<Exclude<SwipeMode, 'off'>, number> = {
  normal: 60,
  firm: 140,
};

const SETTING_KEYS = {
  keepAwake: 'keep_awake',
  defaultFontSize: 'default_font_size',
  showPosition: 'show_position',
  showPerformanceEditButton: 'show_performance_edit_button',
  showPerformanceSettingsButton: 'show_performance_settings_button',
  swipeMode: 'swipe_mode',
  highContrast: 'high_contrast',
  palette: 'palette',
  autoScrollSpeed: 'auto_scroll_speed',
  barSize: 'bar_size',
  lastExportAt: 'last_export_at',
  backupSnoozedUntil: 'backup_snoozed_until',
} as const;

export function settingStorageKey(key: keyof AppSettings) {
  return SETTING_KEYS[key];
}

export function clampAutoScrollSpeed(speed: number) {
  return Math.max(MIN_AUTO_SCROLL_SPEED, Math.min(MAX_AUTO_SCROLL_SPEED, speed));
}

const parseBoolean = (raw: string | undefined, fallback: boolean) =>
  raw === 'true' ? true : raw === 'false' ? false : fallback;

const parseNumber = (raw: string | undefined, fallback: number, clamp: (n: number) => number) => {
  const value = raw === undefined ? NaN : Number(raw);
  return Number.isFinite(value) ? clamp(value) : fallback;
};

export function parseSettings(raw: Record<string, string>): AppSettings {
  const swipe = raw[SETTING_KEYS.swipeMode];
  const bar = raw[SETTING_KEYS.barSize];
  const lastExport = raw[SETTING_KEYS.lastExportAt];
  const snoozed = raw[SETTING_KEYS.backupSnoozedUntil];
  return {
    keepAwake: parseBoolean(raw[SETTING_KEYS.keepAwake], DEFAULT_SETTINGS.keepAwake),
    defaultFontSize: parseNumber(
      raw[SETTING_KEYS.defaultFontSize],
      DEFAULT_SETTINGS.defaultFontSize,
      clampFontSize,
    ),
    showPosition: parseBoolean(raw[SETTING_KEYS.showPosition], DEFAULT_SETTINGS.showPosition),
    showPerformanceEditButton: parseBoolean(
      raw[SETTING_KEYS.showPerformanceEditButton],
      DEFAULT_SETTINGS.showPerformanceEditButton,
    ),
    showPerformanceSettingsButton: parseBoolean(
      raw[SETTING_KEYS.showPerformanceSettingsButton],
      DEFAULT_SETTINGS.showPerformanceSettingsButton,
    ),
    swipeMode: swipe === 'firm' || swipe === 'off' || swipe === 'normal' ? swipe : 'normal',
    highContrast: parseBoolean(raw[SETTING_KEYS.highContrast], DEFAULT_SETTINGS.highContrast),
    palette: parsePalette(raw[SETTING_KEYS.palette]),
    autoScrollSpeed: parseNumber(
      raw[SETTING_KEYS.autoScrollSpeed],
      DEFAULT_SETTINGS.autoScrollSpeed,
      clampAutoScrollSpeed,
    ),
    barSize: BAR_SIZES.find((size) => size === bar) ?? LEGACY_BAR_SIZES[bar ?? ''] ?? 'm',
    lastExportAt: lastExport && !Number.isNaN(Date.parse(lastExport)) ? lastExport : null,
    backupSnoozedUntil: snoozed && !Number.isNaN(Date.parse(snoozed)) ? snoozed : null,
  };
}

export function serializeSetting<K extends keyof AppSettings>(
  key: K,
  value: AppSettings[K],
): string | null {
  return value === null ? null : String(value);
}

export function needsBackupReminder(
  lastExportAt: string | null,
  hasLibraryContent: boolean,
  snoozedUntil: string | null = null,
  now: Date = new Date(),
) {
  if (!hasLibraryContent) {
    return false;
  }
  if (snoozedUntil && now.getTime() < Date.parse(snoozedUntil)) {
    return false;
  }
  if (!lastExportAt) {
    return true;
  }
  const ageMs = now.getTime() - Date.parse(lastExportAt);
  return ageMs > BACKUP_REMINDER_DAYS * 24 * 60 * 60 * 1000;
}
