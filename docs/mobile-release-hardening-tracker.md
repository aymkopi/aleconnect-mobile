# Aleconnect Mobile Release Hardening Tracker

Plan: `docs/mobile-release-hardening-plan.md`

Status values: `pending`, `in_progress`, `complete`, `deferred`, `blocked`.

| ID | Requirement | Status | Required proof |
| --- | --- | --- | --- |
| S-01 | Single-device Expo token ownership and logout revocation | complete | Behavioral API tests plus account-switch device test |
| S-02 | SecureStore bearer token and backup exclusions | complete | Unit/config checks plus rebuilt Android app |
| S-03 | Consumer-scoped request deduplication and async generation guards | complete | Account-switch race test |
| S-04 | Atomic local queue writes and consumer-scoped sync | complete | Concurrent enqueue/sync tests |
| S-05 | Private R2 evidence with authenticated short-lived reads | complete | Unauthorized denial, owner success, image render test |
| R-01 | Backend metadata-driven report field rules | complete | Meta contract test |
| R-02 | Versioned Aiven MySQL JSON report details migration | complete | Backup, migration, schema verification |
| R-03 | Distinct category/type Others descriptions | complete | Mobile and API validation tests |
| R-04 | KWHM current/requested registered-name validation | complete | Empty/equal/different-name tests |
| R-05 | Input limits and aligned 5,000,000-byte evidence limit | complete | Boundary tests |
| R-06 | Albay pin and barangay/PSGC consistency | complete | Coordinate and mismatch API tests |
| R-07 | Cursor pagination, default 25 and max 50 | complete | API pagination tests |
| R-08 | Consumer-safe report timeline | complete | Privacy contract test |
| R-09 | Local queued evidence and remote submitted evidence transition | complete | Offline-to-online device test |
| R-10 | Report Details static map, evidence viewer, status and copy cleanup | complete | Device screenshots and navigation test |
| R-11 | One archive entry with queued reports clearly separated | complete | Route/UI test |
| A-01 | Consumer active-advisory API with targeting/privacy | complete | API audience tests |
| A-02 | Home advisory preview plus feed/detail routes | complete | Device navigation and empty/loading/error tests |
| A-03 | One-minute scheduled publication | complete | Worker cron test and deployed smoke check |
| A-04 | Durable ticket/advisory notification rows and push retries | complete | Outbox retry/receipt tests |
| A-05 | Consumer-only notification copy and advisory navigation | complete | Privacy and routing tests |
| O-01 | Best-effort OS background report synchronization | complete | Android WorkManager registration and device test |
| O-02 | Persisted in-app completion notice after background success | complete | Background completion restoration test |
| O-03 | Request timeouts, safe GET retries, refresh cooldowns, stale indicators | complete | Network/cache tests |
| U-01 | Unified keyboard-aware Gorhom bottom sheets and reliable close actions | deferred | Keyboard avoidance passed; close-icon follow-up deferred by user |
| U-02 | Notification Settings autosave and OS permission state | complete | Device permission/settings tests |
| U-03 | Compact safe-area toast and foreground notification refresh | complete | Device visual test |
| U-04 | Avatar fallback correctness | complete | Image success/error test |
| U-05 | Theme, contrast, touch targets, reduced motion, accessibility labels | complete | Static audit plus light/dark device screenshots |
| P-01 | Cursor-backed virtualized report and notification lists | complete | Large-list render check |
| P-02 | Production API origin fails closed and uses HTTPS | complete | Build/config test |
| P-03 | Documentation, behavioral tests, builds, migration, deploy, device verification | complete | Final verification log |

## Verification Log

