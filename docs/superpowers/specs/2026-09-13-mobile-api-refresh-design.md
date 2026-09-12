# ALEConnect Mobile API Refresh Design

## Status

Approved in chat on 2026-09-13.

## Goal

Verify every ALEConnect Mobile module against the current Staff-owned API and fix only proven compatibility or runtime defects. Run the Expo development client on the connected Android device against `https://api.aleconnect.app`; do not create a production mobile release.

## Current Evidence

- Mobile source starts from clean `master` at `adba048` in isolated branch `codex/mobile-api-refresh`.
- The authoritative Staff checkout is available at `../aleconnect`; it remains read-only unless a server defect is proven.
- Mobile baseline passes 197/197 serial Node tests with the Staff shared-contract check enabled.
- Canonical mobile TypeScript and harness checks pass. Lint has zero errors and four existing warnings.
- The production API origin is already configured through the existing public Expo environment variable.
- One wireless Android device is connected, the development client is foreground, and Metro is available through reverse port 8081.
- The focused Staff mobile-contract baseline passes 146/148. The two failures are existing Staff source assertions: legacy versus compact human-reference mode and a Users Directory UI regex. Neither currently demonstrates a mobile endpoint failure.

## Scope

### Contract inventory

Trace each Staff handler and production response through its mobile service, parser, cache, and screen:

- authentication, session lifecycle, and required password change;
- consumer identity setup and access revision;
- linked accounts, default account, unlink, and account-link requests;
- complaint metadata, list, detail, evidence signing/upload, submission, and archive filtering;
- profile read/update and avatar signing/upload;
- advisories list/detail and scoped cache;
- notifications list/read state, navigation, push token, and notification settings;
- hotline directory and stale-cache behavior;
- report background queue, reconnect, push-driven status updates, and cache invalidation.

### Runtime acceptance

Exercise these consumer modules on the connected Android development client:

- sign-in/session and safe authentication failures;
- Home data and navigation;
- linked-account and Profile views;
- reversible Profile and notification-setting edits;
- Recent Reports, Archive, report detail, map, history, and evidence;
- one clearly labeled test report, including evidence when safe;
- offline queue, reconnect, and authoritative refresh;
- Advisories feed/detail;
- Notifications feed/read actions/settings/tap routing;
- Hotlines search, category sheets, and contact actions;
- location, camera/gallery, and notification permission denial/recovery paths.

## Non-goals

- No EAS build, OTA update, store submission, iOS signing, Android release signing, or production mobile publication.
- No database migration, direct MySQL access, Cloudflare deployment, or Staff release.
- No broad service rewrite, caching rewrite, dependency upgrade, or new dependency.
- No password change unless disposable credentials are available.
- No claim that iOS native behavior was verified without an iOS device and credentials.
- No cleanup or repair of unrelated Staff baseline failures.

## Architecture

Work in `C:/Users/Justine/VSCodeProjects/aleconnect-mobile-api-refresh`. Keep the canonical mobile Metro session untouched until the worktree is ready for device execution. At device time, run the worktree development client on an explicit port/device transport so evidence is bound to the branch under test.

Use this evidence chain for every module:

1. Staff handler and route registration define the authoritative contract.
2. An authenticated production request confirms the deployed response shape where safe.
3. The existing mobile service and parser normalize that shape.
4. Identity/account/revision-scoped storage owns bounded last-successful data.
5. The screen renders success, loading, empty, stale, offline, and error states.
6. A focused automated check and device observation record the result.

Retain the existing `apiRequest`, SecureStore, AsyncStorage, report queue, retry, refresh-cooldown, and notification/report synchronization paths. Add no parallel client layer.

## Contract

Staff owns `/api/*`, `/api/mobile/*`, authorization, MySQL, R2 signing, Worker routing, and deployment order. Mobile owns only consumer parsing, device storage, native permissions, and presentation.

All current route groups must remain registered in both Vite and the Worker. A server change is permitted only after a reproducible contract defect, must be additive/backward-compatible, and requires a separate deployment approval before production release.

## Compatibility

- Treat human references as opaque display values; retain compact and legacy readers.
- Accept documented additive fields when omitted or `null` and provide the existing unavailable-state fallback.
- Accept only supported response/status versions and public consumer statuses.
- Never render unknown raw status, server object keys, credential details, or internal lifecycle data.
- Preserve successful payloads and the last valid scoped cache while scheduling authoritative revalidation for unsupported or incomplete responses.
- Preserve deployed request fields and idempotency keys through the compatibility window.

## Ownership

- Server authorization is authoritative for identity, service accounts, records, and mutations.
- Account-scoped requests must use the resolved `serviceAccountId` and `accessRevision` already provided by the Staff API.
- Cached UI, queued drafts, and locally remembered account IDs never grant access.
- A stale identity/account/revision snapshot fails closed without deleting a same-identity recoverable draft.
- Tokens stay in SecureStore and never appear in logs, screenshots, documentation, or commits.

