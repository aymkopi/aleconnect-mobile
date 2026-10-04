# Expo 55 to 56 to 57 Implementation Plan

**Goal:** Upgrade the consumer app sequentially to stable Expo 57 and refresh compatible dependencies.

**Architecture:** Keep the Staff API contract and consumer data model intact. Expo owns the React/React Native/native-module version matrix; regenerate ignored native projects through the existing config plugins and preserve recovery copies before doing so.

**Tech Stack:** Node 22.23.2, npm, Expo CNG, React Native, TypeScript, Android Gradle.

**Spec:** User request of 2026-10-04; [SDK 56 notes](https://expo.dev/changelog/sdk-56), [SDK 57 notes](https://expo.dev/changelog/sdk-57), [incremental upgrades](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/).

## Contract

Staff `api/mobile/profile/index.ts` uses `requireConsumer`, authorized service-account checks, access revision checks and its existing profile JSON response. Staff `api/_lib/mobile.ts` retains private/no-store JSON and consumer authorization. No shared payload migration is needed for SDK upgrades.

## Compatibility

Preserve routes, identifiers, optional/null response readers and existing unavailable-data UI. Align Expo-managed packages with each SDK instead of installing independently newer native versions. Check Router navigation, the default fetch implementation, asynchronous File.copy, animation interoperability and config plugins. SDK 56/57 raise iOS minimum to 16.4 and require Xcode 26.4 or newer; an iOS build is unavailable on this Windows host.

## Ownership

Consumer app and native configuration only. Staff retains authorization, ownership, MySQL, R2 signing and server secrets.

## Offline

Retain consumer/access-revision cache boundaries, bounded last-successful views, auth-loss invalidation and local report/evidence queues. Add a behavioral regression check that evidence copy finishes before exposing the destination size/URI and that copy errors propagate.

## Permissions

Preserve feature-required location/photo/camera permissions, denial handling, notification sounds, backup exclusion and fail-closed production signing.

## Verification

- [x] Capture SDK 55 serial Node tests, TypeScript and lint baseline. Doctor baseline was invalidated by overlap and is not claimed passed; final SDK diagnostics are independent.
- [x] Snapshot package files and ignored native configuration locally under `.expo/sdk-upgrade`; use branch `codex/mobile-expo-57` based on the clean checkout.
- [x] Install latest stable Expo 56 and run Expo dependency alignment. Resolve peer/API/type conflicts using installed types and official notes.
- [x] Verify SDK 56 tests, TypeScript, lint, Expo Doctor, Android export and native prebuild before proceeding. Save the working package snapshot; Doctor's known Hermes failure is corrected by the next SDK.
- [x] Install latest stable Expo 57, align native dependencies, and refresh compatible third-party packages. Examine any held-back major versions explicitly.
- [x] Repeat source gates and production Android export; regenerate native projects and build an Android preview. Check physical device availability; discovery is unresponsive, so runtime remains explicitly unverified.
- [x] Review the final diff, audit/peer state, Graphify update and harness checks. Record passed, baseline warnings, blocked or unverified checks separately.

## Handoff

- [x] Append history and prepend active-work entries in Mobile and Staff without replacing other work. Include versions, source/base commits, rollback commands, native/runtime evidence and any held dependencies or remaining risks. No remote release is implied.

## Rollback

The initial package/lockfile snapshots and each passing stage are stored in ignored `.expo/sdk-upgrade`. Restore the relevant stage's package files, run `npm ci` under Node 22, and regenerate native code with the matching SDK/config plugins. A full SDK 55 rollback also restores this task's changed source/config files from base `cb6c614fb18bf956682cc67ba58bcac79b60fb1e`; restoring only old package files while retaining Router/Feather imports would be incompatible. Use explicit file paths, never a whole-checkout reset, and preserve later unrelated edits. Native source/config backup preserves local generated settings without committing secrets. Do not restore application data from build artifacts or discard unrelated changes.

## Decisions and results

- Initial Mobile checkout and Staff checkout were clean. SDK 56.0.23 and 57.0.26 were available from npm. Work proceeds locally on the Mobile feature branch; Staff remains read-only except for handoff documentation.
- SDK 55: 202 JavaScript tests and TypeScript passed; four existing lint warnings. The initially launched Doctor overlapped the first dependency install, so it is not valid baseline evidence.
- SDK 56: asynchronous evidence-copy regression reproduced in two behavioral tests and fixed with `await`; the floating tab bar now imports Router-owned types. Removed direct React Navigation dependencies. Migrated the existing Facebook Feather icon to the maintained scoped Feather package and registered its static font plugin. TypeScript 6 requires explicit Node ambient types for repository tests; added Node 22 types.
- Ruling: keep the four newly enabled React Compiler diagnostic rule families at warning level during the dependency migration. All 40 findings concern existing application code (including mutable callback refs and consumer identity guards); broad lifecycle refactoring would expand runtime scope. Rules remain visible and core Hooks errors stay enabled. The compiler can fall back to unoptimized components; these findings are not claimed resolved.
- SDK 56: 204/204 JavaScript tests, TypeScript and Android export (4,649 modules) pass. Doctor is 21/22 with only its documented Hermes V1 regression; proceeding to SDK 57 is the prescribed correction, not an ignored failure.
- SDK 57: clean `npm ci` under Node 22.23.2 passes, 215/215 JavaScript/TypeScript tests pass, TypeScript passes, peer tree has zero problems, alignment passes and Doctor passes 21/21. Android prebuild and export pass; native preview compilation remains in progress.
- Reanimated 4.5 makes ZoomIn's transform-only initial values explicit: removed unsupported opacity values from the existing menu/modal zoom entries after reproducing the two TypeScript failures. A trailing dynamic-import comma in a test was removed for the updated ESLint parser.
- Routine `android:preview` explicitly uses `prebuild --no-clean`, preserving its prior incremental behavior now that SDK 57 prebuild defaults to cleaning. `android:sync` remains the explicit clean regeneration path. The preview/signing-focused suite passes 9/9; independent review closed its sole finding after this correction.
- Final `npm run lint -- -- --format json -o .expo/sdk-upgrade/sdk57-expo-lint.json` passes with 0 errors/44 warnings (4 existing + 40 newly exposed compiler diagnostics). Supplemental whole-repository ESLint passes with 0 errors/47 warnings, including generated/test files. Mobile and Staff harness and whitespace checks pass; AST-only Graphify update passes.
- Current-registry audit of the saved SDK 55 lockfile reports 51 findings (1 low/12 moderate/38 high); final SDK 57 has 43 (12 moderate/31 high) after compatible transitive fixes. Automated remaining fixes propose incompatible old SDK/native versions, SDK 58, or no fix; they were not forced.
- iOS native prebuild explicitly skips Windows and exits without generating a project; run it on macOS/Linux, with native compilation on macOS. This is a host limitation, not validated iOS compilation. Physical-device discovery through ADB and the mobile connector did not respond; no current device/runtime acceptance is claimed.
- The iOS JavaScript/Hermes export passes on Windows; this validates bundling separately from the unsupported native prebuild/build.
- Final Android `npm run android:preview` passes under Node 22.23.2 with the production HTTPS origin: `BUILD SUCCESSFUL in 21m 15s`, 1,024 tasks. The 164,901,874-byte APK verifies with the existing Android Debug certificate; native regeneration preserved the original preview keystore byte-for-byte. It contains all four configured ABIs, Hermes/React Native libraries, the standalone bundle and the static Feather font. Android minimum stays API 24 and target/compile SDK is 36; backup remains disabled.
- APK recovery copy: `.expo/sdk-upgrade/sdk57-preview.apk`, SHA-256 `551F7931BD56B4784017E18515958EB6109A440B4E82DBDC710A49CF8B605526` (matches `android/app/build/outputs/apk/preview/app-preview.apk`). Signing/badging/manifest/ZIP evidence is saved beside it. No device install or native runtime acceptance is implied by packaging/signature checks.
- Generated native production-signing guard is verified: `:app:assembleRelease --dry-run --no-daemon` exits 1 with the expected sanitized `ALEConnect release signing is unavailable` error. This is a passing fail-closed safety check; it did not execute a production build.

## Final version matrix

| Package | SDK 55 baseline | SDK 57 final |
| --- | --- | --- |
| Expo | 55.0.31 | 57.0.26 (via 56.0.23) |
| React / React DOM | 19.2.0 | 19.2.3 |
| React Native | 0.83.10 | 0.86.3 |
| Reanimated / Worklets | 4.2.1 / 0.7.4 | 4.5.1 / 0.10.1 |
| Gesture Handler | 2.30.x | 2.32.0 |
| Keyboard Controller | 1.20.7 | 1.21.9 |
| MapLibre | 11.3.6 | 11.4.1 |
| Bottom Sheet | 5.2.9 | 5.2.14 |
| Lucide | 1.8.0 installed | 1.51.0 |
| Uniwind | 1.6.2 | 1.12.1 |
| TypeScript | 5.9.x | 6.0.3 |
| ESLint | 9.39.4 installed | 9.39.5; hold major 10 for React/import plugin support |
| AsyncStorage | 2.2.0 | 2.2.0; retain Expo's supported native matrix |

The installed package inventory is saved in `.expo/sdk-upgrade/version-evidence.json`. Gluestack, Turf, Tailwind and React Native Web were already at compatible current versions; all Expo modules were aligned to SDK 57.
