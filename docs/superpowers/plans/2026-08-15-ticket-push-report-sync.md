# Push-Driven Report Status Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make visible and cached report statuses update almost immediately from a valid ticket status push, then revalidate against the server without polling, WebSockets, or blocking notification delivery.

**Architecture:** Parse versioned ticket status events defensively, reject duplicate/out-of-order events with a persisted per-user/ticket ordering marker, project accepted status changes into the default report cache and mounted screens, and then request authoritative revalidation. Normal navigation keeps the 60-second list cache; event-driven revalidation bypasses the 3-second manual-refresh cooldown but still uses the existing request registry. App/session activation and network reconnection mark report data for stale-while-revalidate so cached UI remains immediately available even when background notification JavaScript did not execute.

**Tech Stack:** Expo SDK 55, React Native 0.83, TypeScript 5.9, Expo Notifications, AsyncStorage, NetInfo, Expo Router, React hooks, Node test runner.

## Global Constraints

- Backend/API remains authoritative; push is a synchronization signal, not permanent report data.
- V1 requires valid `changedAt`; `revision` is optional and preferred when present.
- Preserve legacy `context: "ticket"` / `ticketId` notification navigation.
- Never infer lifecycle ordering from status names.
- Persist newest accepted ordering marker per user/ticket so delayed pushes cannot regress status after restart.
- Do not clear complaint metadata for ticket status events.
- Do not globally lower the 60-second report-list cache TTL.
- Do not add polling, WebSockets/SSE, a new global state library, or background-push-only correctness.
- Event-driven revalidation must bypass the manual refresh cooldown but retain existing request deduplication.
- Cache projection must preserve original `fetchedAt`.
- App/session activation and offline→online transitions must request report revalidation.
- A legacy tapped ticket push that cannot be parsed as v1 must still navigate and mark report data for revalidation.

---

## File Structure

- Modify `src/services/notification-navigation.ts` — v1 parser, legacy navigation unchanged.
- Create `src/services/report-sync-ordering.ts` — pure marker comparison.
- Modify `src/services/reports.ts` — targeted cache projection, stale marker, `revalidate` network path.
- Create `src/services/report-sync-events.ts` — ordering sidecar, status event bus, revalidation bus.
- Modify `src/app/_layout.tsx` — foreground/tap/session/resume/reconnect bridge.
- Modify `src/app/(tabs)/reports/index.tsx` — immediate row patch + stale-while-revalidate.
- Modify `src/app/(tabs)/reports/list.tsx` — immediate archive patch + stale-while-revalidate.
- Modify/create focused tests under `tests/`.

---

### Task 1: Parse and order ticket status events

**Files:**
- Modify: `src/services/notification-navigation.ts`
- Create: `src/services/report-sync-ordering.ts`
- Modify: `tests/notification-navigation.test.mjs`
- Create: `tests/report-sync-ordering.test.mjs`

**Interfaces:**

```ts
export type TicketStatusChangedPush = {
  context: "ticket";
  event: "ticket.status_changed";
  version: 1;
  ticketId: string;
  ticketNumber?: string;
  status: string;
  changedAt: string;
  revision?: number;
};

export function ticketStatusChangedEventFromPushData(
  data: unknown,
): TicketStatusChangedPush | null;
```

```ts
export type ReportStatusEventMarker = {
  changedAt: string;
  revision?: number;
};

export function isIncomingReportStatusEventNewer(
  current: ReportStatusEventMarker | null,
  incoming: ReportStatusEventMarker,
): boolean;
```

- [ ] **Step 1: Add failing parser test**

In `tests/notification-navigation.test.mjs`, add:

```js
test("ticket status push parser accepts only valid v1 events", async () => {
  const { ticketStatusChangedEventFromPushData } = await import(
    "../src/services/notification-navigation.ts"
  );

  assert.deepEqual(
    ticketStatusChangedEventFromPushData({
      context: "ticket",
      event: "ticket.status_changed",
      version: 1,
      ticketId: "ticket-1",
      ticketNumber: "ALECO-260815-00001",
      status: "verified",
      changedAt: "2026-08-15T03:30:45.123Z",
    }),
    {
      context: "ticket",
      event: "ticket.status_changed",
      version: 1,
      ticketId: "ticket-1",
      ticketNumber: "ALECO-260815-00001",
      status: "verified",
      changedAt: "2026-08-15T03:30:45.123Z",
    },
  );

  assert.equal(
    ticketStatusChangedEventFromPushData({
      context: "ticket",
      event: "ticket.status_changed",
      version: 2,
      ticketId: "ticket-1",
      status: "verified",
      changedAt: "2026-08-15T03:30:45.123Z",
    }),
    null,
  );

  assert.equal(
    ticketStatusChangedEventFromPushData({
      context: "ticket",
      event: "ticket.status_changed",
      version: 1,
      ticketId: "ticket-1",
      status: "verified",
      changedAt: "bad-date",
    }),
    null,
  );
});
```

