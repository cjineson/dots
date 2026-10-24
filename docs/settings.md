# Settings

All settings are saved on-device in the SQLite `app_settings` key/value table. Resetting settings deletes that table's rows; songs and setlists are untouched.

| Setting | Key | Default | Notes |
| --- | --- | --- | --- |
| Theme (Dark / Light / System) | `theme_preference` | dark | System follows the OS scheme |
| High contrast | `high_contrast` | off | Pure black/white surfaces, strong borders, brighter accent |
| Keep screen awake | `keep_awake` | on | Performance and Flow only |
| Show song position | `show_position` | on | "3 of 12" in the Performance header |
| Swipe between songs | `swipe_mode` | normal | normal = 60 px, firm = 140 px, or off |
| Default auto-scroll speed | `auto_scroll_speed` | 40 pts/s | 10–200, step 10; also saved when changed in Flow |
| Text size for new songs | `default_font_size` | 18 | 10–128 |
| Tag size | `tag_size` | 12 | 12–48, step 2; shared by Performance and Flow |
| Last exported | `last_export_at` | none | Set after a successful export share |
| Backup reminder snooze | `backup_snoozed_until` | none | Set by Remind me later / Dismiss |

Settings also contains Export / Import, **Reset settings**, **Delete all setlists and songs** (double confirmation) and the app version.

Code: `src/lib/settings.ts` (types, defaults, parsing, reminder rules), `getAppSettings`/`saveAppSetting`/`resetAppSettings` in `src/lib/db.tsx`, UI in `src/screens/SettingsScreen.tsx`. To add a setting, extend `AppSettings`, `DEFAULT_SETTINGS`, the key map and `parseSettings`, add a test in `settings.test.ts`, then surface it in the screen.
