# ALEConnect Mobile API Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verify every ALEConnect Mobile module against the current Staff-owned API and repair only reproduced compatibility or runtime defects in the Android development client.

**Architecture:** Keep Staff as the authoritative API owner and reuse the existing mobile request, parsing, storage, queue, and synchronization paths. Work through one contract matrix and four bounded verification/repair slices, with test-first fixes and current Android evidence against `https://api.aleconnect.app`.

**Tech Stack:** Expo 55, React Native 0.83, TypeScript, Node test runner, Expo SecureStore, AsyncStorage, NetInfo, MapLibre, Expo Notifications, Staff Vite/Cloudflare Worker routes, Android ADB.

**Spec:** `docs/superpowers/specs/2026-09-13-mobile-api-refresh-design.md`

## Global Constraints

- This plan contains exactly five tasks. Setup, tests, documentation, and commits stay inside their owning task.
- Work only in `C:/Users/Justine/VSCodeProjects/aleconnect-mobile-api-refresh` on `codex/mobile-api-refresh`.
- Treat `C:/Users/Justine/VSCodeProjects/aleconnect` as the authoritative Staff sibling and preserve its unrelated dirty state.
- If a Staff defect is reproduced, create a separate adjacent Staff worktree on `codex/mobile-api-refresh-server` and keep its additive fix, tests, and evidence inside the owning Task 2, 3, or 4; do not create a sixth task or edit dirty Staff `main`.
- Run the development client against `https://api.aleconnect.app`; do not deploy Staff, mutate a database, publish an OTA update, run EAS, or submit to a store.
- Ordinary current-account consumer writes are authorized. Snapshot and restore reversible Profile and notification settings.
- Clearly label submitted reports as tests. Do not invent a real outage or safety event.
- Do not change passwords without disposable credentials. Do not guess account-link credentials.
- Keep ownership server-side and private caches scoped by identity, account, access revision, and filter context.
- Add no dependency and no parallel API/cache abstraction.
- Every product fix starts with a failing behavior-level regression and ends with focused plus sibling verification.
- Record passed, baseline-failing, blocked, and unverified results separately. iOS remains unverified without an iOS device and credentials.

When an owning task proves a Staff defect, create or reuse its isolated server worktree with:

```powershell
$serverWorktree = 'C:\Users\Justine\VSCodeProjects\aleconnect-mobile-api-refresh-server'
if(-not (Test-Path -LiteralPath $serverWorktree)) {
  git -C ..\aleconnect show-ref --verify --quiet refs/heads/codex/mobile-api-refresh-server
  $serverBranchExists = $LASTEXITCODE -eq 0
  if($serverBranchExists) {
    git -C ..\aleconnect worktree add $serverWorktree codex/mobile-api-refresh-server
  } else {
    git -C ..\aleconnect worktree add $serverWorktree -b codex/mobile-api-refresh-server main
  }
}
```

---

### Task 1: Freeze the API-to-module contract matrix and clean baseline

**Files:**

- Create: `docs/implementation/2026-09-13-mobile-api-refresh-matrix.md`
- Inspect: `../aleconnect/vite.config.ts`
- Inspect: `../aleconnect/worker/index.ts`
- Inspect: `../aleconnect/api/mobile/**/*.ts`
- Inspect: `src/services/*.ts`
- Inspect: `src/app/**/*.tsx`
- Inspect: `tests/*.test.mjs`
- Inspect: `tests/*.test.ts`

**Interfaces:**

- Consumes: Staff route prefixes and handler method contracts; mobile service request paths; current production API origin.
- Produces: One matrix row per route group with Staff owner, mobile reader, state owner, screen, focused checks, and device journey. Tasks 2-5 update only their result columns.

- [ ] **Step 1: Reconfirm isolated state and connected runtime without changing either canonical checkout**

Run:

```powershell
git status --short --branch
git -C ..\aleconnect status --short --branch
git worktree list --porcelain
adb devices -l
adb -s 192.168.1.31:41667 shell pidof com.kapecakes.aleconnectmobile
adb -s 192.168.1.31:41667 reverse --list
```

Expected: mobile branch is `codex/mobile-api-refresh`; Staff dirty files remain untouched; wireless device is connected; existing client/Metro state is recorded.

- [ ] **Step 2: Create the matrix with the complete current route inventory**

