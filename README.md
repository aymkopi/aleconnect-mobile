# ALEConnect Mobile

Consumer Expo/React Native app for submitting and tracking service reports, viewing advisories/public updates, account information and hotlines. Staff in `../aleconnect` owns `/api/mobile/*`, authorization, MySQL and R2 signing.

## Development

Use Node 24.21.0 from `.node-version`; exact Expo/React Native versions are in `package.json` and the lockfile.

```powershell
npm ci
npm run start
```

Configure `EXPO_PUBLIC_ALECONNECT_API_URL` for the intended Staff API origin; the existing `EXPO_PUBLIC_API_URL` alias is supported. Public app configuration must never contain server secrets. A production bundle requires an explicit API URL.

This app uses native modules: use a compatible development build for native acceptance. Check current app config and installed SDK before changing native projects. Preserve the existing signing key and incremental preview policy.

## Verification

```powershell
npm run harness:check
node --test tests/agent-harness.test.mjs
npx tsc --noEmit
npm run lint
```

Use focused tests for the changed behavior; the JS suite is `node --test tests/*.test.mjs`. Native/config changes also need Expo alignment/Doctor and appropriate exports/build/device checks. Docs-only edits need harness and whitespace checks.

## Android preview

Run `npm run android:preview` with Node 24 and the required Java/Android SDK from the current native configuration. The local preview uses a standalone production bundle and preview signing; it is separate from a production-signed/store release.

Output: `android/app/build/outputs/apk/preview/app-preview.apk`. For a requested handoff, copy the requested app to the agreed output directory and verify its SHA-256. Install/launch and authenticated/native behavior need separate device evidence.

Do not uninstall an existing app to resolve a signature mismatch as routine cleanup; uninstalling erases its private data. Production signing requires the configured `ALECONNECT_MOBILE_KEYSTORE_*` properties or verified EAS credentials. EAS/OTA/store distribution is a separately authorized release action.

[Agent guide](AGENTS.md) · [Product](PRODUCT.md) · [Documentation map](docs/README.md) · [Current work](docs/agent-harness/active-work.md)

Worktree diagnostics: `npm run harness:doctor` (docs) or `npm run harness:doctor -- --app` (app toolchain). See [isolated setup](docs/agent-harness/worktree-setup.md).
