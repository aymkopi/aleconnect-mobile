# Consumer security and UI refinements

## Baseline and scope

The isolated Mobile worktree includes every current tracked/manual edit and the two native-build handoff/plugin files. The original files and SHA-256 hashes are preserved in the task evidence folder. Do not reset the primary checkout or copy private environment files. Staff owns server authorization; the user authorized final PR integration, compatible Staff deployment and Mobile release on 2026-10-14.

## Implementation tracker

- [x] Reuse PanelUI notification counts on all main-page bells; serialize read/incoming invalidation and discard stale identity results.
- [x] Enforce account-wide rolling verification failure windows and session-bound, five-minute verification on the server.
- [x] Keep existing required-password clients compatible without bypassing security controls.
- [x] Two-step change-password UI, live validation, cooldown, expiry recovery, generation-bound cancellation and completion to Security settings.
- [x] One continuous Reanimated spring pill and static Lucide layer crossfade; reduced motion and interruption-safe values preserve instant routes.
- [x] Explicit report KPI fetched-data scope.
- [x] Replace dotted metadata concatenation with hierarchy, descriptive labels or normal address/date punctuation; source scan has no middle dots.
- [x] Update authoritative Figma password flow; complete badge/KPI examples and action-state labels in the consistency pass.
- [x] Focused security/UI regressions, types, scoped lint, harness, production Android/Hermes export and x86_64 development APK compilation.
- [x] Include the manual source baseline in the finished isolated worktree; all 17 original hashes still match the primary checkout.
- [x] Complete bounded native fixture acceptance on a phone-sized Android 16 emulator and the user-authorized Redmi Pad 2 tablet (25040RP0AG); preserve shared source/device state.

## Server design

Reuse Better Auth's existing `verification` table under a namespaced deterministic row ID. Store bounded failure timestamps, cooldown, session-bound verification and credential fingerprint; no plaintext passwords or client verification token. Serialize per-account changes with a row lock and recheck the live session, credential and five-minute grant before writing. Use Better Auth's password policy/crypto and internal credential adapter inside the same MySQL transaction, revoke other sessions and audit security outcomes without sensitive values. Legacy one-request clients must pass the same verification limits. Other Better Auth consumer password-change entry points must route through this handler. Ordinary login remains available.

The backend must be deployed before releasing the new two-step client. Rollback the client before the server; legacy requests remain supported. Live schema inspection is read-only; no schema migration is expected. No real user's password is changed for testing.

Verification uses an in-memory flow ID bound to the current session, credential fingerprint and server deadline. Cancel/change requests must carry that generation, so late requests cannot cancel or commit a newer flow. Completion receipts permit safe recovery after a lost response. Passwords and flow IDs are never persisted on the client.

At ten failed verifications in 24 hours, existing sessions are revoked account-wide. This prevents another old device session from reviving the invalidated flow after failure storage expires. It does not ban the account or disable normal new login. A successful password change revokes all other sessions, retains the current session and creates a consumer security notification in the same transaction.

The generic Better Auth change-password path shares this consumer limiter. Signed Bearer parsing handles case and percent encoding, then pins stock Staff requests to the selected Staff principal so mixed headers cannot switch identity after role checks.

## Verification and isolation

- Staff focused security tests: 16 passed, including real Better Auth adapter ownership, rollback/retry, concurrent submissions, deadline rechecks, rolling windows, old-session cleanup, stale cancellation and mixed credentials. Live schema columns were inspected read-only; existing verification/account/session tables support the design. No migration or live password update occurred.
- Mobile typecheck passed; scoped lint has zero errors and two preserved manual Account warnings. Focused password and badge tests pass 7/7, including already-verified password changes during a verification cooldown. Final full suite: 456 tests, 452 passed, three manual-baseline source-assertion failures and one existing skip. Failures concern map zoom, map field disabled state and Appearance helper text; do not revert those edits to satisfy outdated assertions.
- Figma secure-flow sections: Light `1162:24461` and Dark `1176:24488` in file `6uIaVRM63oHA723WKgjo5k`. Reused child headers, fields and Button instances. Main-page bells use numeric badge examples and the existing PanelUI KPI includes fetched-data scope. Primary Button labels bind to the semantic control foreground: white in Light, `#00060F` in Dark. Both final flows were visually checked.
- Device ownership: thread `01a12f36-3e2a-7a30-9461-c56b96706e91` owns the wireless Xiaomi 15T (25069PTEBG). It remains untouched after the ownership correction. The user subsequently authorized Redmi Pad 2 (25040RP0AG). This task's phone-sized emulators are stopped; native-only Metro `8101` uses one worker and a bounded heap. The original `8100` task server was stopped because its open web tab triggered simultaneous web rebuilds. Preserve earlier emulators, phone data and unrelated reverse ports.
- Emulator APK builds use an isolated native project and x86_64. Private Google/provider configuration is excluded from this local UI binary; it cannot establish push/provider acceptance. Production configuration and signing are preserved.

## Native build and resource checkpoint

The isolated x86_64 debug APK compiled successfully (559 Gradle tasks). APK SHA-256: `7f77bb82c3dac0ea8c5ba982f34ccdbe1462d323acd43ac05ee176a4c5cd4faf`; size 115,596,686 bytes. Development Metro compiled all 4,655 Android modules. Fixture-free production Android/Hermes and web exports passed; the later fixture-only toast clarification passed focused tests, TypeScript and scoped lint.

