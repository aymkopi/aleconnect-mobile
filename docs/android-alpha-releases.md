# Automated Android alpha releases

The [Android Alpha Release workflow](../.github/workflows/android-alpha-release.yml) handles default-branch pushes and manual builds. It calls the existing Agent Harness checks before building. Changes classified as docs/harness-only skip native compilation. Pull requests retain the existing validation workflow; their code cannot publish an APK. Only the trusted default-branch build job receives contents-write permission.

## Version policy

Source restarts at 1.0.0-alpha.1/code55. Each dedicated release workflow run uses 1.0.0-alpha.N and Android versionCode54+N. Version codes continue above the previous v54 build, retaining in-place update compatibility despite resetting the display version. Docs-only runs can leave gaps. Do not rename/reset this workflow counter without raising the version-code base first. Reruns preserve a published tag and its assets; existing drafts fail for inspection rather than silently overwrite. Build/publish jobs are serialized; a newer published alpha prevents an older run from publishing later.

Keep the historical 2.0.0 preview release. EAS/OTA/store distribution and production signing are separate workflows. This alpha is non-debuggable and self-contained but deliberately retains the original public Expo preview/debug certificate, which is unsuitable for store production signing.

## Build and publication

- Node24.21 from .node-version, JDK21, SDK/build-tools36 and NDK27.1.12297006; exact dependency lockfile, ARM64/x86_64.
- EXPO_NO_DOTENV=1, EXPO_PUBLIC_PANELUI_PREVIEW=0 and the explicit https://api.aleconnect.app API origin. No private .env or signing/provider secret is copied to CI.
- Fresh Expo Android prebuild retains the production signing guard and separate preview variant. The Expo template debug.keystore hash matches the original local preview signer; CI fails if it changes.
- Fresh Hermes bundle, APK compile, then actual signature/package/code/min/target SDK/non-debuggable/notification permission/HTTPS API/fixture-bytecode/ZIP and ELF16KB checks. Small Python stdlib regressions test the critical fixture/ELF parser checks.
- Upload the verified APK, SHA256SUMS and build-metadata.json to a draft pinned to the exact source SHA. Confirm GitHub's uploaded asset digest before publishing the prerelease. Existing published assets are immutable.

To request a manual rebuild: GitHub Actions → Android Alpha Release → Run workflow on master. The CLI equivalent is `gh workflow run android-alpha-release.yml --ref master --repo aymkopi/aleconnect-mobile`. Published build metadata records source/version/code/hash/certificate/API and ABI proof.

A successful pipeline does not establish real-device/private authenticated/FCM/native-iOS acceptance. Do not uninstall an existing device app to fix a signer mismatch. The canonical signer/provider config, cached queues, device data, old APKs and recovery evidence remain protected.

## Current rollout

Source gates pass: 436/436 Node tests with zero skips using the canonical Staff contract path, Python APK verifier 2/2, TypeScript, lint 0 errors/181 existing warnings, harness/whitespace, YAML parse, release-tag ordering query, Expo alignment and Doctor 21/21. The changelog classifier regression observed failure then passed 7/7; independent source review has no blocker. The isolated checkout first needed the existing sync:web-map generated worker. No new alpha APK is published yet. The current GitHub v54 binary predates the merged border-free UI. This task will publish the current source through the new pipeline and record the exact release/run/asset digest below.
