# Active work

## Consumer multi-account V18 release evidence (2026-08-26)

- Status: coordinated mobile source is merged to canonical `master` at `6eed61da65557c04faa878fd2cee3f73b8676087`, with the iOS encryption-compliance metadata fix included. Android production build `46a1019d-03de-4d16-8824-8a32c95ce4d8` finished successfully and produced an AAB; automatic store submission stopped because the Google Play service-account key is not configured for non-interactive submission. iOS build/submission is blocked because Apple distribution credentials are not set up.
- Backend dependency: staff/API `main` is `e56731d6bd6b26c74aae1adb1c7e80f4f2cc3700`, the live additive schema is applied and verified, and the Cloudflare workflow completed successfully before this mobile release attempt.
- Verification: snapshot behavior 6/6, TypeScript, harness, diff checks, and EAS Android build passed. The full JavaScript suite remains 172/178 with the same six unrelated baseline failures; lint has 0 errors and four existing warnings. No physical Android/iOS device or push-tap flow is claimed.
- Review/boundary: the fresh independent Sol High review was attempted but unavailable because of the platform usage limit; no fresh approval is claimed. Production rollout flags remain off and real email verification is not wired; generated Graphify output is preserved and excluded from release commits.

## Consumer multi-account V18 final remediation (2026-08-26)

- Status: coordinated source and local verification complete; final independent review and authorized backend/mobile release remain pending.
- Scope: linked-account snapshots now retain the server identity principal during normalization, preventing equal-revision data from another identity from being published; mobile account/report/profile readers continue to require matching identity, account set, default, and access revision.
- Files: `src/features/accounts/contract.ts`, `src/services/linked-accounts.ts`, focused snapshot behavior/contract tests, and this handoff; staff owns the corresponding auth/access/input/linking hardening.
- Evidence: TypeScript behavior passed 6/6; `npx tsc --noEmit` passed; lint exited 0 with four existing warnings; the full serial JavaScript suite reported 172/178 with exactly six unrelated established baselines (hotline sheet sizing/keyboard/cache, Manila date formatting, image-only permission manifest, and responsive profile UI). Coordinated staff lifecycle/child/deployment evidence is 401/401, 146/146, and 34/34; guarded DB coverage remains 3 explicit skips without a disposable schema.
- Boundary: no EAS build, device interaction, merge, push, migration, backend deployment, or production write has occurred at this evidence point.
- Next: obtain a fresh read-only Sol/High verdict, then release staff first and mobile from canonical `master` only after backend smoke evidence.

## Consumer multi-account V17 queue and advisory scope compatibility (2026-08-26)

- Status: coordinated implementation and aggregate verification complete; final independent review and authorized release actions remain pending.
- Scope: protected report drafts reuse one consistent identity/account/access-revision snapshot before evidence signing and submission. Advisory request deduplication, persistent cache, stale fallback, detail loading, and visible state use the active identity and access revision; late results from an earlier scope cannot render after an ownership revision changes. Root push-cache invalidation passes the same scope.
- Evidence: the serial source-contract suite passed 172/178 with exactly the six unrelated established baselines: category sheet 55%, hotline keyboard/reduced motion, stale hotline cache visibility, Manila advisory range, image-only permission manifest, and responsive profile child UI. TypeScript passed and lint had 0 errors/4 existing warnings. The stale advisory cache assertion was updated from v1 to the intentional identity/revision-scoped v2 key. Coordinated staff evidence is lifecycle 397/397, child workflows 146/146, deployment 34/34, and 3 explicit guarded-DB skips without a disposable schema.
- Boundary: no EAS build, store submission, device interaction, merge, push, backend migration, Cloudflare deployment, or production write has occurred at this evidence point.

## Consumer multi-account linking (2026-08-25)

Branch `codex/multi-account-linking` contains the mobile half of unified consumer email identities. Consumers retain legacy ALECO account sign-in until linked; a one-account identity remains account-login compatible, while multi-account identities are guided to email sign-in. First login offers skippable email setup with a server-authorized mock-verification review, and Profile now includes linked-account management, claim status/reasons, default selection, per-account service details, password-confirmed unlink, and approval guidance. Multi-account report creation and archives add account selection and labels, switch saved location with the selected account, clear cross-account drafts/evidence, and scope offline queues and caches by identity, account, and access revision. Notifications and report feeds default to all accounts, add conditional filters/labels, and route ticket or linking decisions through privacy-safe data.

