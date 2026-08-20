# ALEConnect-Lineman Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a separate native Expo field application used only by the current Daily Field Crew leader to receive, execute, document, and synchronize ALEConnect assignments.

**Architecture:** Seed the new `aleconnect-lineman` repository from reusable infrastructure in `aleconnect-mobile`, then remove consumer-specific functionality. Field mutations are durable offline-first actions stored locally and synchronized idempotently against ALEConnect's crew-leader field API.

**Tech Stack:** Expo SDK 55, React Native 0.83, React 19, TypeScript 5.9, Expo Router, GlueStack UI v5, Uniwind/Tailwind, Expo SQLite, SecureStore, Location, Notifications, TaskManager, FileSystem, MapLibre React Native, NetInfo.

**Shared Spec:** `aymkopi/Aleconnect/docs/superpowers/specs/2026-08-20-field-operations-product-design.md`

## Global Constraints

- ALEConnect-Lineman is a separate application/repository from the consumer app.
- Reuse generic mobile infrastructure and design primitives; do not copy consumer workflows.
- Only the current active crew leader can perform field mutations.
- The app must remain useful offline after assignments are cached.
- Every mutation has a globally unique `actionId`; replay must be harmless.
- Location runs only while the user is the active on-duty crew leader or is covered by an assignment-specific approved holdover.
- GPS is supporting evidence, not sole proof of work.
- Push is primary assignment delivery; SMS fallback is server-owned.

---

## Task 1: Bootstrap the Separate App and Field Authentication Boundary

**Source:** current `aymkopi/aleconnect-mobile`

**New repository target:** `aymkopi/aleconnect-lineman`

**Files:**
- Create/adapt: `package.json`, `app.json`, `eas.json`, `index.ts`, `tsconfig.json`, `eslint.config.js`, `global.css`
- Copy/adapt: reusable `src/components/ui/**`, theme/provider utilities, `src/services/api.ts`, auth context/hooks
- Create: `src/models/auth.ts`, `src/app/sign-in.tsx`, `src/app/not-assigned.tsx`
- Test: `tests/app-boundary.test.mjs`, `tests/field-auth.test.mjs`

**Produces:** a buildable independent app with SecureStore auth and crew-leader-only bootstrap.

- [ ] Create the new repo from the current mobile baseline, rename Expo identity/bundle IDs, add `typecheck`/`test` scripts, and add Expo SQLite without upgrading unrelated dependencies.
- [ ] Remove consumer routes/features (report submission/history, hotlines, advisories, consumer applications/onboarding/profile-specific flows) while retaining generic UI, networking, location, notifications, storage, and map infrastructure.
- [ ] Adapt `AuthUser` to lineman access and add `GET /api/field?action=bootstrap`; interpret `not_lineman | not_on_duty | not_crew_leader | crew_inactive` into the `not-assigned` screen.
- [ ] Keep existing bearer token, request ID, timeout, retry, 401 invalidation, and SecureStore behavior.
- [ ] Verify `npm run test`, `npm run typecheck`, `npm run lint`, Android export, then commit `chore: bootstrap ALEConnect Lineman app`.

---

## Task 2: Define Field Domain State and Durable SQLite Storage

**Files:**
- Create: `src/models/field.ts`
- Create: `src/features/jobs/field-workflow.ts`
- Create: `src/services/field-db-schema.ts`
- Create: `src/services/field-db.ts`
- Test: `tests/field-workflow.test.mjs`, `tests/field-db-contract.test.mjs`

**Produces:** local state-machine semantics and durable cached crew/Trip/action storage.

- [ ] Define Trip and work-item statuses plus field action types: acknowledge, start travel, arrive, start/pause/resume/complete work, handoff, holdover, and crew-change report.
- [ ] Implement/test a pure local transition evaluator; it drives optimistic UX only while the server remains authoritative.
- [ ] Add versioned SQLite tables: `cached_crew`, `cached_trips`, `cached_trip_items`, `pending_actions`, `pending_evidence`, `sync_metadata`.
- [ ] Make `pending_actions.action_id` the primary key and persist each action atomically before showing success.
- [ ] Verify duplicate `actionId` is harmless and app restart preserves queue/state, then commit `feat: add durable field domain storage`.

---

