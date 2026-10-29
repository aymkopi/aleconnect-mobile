# Ticket Closure and Offline Reporting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retire follow-up, close resolved tickets through rating/Staff/24 hours, and support native offline maps and report creation.

**Architecture:** Staff remains authoritative for lifecycle, receipts and access. Add a durable per-ticket deadline and compatible policy reads; keep old receipts and stored communications. Mobile reuses PanelUI, the existing persistent report queue and installed MapLibre offline manager.

**Tech Stack:** TypeScript, MySQL/mysql2, Cloudflare Workers, React/Vite, Expo/React Native, AsyncStorage and MapLibre Native.

**Spec:** `docs/superpowers/specs/2026-10-29-ticket-closure-offline-design.md` (approved by the user).

## Global Constraints

- Billing excluded. No production writes/deployment/distribution/installation in this implementation scope.
- Rating stays optional and cannot be edited; existing Resolved tickets get 24 hours from rollout.
- Full Albay pack during onboarding; protect existing users' offline drafting and public emergency contacts.
- No private queue/receipt deletion, account retargeting, global map purge, signer change or unrelated primary edit.
- Preserve old payload hashes/receipt replay. Cache never grants business authority.
- Root executes lifecycle/rating and integration; independent account-cache/map workers follow dispatching-parallel-agents with disjoint ownership. User explicitly approved proceeding. Do not ask again for routine implementation decisions covered by the design.

## Review Focus

- Rating, Staff close and timeout race: one transition/receipt; siblings and active redispatch remain untouched (Tasks1–2).
- Old offline update/rating receipts: replay original results, reject only new retired work, preserve saved intent (Tasks2–3).
- Account switch/revocation during cache hydration: no cross-principal data or submission; fresh access before retry (Task4).
- Full pack interrupted/backgrounded or storage constrained: retain original pack/form and never mark a partial pack Ready (Task5).
- Eastern Albay/islands and cold offline fonts/icons: real boundary coverage and usable map after process restart (Task5).

### Task 1: Durable closure policy, migration and maintenance

**Files:** create `api/_lib/ticket-closure.ts`, `api/_lib/ticket-closure-schema.ts`, `scripts/apply-ticket-closure.mjs`, `tests/lifecycle/ticket-closure.test.mjs`, `tests/lifecycle-db/ticket-closure.test.mjs`; modify `api/_lib/consumer-feature-flags.ts`, `api/_lib/incident-lifecycle.ts`, `worker/maintenance/ticket-push.ts` and runtime typing as needed.

**Interfaces:** `ticketClosureEnabled(environment?) -> boolean`; `closeResolvedTicket(connection, {ticketId,serviceAccountId?,source,actorId?,reason,now,onlyIfDue?})` locks canonical memo/membership/ticket state and returns whether it changed; `processTicketClosures(pool,{limit?,now?}) -> {closed,skipped}`. Policy read exposes `{version:1,closesAt,cycleId,canRate}`.

- [x] Add failing tests for exact24-hour deadline, legacy grace from one rollout instant, non-Resolved immunity, sibling isolation, duplicate/repeated close and an active memo mismatch. Run `node --test tests/lifecycle/ticket-closure.test.mjs`; require the new missing-policy assertions to fail.
- [x] Inspect actual schema read-only. Add nullable `tickets.close_due_at DATETIME(3)` and `(status,close_due_at)` index using the existing target/snapshot-gated explicit migration pattern; separate additive schema and authorized activation backfill. Empty rollback refuses used state. Stamp deadlines in every real resolution transaction while policy is active.
- [x] Implement policy helper and bounded scheduled closure, including history/audit/status notification and parent closure only when all linked tickets are Closed. Replace old timer scheduling when the new policy is enabled; preserve rollback/off behavior.
- [x] Re-run focused policy tests and disposable-schema migration/closure/race tests; no live DDL/DML. Commit scoped source with `[skip ci]` when green.

### Task 2: Rating closure, follow-up retirement and Staff UI

**Files:** modify `api/_lib/consumer-feedback.ts`, `api/_lib/consumer-report-updates.ts`, `api/mobile/complaint-updates.ts`, `api/mobile/complaints.ts`, `api/mobile/feedback.ts`, `api/ticket-consumer-updates.ts`, `api/service-memos.ts`, affected push-eligibility readers, Staff consumer review/Service Memo/detail UI and existing contract tests.

**Interfaces:** new rating input adds `closurePolicyVersion:1` and retains original ticket/cycle/account/access/mutation identity; new ratings no longer require a positive resolution answer. Existing report/update reads add `closurePolicy`; legacy fields/receipts remain. New follow-up mutations fail with `FOLLOWUP_RETIRED` only after exact receipt replay.

- [x] Add failing tests for rating without a resolution answer, optional rating on Closed, rating/timeout concurrency, exact old replay and new retired upload/reply/reopen rejection. Include permissions and grouped-ticket assertions.
- [x] Reuse Task1 closure helper inside the rating transaction; keep original receipt hashing for legacy inputs. Advertise non-writable historical updates, suppress unsent obsolete follow-up reminders and hide retired Staff queue/composer/reopen controls when policy is active.
- [x] Run focused lifecycle/disposable-DB tests, scoped lint and Staff build. Check Staff UI with mocked data; no live ticket commands. Commit green source with `[skip ci]`.

