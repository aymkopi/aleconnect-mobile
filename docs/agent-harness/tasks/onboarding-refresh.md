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
- Browser verification used only the task preview on port8105. That server stopped before closeout, and the optional restart was rejected by execution policy without a more detailed reason; no running preview is claimed. Primary manual history/security audit documents and Staff edits remain untouched. No backend, migration, signing, device, merge or release operation ran.

## Remaining acceptance

Physical-device Tour positioning, native screen-reader announcements, large native Dynamic Type, real interactive sign-in/password-reset completion and authenticated production mutations remain unverified. Public API availability in the browser was not accepted as a live-backend test; recovery targets explain retry rather than inventing content. Existing password and guest guards remain in force.

## Next

Finish the authorized release below; do not reopen the completed password-policy release or overwrite primary manual work.

## Authorized release tracker (2026-10-20)

- [x] Confirm base/default branch `c1c5bbc4d4c95438c0be191dc98c083d0e942120` and retain unrelated documentation PR21.
- [x] Snapshot/hash the five primary manual documentation files outside the source tree; preserve unrelated Staff edits and previous native artifacts.
- [x] Run fresh full tests, types, lint, harness and whitespace checks, then close the independent read-only review. Review found and resolved stale spotlight bounds after async content replaces a skeleton; the regression fails before the fix and all eleven focused checks pass afterward. No remaining review blocker.
- [x] Create [PR23](https://github.com/aymkopi/aleconnect-mobile/pull/23) with detailed Added/Changed/Compatibility/Validation notes and a changelog entry. Preserve unrelated PR21.
- [ ] Require both exact-head GitHub checks, merge with a feature Conventional Commit and verify the merged application tree.
- [ ] Let the existing combined release workflow allocate/build/publish APK and unsigned IPA from the same source and version context.
- [ ] Verify both metadata sources, tag, version/build, six asset digests, original Android signer and native/runtime integrity. Copy versioned binaries to Desktop/AleconnectApps without overwriting previous files.
- [ ] Synchronize primary master while restoring/hash-checking the manual history and security documents. Record release results and remaining native acceptance separately.

Expected compatible feature release: `1.5.0-alpha.1`, subject to the live allocator; Android/iOS build numbers remain monotonic. No Staff deployment or schema migration is needed. The unsigned IPA still needs local signing; native device, provider and accessibility acceptance are separate from artifact verification.