Keep all existing `ticketIdFromPushData()` tests unchanged.

- [ ] **Step 2: Add failing pure ordering test**

Create `tests/report-sync-ordering.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { isIncomingReportStatusEventNewer } from "../src/services/report-sync-ordering.ts";

const marker = (changedAt, revision) =>
  revision === undefined ? { changedAt } : { changedAt, revision };

test("status event ordering rejects duplicate and older delivery", () => {
  assert.equal(isIncomingReportStatusEventNewer(null, marker("2026-08-15T03:00:00.000Z")), true);
  assert.equal(
    isIncomingReportStatusEventNewer(
      marker("2026-08-15T03:00:00.000Z", 4),
      marker("2026-08-15T03:01:00.000Z", 5),
    ),
    true,
  );
  assert.equal(
    isIncomingReportStatusEventNewer(
      marker("2026-08-15T03:00:00.000Z", 5),
      marker("2026-08-15T03:02:00.000Z", 4),
    ),
    false,
  );
  assert.equal(
    isIncomingReportStatusEventNewer(
      marker("2026-08-15T03:00:00.000Z"),
      marker("2026-08-15T03:00:00.000Z"),
    ),
    false,
  );
});
```

- [ ] **Step 3: Run RED**

```bash
node --test tests/notification-navigation.test.mjs tests/report-sync-ordering.test.mjs
```

Expected: FAIL because parser/ordering module do not exist.

- [ ] **Step 4: Implement parser**

In `notification-navigation.ts`, validate exact event/version, non-empty ID/status, parseable `changedAt`, and optional non-negative integer `revision`. Normalize `changedAt` with `new Date(changedAt).toISOString()`. Keep `ticketIdFromPushData()` independent so legacy pushes still navigate.

Core return shape:

```ts
return {
  context: "ticket",
  event: "ticket.status_changed",
  version: 1,
  ticketId,
  ...(ticketNumber ? { ticketNumber } : {}),
  status,
  changedAt: new Date(changedAt).toISOString(),
  ...(revision === undefined ? {} : { revision }),
};
```

- [ ] **Step 5: Implement pure ordering**

```ts
export function isIncomingReportStatusEventNewer(
  current: ReportStatusEventMarker | null,
  incoming: ReportStatusEventMarker,
) {
  if (!current) return true;
  if (current.revision !== undefined && incoming.revision !== undefined) {
    return incoming.revision > current.revision;
  }
  const currentMs = Date.parse(current.changedAt);
  const incomingMs = Date.parse(incoming.changedAt);
  if (Number.isNaN(currentMs) || Number.isNaN(incomingMs)) return false;
  return incomingMs > currentMs;
}
```

- [ ] **Step 6: Run GREEN**

```bash
node --test tests/notification-navigation.test.mjs tests/report-sync-ordering.test.mjs
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/services/notification-navigation.ts src/services/report-sync-ordering.ts tests/notification-navigation.test.mjs tests/report-sync-ordering.test.mjs
git commit -m "feat: parse and order ticket status push events"
```

---

### Task 2: Add report-cache projection and event-driven revalidation

**Files:**
- Modify: `src/services/reports.ts`
- Create: `tests/report-status-cache-sync.test.mjs`

**Interfaces:**

```ts
export type ReportStatusProjection = {
  userId: string;
  ticketId: string;
  status: string;
};

export async function projectComplaintReportStatus(
  projection: ReportStatusProjection,
): Promise<boolean>;

export function markComplaintReportsForRevalidation(userId: string): void;
export function complaintReportsNeedRevalidation(userId: string): boolean;
```

Extend `fetchComplaintReportPage()` options:

```ts
revalidate?: boolean;
```

- [ ] **Step 1: Add failing source-contract test**

Create `tests/report-status-cache-sync.test.mjs` and assert the source contains `projectComplaintReportStatus`, `markComplaintReportsForRevalidation`, `complaintReportsNeedRevalidation`, `revalidate?: boolean`, matching `report.id === projection.ticketId`, and writes cached data with the original `parsed.fetchedAt`.

Also assert event revalidation still goes through `complaintReportRequests.run` and does not depend on `claimRefresh`.

