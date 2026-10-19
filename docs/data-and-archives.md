# Data and archives

## SQLite (`gigbox.db`)
| Table | Purpose |
| --- | --- |
| `setlists` | `id, name, order_index, group_id` plus `location, date, time, latitude, longitude, notes` (added by migration) |
| `setlist_groups` | One-level groups; unique case-insensitive names |
| `songs` | `title, notes_raw_text, font_size, cue_document, tags` (JSON) |
| `setlist_songs` | Links songs to setlists with `sort_order`; a song may be in several setlists |
| `setlist_breaks` | Breaks with `sort_order` and optional `duration_minutes` |
| `dashboard_preferences` | Expanded setlists / collapsed groups |
| `app_settings` | Key/value settings, see [settings.md](settings.md) |

Migrations are additive `ALTER TABLE` checks in `initializeDatabase`. Never drop or rewrite existing columns; existing songs must keep working.

## JSON archives
Export (Settings → Export setlists) writes `gigbox-library-YYYY-MM-DD_HHmm.json` and opens the share sheet. The current format is **version 5**; imports accept versions **1–5** and add setlists to the library without replacing anything.

Version 5 per-setlist fields (all optional): `location`, `latitude`, `longitude` (validated ranges), `notes`, `date`, `time`, group name. Items are ordered songs and breaks; songs carry cue document, text size and tags. Earlier versions lack some of these fields. Add tests in `setlistArchive.test.ts` for any format change and keep v1 import working.

## Backup and reset
- Last export time and reminder snooze are stored in `app_settings`.
- **Reset settings** clears `app_settings` only.
- **Delete all data** clears setlists, groups, songs, links, breaks and dashboard preferences (settings are kept).
