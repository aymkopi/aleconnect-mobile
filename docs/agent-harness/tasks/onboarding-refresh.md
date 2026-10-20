# Onboarding and contextual guidance

## Scope

Refresh the existing Figma welcome screens, implement the selected three-screen introduction, and add optional account setup plus short PanelUI Tour chapters. Preserve primary manual changes. October20 release authorization adds PR creation, final checks/review, merge and one combined APK/IPA alpha publication. No backend contract, migration or device installation is required.

## Design sources

- Welcome Light/Dark: Figma file `6uIaVRM63oHA723WKgjo5k`, section `1374:25743`.
- Optional account setup and App guide: section `1390:25917`.
- In-app spotlight and guest/signed-in offers: section `1391:26325`.
- Editable guide copy/target inventory: frame `1395:26951`.
- Reusable guide link `1391:25917`, Tour card `1393:26129`, page indicator set `1383:25925`.
- Eighteen editable 402×874 phone frames: six welcome, six setup/signed-in/guest guide hubs, and six Tour/first-access offer frames. Guest hubs are `1403:26714` (Light) and `1403:26811` (Dark). The remaining Tour steps are specified in the editable twenty-step inventory, rather than twenty duplicate full-screen mockups.

## Entry policy

| State | Behavior |
| --- | --- |
| No restored session, welcome unseen | Three skippable illustrated screens. |
| Welcome previously completed | Home; no repeated introduction. |
| Existing restored session | Home, preserving the existing required-password gate. |
| Required temporary/reset password | Existing secure password flow first. A reset alone does not restart onboarding. |
| First interactive sign-in on this device | Offer optional setup or the guide hub after secure sign-in. Offer state is account-scoped; restoration and refresh do not trigger it. |
| Explicit first welcome guest choice | Offer the public guide hub; no account setup. Guest state is separate. |
| Replay | Help & support opens App guide; public chapters remain accessible to guests. |

Account setup links to the existing profile editor, service accounts and alert preferences. It does not bypass password confirmation, introduce mock OTP, or promise unsupported email verification. Guides never submit reports, place calls or alter preferences. A route or principal change ends the active guide.

## Tracker

- [x] Inspect current Figma, app/auth routes and PanelUI APIs.
- [x] Create editable three-screen welcome Light/Dark designs and original vector exports.
- [x] Build initial entry gate and welcome route in the isolated worktree.
- [x] Design optional setup, guide hub, attached offers and twenty contextual guide steps.
- [x] Verify corrected setup/tour compositions and reusable components.
- [x] Import PanelUI Tour and normalize its theme/accessibility presentation.
- [x] Implement scoped first-access offers and setup/guide routes.
- [x] Connect actual targets across Home, Reports, New Report, Advisories, Hotlines, Account and navigation.
- [x] Add Help replay entries and preserve existing security/guest guards.
- [x] Run focused/full tests, types, scoped lint, exports and integrated-browser checks.
- [x] Obtain read-only review and resolve its findings.
- [x] Finish documentation validation and preserve refreshed Graphify outside the source diff.

## Current evidence and limits

- Final release suite: 565 tests, 564 passed, zero failures, one existing isolated-sibling skip. Added checks cover hydration and welcome eligibility, bundled vectors, restored versus interactive sessions, required-password precedence, principal-scoped offer records, public guide routes, per-step card measurement and asynchronous target resizing.
- TypeScript passes after Metro regenerates the new Expo route types. Scoped lint has zero errors and fourteen warnings, including existing hook/test warnings and the imported Tour/provider lifecycle effects; no rule was weakened for this task.
- Production web and Android/Hermes exports pass with the explicit HTTPS API and preview fixtures disabled. These are bundle checks, not native APK/IPA builds or installation evidence.
- Codex integrated-browser checks cover the three-screen welcome controls, explicit guest entry, attached first-access offer, guest-only guide hub, labelled private fixtures, optional setup links, all six guide chapters, Back/Next/Done, Help replay, actual navigation spotlight, keyboard Tab/Escape and compact/Dark geometry. Finishing the report guide leaves the form at its original step. No report is submitted, call placed or preference changed by a guide.
- Review corrections: a persisted account hint cannot reopen setup after session restoration; target activation and remeasurement include window/font-scale changes. The visible navigation pill is measured directly. Web focus lands on the dialog, not its close action. Native-only accessibility props are not emitted onto the web welcome markup.
- Final Figma compositions were inspected in Light/Dark, including both public guide hubs. Artwork is local editable vector content exported from the six Figma illustration stages; no runtime external image dependency was added.
- Harness and whitespace checks pass. Harness retains the expected absent-relative-Staff warning in this nested worktree; no shared API contract changed. Graphify refresh produces 4,557 nodes and 8,620 edges. Six generated graph/Uniwind files are SHA256-copy-verified under `.cache/onboarding-generated-final-20261020-145451`, then restored out of the product diff.
- Browser verification used only the task preview on port8105. That server stopped before implementation closeout, and the optional restart was rejected by execution policy without a more detailed reason; no running preview is claimed. Release authorization and actual publication follow below. No backend, migration, device or signing-identity change was required.

## Remaining acceptance

Physical-device Tour positioning, native screen-reader announcements, large native Dynamic Type, real interactive sign-in/password-reset completion and authenticated production mutations remain unverified. Public API availability in the browser was not accepted as a live-backend test; recovery targets explain retry rather than inventing content. Existing password and guest guards remain in force.

## Next

No required onboarding implementation, merge or publication work remains. Native acceptance is separate; preserve primary manual work and previous artifacts.