Create `docs/implementation/2026-09-13-mobile-api-refresh-matrix.md` with these rows and columns:

```markdown
# Mobile API Refresh Matrix

API target: https://api.aleconnect.app
Branch: codex/mobile-api-refresh

| Route group | Methods | Staff handler | Mobile reader | State owner | Screen/journey | Automated result | Device result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/api/auth/*` | POST/GET | `api/auth/[...all].ts` | `src/services/auth.ts`, `src/services/api.ts` | SecureStore session | Sign in/out/session | Task 1 baseline | Task 2 journey |
| `/api/mobile/auth/change-password` | POST | `api/mobile/auth/change-password.ts` | `src/services/auth.ts` | session | Required-password screen | Task 2 focused gate | Restricted: disposable credentials required |
| `/api/mobile/consumer-identity` | GET/POST | `api/mobile/consumer-identity.ts` | `src/services/consumer-identity.ts` | identity/access snapshot | Email setup and app bootstrap | Task 2 focused gate | Task 2 journey |
| `/api/mobile/linked-accounts` | GET/PATCH | `api/mobile/linked-accounts.ts` | `src/services/linked-accounts.ts` | identity/account/revision | Profile accounts | Task 2 focused gate | Task 2 journey |
| `/api/mobile/account-link-requests` | GET/POST | `api/mobile/account-link-requests.ts` | `src/services/account-link-requests.ts` | identity/access revision | Link-account request | Task 2 focused gate | Valid supplied credentials required |
| `/api/mobile/profile` | GET/PATCH | `api/mobile/profile/index.ts` | `src/services/profile.ts` | selected account/revision | Profile details/address | Task 2 focused gate | Task 2 journey |
| `/api/mobile/profile/avatar-*` | POST/PUT/POST | `api/mobile/profile/avatar-upload.ts`, `avatar-complete.ts` | `src/services/profile.ts` | selected account/revision | Profile avatar | Task 2 focused gate | Task 2 journey |
| `/api/mobile/complaints/meta` | GET | `api/mobile/complaints.ts` | `src/services/reports.ts` | bounded metadata cache | New report form | Task 3 focused gate | Task 3 journey |
| `/api/mobile/complaints` | GET/POST | `api/mobile/complaints.ts` | `src/services/reports.ts`, `report-queue.ts` | identity/account/revision caches | Recent, Archive, submit | Task 3 focused gate | Task 3 journey |
| `/api/mobile/complaints/:id` | GET | `api/mobile/complaints.ts` | `src/services/reports.ts` | scoped detail cache | Report detail/history/map | Task 3 focused gate | Task 3 journey |
| `/api/mobile/complaints/evidence-upload` | POST/PUT | `api/mobile/complaints.ts` | `src/services/reports.ts` | protected local evidence | Evidence picker/upload | Task 3 focused gate | Task 3 journey |
| `/api/mobile/advisories` | GET | `api/mobile/advisories.ts` | `src/services/advisories.ts` | identity/revision cache | Home/feed/detail | Task 4 focused gate | Task 4 journey |
| `/api/mobile/notifications` | GET/POST | `api/mobile/notifications.ts` | `src/services/notifications.ts` | identity/revision/filter cache | Feed/read/navigation | Task 4 focused gate | Task 4 journey |
| `/api/mobile/push-notifications` | GET/POST | `api/mobile/push-notifications.ts` | `src/services/notification-settings.ts` | user settings cache | Push settings/token | Task 4 focused gate | Task 4 journey |
| `/api/mobile/hotlines` | GET | `api/mobile/hotlines.ts` | `src/services/hotlines.ts` | public bounded cache | Search/category/contact | Task 4 focused gate | Task 4 journey |
```

- [ ] **Step 3: Verify route registration and current cross-project contracts**

Run:

```powershell
rg -n 'prefix: "/api/mobile|startsWith\("/api/mobile' ..\aleconnect\worker\index.ts ..\aleconnect\vite.config.ts
node --test --test-concurrency=1 tests/agent-harness.test.mjs tests/api-origin.test.mjs tests/human-reference-contract.test.mjs
Push-Location ..\aleconnect
try {
  node --test --test-concurrency=1 tests/deployment/consumer-account-linking-routes.test.mjs tests/deployment/cloudflare-runtime.test.mjs
} finally {
  Pop-Location
}
```

Expected: every matrix route is registered in both runtimes; shared marker block matches; API origin remains HTTPS and compact/legacy references remain opaque.

- [ ] **Step 4: Run and record the clean mobile baseline**

Run serially:

```powershell
node --test --test-concurrency=1 tests/*.test.mjs
npx tsx --test --test-concurrency=1 tests/*.test.ts
npx tsc --noEmit
npm run lint
npm run harness:check
```

Expected baseline: 197/197 `.mjs` tests pass; TypeScript and harness pass; lint has zero errors and four recorded existing warnings. Record actual current counts rather than copying expectations.

- [ ] **Step 5: Commit the evidence-only matrix**

Run:

```powershell
git add -- docs/implementation/2026-09-13-mobile-api-refresh-matrix.md
git diff --cached --check
git commit -m "docs: map mobile API refresh coverage"
```

### Task 2: Verify and repair authentication, accounts, and Profile

**Files:**

- Modify only on reproduced failure: `src/services/api.ts`
- Modify only on reproduced failure: `src/services/auth.ts`
- Modify only on reproduced failure: `src/services/consumer-identity.ts`
- Modify only on reproduced failure: `src/services/linked-accounts.ts`
- Modify only on reproduced failure: `src/services/account-link-requests.ts`
- Modify only on reproduced failure: `src/services/profile.ts`
- Modify only in the conditional Staff worktree after a proven server defect: `../aleconnect-mobile-api-refresh-server/api/mobile/auth/change-password.ts`
- Modify only in the conditional Staff worktree after a proven server defect: `../aleconnect-mobile-api-refresh-server/api/mobile/consumer-identity.ts`
- Modify only in the conditional Staff worktree after a proven server defect: `../aleconnect-mobile-api-refresh-server/api/mobile/linked-accounts.ts`
- Modify only in the conditional Staff worktree after a proven server defect: `../aleconnect-mobile-api-refresh-server/api/mobile/account-link-requests.ts`
- Modify only in the conditional Staff worktree after a proven server defect: `../aleconnect-mobile-api-refresh-server/api/mobile/profile/**/*.ts`
- Modify only on reproduced failure: `src/app/sign-in.tsx`
- Modify only on reproduced failure: `src/app/email-setup.tsx`
- Modify only on reproduced failure: `src/app/(tabs)/profile/**/*.tsx`
- Test: `tests/auth-lifecycle.test.mjs`
- Test: `tests/consumer-account-contract.test.mjs`
- Test: `tests/consumer-account-snapshot-behavior.test.ts`
- Test: `tests/linked-account-management.test.mjs`
- Test: `tests/profile-*.test.mjs`
- Update: `docs/implementation/2026-09-13-mobile-api-refresh-matrix.md`

**Interfaces:**

- Consumes: Task 1 route matrix; `AuthSession`; `ConsumerAccessContext`; linked-account `accessRevision`; Profile scope.
- Produces: Verified session/account/Profile flows with restored reversible production settings and regression coverage for every owned fix.

- [ ] **Step 1: Run focused behavior contracts before device work**

Run:

```powershell
node --test --test-concurrency=1 tests/auth-lifecycle.test.mjs tests/consumer-account-contract.test.mjs tests/linked-account-management.test.mjs tests/profile-avatar.test.mjs tests/profile-coordinates.test.mjs tests/profile-scroll-reset.test.mjs tests/profile-shared-ui.test.mjs tests/profile-structured-address.test.mjs
npx tsx --test --test-concurrency=1 tests/consumer-account-snapshot-behavior.test.ts tests/account-link-status.test.ts tests/account-linking-report-ux.test.ts
```

- [ ] **Step 2: Bind device evidence to the worktree client**

Run the new worktree on a separate port so canonical Metro stays available:

```powershell
$env:ANDROID_SERIAL = "192.168.1.31:41667"
adb reverse tcp:8082 tcp:8082
npx expo run:android --device 25040RP0AG --port 8082
```

Confirm `com.kapecakes.aleconnectmobile/.MainActivity` is foreground and logs identify the 8082 bundle before accepting device evidence.

- [ ] **Step 3: Exercise auth/account journeys without widening production scope**

On device:

1. Confirm existing session restoration, sign-out, account-number sign-in, and email sign-in safe error states.
2. Confirm consumer identity and linked-account lists load with the same identity/access revision.
3. Change default account only when multiple valid linked accounts exist, then restore the original default.
4. Open account-link request history. Submit only with valid supplied account credentials; otherwise mark mutation blocked, not passed.
5. Do not execute password change without disposable credentials.

- [ ] **Step 4: Snapshot, exercise, and restore Profile state**

Record current phone/address/avatar/settings without storing personal values in repository artifacts. Exercise Profile views, one reversible field update, structured address/map validation, and avatar selection/upload when a neutral image is available. Restore prior values immediately and re-read Profile to prove restoration.

- [ ] **Step 5: Repair only a reproduced root cause**

For each failed journey: capture safe HTTP status/code and screen state; trace Staff response → service parser → scoped cache → screen; add one failing assertion to the closest listed test; run RED; make the smallest shared-path fix; run GREEN plus all focused Task 2 tests. If no journey fails, make no product edit.

- [ ] **Step 6: Record results and commit Task 2 scope**

Update only Task 2 matrix rows with exact automated/device outcomes and restoration evidence. Then run:

```powershell
git add -- src tests docs/implementation/2026-09-13-mobile-api-refresh-matrix.md
git diff --cached --check
git commit -m "fix: refresh mobile account and profile flows"
```

If no product fix exists, use `docs: verify mobile account and profile flows`.

### Task 3: Verify and repair reports, evidence, and offline synchronization

**Files:**

- Modify only on reproduced failure: `src/services/reports.ts`
- Modify only on reproduced failure: `src/services/report-queue.ts`
- Modify only on reproduced failure: `src/services/report-queue-access.ts`
- Modify only on reproduced failure: `src/services/report-background-sync.ts`
- Modify only on reproduced failure: `src/services/report-sync-*.ts`
- Modify only on reproduced failure: `src/features/reports/**/*.ts`
- Modify only in the conditional Staff worktree after a proven server defect: `../aleconnect-mobile-api-refresh-server/api/mobile/complaints.ts`
- Modify only on reproduced failure: `src/app/(tabs)/reports/**/*.tsx`
- Modify only on reproduced failure: `src/app/report/[id].tsx`
- Test: `tests/report-*.test.mjs`
- Test: `tests/complaint-*.test.mjs`
- Update: `docs/implementation/2026-09-13-mobile-api-refresh-matrix.md`

**Interfaces:**

- Consumes: Task 2 authenticated identity/account/revision snapshot and worktree device session.
- Produces: Verified metadata, submission, list/detail, evidence, map, queue, reconnect, and status-sync paths with one safely labeled production test report.

- [ ] **Step 1: Run report contracts before writes**

Run:

```powershell
node --test --test-concurrency=1 tests/complaint-submission-contract.test.mjs tests/complaint-detail-back.test.mjs tests/complaints-archive-back.test.mjs tests/complaints-auth-boundary.test.mjs tests/report-*.test.mjs
```

- [ ] **Step 2: Verify read paths and metadata on device**

Confirm Recent Reports, Archive pagination/filtering, report detail, consumer-safe history/status, map/address display, signed evidence refresh, and metadata-driven category/type rules. Check empty, loading, retry, and stale states without clearing another identity's data.

- [ ] **Step 3: Submit one non-operational test report**

Use a non-emergency category/type accepted by live metadata. Put `TEST - mobile API refresh verification; no actual outage or safety event` in every available free-text detail field. Use the current authorized account and one neutral evidence image when safe. Verify one idempotent submission, returned reference, immediate Recent/Archive visibility, detail/history/map rendering, and no duplicate after refresh/reopen.

- [ ] **Step 4: Exercise offline queue without breaking wireless ADB**

Keep one PowerShell terminal open for the whole offline interval. Refuse to overwrite a pre-existing proxy and restore direct networking in `finally`:

```powershell
$priorProxy = adb -s 192.168.1.31:41667 shell settings get global http_proxy
if($priorProxy -notin @('null', ':0')) { throw "Existing device proxy must be preserved: $priorProxy" }
try {
  adb -s 192.168.1.31:41667 shell settings put global http_proxy 127.0.0.1:9
  Read-Host 'Queue and inspect the offline test draft, then press Enter to restore networking'
} finally {
  adb -s 192.168.1.31:41667 shell settings put global http_proxy :0
}
```

Queue one clearly labeled test draft while the prompt is open and confirm it remains scoped/recoverable. After restoration, verify reconnect triggers existing sync, reuses the idempotency key, and does not duplicate the report. Confirm `settings get global http_proxy` returns `null` or `:0` before continuing.

- [ ] **Step 5: Verify foreground/background and push-driven report synchronization**

Move the app background/foreground, reopen Recent and Archive, and confirm authoritative refresh. Validate existing v1 status-event parsing and stale/duplicate ordering through automated tests. Do not synthesize a provider push; mark live provider delivery unverified unless an organic event arrives.

- [ ] **Step 6: Repair only a reproduced root cause, record, and commit**

Use the same RED → minimal shared fix → focused GREEN rule from Task 2. Update report/evidence/offline matrix rows, including created test references without personal data. Then run:

```powershell
git add -- src tests docs/implementation/2026-09-13-mobile-api-refresh-matrix.md
git diff --cached --check
git commit -m "fix: refresh mobile report workflows"
```

If no product fix exists, use `docs: verify mobile report workflows`.

### Task 4: Verify and repair advisories, notifications, and Hotlines

**Files:**

- Modify only on reproduced failure: `src/services/advisories.ts`
- Modify only on reproduced failure: `src/services/notifications.ts`
- Modify only on reproduced failure: `src/services/notification-navigation.ts`
- Modify only on reproduced failure: `src/services/notification-settings.ts`
- Modify only on reproduced failure: `src/services/push-notifications.ts`
- Modify only on reproduced failure: `src/services/hotlines.ts`
- Modify only in the conditional Staff worktree after a proven server defect: `../aleconnect-mobile-api-refresh-server/api/mobile/advisories.ts`
- Modify only in the conditional Staff worktree after a proven server defect: `../aleconnect-mobile-api-refresh-server/api/mobile/notifications.ts`
- Modify only in the conditional Staff worktree after a proven server defect: `../aleconnect-mobile-api-refresh-server/api/mobile/push-notifications.ts`
- Modify only in the conditional Staff worktree after a proven server defect: `../aleconnect-mobile-api-refresh-server/api/mobile/hotlines.ts`
- Modify only on reproduced failure: `src/app/advisories.tsx`
- Modify only on reproduced failure: `src/app/advisory/[id].tsx`
- Modify only on reproduced failure: `src/app/notifications.tsx`
- Modify only on reproduced failure: `src/app/notification-settings.tsx`
- Modify only on reproduced failure: `src/app/(tabs)/hotlines.tsx`
- Test: `tests/advisory-*.test.mjs`
- Test: `tests/notification*.test.mjs`
- Test: `tests/notifications*.test.mjs`
- Test: `tests/hotlines*.test.mjs`
- Update: `docs/implementation/2026-09-13-mobile-api-refresh-matrix.md`

**Interfaces:**

- Consumes: Task 2 identity/revision scope; existing notification token/settings ownership; public hotline cache.
- Produces: Verified advisory, notification, settings/token, navigation, and hotline flows with reversible preference restoration.

- [ ] **Step 1: Run focused feed/cache/navigation contracts**

Run:

```powershell
node --test --test-concurrency=1 tests/advisory-*.test.mjs tests/notification*.test.mjs tests/notifications*.test.mjs tests/hotlines*.test.mjs tests/profile-notification-settings.test.mjs tests/native-notification-sounds.test.mjs tests/native-permissions.test.mjs
```

- [ ] **Step 2: Verify Advisories on device**

Confirm Home preview, paginated feed, active/stale states, detail route, nullable restoration dates, Manila time, audience labels, background/foreground refresh, and safe behavior for missing/unsupported data.

- [ ] **Step 3: Snapshot, exercise, and restore notification state**

Record current server settings outside repository text, test OS permission presentation, push-token registration, preference autosave, feeder/substation controls, offline read-only behavior, reconnect refresh, notification pagination/filtering/read actions, badges, and Advisory/Report navigation. Restore original settings and re-read them from server.

- [ ] **Step 4: Verify Hotlines on device**

Confirm public directory load, stale-cache fallback, focus revalidation, search, category/All sheets, agency avatars, grouped contacts, wrapping, keyboard/reduced-motion behavior, and supported call/link actions. Never fall back to mock phone numbers.

- [ ] **Step 5: Repair only a reproduced root cause, record, and commit**

Apply one RED/GREEN cycle per failure in the closest listed test and shared service. Update Task 4 matrix rows. Then run:

```powershell
git add -- src tests docs/implementation/2026-09-13-mobile-api-refresh-matrix.md
git diff --cached --check
git commit -m "fix: refresh mobile information and notification flows"
```

If no product fix exists, use `docs: verify mobile information and notification flows`.

### Task 5: Run the full Android acceptance gate and close the handoff

**Files:**

- Update: `docs/implementation/2026-09-13-mobile-api-refresh-matrix.md`
- Update: `docs/agent-harness/implementation-history.md`
- Update: `docs/agent-harness/active-work.md`
- Update only if Staff source changed: `../aleconnect/docs/agent-harness/implementation-history.md`
- Update only if Staff source changed: `../aleconnect/docs/agent-harness/active-work.md`

**Interfaces:**

- Consumes: Tasks 1-4 commits, completed matrix, connected Android device, and approved production consumer-write boundary.
- Produces: One final evidence commit with every module classified and no unresolved mobile-owned regression hidden.

- [ ] **Step 1: Run all mobile automated gates serially**

Run:

```powershell
node --test --test-concurrency=1 tests/*.test.mjs
npx tsx --test --test-concurrency=1 tests/*.test.ts
npx tsc --noEmit
npm run lint
npm run harness:check
npx expo-doctor
git diff --check
```

Read complete outputs. Record exact pass/fail/skip/warning counts.

- [ ] **Step 2: Run Staff-owned mobile contract gates without editing Staff baseline**

Run the focused consumer/mobile lifecycle set and deployment route checks from `../aleconnect`:

```powershell
Push-Location ..\aleconnect
try {
  node --test --test-concurrency=1 tests/lifecycle/consumer-*.test.mjs tests/lifecycle/mobile-*.test.mjs tests/lifecycle/notification-*.test.mjs tests/lifecycle/human-reference*.test.mjs tests/lifecycle/report-ingestion-latency-contract.test.mjs
  node --test --test-concurrency=1 tests/deployment/consumer-account-linking-routes.test.mjs tests/deployment/cloudflare-runtime.test.mjs
} finally {
  Pop-Location
}
```

Record the existing compact-mode and Users Directory source-assertion failures separately if they reproduce. Do not call the Staff suite green when either remains red.

- [ ] **Step 3: Produce the Android bundle/build evidence without overlapping heavy jobs**

Run Android export alone:

```powershell
npx expo export --platform android --output-dir .expo\mobile-api-refresh-export
```

After export finishes, run/install the worktree client on port 8082:

```powershell
$env:ANDROID_SERIAL = "192.168.1.31:41667"
adb reverse tcp:8082 tcp:8082
npx expo run:android --device 25040RP0AG --port 8082
```

Keep generated export/native artifacts uncommitted. Do not run EAS or a release build.

- [ ] **Step 4: Complete one final device matrix pass**

Recheck every matrix journey in the installed worktree client. Capture safe screen/log evidence for success, loading, empty, error, permission denial, foreground/background, and reconnect states. Confirm Profile/notification settings are restored, proxy is restored, no token/personal data appears in artifacts, and no unexpected JavaScript/native error remains.

- [ ] **Step 5: Refresh Graphify only when source changed**

If `src/` or tests changed, run:

```powershell
graphify update .
```

Inspect generated changes separately. Do not mix unrelated Graphify churn into the product commit.

- [ ] **Step 6: Append durable evidence and run final repository checks**

Append one implementation-history entry containing Repositories, Scope, Files, Contracts, Verification, Device/production consumer writes, Git/Deployment, Remaining risks, and Next. Update active work without replacing unrelated entries. Then run:

```powershell
npm run harness:check
git diff --check
git status --short --branch
```

If Staff source never changed, do not edit Staff history/active work.

- [ ] **Step 7: Commit only scoped handoff files**

Run:

```powershell
git add -- src tests docs/implementation/2026-09-13-mobile-api-refresh-matrix.md docs/agent-harness/implementation-history.md docs/agent-harness/active-work.md
git diff --cached --check
git commit -m "docs: record mobile API refresh evidence"
git status --short --branch
```

Final report must list passed modules, baseline failures, blockers, iOS-unverified behavior, test report references, restored settings, exact commands/results, branch/commits, and excluded deployment/release actions.