- [ ] **Step 2: Run RED**

```bash
node --test tests/report-status-cache-sync.test.mjs
```

- [ ] **Step 3: Extract reusable default-list cache helpers**

Move the nested default-page AsyncStorage read logic into module-level helpers:

```ts
function complaintReportStorageKey(userId: string) {
  return `report_list_cache_v1:${userId}`;
}

async function readStoredComplaintReportPage(
  userId: string,
  allowStale: boolean,
): Promise<ComplaintReportPage | null> {
  // Preserve the current v1 stored shape and stale TTL behavior.
}
```

Do not change the storage key or stored schema.

- [ ] **Step 4: Add targeted cache projection**

Use a pure page patch helper:

```ts
function patchReportPageStatus(
  page: ComplaintReportPage,
  projection: ReportStatusProjection,
) {
  let changed = false;
  const reports = page.reports.map((report) => {
    if (report.id !== projection.ticketId || report.status === projection.status) {
      return report;
    }
    changed = true;
    return { ...report, status: projection.status };
  });
  return { changed, page: changed ? { ...page, reports } : page };
}
```

Patch both the in-memory default page and `report_list_cache_v1:<userId>` if present. When writing storage, preserve:

```ts
{ fetchedAt: parsed.fetchedAt, value: patched.page }
```

Malformed stored JSON must be ignored rather than surfaced as a fatal push-sync error.

- [ ] **Step 5: Add revalidation marker and dedicated network path**

```ts
const complaintReportRevalidationUsers = new Set<string>();
```

`markComplaintReportsForRevalidation(userId)` adds the user; `complaintReportsNeedRevalidation(userId)` reads it.

In `fetchComplaintReportPage`:

```ts
const revalidate = Boolean(options?.revalidate);
const force = Boolean(options?.force) && claimRefresh(...);
```

Rules:

1. Manual `force` keeps the existing cooldown.
2. `revalidate: true` bypasses fresh cache and does not call/obey the manual cooldown.
3. It still uses the existing `complaintReportRequests.run(requestKey, ...)` path.
4. A normal first-page read for a user marked stale returns the best available cached page immediately with `isStale: true`.
5. A successful first-page network response clears the user marker.
6. A failed revalidation keeps the marker and stale fallback.

- [ ] **Step 6: Clean markers when user-specific caches are explicitly cleared**

Delete the user from the marker set in `clearComplaintCache(userId)` / `clearReportListCache(userId)` when a user ID is provided.

- [ ] **Step 7: Run GREEN and commit**

```bash
node --test tests/report-status-cache-sync.test.mjs
git add src/services/reports.ts tests/report-status-cache-sync.test.mjs
git commit -m "feat: project report status into cached lists"
```

---

### Task 3: Add persisted event coordinator

**Files:**
- Create: `src/services/report-sync-events.ts`
- Create: `tests/report-sync-events.test.mjs`

**Interfaces:**

```ts
export type ReportStatusChangedEvent = TicketStatusChangedPush & {
  userId: string;
};

export function subscribeReportStatusChanged(
  listener: (event: ReportStatusChangedEvent) => void,
): () => void;

export function subscribeReportRevalidationRequested(
  listener: (userId: string) => void,
): () => void;

export async function handleReportStatusPush(
  data: unknown,
  userId: string,
): Promise<boolean>;

export function requestReportRevalidation(userId: string): void;
```

- [ ] **Step 1: Add failing source test**

Create `tests/report-sync-events.test.mjs` asserting the service uses `report_status_event_markers_v1`, `ticketStatusChangedEventFromPushData`, `isIncomingReportStatusEventNewer`, `projectComplaintReportStatus`, `markComplaintReportsForRevalidation`, AsyncStorage persistence, and both subscribe functions.

- [ ] **Step 2: Run RED**

```bash
node --test tests/report-sync-events.test.mjs
```

- [ ] **Step 3: Implement marker storage and listeners**

Use one sidecar key per user:

```ts
const markerPrefix = "report_status_event_markers_v1";
const markerMemory = new Map<string, Record<string, ReportStatusEventMarker>>();
```

`readMarkers(userId)` must catch AsyncStorage read/JSON failures, warn, and return the current runtime map or `{}`. A storage failure must not prevent visible status projection.

- [ ] **Step 4: Implement accepted-event flow**