Task-focused auth/account/profile/report/notification/navigation suites pass after four Sol/High remediation waves aligned authorized-account background sync with the identity context, opened both push-driven and visible approval guidance in explicit Email sign-in mode, cleared claim passwords before network submission, and made queued-report access immutable by identity/account/revision. Same-identity drafts for removed accounts remain visible as non-retryable failures without exposing another identity's drafts. Queue behavior passes 6/6. The complete serial mobile suite is 168/174 with the same six unrelated pre-existing category-sheet, hotline, Manila advisory formatting, image-permission manifest, and responsive-profile source-contract failures. No Expo/EAS/store build, device mutation, release, API deployment, database action, staging, push, or merge occurred.

Next: obtain a new independent read-only Sol/High verdict, then validate single-account and multi-account flows on physical Android/iOS builds against an explicitly authorized flagged backend before publication.

## Saved home address report selection (2026-08-25)

The report form now uses the authenticated consumer profile's saved structured municipality, barangay, purok/street, landmark, and coordinates when Home Address is active. The prior `findHomeAddress` implementation ignored the saved municipality/barangay identifiers, re-derived them only from bundled GeoJSON, and always cleared the landmark; a missing or differing polygon match could therefore leave the report location blank or different from the user's saved address. Current metadata still validates the saved barangay-to-municipality relationship, and coordinate-derived detection remains only as a compatibility fallback for legacy profiles without valid structured codes. The unused duplicate home-address toggle implementation was removed.

TDD captured RED when the pure saved-address resolver did not exist, then GREEN on its saved-address behavior. Resolver coverage now also protects saved-code precedence, mismatched and missing-code fallbacks, and out-of-Albay rejection. Focused profile/report-location coverage passes 20/20; the staff profile source contract passes 2/2 without a database integration test; TypeScript, both project harnesses, both diff checks, and the Android production export pass; lint has zero errors and four existing warnings. Graphify refreshed to 1,925 nodes, 3,100 edges, and 178 communities. The complete mobile suite is 146/152 with the same six unrelated UI/date/permission baseline failures, and Expo Doctor remains at the existing 19/20 SDK patch-version drift. No Android device is attached, so physical Home Address interaction remains unverified. No API, database, authorization, cache, permission, native configuration, deployment, or release contract changed.

Next: verify Home Address selection on a connected Android device before publishing a mobile build. No staff deployment is required.

Last reviewed: 2026-08-20
Current branch: `master` (unused-module cleanup locally merged; prior `codex/mobile-operations-parity` integration context remains below).
Active plan: `../aleconnect/docs/superpowers/plans/2026-08-13-mobile-operations-parity.md`; Tasks 1–9 are locally implemented/verified, pending controller-owned full-branch review and integration.
Next task: obtain the fresh whole-branch Sol review, resolve any finding through the designated Terra lane, then repeat the listed gates before merge. Do not publish EAS/store artifacts or deploy staff infrastructure from this handoff.
Known blockers: no combined reviewed/integrated evidence for the separately owned `codex/push-dispatch-engine`; staff database runtime is intentionally unverified without worktree-local credentials. Preserve Graphify outputs.
Last verified: Task 9 mobile gates passed: `node --test tests/*.test.mjs` 111 passed/1 existing skipped, lint, TypeScript, Expo Doctor 19/19, explicit-output Android export, and harness (with its expected absent conventional-sibling warning). Redmi Pad 2 `25040RP0AG` remains connected with `com.kapecakes.aleconnectmobile` foreground; Task 8 proved the patched report form keeps the IME open through 2000 ms, preserves Tab focus/visibility, and retains the route after Android Back.

## Mobile operations parity integration (2026-08-13, unmerged)

The staff-owned `/api/mobile/complaints` and `/api/mobile/hotlines` contract remains the only mobile API path; consumer code does not gain MySQL, server secrets, or a cache authority bypass. Staff Task 9 proves Vite/Worker handler identity for those consumer endpoints plus `/api/service-memos` and `/api/data`; the Pages proxy forwards the exact path/query to the API Worker. No duplicate local handler was introduced.

