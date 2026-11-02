# Publishing checklist

Where things live: listing copy in [`store/`](../store/listing.md), the public front door, privacy policy and support pages in [`site/`](../site/index.html). Secrets never go in the repo.

## Accounts
- [ ] Apple Developer Program (US$99/year; individual is quick, organisation needs a D-U-N-S number). Two-factor auth on the Apple ID.
- [ ] Expo account (owner is `chrisineson` in `app.json`).
- [ ] Optional: Google Play Console (one-off US$25; new personal accounts need a closed test with 12 testers for 14 days).
- [ ] Contact email for support and the privacy policy.

## Repo changes before a store build
- [ ] 1024 x 1024 app icon and splash configured in `app.json` (none are set today).
- [ ] `userInterfaceStyle` set to `automatic` now that light palettes exist.
- [ ] `ios.infoPlist.ITSAppUsesNonExemptEncryption` set to `false`.
- [ ] `eas.json` gets `build.production` (with auto-increment build numbers) and a `submit` profile.
- [ ] Reconcile `docs/ci-and-releases.md` (says pushes to main run an EAS build) with `.github/workflows/deploy.yml` (runs `eas update`).
- [ ] `npx expo-doctor` and a production export pass.

## Build and test
- [ ] Create an App Store Connect API key (.p8) and store the three secrets listed in [ci-and-releases.md](ci-and-releases.md).
- [ ] `eas build --platform ios --profile production`.
- [ ] Install through TestFlight and test on a real iPhone: Performance and Flow, auto-scroll and crawl, swipe, keep-awake, location, Maps links, export and import, every palette in dark and light, small and large screens. Nothing has been verified on a physical device yet.

## Listing
- [ ] Check the name "Dots" is available and not confusingly similar to an existing app.
- [ ] Add final square app icon and splash assets; the supplied transparent Dots wordmark has dark- and light-theme variants in `assets/branding/`.
- [ ] Fill in the placeholders in `store/listing.md` and `site/` (`[SITE_URL]`, `[CONTACT_EMAIL]`, `[DATE]`, `[YEAR] [YOUR NAME]`).
- [ ] Publish `site/` (for example GitHub Pages) and confirm the privacy and support URLs load.
- [ ] Screenshots for 6.9" iPhone (and iPad if supported) and the 1024 icon.
- [ ] Privacy nutrition label and age rating answered (see `store/listing.md`).
- [ ] Review notes added.

## Submit
- [ ] `eas submit --platform ios`, select the build in App Store Connect, submit for review.
- [ ] Once live, add the App Store link to `site/index.html`.

## Sharing with someone over Expo Go
For quick testing without a store build. The app stays Expo Go compatible, so no TestFlight or Apple account is needed for the tester.

**Tester set-up**
- Install **Expo Go** from the App Store (iOS) or Google Play. It must support the SDK this repo uses (`expo` in `package.json`); the store version normally tracks the latest SDK, so update it if the app refuses to open.
- Their data is local to their device. They start with an empty library; send them an archive (Settings, Export) to import if you want them to have songs.

**Option 1: a published update (works when your machine is off)**
1. Log in once: `npx eas-cli login`.
2. Publish: `npx eas-cli update --branch preview --message "Describe the change"`. Pushes to `main` also publish to the `main` branch through `.github/workflows/deploy.yml`.
3. Open the project's **Updates** page on expo.dev (owner `chrisineson`, project `dots`), pick the branch and its latest update, and use the QR code or link there.
4. The tester scans the QR code with the iOS Camera app (or Expo Go on Android) and the app opens in Expo Go. For a private project they must be signed in to Expo Go with an Expo account you have invited to the project (expo.dev, project or organisation settings, Members).
5. Re-publish to push changes; testers get them next time they open the app.

**Option 2: live from your machine (development server)**
1. `npx expo start --tunnel` (the tunnel works across networks; plain `npx expo start` only works on the same Wi-Fi).
2. Send the tester the QR code or the `exp://` URL shown in the terminal.
3. It only works while the dev server is running, so use it for short sessions.

**Limitations**
- Expo Go runs the app under Expo's own identity, so there is no custom icon or splash, and only modules bundled in Expo Go work.
- Nothing here replaces a TestFlight or store build for wider testing; see the checklist above.