## Authorized release tracker (2026-10-20)

- [x] Confirm base/default branch `c1c5bbc4d4c95438c0be191dc98c083d0e942120` and retain unrelated documentation PR21.
- [x] Snapshot/hash the five primary manual documentation files outside the source tree; preserve unrelated Staff edits and previous native artifacts.
- [x] Run fresh full tests, types, lint, harness and whitespace checks, then close the independent read-only review. Review found and resolved stale spotlight bounds after async content replaces a skeleton; the regression fails before the fix and all eleven focused checks pass afterward. No remaining review blocker.
- [x] Create [PR23](https://github.com/aymkopi/aleconnect-mobile/pull/23) with detailed Added/Changed/Compatibility/Validation notes and a changelog entry. Preserve unrelated PR21.
- [x] Both final-head checks pass on `cbab84d737175c1a586c195437c52ee05089363f`. PR23 squash-merges as `73f2f1e9423d6ecb1fe22507a90315ad56e95ab1`; its entire tree matches the tested PR head.
- [x] Existing combined workflow39384834070 passes all five jobs and publishes APK plus unsigned IPA from one version/build context.
- [x] Verify both metadata sources, tag, version/build, all six GitHub digests and checksum files, original Android signer and native/runtime integrity. Versioned Desktop copies hash-match; previous files remain intact.
- [x] Fast-forward primary master, restore the original manual history patch ID and four exact audit-file hashes, and retain all ten unrelated stashes. Git normalized the stashed audit-file line endings; normalized-content comparison followed by original-byte recovery restored their exact hashes. Record outcomes below.

Actual compatible feature release: `1.5.0-alpha.1`; Android/iOS build74. No Staff deployment or schema migration was needed for onboarding. The unsigned IPA still needs local signing; native device, provider and accessibility acceptance are separate from artifact verification.

## Release completion

- [PR23](https://github.com/aymkopi/aleconnect-mobile/pull/23) and [workflow39384834070](https://github.com/aymkopi/aleconnect-mobile/actions/runs/39384834070) identify the same merged source. [Release1.5.0-alpha.1](https://github.com/aymkopi/aleconnect-mobile/releases/tag/v1.5.0-alpha.1) contains all six binary/metadata/checksum assets. Release notes and the detailed feature commit/changelog describe Added, Changed, Fixed and compatibility scope; no feature is removed or deprecated.
- APK native1.5.0-alpha.1/code74, IPA native1.5.0/build74 and both embedded Expo/About alpha labels verify. Both standalone Hermes bundles contain the new welcome, optional setup and contextual-guide strings, the production HTTPS API and compiled-off fixtures. The APK retains certificate `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`; both64-bit ABIs,54 native libraries, signature and ZIP/ELF16KB alignment pass. IPA ZIP/ARM64/Info.plist/permissions/embedded config pass; no provisioning profile is embedded.
- APK SHA256 `166ceb67ca99148a5d9b922fd96d705de91cf792dd2777b2b86e19909de3d400`; IPA SHA256 `062444ffafa37811e12f6d094fd1fb3496886fa23c9455f70bfc4174f6f8b5e1`.
- Hash-verified Desktop files: `C:/Users/Justine/Desktop/AleconnectApps/aleconnect-mobile-1.5.0-alpha.1.apk` and `C:/Users/Justine/Desktop/AleconnectApps/ipa/Aleconnect-ios-1.5.0-alpha.1-build74.ipa`. Private checks, Graphify refresh, original manual snapshots and public release metadata are retained at `C:/Users/Justine/.codex/artifacts/onboarding-release-20261020`.
- No physical-device install, real credential mutation, native screen-reader or provider acceptance is claimed. The unsigned IPA needs local signing; personal-team remote push remains unsupported. No additional Mobile alpha is needed for documentation closeout.

## Post-release Tour recovery (2026-10-20)

The user reports the spotlight without its description on both Android and iOS, and a single tap ends the guide. A target relayout creates a new registered entry for the same step; the previous object-identity measurement then becomes invalid without a new card layout event. This reproduces the invisible-card state. Backdrop dismissal was also enabled by default.

- [x] Key card measurements to the stable step order and reject zero/invalid content sizes.
- [x] Bound the native ScrollView viewport and measure intrinsic content; cap long copy to the safe area.
- [x] Ignore callbacks from an old step after advancing.
- [x] Ignore accidental backdrop taps in app guides, retaining explicit dismissal and platform Back/Escape.
- [x] Reproduce and fix the description container intercepting the End tour touch area.
- [x] Full suite:569 total,568 passed,0 failures,1 existing skip. Types pass; scoped lint has0 errors/4 baseline warnings. Independent read-only review has no findings.
- [x] Fresh exported-app render checks: public Home/Hotlines/Advisories chapters on regular Light phone, compact Dark phone and Dark tablet; card and ancestor opacity, description text, resizing, background/body taps, Next/Back/Done/Skip/End tour, no page errors.
- [x] Fixture-free production Android/iOS Hermes exports pass. Graph refresh produces4575 nodes/8637 edges; generated graph/Uniwind copies are hash-verified outside the product diff. Final harness/whitespace checks pass with the existing isolated-sibling warning.
- [ ] Corrective APK/IPA publication, version/signature verification and native acceptance.

The browser check fulfills only files from the fresh export in a private browser context, without a local server; all external requests are intercepted. Starting an Expo preview server was rejected by automatic approval review with no detailed reason. No existing browser session or device data is touched. The25040RP0AG tablet reappears in ADB with1.2.0-alpha.1/code68; native behavior of the new fix remains separately unverified.