```ts
export async function handleReportStatusPush(data: unknown, userId: string) {
  const event = ticketStatusChangedEventFromPushData(data);
  if (!event || !userId) return false;

  const markers = await readMarkers(userId);
  const current = markers[event.ticketId] ?? null;
  if (!isIncomingReportStatusEventNewer(current, event)) return false;

  markers[event.ticketId] = {
    changedAt: event.changedAt,
    ...(event.revision === undefined ? {} : { revision: event.revision }),
  };
  markerMemory.set(userId, markers);

  try {
    await AsyncStorage.setItem(markerKey(userId), JSON.stringify(markers));
  } catch (error) {
    console.warn("Failed to persist report status event ordering", error);
  }

  const accepted = { ...event, userId } satisfies ReportStatusChangedEvent;
  statusListeners.forEach((listener) => listener(accepted));

  void projectComplaintReportStatus({
    userId,
    ticketId: event.ticketId,
    status: event.status,
  }).catch((error) => {
    console.warn("Failed to project report status into cache", error);
  });

  requestReportRevalidation(userId);
  return true;
}
```

`requestReportRevalidation` must first call `markComplaintReportsForRevalidation(userId)` and then notify revalidation listeners. Do not add a timer; network request dedupe happens in `reports.ts`.

- [ ] **Step 5: Run GREEN and commit**

```bash
node --test tests/report-sync-ordering.test.mjs tests/report-sync-events.test.mjs
git add src/services/report-sync-events.ts tests/report-sync-events.test.mjs
git commit -m "feat: coordinate push-driven report status sync"
```

---

### Task 4: Wire foreground push, tap, app activation, and reconnect

**Files:**
- Modify: `src/app/_layout.tsx`
- Create: `tests/report-status-sync-ui.test.mjs`

- [ ] **Step 1: Add failing root bridge assertions**

Create `tests/report-status-sync-ui.test.mjs` asserting `_layout.tsx` imports/uses `handleReportStatusPush`, `requestReportRevalidation`, `AppState.addEventListener`, and `NetInfo.addEventListener`; preserves `clearAdvisoryCache` and `invalidateNotifications`; and no longer calls `clearComplaintCache` from notification handling.

- [ ] **Step 2: Run RED**

```bash
node --test tests/report-status-sync-ui.test.mjs
```

- [ ] **Step 3: Route foreground ticket push into sync handling**

Remove the `clearComplaintCache` import. Import report sync functions and NetInfo.

In `handleForegroundNotification`:

```ts
const data = notification.request.content.data;
if (session) {
  void Promise.all([
    clearAdvisoryCache(session.user.id),
    handleReportStatusPush(data, session.user.id),
  ]).then(() => invalidateNotifications(session.user.id));
}
```

Do not await this before displaying the existing toast.

- [ ] **Step 4: Handle ticket taps without duplicate revalidation**

For ticket navigation:

```ts
if (ticketId) {
  if (session) {
    void handleReportStatusPush(data, session.user.id)
      .then((handled) => {
        if (!handled) requestReportRevalidation(session.user.id);
      })
      .catch(() => {
        requestReportRevalidation(session.user.id);
      });
  }

  router.push({
    pathname: "/report/[id]",
    params: { id: ticketId, focus: "notification" },
  });
  return;
}
```

A valid accepted event already requests revalidation inside the coordinator; only legacy/invalid/error cases need the explicit fallback.

- [ ] **Step 5: Mark stale on session activation and app resume**

Use `const userId = session?.user.id` and dependencies on `userId`, not the entire session object.

```ts
useEffect(() => {
  if (!userId) return;
  requestReportRevalidation(userId);
}, [userId]);
```

Track `AppState.currentState`, and when state transitions from non-active to `active`, call `requestReportRevalidation(userId)`.

- [ ] **Step 6: Retry on offline→online transition**

Subscribe to NetInfo inside the same bridge. Keep a ref to the previous offline state:

```ts
const wasOfflineRef = useRef<boolean | null>(null);
```

```ts
useEffect(() => {
  if (!userId) return;

  const unsubscribe = NetInfo.addEventListener((state) => {
    const offline =
      state.isConnected === false || state.isInternetReachable === false;
    const previous = wasOfflineRef.current;
    wasOfflineRef.current = offline;
    if (previous === true && !offline) {
      requestReportRevalidation(userId);
    }
  });

  return unsubscribe;
}, [userId]);
```

This ensures a failed offline revalidation retries without requiring the user to leave the visible Reports screen.

- [ ] **Step 7: Run GREEN and commit**

```bash
node --test tests/report-status-sync-ui.test.mjs
git add src/app/_layout.tsx tests/report-status-sync-ui.test.mjs
git commit -m "feat: route ticket pushes into report sync"
```

---

### Task 5: Patch Recent Reports and Archive immediately, then revalidate

