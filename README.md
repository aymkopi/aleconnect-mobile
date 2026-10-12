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

Use focused tests for the changed behavior; `npm test` runs the JS and TypeScript suites. Native/config changes also need Expo alignment/Doctor and appropriate exports/build/device checks. Docs-only edits need harness and whitespace checks.

## GitHub APK releases

Installable APKs and SHA-256 checksums are available in [GitHub Releases](https://github.com/aymkopi/aleconnect-mobile/releases). The first [2.0.0 preview](https://github.com/aymkopi/aleconnect-mobile/releases/tag/v2.0.0-preview.1) is a standalone ARM64/x86_64 build with the existing package and signing certificate. Preview publication does not imply real-device/private/provider acceptance or store signing.

## Android preview

The `npm run android:preview` script is emulator QA only: it requires `EXPO_PUBLIC_PANELUI_PREVIEW=1` and pauses queue replay. For a fixture-free real-device build, follow [the signed-device runbook](docs/superpowers/plans/2026-10-10-real-android-preview.md) with `EXPO_NO_DOTENV=1`, `EXPO_PUBLIC_PANELUI_PREVIEW=0` and the explicit HTTPS API origin. Force regeneration of the Hermes bundle when changing build-mode environment variables. Preserve the original local signing key; this is separate from a production-signed/store release.

Output: `android/app/build/outputs/apk/preview/app-preview.apk`. For a requested handoff, copy the requested app to the agreed output directory and verify its SHA-256. Install/launch and authenticated/native behavior need separate device evidence.

Do not uninstall an existing app to resolve a signature mismatch as routine cleanup; uninstalling erases its private data. Production signing requires the configured `ALECONNECT_MOBILE_KEYSTORE_*` properties or verified EAS credentials. EAS/OTA/store distribution is a separately authorized release action.

[Agent guide](AGENTS.md) · [Product](PRODUCT.md) · [Documentation map](docs/README.md) · [Current work](docs/agent-harness/active-work.md)

Worktree diagnostics: `npm run harness:doctor` (docs) or `npm run harness:doctor -- --app` (app toolchain). See [isolated setup](docs/agent-harness/worktree-setup.md).

## PanelUI 2.0.0

Five Expo Router tabs and their child screens live in `src/app`; feature implementations live in `src/features`. Shared copied-source controls live in `src/components/panelui`, with provenance in `panelui-lock.json`. Consumer API/storage logic stays in `src/services`, models/contracts stay near their owners, and native config plugins stay in `plugins`.

See [the detailed changelog](CHANGELOG.md) and [major migration handoff](docs/panelui-major-migration.md). Onboarding and in-app payment collection are outside the shipped flows. Optional Staff PR40 contracts must be released before claiming their dependent behavior.

Copied PanelUI source is Copyright (c) 2026 Khalid Abdi and distributed under [its MIT license](src/components/panelui/LICENSE). Font licenses are included beside the font assets.
