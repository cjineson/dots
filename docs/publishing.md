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
For quick testing without a store build. The app stays Expo Go compatible, so the tester needs no Apple account or TestFlight.

Expo Go loads the app from your running development server. Published EAS updates (the `Deploy` workflow) are **not** a way to open the app in Expo Go: `expo-updates` is not installed, and Expo's docs only describe updates for development or preview builds. Use the tunnel below.

*You (each session)*
1. `npm install` if needed, then `npx expo start --tunnel`. The tunnel works across networks; plain `npx expo start` only works on the same Wi-Fi.
2. Keep the terminal running. Copy the QR code or the `exp://` URL it prints and send it to the tester.
3. Stop the server (Ctrl+C) when you are done; the link stops working.

*Tester*
1. Install **Expo Go** from the App Store (iPhone) or Google Play (Android).
2. Open the `exp://` link on the phone, or scan the QR code with the camera (iPhone) or inside Expo Go (Android). Dots opens in Expo Go.
3. If it says the project is incompatible, update Expo Go in the store.

Their library starts empty. To give them songs, send an export (Settings, Export) and ask them to import it.

**Limitations**
- It only works while your dev server is running, so it suits short sessions.
- Expo Go runs the app under Expo's own identity, so there is no custom icon or splash, and only modules bundled in Expo Go work.
- For testers who need the app without your machine on, use TestFlight (iOS) or an internal build (Android); see the checklist above.