**Files:**
- Modify: `src/app/(tabs)/reports/index.tsx`
- Modify: `src/app/(tabs)/reports/list.tsx`
- Modify: `tests/report-status-sync-ui.test.mjs`

- [ ] **Step 1: Add failing screen assertions**

Assert both screen sources contain `subscribeReportStatusChanged`, `subscribeReportRevalidationRequested`, a local patch matching `report.id === event.ticketId`, `status: event.status`, and a `revalidate: true` load path.

- [ ] **Step 2: Run RED**

```bash
node --test tests/report-status-sync-ui.test.mjs
```

- [ ] **Step 3: Update Recent Reports loading**

Replace `fetchComplaintReports` with `fetchComplaintReportPage` so the screen can inspect `page.isStale`.

Extend load options:

```ts
options?: { force?: boolean; revalidate?: boolean }
```

Pass both options into the report page call. Do not set the full-screen skeleton during `revalidate: true` if data has already loaded.

Keep a `loadComplaintsRef` pointing to the latest callback. After applying a returned page:

```ts
if (page.isStale && !options?.revalidate && !options?.force) {
  queueMicrotask(() => {
    void loadComplaintsRef.current({ revalidate: true });
  });
}
```

- [ ] **Step 4: Subscribe Recent Reports**

```ts
useEffect(() => {
  const userId = session?.user.id;
  if (!userId) return;

  const unsubscribeStatus = subscribeReportStatusChanged((event) => {
    if (event.userId !== userId) return;
    setReports((current) =>
      current.map((report) =>
        report.id === event.ticketId
          ? { ...report, status: event.status }
          : report,
      ),
    );
  });

  const unsubscribeRevalidation = subscribeReportRevalidationRequested(
    (changedUserId) => {
      if (changedUserId !== userId) return;
      void loadComplaintsRef.current({ revalidate: true });
    },
  );

  return () => {
    unsubscribeStatus();
    unsubscribeRevalidation();
  };
}, [session?.user.id]);
```

- [ ] **Step 5: Apply the same model to Archive**

Extend `loadReports` with `revalidate?: boolean`, pass it into `fetchComplaintReportPage`, and retain all current query/category/sort values.

A status event patches only a matching row currently in `reports`. A revalidation request refreshes the current first page/view with `{ revalidate: true }`. If the ticket is absent due to filtering/pagination, local patch is a no-op and server revalidation decides inclusion.

If a normal load returns `isStale`, render that cached page and schedule one `{ revalidate: true }` request. Never recursively revalidate a result that came from a revalidation attempt.

- [ ] **Step 6: Run GREEN and commit**

```bash
node --test tests/report-status-sync-ui.test.mjs tests/report-status-cache-sync.test.mjs
git add 'src/app/(tabs)/reports/index.tsx' 'src/app/(tabs)/reports/list.tsx' tests/report-status-sync-ui.test.mjs
git commit -m "feat: sync visible report status from ticket pushes"
```

---

### Task 6: Full verification gate

- [ ] **Step 1: Focused push/report tests**

```bash
node --test \
  tests/notification-navigation.test.mjs \
  tests/report-sync-ordering.test.mjs \
  tests/report-status-cache-sync.test.mjs \
  tests/report-sync-events.test.mjs \
  tests/report-status-sync-ui.test.mjs
```

Expected: PASS.

- [ ] **Step 2: Entire Node suite**

```bash
node --test tests/*.test.mjs
```

Expected: PASS.

- [ ] **Step 3: TypeScript**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 4: Lint**

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 5: Harness**

```bash
npm run harness:check
```

Expected: PASS.

- [ ] **Step 6: Verify accepted failure cases**

Confirm behavior:

```text
valid foreground push
  -> visible row patches immediately
  -> cache patches without refreshing fetchedAt
  -> authoritative revalidation starts independently
  -> API result wins

duplicate/equal event
  -> no projection or UI churn

older event
  -> no regression

cache persistence failure
  -> runtime UI still patches; warning only

revalidation failure/offline
  -> projected/cached state remains
  -> stale marker remains
  -> reconnect/app resume/manual refresh retries

cold session/app resume
  -> reports marked stale
  -> cached list can render immediately
  -> network revalidation follows

legacy tapped ticket push
  -> existing navigation works
  -> report list still marked for revalidation
```

- [ ] **Step 7: Diff review**

```bash
git diff --check
git status --short
git log --oneline --max-count=8
```

Expected: no report TTL reduction, polling, WebSocket/SSE, blanket complaint metadata invalidation, or unrelated UI changes.
