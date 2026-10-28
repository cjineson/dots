import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_SETTINGS,
  needsBackupReminder,
  parseSettings,
  serializeSetting,
  settingStorageKey,
} from './settings';

test('parseSettings returns defaults for empty or invalid values', () => {
  assert.deepEqual(parseSettings({}), DEFAULT_SETTINGS);
  assert.deepEqual(
    parseSettings({
      keep_awake: 'maybe',
      default_font_size: 'abc',
      swipe_mode: 'sideways',
      auto_scroll_speed: 'NaN',
      last_export_at: 'yesterday',
      show_performance_edit_button: 'invalid',
      show_performance_settings_button: 'invalid',
    }),
    DEFAULT_SETTINGS,
  );
});

test('parseSettings reads and clamps stored values', () => {
  const parsed = parseSettings({
    keep_awake: 'false',
    default_font_size: '500',
    show_performance_edit_button: 'false',
    show_performance_settings_button: 'true',
    swipe_mode: 'firm',
    high_contrast: 'true',
    palette: 'goth',
    auto_scroll_speed: '0',
    bar_size: 'xxs',
    last_export_at: '2026-01-02T03:04:05.000Z',
  });
  assert.equal(parsed.keepAwake, false);
  assert.equal(parsed.defaultFontSize, 128);
  assert.equal(parsed.showPerformanceEditButton, false);
  assert.equal(parsed.showPerformanceSettingsButton, true);
  assert.equal(parsed.swipeMode, 'firm');
  assert.equal(parsed.highContrast, true);
  assert.equal(parsed.palette, 'goth');
  assert.equal(parseSettings({ palette: 'neon' }).palette, 'stage');
  assert.equal(parsed.autoScrollSpeed, 1);
  assert.equal(parsed.barSize, 'xxs');
  assert.equal(parseSettings({ bar_size: 'huge' }).barSize, 'xl');
  assert.equal(parseSettings({ bar_size: 'normal' }).barSize, 'm');
  assert.equal(parseSettings({ bar_size: 'tiny' }).barSize, 'm');
  assert.equal(parsed.lastExportAt, '2026-01-02T03:04:05.000Z');
});

test('serializeSetting stringifies values and keeps null as null', () => {
  assert.equal(serializeSetting('keepAwake', true), 'true');
  assert.equal(serializeSetting('autoScrollSpeed', 50), '50');
  assert.equal(serializeSetting('lastExportAt', null), null);
  assert.equal(settingStorageKey('showPerformanceEditButton'), 'show_performance_edit_button');
  assert.equal(
    settingStorageKey('showPerformanceSettingsButton'),
    'show_performance_settings_button',
  );
});

test('needsBackupReminder only applies when there are setlists and the backup is old', () => {
  const now = new Date('2026-03-01T00:00:00.000Z');
  assert.equal(needsBackupReminder(null, false, null, now), false);
  assert.equal(needsBackupReminder(null, true, null, now), true);
  assert.equal(needsBackupReminder('2026-02-20T00:00:00.000Z', true, null, now), false);
  assert.equal(needsBackupReminder('2026-01-01T00:00:00.000Z', true, null, now), true);
  assert.equal(needsBackupReminder(null, true, '2026-03-02T00:00:00.000Z', now), false);
  assert.equal(needsBackupReminder(null, true, '2026-02-28T00:00:00.000Z', now), true);
});