## Task 3: Implement Offline Sync, Reconciliation, and Evidence Queue

**Files:**
- Create: `src/services/field-sync.ts`
- Create: `src/context/field-sync-context.tsx`
- Create: `src/hooks/use-field-sync.ts`
- Create: `src/services/field-evidence.ts`
- Create: `src/components/field/sync-status.tsx`
- Create: `src/features/jobs/components/evidence-grid.tsx`
- Test: `tests/field-sync.test.mjs`, `tests/evidence-queue.test.mjs`

**Produces:** one durable offline queue for lifecycle actions and evidence with server reconciliation.

- [ ] Batch pending actions to `POST /api/field` in creation order and handle per-action accepted/rejected results plus canonical server state/cursor.
- [ ] Trigger sync on foreground, network restoration, manual retry, and permitted background opportunities; retrying after timeout must reuse the same action IDs.
- [ ] Show `All synced | Updates pending | Syncing | Needs attention`; offline after successful local persistence is **Pending sync**, not failure.
- [ ] Persist captured evidence in app-managed FileSystem storage, track `local | uploading | uploaded | failed`, upload independently, then reference finalized server evidence IDs in completion/handoff actions.
- [ ] Test complete offline action+evidence flow and duplicate batch replay, then commit `feat: add offline field sync and evidence`.

---

## Task 4: Build the Field App Shell and Crew Context

**Files:**
- Create: `src/app/_layout.tsx`
- Create: `src/app/(tabs)/_layout.tsx`
- Create: `src/app/(tabs)/home.tsx`
- Create: `src/app/(tabs)/jobs.tsx`
- Create: `src/app/(tabs)/crew.tsx`
- Create: `src/components/field/duty-status-banner.tsx`
- Create: `src/components/field/current-assignment-card.tsx`
- Create: `src/components/field/crew-summary-card.tsx`

**Produces:** task-first `Home | Jobs | Crew` navigation using the existing mobile design language.

- [ ] Home information order: duty/crew state -> current job -> one primary next action -> upcoming jobs -> sync state.
- [ ] Jobs groups `Current`, `Next`, and `Completed today`; Crew is operationally read-only and shows leader, members, duty window, status, and jobs completed.
- [ ] Add `Report crew change` entry point without allowing the leader to silently rewrite the official roster.
- [ ] Reuse GlueStack/Uniwind/Satoshi semantic tokens, 16px screen gutter, 16px card padding, 24px section gaps, and >=48x48 controls; pair status color with icon+text.
- [ ] Verify keyboard/screen-reader labels, reduced motion, dark/light mode, then commit `feat: add field application shell`.

---

## Task 5: Build Assignment and Work-Item Execution UX

**Files:**
- Create: `src/app/job/[tripId].tsx`
- Create: `src/features/jobs/components/work-status-stepper.tsx`
- Create: `src/features/jobs/components/primary-work-action.tsx`
- Create: `src/features/jobs/components/job-location-card.tsx`
- Create: `src/features/jobs/hooks/use-field-action.ts`
- Test: `tests/work-action-gates.test.mjs`

**Produces:** one state-appropriate primary action and locally durable field progression.

- [ ] Map states to one primary action: `sent -> Accept assignment`, `pending -> Start travel`, `en_route -> I've arrived`, `arrived -> Start work`, `in_progress -> Complete work`, `paused -> Resume work`.
- [ ] On tap: generate action ID -> capture event time/location when available -> SQLite transaction -> optimistic state -> pending sync; never wait on network before local success.
- [ ] Show incident title, memo/trip references, priority, address/map context, current stop, and queue position without consumer-facing clutter.
- [ ] GPS permission/unavailability produces a visible supporting-evidence warning but does not erase a valid field action.
- [ ] Verify all transitions with network disabled and commit `feat: add field job execution workflow`.

---

## Task 6: Add Pause, Completion, Handoff, Holdover, and Crew-Change Gates

**Files:**
- Create: `src/features/jobs/components/pause-reason-sheet.tsx`
- Create: `src/features/jobs/components/completion-sheet.tsx`
- Create: `src/features/jobs/components/handoff-sheet.tsx`
- Create: `src/features/jobs/components/holdover-request-sheet.tsx`
- Create: `src/features/crew/report-crew-change-sheet.tsx`
- Create: `src/features/jobs/validation/completion-requirements.ts`
- Test: `tests/field-exception-actions.test.mjs`, `tests/completion-gates.test.mjs`

