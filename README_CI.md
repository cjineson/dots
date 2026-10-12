CI / Cloud build (GitHub Actions + EAS)

This project has a GitHub Actions workflow that will trigger an EAS cloud iOS build whenever you push to main.

Required repository secrets (set in GitHub → Settings → Secrets → Actions):
- EXPO_TOKEN — your Expo auth token (required). Create with: `eas login` then `eas token -n "CI token"` or use `expo login` and generate a token.

Optional (recommended for automated App Store uploads):
- APP_STORE_CONNECT_ISSUER_ID — your App Store Connect API key issuer ID
- APP_STORE_CONNECT_KEY_ID — your App Store Connect API key ID
- APP_STORE_CONNECT_KEY_BASE64 — base64 encoding of your App Store Connect .p8 private key file

Notes:
- The workflow runs `eas build --platform ios --profile production --non-interactive`. For this to succeed non-interactively you generally need EXPO_TOKEN and App Store Connect API key secrets configured.
- If you prefer to run builds manually from your machine, you can still use the EAS cloud build commands locally.

How to trigger a build manually (once secrets are set):
- Push any commit to main and the workflow will start.
- Or run the workflow manually from the Actions tab if you change the workflow to accept workflow_dispatch.

If you want, I can update the workflow to accept manual dispatch, include Android builds, or attempt automatic submission to App Store Connect via `eas submit` (that will require additional secrets).