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

## Initial alpha.1 rollout

Source gates pass: 436/436 Node tests with zero skips using the canonical Staff contract path, Python APK verifier 2/2, TypeScript, lint 0 errors/181 existing warnings, harness/whitespace, YAML parse, release-tag ordering query, Expo alignment and Doctor 21/21. The changelog classifier regression observed failure then passed 7/7; independent source review has no blocker. The isolated checkout first needed the existing sync:web-map generated worker. The current alpha includes the merged border-free UI and is published with exact source and artifact proof below. The historical v54 binary remains available.


## CI integration — 2026-10-12

[PR #5](https://github.com/aymkopi/aleconnect-mobile/pull/5) merged as 2d39979fa3d47c51cfd014ac6b9c5e6794514091 after both exact-head checks passed at f318045. The canonical local default branch fast-forwarded without conflict and has the exact checked source tree. Fresh local prebuild synchronized alpha/code 55 without cleaning the retained Android project; signer hash 221e0a3106aa4c3ccc154e0a418b55020b3f9ea6e84f92e8749cd9e2f39f5e58 is unchanged. Six fresh read-only live API/public/private boundary assertions pass.

[Automatic run 38253889473](https://github.com/aymkopi/aleconnect-mobile/actions/runs/38253889473) completed successfully on attempt 2: reusable CI, native compile, actual APK verifier, uploaded digest check and prerelease publication all passed.

[Docs-only run 38254901886](https://github.com/aymkopi/aleconnect-mobile/actions/runs/38254901886), source f3406d23ed1826bd063a1c2e44eb44e393fc0dfd, completed successfully: reusable validation passed and the native release job was skipped. This verifies that handoff/changelog-only updates do not generate APK releases.

The first native attempt compiled successfully and passed the actual APK verifier (alpha.1/code55, original certificate, 54 native libraries, fixture mode disabled). Publication failed on the first GitHub release-list request with a TCP connection timeout. Read-only release inventory confirmed no alpha draft or asset existed. The failed job was rerun with the same source/version/code and published successfully; no application-code repair was needed.

## Published alpha.1 and closeout

- [1.0.0-alpha.1 release](https://github.com/aymkopi/aleconnect-mobile/releases/tag/v1.0.0-alpha.1), published 2026-10-12; tag and metadata pin source 2d39979fa3d47c51cfd014ac6b9c5e6794514091. Android code 55, package com.kapecakes.aleconnectmobile, API https://api.aleconnect.app, fixtures disabled and non-debuggable runtime.
- APK aleconnect-mobile-1.0.0-alpha.1.apk is 104101097 bytes. SHA-256: 57a523031d9a86d89ff355d4745c4ae5fe8e62cad7dd98d5c5a826c17a0f642d. All three downloaded asset digests match GitHub; SHA256SUMS and build-metadata.json match the APK. Desktop copy at C:/Users/Justine/Desktop/AleconnectApps/aleconnect-mobile-1.0.0-alpha.1.apk has the same hash.
- Original certificate SHA-256: fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c. Downloaded signer, manifest/code and ZIP16KB checks pass. CI additionally verified all 54 ELF libraries, ARM64/x86_64, SDK24/target36, notification permission, live HTTPS origin and fixture-disabled Hermes bytecode.
- PR #5 is merged and canonical master is synchronized. Clean task worktree removal used no force; its dependency junction was unlinked without traversing the canonical dependencies, and its local/remote feature branch is deleted. Nine saved stashes, provider/signer configuration, old APK/release, external QA evidence and device state are preserved.
- New uncommitted Home, Reports and Advisories edits appeared during closeout. They are preserved and excluded from this docs-only commit and alpha.1; the published APK contains the reviewed source SHA above. They need their own validation and next app-change release.
- Evidence: mobile-alpha-release-2026-10-12 under the session visualization directory contains successful-build-run.json, published-release.json, docs-only-run.json, artifact-acceptance.json, downloaded assets and native acceptance logs. The final handoff commit is docs-only and does not need another APK; its validation/skip result is available on that commit's Actions run. Fresh closeout harness/whitespace and 50 documentation/harness regressions pass.

Remaining acceptance: install this exact APK on a real device and verify private authenticated flows and notification delivery. Native iOS, EAS/OTA and store-production signing are not part of this release. No Staff/database deployment or private credential upload occurred.


## Latest publication — 2026-10-13

[Alpha.4/code58](https://github.com/aymkopi/aleconnect-mobile/releases/tag/v1.0.0-alpha.4) includes merged PR6 source b481117: normalized Figma/app sheets and all latest manual Home/Reports/Advisories/Hotlines/detail edits. [Run38282464018](https://github.com/aymkopi/aleconnect-mobile/actions/runs/38282464018) passed reusable validation, fresh native compile, actual APK verification and digest-gated publication. Merged canonical437 tests, TypeScript/harness/whitespace and independent source review pass; lint retains181 existing warnings.

Downloaded assets/checksum/metadata match GitHub. APK104104701 bytes, SHA-256537674b95fefd8fe4d46094561d7158bdd123a32325060d0aa7649d9fedbbb21; original certificate/package, code58/versionalpha.4, API24-target36, non-debuggable ARM64/x86_64 and all54-library ZIP/ELF16KB checks pass locally. CI verifies fixture-disabled bytecode and the live API. The Desktop AleconnectApps copy matches the published hash. Earlier releases are retained; docs-only runs explain the version ordinal gap. Source/cleanup and Figma/browser evidence are in the [sheet handoff](bottom-sheet-normalization.md). Device/private/provider/iOS acceptance remains separate.

## Alpha.8 publication — 2026-10-13

[PR8](https://github.com/aymkopi/aleconnect-mobile/pull/8) merged as017f7433c6fa1ae45d20e10dc9003b120b09d324 after both checks passed at771f6d6. The [automatic run38372229138](https://github.com/aymkopi/aleconnect-mobile/actions/runs/38372229138) completed successfully and published [1.0.0-alpha.8/code62](https://github.com/aymkopi/aleconnect-mobile/releases/tag/v1.0.0-alpha.8). No manual duplicate build was dispatched; docs-only ordinal7 explains the gap afteralpha.6.

The APK is104117073 bytes, SHA-25630170e5a3a2f75353dc81a76f07726397c8509ec12b907a408ef03aeb851db7c. All three downloaded asset hashes match GitHub. Downloaded signature/manifest, API24-target36, original certificate/package, non-debuggable ARM64/x86_64 runtime, POST_NOTIFICATIONS permission, live HTTPS API, fixture-disabled Hermes bytecode and all54-library ZIP/ELF16KB checks pass locally as well as in CI. `C:/Users/Justine/Desktop/AleconnectApps/aleconnect-mobile-1.0.0-alpha.8.apk` matches the published hash.

Release evidence is in `mobile-selection-alpha-release-2026-10-13` under the existing session visualization directory. Source449 tests, TypeScript, scoped lint (zero errors/six existing warnings), fixture-free exports, Figma/Light/Dark browser and independent reviews passed before integration. Native/private authenticated API, real-device retained-data/login/GPS/push/provider and native-iOS acceptance remain separate. Staff/db/provider/signing/device queues are unchanged; all nine stashes and earlier releases are preserved. The closeout commit contains documentation only and should skip a new APK.
