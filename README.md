# Dots

Dots is a local-first setlist and cue app for musicians. It keeps songs, setlists and gig
details organised, then puts the right lyrics, chords and cues on screen when it is time
to play. It works offline and stores the library on the device.

## What Dots does

- **Build a library:** create songs on their own or organise them into setlists and groups.
- **Prepare a gig:** add a venue, date, time and notes/checklist to each setlist; reuse songs
  and add breaks wherever they belong.
- **Read on stage:** use Flow to scan a whole set or Performance to focus on one song, with
  readable cues, tags, swipe navigation, auto-scroll and keep-awake controls.
- **Keep control of your data:** everything is stored locally. Export JSON backups, restore
  them on another device, or convert an Apple Notes setlist export.

## Project direction

The foundation is a dependable, stage-focused app that works without an account or
network connection. Changes should keep libraries safe, preserve backward-compatible
archive imports, and remain usable in Expo Go. Local peer-to-peer sync is a future
direction; it should build on the local library rather than make a cloud account a
requirement.

## Development

The app uses React Native, Expo, TypeScript and SQLite.

```sh
git clone https://github.com/cjineson/dots.git
cd dots
npm install
npx expo start
```

In the Expo UI, select a simulator or run on a device. See [Development](docs/development.md)
for validation commands and [the project guide](etc/agent-project-guide.md) for the
architecture and implementation conventions.

## Documentation

Start at [docs/README.md](docs/README.md) for the [user guide](docs/user-guide.md),
[settings](docs/settings.md), [architecture](docs/architecture.md),
[data and archives](docs/data-and-archives.md), [Apple Notes importing](docs/import-apple-notes.md),
[development](docs/development.md), [CI and releases](docs/ci-and-releases.md) and
[publishing](docs/publishing.md).

Run `npm run typecheck` and `npm test` to validate TypeScript and unit tests.
