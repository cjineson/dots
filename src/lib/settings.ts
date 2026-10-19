import { clampFontSize } from './fontSize';

export type SwipeMode = 'normal' | 'firm' | 'off';

export type AppSettings = {
  keepAwake: boolean;
  defaultFontSize: number;
  showPosition: boolean;
  swipeMode: SwipeMode;
  highContrast: boolean;
  autoScrollSpeed: number;
  lastExportAt: string | null;
};

export const MIN_AUTO_SCROLL_SPEED = 10;
export const MAX_AUTO_SCROLL_SPEED = 200;
export const AUTO_SCROLL_SPEED_STEP = 10;
export const BACKUP_REMINDER_DAYS = 30;

export const DEFAULT_SETTINGS: AppSettings = {
  keepAwake: true,
  defaultFontSize: 18,
  showPosition: true,
  swipeMode: 'normal',
  highContrast: false,
  autoScrollSpeed: 40,
  lastExportAt: null,
};

export const SWIPE_DISTANCE: Record<Exclude<SwipeMode, 'off'>, number> = {
  normal: 60,
  firm: 140,
};

const SETTING_KEYS = {
  keepAwake: 'keep_awake',
  defaultFontSize: 'default_font_size',
  showPosition: 'show_position',
  swipeMode: 'swipe_mode',
  highContrast: 'high_contrast',
  autoScrollSpeed: 'auto_scroll_speed',
  lastExportAt: 'last_export_at',
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
  const lastExport = raw[SETTING_KEYS.lastExportAt];
  return {
    keepAwake: parseBoolean(raw[SETTING_KEYS.keepAwake], DEFAULT_SETTINGS.keepAwake),
    defaultFontSize: parseNumber(
      raw[SETTING_KEYS.defaultFontSize],
      DEFAULT_SETTINGS.defaultFontSize,
      clampFontSize,
    ),
    showPosition: parseBoolean(raw[SETTING_KEYS.showPosition], DEFAULT_SETTINGS.showPosition),
    swipeMode: swipe === 'firm' || swipe === 'off' || swipe === 'normal' ? swipe : 'normal',
    highContrast: parseBoolean(raw[SETTING_KEYS.highContrast], DEFAULT_SETTINGS.highContrast),
    autoScrollSpeed: parseNumber(
      raw[SETTING_KEYS.autoScrollSpeed],
      DEFAULT_SETTINGS.autoScrollSpeed,
      clampAutoScrollSpeed,
    ),
    lastExportAt: lastExport && !Number.isNaN(Date.parse(lastExport)) ? lastExport : null,
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
  hasSetlists: boolean,
  now: Date = new Date(),
) {
  if (!hasSetlists) {
    return false;
  }
  if (!lastExportAt) {
    return true;
  }
  const ageMs = now.getTime() - Date.parse(lastExportAt);
  return ageMs > BACKUP_REMINDER_DAYS * 24 * 60 * 60 * 1000;
}