- 2026-07-28 baseline: mobile TypeScript, lint, Expo Doctor, and 33 tests passed.
- 2026-07-28 baseline: backend build and 15 focused mobile/lifecycle tests passed.
- 2026-07-28 baseline: live R2 evidence objects returned valid WebP responses.
- 2026-07-28 audit: concurrent queue write and cross-account request races reproduced.
- 2026-07-28 implementation: SecureStore migration, keyed request registry, serialized queue writes, token-pinned submission, Expo background task, and persisted completion notices compile; focused tests pass.
- 2026-07-28 implementation: active-advisory cache/feed/detail, cursor-backed notification SectionList, foreground invalidation, safe GET retry, refresh cooldown, and Android/iOS backup exclusions have focused passing tests.
- 2026-07-28 implementation: conditional report fields, KWHM validation, Albay/PSGC checks, 1-3 evidence policy, static report map, authenticated image UI, unified archive/queue, adaptive keyboard-aware sheets, settings autosave, avatar fallback, 12px global radius, and semantic theme controls pass all 53 mobile tests, TypeScript, lint, and all 19 Expo Doctor checks.
- 2026-07-28 implementation: home, advisory, notification, and report archive screens reject late results from a previously authenticated consumer; the account-switch regression test passes.
- 2026-07-28 backend: Aiven backup-first migration verified `tickets.report_details` as JSON and the category/type rule flags as `tinyint(1)`; live DB lifecycle tests passed 46/46.
- 2026-07-28 storage: 9 referenced evidence objects were copied and byte-verified in private APAC bucket `aleconnect-private`, then removed from the public bucket. Both `r2.dev` endpoints are disabled; a migrated key returned `200 image/webp` through a signed private URL and `404` through the public asset domain.
- 2026-07-28 production: API Worker version `ff05f7f1-cb29-489d-ada7-b0f72fd93430` deployed with one-minute cron. Production report smoke passed login, metadata, private upload, ticket insert, DB-generated ticket number, owner detail, signed evidence, and cleanup verification.
- 2026-07-28 final automation: mobile 53/53 tests, TypeScript, lint, and Expo Doctor 19/19; backend lifecycle 100/100, deployment 14/14, child workflow 89/89, data-table 38/38, live DB 46/46, scoped lint, and production build passed.
- 2026-07-28 cron observation: live Worker tail produced no event before its 90-second command timeout; trigger deployment and worker behavior are verified by Wrangler deployment output and automated tests.
- 2026-07-28 native build: Expo Android prebuild and Gradle `assembleDebug` passed; generated APK is 291,671,215 bytes. Production Metro exports passed for Android (4,446 modules) and iOS (4,428 modules). Metro discarded an unreadable cache and completed full crawls successfully.
- 2026-07-28 completion restoration: executable tests verify report completion deduplication, 50-item retention, and per-consumer consume/retain behavior; focused tests, TypeScript, and lint pass.
- 2026-07-28 physical device: wireless Android device `25069PTEBG` ran the native debug build. Home advisory preview, feed, detail, back navigation, cached reports, archive search/sort/filter, adaptive report type sheet, map gestures, current location, required-field flow, and keyboard avoidance were exercised.
- 2026-07-28 offline transition: private DNS interruption preserved ADB while forcing a report into “Saved on this device.” Restoring DNS and retrying promoted it to official ticket `ALECO-260728-00056`; the archive count changed from 6 to 7.
- 2026-07-28 private evidence: the new ticket detail rendered the submitted door photo through its authenticated signed R2 URL, alongside a static MapLibre marker and consumer-safe “Under Review” timeline entry.
- 2026-07-28 submission contract fix: removed the retired generic `description` payload and strips it from legacy queued drafts. The already-saved report retried successfully without re-entry; focused queue/contract tests, TypeScript, and lint passed.
- 2026-07-29 native rebuild: `npx expo run:android --device 25069PTEBG` built, installed, launched Metro on port 8081, and loaded the authenticated app on the wireless Android device.
- 2026-07-29 background sync: Android WorkManager registered and executed the Expo background task with connectivity constraints and the persisted 15-minute minimum interval.
- 2026-07-29 session replacement: production smoke verified old-session `401`, current-session `200`, and sign-out revocation. A second login invalidated the physical device session; its next refresh redirected to Sign in with the expected another-device message, and device login restored access.
- 2026-07-29 device UI: notification settings autosaved with OS permission allowed, the profile avatar rendered without fallback initials, and fixed Light/Dark plus restored Auto theme modes rendered without clipping or contrast regressions.
- 2026-07-29 toast: a foreground Expo push rendered the compact responsive toast within 16px screen margins with a single-line title and bounded body.
- 2026-07-29 bottom sheets: Gorhom interactive keyboard handling now uses Android `adjustPan`; the profile sheet moved to keep its focused input and actions above the keyboard while retaining a 55% maximum dynamic size. Further close-icon debugging was explicitly deferred by the user.
- 2026-07-29 SDK alignment: React Native was updated from `0.83.6` to Expo 55's expected `0.83.10`; Expo Doctor passed 19/19 afterward.
- 2026-07-29 final rebuild: `npx expo run:android --device 25069PTEBG --no-bundler` completed a clean native rebuild in 8m10s, installed the APK, and the restarted Metro dev client loaded the authenticated Home screen.
- 2026-07-29 final checks: mobile 56/56 tests, TypeScript, lint, Expo Doctor 19/19, production single-device smoke, and the Aleconnect backend production build all passed.
