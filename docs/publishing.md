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
- [ ] Check the name "GigBox" is available and not confusingly similar to an existing app.
- [ ] Fill in the placeholders in `store/listing.md` and `site/` (`[SITE_URL]`, `[CONTACT_EMAIL]`, `[DATE]`, `[YEAR] [YOUR NAME]`).
- [ ] Publish `site/` (for example GitHub Pages) and confirm the privacy and support URLs load.
- [ ] Screenshots for 6.9" iPhone (and iPad if supported) and the 1024 icon.
- [ ] Privacy nutrition label and age rating answered (see `store/listing.md`).
- [ ] Review notes added.

## Submit
- [ ] `eas submit --platform ios`, select the build in App Store Connect, submit for review.
- [ ] Once live, add the App Store link to `site/index.html`.