C: repeatedly reached zero free space during concurrent work. The initial fresh Android 16 emulator's permission database became corrupt; its disposable userdata was discarded, preserving its logs/config and every saved device. The Android 15 test emulator then reported system SQLite/Google Play service failures while space was exhausted. No real phone was reset or modified after ownership correction. Only task-owned disposable snapshots and reproducible Staff/CMake outputs were removed; broader caches and other processes remain untouched.

After resource isolation, a fresh task Android 16 emulator with 3 GB RAM rendered Home, Account, the two password steps, completion and Security settings without a new recorded app exit. The user then authorized the tablet instead; both task emulators were stopped. The tablet preview uses the existing compatible ARM development client, updated in place after comparing its certificate with the installed APK. The original APK was retained as rollback evidence. The new worktree JavaScript runs through Metro 8101; this is not a newly published release APK.

The tablet is Android 16, 1600×2560, with its existing density retained. Its 3×4 Home actions fit without page scrolling, the fetched-data KPI label is visible, and measured page pixels are exactly `#00060F`. Light and Dark password fields, show/hide controls, confirmation validation, the guarded Back dialog, fixture completion and return to Security settings were checked. Leaving/reopening the flow clears the typed fixture values. App-only theme selection was checked and restored to System; OS settings were not changed.

The 30-fps tablet recording and cropped frames show one moving pill crossing intermediate tabs in both directions, including an interrupted rapid switch. Pixel traces include intermediate positions rather than separate endpoint pills. This establishes bounded motion behavior, not a native frame-rate benchmark or universal device coverage.

Native private screens use explicitly labelled visual fixtures. The tablet's previous session returned 401; existing saved report queues were retained and background replay/push registration stayed paused in preview mode. No real credentials were entered, no live password changed, and no saved report was submitted. Security windows, expiry, revocation and notification atomicity are established by focused server tests, not production mutations.

Earlier Android exits were `LOW_MEMORY` while C: was exhausted. Only dedicated disposable emulator state and reproducible task build outputs were removed; saved devices and other tasks were preserved. Keep Metro 8101 native-only and bounded. Evidence, graphs, screenshots, video, baseline hashes and logs are retained outside the repositories.

Production deployment, release, private/provider and native iOS acceptance remain separate gates; deploy the compatible server first. Primary source files remain untouched while the other thread works, and all 17 original baseline hashes still match. No commit, push, production deployment or GitHub alpha release is claimed. Reconcile isolated source against fresh primary edits before integration.

## Final release checks — 2026-10-14

Reconciled Staff on current remote main while preserving unrelated unpublished local commits. The current production verification/account/session/audit columns support the password flow; no DDL, data backfill or migration is required. Mobile includes all captured manual changes and the Windows native-path fix. Three outdated assertions now validate the preserved zoom9, always-visible address outside its pending-spinner conditional, and separate theme-selection heading. Fresh full Mobile suite passes455 tests with one optional sibling-contract skip; types and whole-project lint pass (zero errors/181 existing warnings). Final direct sibling-contract validation, Staff security/regression/build, exact-head PR checks and deployment/artifact verification remain the release gates.

Final approved source gate:456/456 Mobile tests, TypeScript, whole-project lint (zero errors/181 existing warnings), harness, fixture-free Android/Hermes and web exports pass. Expo alignment and Doctor21/21 pass after five direct compatible patch upgrades and their resolved dependencies. Staff final source has1353 passing application tests/two existing skips,17 focused password tests, build/lint/Worker dry-run and clear independent review. The reviewed malformed-action bypass is fixed and regressed. Manual primary baseline17/17 remains unchanged before integration. Publication order is Staff PR/deployment then Mobile PR/default-branch alpha pipeline; original package/certificate/version-code policy is retained. No database migration is required.

## Published alpha10/code64

PR9 merged asfc43da85b1a16cbd4641d35be01cc689125776bc after both exact-head checks passed. Workflow38541261800 passed source validation, standalone ARM64/x86_64 compilation, native/bundle verification and immutable publication. Downloaded APK is104148809 bytes, SHA-256cc2889426f39e128370cb88118b9e51cea3373514b4ace3ee144c800529b5361. All three GitHub asset digests match; downloaded signer/manifest/Hermes fixture flag/live API and54-library ZIP/ELF16KB checks pass. Desktop/AleconnectApps copy matches the hash. Alpha9 was a documentation-only workflow ordinal, so no tag was overwritten or version code reset.

Staff PR41/source4f7762d was deployed first through38540156021; API850ccade-b848-438e-bcbe-2e57745f3f7d, Pagesc05502e9 and eight read-only production auth/public smoke checks pass. No database migration was required. Local Mobile master includes every captured manual edit and matches the product release source; recovery stash and private/signing/provider/queue state remain intact. Staff's unrelated unpublished commits are retained only in its local merge/recovery branch.

The tablet disconnected before final release installation. Earlier bounded fixture UI/motion acceptance remains valid; exact release device/private-password/provider/native-iOS acceptance is separate. This closeout changes documentation only and must not build another APK.