### Task 3: Mobile rating and report details

**Files (Mobile):** modify `src/features/reports/consumer-updates-contract.ts`, `consumer-rating-action.tsx`, `consumer-updates-section.tsx`, `report-detail-screen.tsx`, `service-feedback-section.tsx`, rating service/queue/cache and status-stepper readers; add focused policy/flow tests.

**Interfaces:** normalize optional `closurePolicy:{version:1,closesAt:string|null,cycleId:string|null,canRate:boolean}`; pass `closurePolicyVersion:1` through immutable rating intent/receipt validation. Old server payloads remain readable.

- [x] Add failing normalization/flow tests: direct optional sheet, one immutable score, no follow-up composer/question/cycle label under the new policy, no false Closed projection on uncertain rating, and preserved old saved intent.
- [x] Reuse PanelUI rating sheet, score acknowledgement/3-second close, appbar score/star, and existing New report route. Add concise closure deadline/read-only legacy behavior without relaying out Ticket details.
- [x] Run focused tests/types/scoped lint and actual-screen rendered Light/Dark phone/tablet cases. Commit green source with `[skip ci]`.

### Task 4: Persistent account snapshots and offline report gates

**Files (Mobile):** create `src/services/consumer-account-cache.ts`; modify `src/context/consumer-account-context.tsx`, `src/hooks/use-consumer-profile.ts`, `src/features/reports/new-report-screen.tsx`, auth/cache invalidation and linked-account refresh callers; add `tests/consumer-account-cache.test.mjs` and focused offline-report regressions.

**Interfaces:** `readConsumerAccountCache(principalId,now?)`, `writeConsumerAccountCache(principalId,value,now?)`, `clearConsumerAccountCache(principalId?)`; validated snapshot preserves identity, authorized IDs, default and revision. Context exposes whether its current data is cached/stale, while queue sending still reads fresh server authority.

- [x] Add failing storage/race tests for cold offline restart, multiple accounts, corrupt/expired snapshots, fresh empty/revoked state, sign-out/principal/revision changes and late read completion. Pin usable cached-profile plus network failure behavior.
- [x] Hydrate before refreshing, retain usable data on transport failure only, clear on explicit authorization rejection, warm existing scoped profile/metadata caches, and unblock offline drafting with a concise notice. Preserve original queue identities/evidence and current retry/discard protections.
- [x] Run focused tests and complete Mobile types/scoped lint; render cached account selection and save/reconnect journeys using fixtures. Commit green source with `[skip ci]`.

### Task 5: Full Albay native pack and mandatory setup

**Files (Mobile):** create `src/services/offline-maps.ts`, `src/services/offline-map-native.ts`, `src/features/maps/offline-map-setup.tsx` and bundled app-owned style; modify map runtime/picker/static-map, onboarding/setup/profile-entry readers and report boundary helper. Modify the corresponding Staff coordinate validation. Add `tests/offline-maps.test.mjs` and shared boundary checks.

**Interfaces:** device-wide pack manager `restore/start/pause/resume/status` retains one full-Albay native pack ID/style version. State is `missing|downloading|paused|failed|ready`; ready requires actual native completion. A stable local style is used by both pack and native map readers.

- [x] Add failing manager tests for restart/resume without duplicate packs, partial completion, mobile-data consent, storage failure, capability absence and all720 barangay extent extremes.
- [x] Use installed MapLibre OfflineManager; persist local style and offline resources with full Albay coverage/native source detail. Inspect current source metadata and measure the pack before fixing exact budgets. Keep attribution; handle network-only search gracefully. Adapt only required existing native safeguards and validate Android/iOS independently.
- [x] Start during account setup on Wi-Fi (explicit mobile consent otherwise); show one compact progress/error item, retain entered form state, gate new native onboarding on real completion, and preserve existing offline drafting. Reuse component contracts/design tokens.
- [ ] Run focused tests/types/lint, native configuration/Doctor/export/build checks, rendered setup states and cold native offline map/readback where an authorized test device is available. State platform/provider limits honestly. Commit green source with `[skip ci]`.

### Task 6: Integration, review and handoff

**Files:** paired contract snapshots, `PRODUCT.md` where affected, task/active-work/history, migration/rollback runbook and this plan.

- [ ] Run all relevant Staff policy/auth/replay/DB tests and build; full Mobile suite/types/scoped lint; paired harness and whitespace checks. Refresh Graphify separately, preserving prior churn.
- [ ] Obtain one fresh read-only whole-change review with plan/spec, verified tests and rulings. Reproduce/fix important findings with focused failing tests, then rerun affected/full checks.
- [ ] Record source-only completion, exact migration/activation order and still-unverified physical-device/iOS/provider work. Preserve all original artifacts/queues. Do not push/deploy/install without separately authorized scope.

Implementation checkpoint: source and local tests are verified; final independent review is pending. Physical-device map/setup acceptance and iOS native compilation are not established by JS exports/Kotlin tests. Expo Doctor20/21 passes with the same seven existing patch-version drifts; dependencies are preserved. Graphify refresh is blocked by its inaccessible configured Python launcher.