## Offline

- Private caches remain scoped by identity user, service account or approved all-account scope, access revision, and filter context.
- Authentication/session failure must hide private cached data.
- Last-successful cached data may render only through its existing bounded stale state.
- Reconnect triggers the existing authoritative refresh path; no polling layer is added.
- Queued reports retain one idempotency key and immutable ownership snapshot.
- Ownership drift makes a queue item non-retryable until safely resolved; it does not expose another identity's data.

## Permissions

Request only permissions already required by the exercised feature:

- location for report map placement;
- camera or gallery for report evidence and avatar selection;
- notifications for push delivery and settings.

Denial must leave the rest of the module usable, show actionable recovery, and avoid permission loops. Microphone permission remains disabled.

## Production-data Safety

The user authorized ordinary current-account writes from the development client against `https://api.aleconnect.app`.

- Snapshot Profile and notification settings before changing them; restore their prior values and verify the restored read.
- Label submitted reports clearly as test records. Do not invent or misrepresent an outage or safety event.
- Use only supplied valid account-link credentials. Do not enumerate accounts or guess identities.
- Do not change passwords without disposable credentials.
- Do not delete records, mutate Staff-owned operational state, or perform provider/admin actions.
- Stop if a flow would create an irreversible or materially broader production effect than the approved consumer write.

## Error Handling

- Reproduce and trace each failure through request, response, parser, cache, and screen before editing.
- Preserve `ApiRequestError` status/code semantics and consumer-safe messages.
- Retry only already-approved safe transient/idempotent requests.
- Do not retry credential errors, ownership conflicts, or non-idempotent writes automatically.
- Treat external network/provider failure as a recorded blocked state, not a passing module.

## Implementation Phases

### Phase 1: Contract and baseline matrix

Inventory every endpoint, method, request field, response field, mobile reader, screen, cache key, focused test, and device journey. Record current Staff baseline failures separately. Produce no product change when contracts already match.

### Phase 2: Authentication, accounts, and Profile

Verify session/authentication, consumer identity, linked accounts, account-link requests, Profile, avatar, and reversible settings. Add one failing regression before each owned fix.

### Phase 3: Reports, evidence, and offline synchronization

Verify metadata, creation, validation, map/address behavior, evidence signing/upload, idempotent submission, lists, detail/history, stale status preservation, offline queue, reconnect, and push-driven refresh.

### Phase 4: Advisories, notifications, and Hotlines

Verify scoped list/detail caches, notification pagination/read actions/navigation, push token/settings, stale/offline states, hotline grouping/search/contact actions, and permission behavior.

### Phase 5: Full device acceptance and handoff

Run the complete automated gates, Android development build/export, module walkthrough, foreground/background/reconnect checks, and scoped log review. Record each module as passed, baseline-failing, blocked, or unverified.

## Verification

For every proven defect:

1. Add the smallest behavior-level regression.
2. Run it and confirm the expected RED failure.
3. Implement the minimal root-cause fix.
4. Run the focused test GREEN.
5. Run sibling and full regression gates before moving on.

Final mobile gates:

- focused module tests;
- `node --test --test-concurrency=1 tests/*.test.mjs`;
- TypeScript behavior tests when applicable;
- `npx tsc --noEmit`;
- `npm run lint`;
- `npm run harness:check`;
- `npx expo-doctor`;
- Android development build/export appropriate to changed files;
- `git diff --check` and final `git status`;
- `graphify update .` after source changes, with generated churn reviewed separately.

Final Staff gates when no Staff source changes:

- route registration inventory;
- focused consumer/mobile contract tests;
- report the two current baseline failures separately.

If Staff source changes, additionally run its focused authorization tests, TypeScript, lint, build, deployment-contract checks, harness, diff check, and Graphify update. No Staff deployment follows without new authorization.

Device evidence must cover the named module journeys, production HTTP outcomes, visible safe UI state, offline/reconnect behavior, foreground/background behavior where relevant, and Android logs without tokens or personal data.

## Handoff

- Append a mobile implementation-history entry with scope, contracts, commands/results, commits, device evidence, production consumer writes, restored settings, risks, and remaining unverified iOS behavior.
- Update mobile active work without replacing unrelated state.
- Update Staff history and active work only if Staff source changes.
- Stage only scoped files.
- Keep release, deployment, DB, EAS, store, and worktree cleanup outside this task unless separately authorized.

## Success Criteria

- Every mobile service and screen in scope has a mapped Staff contract and an automated or explicit device acceptance result.
- Every mobile-owned automated gate passes from the isolated branch.
- Every proven defect has RED/GREEN evidence and a minimal root-cause fix.
- Android device journeys have current evidence against `https://api.aleconnect.app`.
- Reversible settings are restored and verified.
- Baseline failures, external blockers, and iOS gaps remain explicit; none are relabeled as passing.
- No unapproved server release, database action, mobile publication, dependency expansion, or unrelated edit occurs.