**Produces:** structured reliability gates instead of free-form status changes.

- [ ] Pause requires structured reason; completion requires work performed, resolution, time, location when available, and job-type-required evidence.
- [ ] Handoff captures reason, work completed, work remaining, site condition/requirements, evidence, and mode intent (`immediate` or `carryover`); server decides authoritative availability/assignment.
- [ ] Holdover requires requested-until and reason and shows pending/approved/denied state.
- [ ] Crew change reports notify Dispatch but never directly mutate official membership.
- [ ] Verify invalid/missing gate data never queues an action, then commit `feat: add field completion and exception gates`.

---

## Task 7: Add On-Duty Adaptive Background Location

**Files:**
- Create: `src/services/field-location.ts`
- Create: `src/tasks/field-location-task.ts`
- Create: `src/hooks/use-field-location.ts`
- Create: `src/components/field/location-sharing-status.tsx`
- Test: `tests/location-policy.test.mjs`

**Produces:** leader-device telemetry tied to actual operational authority.

- [ ] Implement/test `resolveTrackingPolicy(context)` with: not current leader -> off; on-duty idle -> low frequency; en route/working -> higher frequency; workflow event -> immediate sample.
- [ ] Register the Expo background task and batch points into normal field sync rather than sending one request per GPS callback.
- [ ] Stop tracking on sign-out, crew closure, leader replacement, or duty expiry unless assignment-specific approved holdover remains valid.
- [ ] Show clear `Location sharing on/off/unavailable` and last-sample state; location denial must not block queued work actions.
- [ ] Verify permission revocation, app restart, leader replacement, and battery-conscious idle behavior, then commit `feat: add on duty field location tracking`.

---

## Task 8: Add Push Assignment Routing and Operational Receipts

**Files:**
- Create/adapt: `src/services/push-notifications.ts`
- Create: `src/hooks/use-field-notifications.ts`
- Modify: `src/app/_layout.tsx`
- Add receipt/status presentation to Home/Job screen as needed
- Test: `tests/notification-routing.test.mjs`

**Produces:** app-first assignment delivery without confusing notification receipt with acknowledgment.

- [ ] Register the ALEConnect-Lineman Expo token against the field user/device and deep-link assignment notifications to `/job/:dispatchTripId`.
- [ ] Receiving/opening a push never queues `ASSIGNMENT_ACKNOWLEDGED`; only tapping `Accept assignment` does.
- [ ] Surface server delivery context where useful (`Push sent`, `SMS fallback used`) while keeping the field action state authoritative.
- [ ] Ensure notification handling refreshes cached assignment state without destroying unsynced local actions.
- [ ] Verify foreground/background/cold-start routing, then commit `feat: add field assignment notifications`.

---

## Task 9: Harden Pilot Scenarios and Production Boundaries

**Files:**
- Create: `docs/field-pilot-checklist.md`
- Create/update: `PRODUCT.md`, `README.md`
- Add focused regression tests discovered during pilot verification

**Produces:** a releasable field client with explicit operational failure coverage.

- [ ] Verify: cached assignment -> disconnect -> travel -> arrive -> work -> evidence -> complete -> restart app -> reconnect -> exactly-once server sync.
- [ ] Verify old leader loses mutation authority after transfer while historical local/server events remain attributed correctly and the replacement leader can continue.
- [ ] Verify no active crew/no duty/ordinary crew member routes to non-operational state; location permission revocation does not lose work; rejected server action becomes actionable `Needs attention` rather than silent deletion.
- [ ] Verify carryover/holdover status refresh, notification deep links, evidence retry, and no consumer-only route/module leakage.
- [ ] Run `npm run test`, `npm run typecheck`, `npm run lint`, Android/iOS exports, document pilot checklist, then commit `test: harden ALEConnect Lineman field workflows`.

## Execution Order

Tasks 1-3 establish the independent app, state model, and offline reliability. Tasks 4-6 deliver the field workflow. Tasks 7-8 add telemetry/delivery. Task 9 is the release gate. ALEConnect server plan Tasks 1-5 should exist before end-to-end completion of Lineman Tasks 3-6.