Product commits are `4b8794f`, `80d7bee`, `3364902`, `8ee8a89`, and `fc31291`; paired staff commits and the push-engine dependency are recorded in the staff handoff. No database action, deployment, publish, secret copy, or push-engine branch edit occurred. Immediate push delivery from `codex/push-dispatch-engine` is not claimed pending its owner review plus combined integration and device evidence.

Harness fix evidence: `node --test tests/agent-harness.test.mjs` -> 28/28 passed; `npm run harness:check` -> exit 0; see implementation-history entry "ALEConnect agent harness final fix wave" for the full cross-repository command -> result record.

Verify branch, worktree, source, and connected device again before relying on this handoff.

## Unused module and dependency cleanup (2026-08-20, committed and locally merged)

- Scope: removed 14 generated UI/context files with no inbound runtime imports (`actionsheet`, `box`, `card`, `checkbox`, `fab`, `hstack`, `popover`, and the unused context barrel). Removed the no-op `expo-web-browser` config plugin and 11 redundant direct dependencies; transitive navigation/Gluestack/Expo packages required by retained code remain installed.
- Verification: `npx tsc --noEmit`, `npm run lint`, `npm run harness:check`, and `git diff --check` passed; lint retained five existing warnings in untouched profile/report/map files; serial Node tests reported 141 passed and 6 existing UI contract failures; `npx expo-doctor` passed 19/20 and reported only the pre-existing Expo SDK patch-version drift. Source/config reference scan found no deleted-module or removed-dependency references.
- Boundary: no API/shared contract, database, deployment, EAS/store release, native source behavior, or device state changed. Graphify was refreshed to 1,917 nodes, 3,083 edges, and 176 communities.
- Rollback: restore the deleted mobile files, app plugin line, package entries, and lockfile from pre-cleanup base commit `8922e56`; no API, database, native artifact, or persisted-data rollback is required.
- Status: cleanup commit `59f98f6` was created on `codex/unused-module-cleanup` and fast-forwarded locally into `master`; no EAS/native build, device release, backend deployment, database mutation, or secret output occurred.
- Next: resolve the existing six test failures and Expo patch drift separately; no publishing or deployment is part of this cleanup.

## Consumer multi-account review remediation (2026-08-25)

- Mobile approval now explicitly opens Email sign-in mode and link submission clears the password before the request begins, including failure paths.
- Focused auth/linked-account tests passed 10/10; TypeScript, lint (four existing warnings), harness, and diff checks passed. No release or deployment occurred.

## Consumer multi-account v3 report-queue remediation (2026-08-25)

- Scoped offline report drafts now fail closed if their identity, service account, or access revision no longer exactly matches server access. They remain visible as safe non-retryable failures; no R2 upload, revision upgrade, or evidence deletion occurs.
- Focused report/auth/account coverage passes 12/12; TypeScript, lint (four existing warnings), harness, and diff checks pass. No device, Expo, backend deployment, or release occurred.

## Consumer multi-account queue retry guard (2026-08-25)

- Focused queue coverage confirms stale/inaccessible drafts are replaced with retained non-retryable records. Queue sync submits only queued records, while retry rejects non-retryable records; protected evidence is not deleted on this path.
- The focused queue behavior passes 6/6 through the extracted access and visibility evaluators plus queue integration contract. No device, Expo/EAS, backend deployment, database operation, release, staging, or commit occurred.

## Consumer multi-account staff delivery compatibility (2026-08-26)

- Staff fixed ownership-delivery dedupe scoping, fail-closed mock setup guarding, and unlink writer locking. Mobile source, persisted queue/cache shapes, and payload readers are unchanged; no mobile test, device, Expo/EAS, or release action occurred in this staff-only remediation.
- Compatibility: delivery payload remains privacy-safe and unchanged (`context`, `requestId`, `decision`); existing mobile notification/account readers continue to work without a client release. Root owns aggregate cross-repository gates.

## Consumer multi-account consolidated aggregate evidence (2026-08-26)

- Status: complete. The staff pre-edit audit dispositioned all nine required categories and fixed exactly three confirmed defects: ownership delivery-key collisions, an unset-runtime mock-verification guard, and unlink request-lock revalidation.
- Mobile remains source-unchanged and payload-compatible. Its full suite is 168/174 with the same six unrelated baselines; TypeScript, harness, and diff checks pass, while lint has 0 errors and 4 existing warnings.
- Boundary: V13 makes this the completed thirteenth Sol/High review-remediation wave. No mobile code/tests, Graphify, database, deployment, EAS/device, staging, commit, push, merge, or release action occurred.

