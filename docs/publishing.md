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

*Already set up if* you can sign in at expo.dev as the project owner (`chrisineson`) and the repo has the `EXPO_TOKEN` secret, so `.github/workflows/deploy.yml` publishes on every push to `main`. Nothing else is needed for merged work.

*Sharing with a new person*
1. Send them **message 1** below.
2. When they reply with the email or username of their Expo account, invite them at expo.dev under **Members** (needed while the project is private).
3. Merge to `main` if needed; the workflow publishes automatically (check the run in the Actions tab). Open the run's "Publish OTA update" step in the Actions tab and follow its "EAS Dashboard" link (`expo.dev/accounts/chrisineson/projects/dots/updates/<id>`) while signed in to expo.dev; copy the QR code or link from that page. The menu name for updates on expo.dev changes, so use this link rather than navigating. Expo Go must support the SDK in the log's runtime version (currently `exposdk:58.0.0`).
4. Send them **message 2** with the link or QR code.

*Message 1 (to send them)*
> 1. Install **Expo Go** from the App Store (iPhone) or Google Play (Android) and open it.
> 2. Create a free Expo account in Expo Go (or at expo.dev) and sign in.
> 3. Reply with the email and username you used.

*Message 2 (to send them, with the link or QR code)*
> 1. Open the link on your phone, or scan the QR code with your camera. Dots opens inside Expo Go.
> 2. To get a newer version later, close Dots fully and reopen it from Expo Go (it may need a second open to pick up the update).
> If it says the project is incompatible, update Expo Go in the store.

Their library starts empty. To give them songs, send an export (Settings, Export) and ask them to import it.

*Sharing again later*: just merge and resend the link, or tell them to reopen the app.

*Unmerged work (optional)*: run `npm install`, `npx eas-cli login` (check with `npx eas-cli whoami`), then `npx eas-cli update --branch preview --message "What changed"`, and share the link it prints (or branch `preview` on the Updates page).

**Option 2: live from your machine (development server)**
1. `npx expo start --tunnel` (the tunnel works across networks; plain `npx expo start` only works on the same Wi-Fi).
2. Send the tester the QR code or the `exp://` URL shown in the terminal.
3. It only works while the dev server is running, so use it for short sessions.

**Limitations**
- Expo Go runs the app under Expo's own identity, so there is no custom icon or splash, and only modules bundled in Expo Go work.
- Nothing here replaces a TestFlight or store build for wider testing; see the checklist above.
