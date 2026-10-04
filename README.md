# ALEConnect Mobile

Consumer Expo application for reports, advisories, notifications, account
linking, and profile management. Staff owns the HTTPS `/api/mobile/*` contract,
authorization, database, and evidence signing.

See [PRODUCT.md](PRODUCT.md), [the agent guide](AGENTS.md), and
[repository structure](docs/repository-structure.md).

## Local development

Use Node 22 LTS and install the committed lockfile:

```powershell
npm ci
npm start
```

Routes live in `src/app/`; consumer feature code lives in `src/features/`.
Use a native development build for the installed native modules.

## Source verification

```powershell
npm test
npm run typecheck
npm run lint
npm run harness:check
```

## Android preview

Use Node 22 LTS, JDK 21, Android SDK 36, and a device with USB debugging:

```powershell
npm run android:preview
adb install -r android\app\build\outputs\apk\preview\app-preview.apk
```

The preview is non-debuggable, includes a standalone Hermes bundle, and uses
the local Android debug key. It does not need Metro. Production
`assembleRelease` requires the `ALECONNECT_MOBILE_KEYSTORE_*` signing
properties or verified EAS credentials. Preserve the installed app's signer
when upgrading in place; uninstalling the app erases its local data.