## Consumer multi-account V13 migration-shape gate compatibility (2026-08-26)

- Status: complete; authoritative post-V13 aggregate evidence is recorded.
- Scope: staff now fails closed on all 33 material consumer multi-account migration columns (consumer identities 9, memberships 5, requests 14, limiter 5), required unique indexes, and foreign-key endpoints/rules. No mobile payload, reader, cache, queue, or native behavior changed.
- Evidence: staff focused migration lifecycle coverage passed 8/8 and full lifecycle passed 392/392 with 0 failures; its guarded migration DB test explicitly skipped 1/1 and the full guarded DB bundle remains 3 explicit skips without the required disposable schema. Staff TypeScript, lint, build (4,589 modules; existing chunk advisory), harness, and scoped diff checks passed. No mobile suite or device work was required for this server-only shape gate.
- Boundary: this is the completed thirteenth Sol/High review-remediation wave. No mobile code/tests, Graphify, database, deployment, EAS/device, staging, commit, push, merge, or release action occurred.

## Consumer multi-account V14 setup replay compatibility (2026-08-26)

- Status: complete; final V14/root aggregate evidence is recorded.
- Scope: setup retains one idempotency key for its logical confirm/retry attempt and marks the request transport idempotent. The replacement/session token remains stored before session refresh. No mobile cache, queue, notification, payload, permission, or native behavior broadens authority. The final coordinated batch includes the staff lint typing correction and stale report-wrapper contract assertion update.
- Evidence: mobile full aggregate remains 168/174 with the same six unrelated pre-existing baselines: category sheet 55%, hotline keyboard/reduced motion, stale hotline cache visibility, Manila advisory range, image-only permission manifest, and responsive profile child UI. Focused auth/account/linking passed 18/18; TypeScript passed; lint had 0 errors/4 existing warnings; harness/scoped diff checks passed. The staff lifecycle aggregate recorded 394 tests: 393 passed and one transient `ER_NET_READ_INTERRUPTED` timeout in the related-incidents disposable DB test; its exact isolated retry passed 1/1. Child workflows passed 146/146, focused lifecycle passed 27/27, setup behavioral `tsx` passed 1/1, guarded disposable identity DB remains explicitly skipped/unexecuted without `CONSUMER_MULTI_ACCOUNT_DISPOSABLE_DATABASE`, and staff lint/build (4,589 modules; existing `>1200 kB` chunk advisory)/harness/scoped diff passed. Graphify was updated to staff 6,795 nodes/12,469 edges and mobile 2,011 nodes/3,379 edges.
- Boundary: browser, device, Expo/EAS, and release validation remain pending; no rollout is implied.

## Consumer multi-account V15 snapshot consistency and advisory identity-active compatibility (2026-08-26)

- Status: complete; root release-gate evidence is recorded.
- Scope: account-context assembly now requires equal identity and linked-account access revisions before it can publish cache/default/account/offline scope. It refetches one full pair after either mismatch order and otherwise fails closed. Legacy additive sole-account compatibility remains revision-zero. Staff now excludes a banned/non-consumer resolved identity before selecting its advisory Expo token, without changing unlinked legacy recipient behavior.
- Evidence: mobile full remains 168/174 with the same six unrelated pre-existing baselines: category sheet 55%, hotline keyboard/reduced motion, stale hotline cache visibility, Manila advisory range, image-only permission manifest, and responsive profile child UI. Snapshot behavior passed 4/4 and consumer-account contract coverage passed 9/9; TypeScript passed and lint had 0 errors/4 existing warnings. Post-V15 staff full lifecycle exited 0 end-to-end; child workflows passed 146/146, deployment topology 34/34, and advisory identity coverage 5/5; staff lint/build passed (4,589 modules; existing `>1200 kB` chunk advisory). Disposable DB integration remains 3 explicit skips without a configured schema. Graphify refreshed to staff 6,797 nodes/12,471 edges/477 communities and mobile 2,022 nodes/3,396 edges/180 communities. Both harnesses and scoped diff checks passed.
- Boundary: final fresh Sol review remains pending. Merge and deployment are newly authorized but have not been performed; browser/device, Expo/EAS, and release validation remain outstanding.
