# CI / releases (GitHub Actions + EAS Update)

Pushing to `main` (or running the Deploy workflow manually from the Actions tab) publishes an over-the-air update to the EAS `main` branch, which Expo Go users can open. It does not make a store build.

Required repository secrets (GitHub → Settings → Secrets → Actions):
- `EXPO_TOKEN`: an Expo access token that can publish to the project's owning account.
- `EAS_PROJECT_ID`: the Expo project ID.

## Versioning

Each deploy computes a semver version and stamps it into `app.json` inside the CI run only (nothing is committed back, so there is no loop):

- The version comes from the latest `v*` git tag plus the commits since it ([scripts/release-version.ts](../scripts/release-version.ts), logic in [src/lib/releaseVersion.ts](../src/lib/releaseVersion.ts)).
- `feat:` commits bump the minor version, `!` or a `BREAKING CHANGE:` footer bumps the major, and anything else bumps the patch. Merge commits are ignored.
- Older history is not conventional, so those commits count as patch bumps.
- If there is no `v*` tag yet, the version already in `app.json` is published as-is and tagged (so the first run publishes 1.0.0).
- After publishing, the workflow pushes the `vX.Y.Z` tag. Put the conventional prefix in the commit messages that land on `main` (the PR title when squash merging).
- The build time (`extra.buildTime`) and short commit (`extra.commit`) are stamped too.

Settings → About shows the version, commit and build time. Local `expo start` runs show "Development build (not published)". Compare these between devices to confirm a tester has the latest update.