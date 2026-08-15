# Push-Driven Report Status Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make visible and cached report statuses update almost immediately from a valid ticket status push, then revalidate against the server without polling, WebSockets, or blocking notification delivery.

**Architecture:** Parse versioned ticket status events defensively, reject duplicate/out-of-order events using a persisted per-user/ticket ordering marker, project accepted status changes into the default report cache and mounted report screens, then request a dedicated authoritative revalidation. Normal navigation keeps the existing 60-second cache; event-driven revalidation bypasses the manual 3-second refresh cooldown but still uses the existing request registry to deduplicate concurrent API calls. App/session foregrounding marks report data for stale-while-revalidate so cached UI remains immediately available even when push JavaScript did not run in the background.

**Tech Stack:** Expo SDK 55, React Native 0.83, TypeScript 5.9, Expo Notifications, AsyncStorage, Expo Router, React hooks, Node test runner.

## Global Constraints

- The backend/API remains authoritative; a push payload is a synchronization signal, not permanent report data.
- Version 1 ticket events require valid `changedAt`; `revision` is optional and preferred when present.
- Keep legacy `context: "ticket"` / `ticketId` navigation compatible.
- Never infer lifecycle ordering from status names.
- Persist the newest accepted ordering marker per user/ticket so delayed pushes cannot regress status after app restart.
- Do not clear complaint metadata for ticket status events.
- Do not globally lower the existing 60-second report-list cache TTL.
- Do not add polling, WebSockets/SSE, a new persistent state-management library, or background-push-only correctness.
- App resume/cold-session activation must mark reports for revalidation; cached report rows should display before authoritative refresh completes when cache exists.
- Event-driven revalidation must not be blocked by the manual refresh cooldown. Concurrent identical API calls should still be deduplicated by the existing report request registry.
- Cache projection must preserve the existing `fetchedAt` value; changing one status must not make the whole list appear freshly fetched.

---

## File Structure

- Modify `src/services/notification-navigation.ts` — add the versioned ticket-status event parser while preserving navigation helpers.
- Create `src/services/report-sync-ordering.ts` — pure ordering-marker comparison logic with no native dependencies.
- Modify `src/services/reports.ts` — extract default report-cache helpers, add targeted status projection, revalidation markers, and an event-driven `revalidate` fetch path.
- Create `src/services/report-sync-events.ts` — persisted ordering sidecar, accepted-event bus, and revalidation-request bus.
- Modify `src/app/_layout.tsx` — route foreground/tapped ticket pushes into sync handling and mark report data stale on active session/app resume.
- Modify `src/app/(tabs)/reports/index.tsx` — patch visible rows immediately and perform stale-while-revalidate.
- Modify `src/app/(tabs)/reports/list.tsx` — patch archive rows immediately and perform stale-while-revalidate.
- Modify `tests/notification-navigation.test.mjs`.
- Create `tests/report-sync-ordering.test.mjs`.
- Create `tests/report-status-cache-sync.test.mjs`.
- Create `tests/report-sync-events.test.mjs`.
- Create `tests/report-status-sync-ui.test.mjs`.

---

### Task 1: Parse and order ticket status events safely

**Files:**
- Modify: `src/services/notification-navigation.ts`
- Create: `src/services/report-sync-ordering.ts`
- Modify: `tests/notification-navigation.test.mjs`
- Create: `tests/report-sync-ordering.test.mjs`

**Interfaces:**
- Produces:

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

- [ ] **Step 1: Add failing parser tests**

Extend `tests/notification-navigation.test.mjs`:

```js
test("ticket status push parser accepts only valid version 1 status events", async () => {
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
      changedAt: "not-a-date",
    }),
    null,
  );
});
```

Keep the existing `ticketIdFromPushData()` assertions unchanged so legacy navigation remains covered.

- [ ] **Step 2: Add failing pure ordering tests**

Create `tests/report-sync-ordering.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";

import { isIncomingReportStatusEventNewer } from "../src/services/report-sync-ordering.ts";

const marker = (changedAt, revision) =>
  revision === undefined ? { changedAt } : { changedAt, revision };

test("report status event ordering rejects duplicates and older events", () => {
  assert.equal(
    isIncomingReportStatusEventNewer(null, marker("2026-08-15T03:00:00.000Z")),
    true,
  );
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
  assert.equal(
    isIncomingReportStatusEventNewer(
      marker("2026-08-15T03:02:00.000Z"),
      marker("2026-08-15T03:01:00.000Z"),
    ),
    false,
  );
});
```

- [ ] **Step 3: Run the two focused tests and confirm RED**

```bash
node --test tests/notification-navigation.test.mjs tests/report-sync-ordering.test.mjs
```

Expected: FAIL because the parser and ordering module do not yet exist.

- [ ] **Step 4: Implement the defensive parser**

In `src/services/notification-navigation.ts`, add:

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

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function ticketStatusChangedEventFromPushData(
  data: unknown,
): TicketStatusChangedPush | null {
  if (!data || typeof data !== "object") return null;
  const value = data as Record<string, unknown>;
  if (
    value.context !== "ticket" ||
    value.event !== "ticket.status_changed" ||
    value.version !== 1
  ) {
    return null;
  }

  const ticketId = nonEmptyString(value.ticketId);
  const status = nonEmptyString(value.status);
  const changedAt = nonEmptyString(value.changedAt);
  if (!ticketId || !status || !changedAt || Number.isNaN(Date.parse(changedAt))) {
    return null;
  }

  const revision = value.revision;
  if (
    revision !== undefined &&
    (!Number.isInteger(revision) || Number(revision) < 0)
  ) {
    return null;
  }

  const ticketNumber = nonEmptyString(value.ticketNumber);
  return {
    context: "ticket",
    event: "ticket.status_changed",
    version: 1,
    ticketId,
    ...(ticketNumber ? { ticketNumber } : {}),
    status,
    changedAt: new Date(changedAt).toISOString(),
    ...(revision === undefined ? {} : { revision: Number(revision) }),
  };
}
```

Do not make `ticketIdFromPushData()` depend on this parser; legacy ticket pushes must still navigate.

- [ ] **Step 5: Implement pure ordering**

Create `src/services/report-sync-ordering.ts`:

```ts
export type ReportStatusEventMarker = {
  changedAt: string;
  revision?: number;
};

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

- [ ] **Step 6: Run focused tests**

```bash
node --test tests/notification-navigation.test.mjs tests/report-sync-ordering.test.mjs
```

Expected: PASS.

- [ ] **Step 7: Commit Task 1**

```bash
git add src/services/notification-navigation.ts src/services/report-sync-ordering.ts tests/notification-navigation.test.mjs tests/report-sync-ordering.test.mjs
git commit -m "feat: parse and order ticket status push events"
```

---

### Task 2: Add targeted report-cache projection and stale-while-revalidate markers

**Files:**
- Modify: `src/services/reports.ts`
- Create: `tests/report-status-cache-sync.test.mjs`

**Interfaces:**
- Produces:

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

- Extend `fetchComplaintReportPage()` options with:

```ts
revalidate?: boolean;
```

`revalidate: true` bypasses report-list caches and the manual refresh cooldown, but still uses `complaintReportRequests.run(...)` for request deduplication.

- [ ] **Step 1: Add a source-contract test for cache projection semantics**

Create `tests/report-status-cache-sync.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("report status projection patches only report status and preserves cache age", async () => {
  const source = await readFile(
    new URL("../src/services/reports.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /projectComplaintReportStatus/);
  assert.match(source, /markComplaintReportsForRevalidation/);
  assert.match(source, /complaintReportsNeedRevalidation/);
  assert.match(source, /revalidate\?: boolean/);
  assert.match(source, /report\.id === projection\.ticketId/);
  assert.match(source, /\{ \.\.\.report, status: projection\.status \}/);
  assert.match(source, /fetchedAt: parsed\.fetchedAt/);
  assert.doesNotMatch(source, /fetchedAt: Date\.now\(\).*projection/s);
});

test("event-driven revalidation bypasses manual refresh cooldown but retains request dedupe", async () => {
  const source = await readFile(
    new URL("../src/services/reports.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /const revalidate = Boolean\(options\?\.revalidate\)/);
  assert.match(source, /complaintReportRequests\.run/);
  assert.match(source, /if \(!revalidate && !force/);
});
```

- [ ] **Step 2: Run the focused test and confirm RED**

```bash
node --test tests/report-status-cache-sync.test.mjs
```

Expected: FAIL because the projection/revalidation interfaces do not exist.

- [ ] **Step 3: Extract default-list storage helpers from the nested fetch function**

Refactor `src/services/reports.ts` so default report-list cache access is reusable by projection code:

```ts
function complaintReportStorageKey(userId: string) {
  return `report_list_cache_v1:${userId}`;
}

async function readStoredComplaintReportPage(
  userId: string,
  allowStale: boolean,
): Promise<ComplaintReportPage | null> {
  const raw = await AsyncStorage.getItem(complaintReportStorageKey(userId));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as {
      fetchedAt: number;
      value: Report[] | ComplaintReportPage;
    };
    const maxAge = allowStale
      ? complaintReportsStaleTtlMs
      : complaintReportsCacheTtlMs;
    if (Date.now() - parsed.fetchedAt > maxAge) return null;

    const value = Array.isArray(parsed.value)
      ? { reports: parsed.value, nextCursor: null }
      : parsed.value;
    complaintReportsMemoryCache = {
      fetchedAt: parsed.fetchedAt,
      userId,
      value,
    };
    return {
      ...value,
      isStale:
        allowStale && Date.now() - parsed.fetchedAt > complaintReportsCacheTtlMs,
    };
  } catch {
    return null;
  }
}
```

Keep serialization backward-compatible with the existing cache shape.

- [ ] **Step 4: Add projection and revalidation markers**

Add module state:

```ts
const complaintReportRevalidationUsers = new Set<string>();
```

Add:

```ts
export function markComplaintReportsForRevalidation(userId: string) {
  if (userId) complaintReportRevalidationUsers.add(userId);
}

export function complaintReportsNeedRevalidation(userId: string) {
  return complaintReportRevalidationUsers.has(userId);
}
```

Implement projection without changing cache age:

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

export async function projectComplaintReportStatus(
  projection: ReportStatusProjection,
) {
  let changed = false;

  if (complaintReportsMemoryCache?.userId === projection.userId) {
    const patched = patchReportPageStatus(
      complaintReportsMemoryCache.value,
      projection,
    );
    changed ||= patched.changed;
    complaintReportsMemoryCache = {
      ...complaintReportsMemoryCache,
      value: patched.page,
    };
  }

  const storageKey = complaintReportStorageKey(projection.userId);
  const raw = await AsyncStorage.getItem(storageKey);
  if (!raw) return changed;

  const parsed = JSON.parse(raw) as {
    fetchedAt: number;
    value: Report[] | ComplaintReportPage;
  };
  const value = Array.isArray(parsed.value)
    ? { reports: parsed.value, nextCursor: null }
    : parsed.value;
  const patched = patchReportPageStatus(value, projection);
  changed ||= patched.changed;
  if (patched.changed) {
    await AsyncStorage.setItem(
      storageKey,
      JSON.stringify({ fetchedAt: parsed.fetchedAt, value: patched.page }),
    );
  }
  return changed;
}
```

Wrap malformed stored JSON in `try/catch` and return the memory result rather than turning a cache-corruption issue into a push-handler failure.

- [ ] **Step 5: Add stale-while-revalidate behavior to `fetchComplaintReportPage`**

Add:

```ts
const revalidate = Boolean(options?.revalidate);
```

Behavior:

1. `force` remains the user/manual refresh path and continues using `claimRefresh(...)`.
2. `revalidate` bypasses both memory/storage fresh-cache returns and does **not** call `claimRefresh`.
3. If neither `force` nor `revalidate` is requested and the user has a revalidation marker, return the best existing default-page cache immediately with `isStale: true`; do not clear the marker.
4. On a successful default-page network response, call:

```ts
complaintReportRevalidationUsers.delete(userId);
```

5. On network failure, keep the marker and return stale cache as today when available.

Use this explicit cache decision shape:

```ts
if (!force && !revalidate && isDefaultPage && userId) {
  const needsRevalidation = complaintReportsNeedRevalidation(userId);
  const cached = needsRevalidation
    ? await readStoredComplaintReportPage(userId, true)
    : await readStoredComplaintReportPage(userId, false);
  if (cached) {
    return needsRevalidation ? { ...cached, isStale: true } : cached;
  }
}
```

Preserve the existing in-memory fast path as well; if it is used while `needsRevalidation` is true, return its page with `isStale: true` rather than claiming it is authoritative.

- [ ] **Step 6: Ensure clear/logout paths clean runtime revalidation state**

In `clearComplaintCache(userId)` and `clearReportListCache(userId)`, delete the user from `complaintReportRevalidationUsers` when a user ID is explicitly being cleared.

- [ ] **Step 7: Run focused test**

```bash
node --test tests/report-status-cache-sync.test.mjs
```

Expected: PASS.

- [ ] **Step 8: Commit Task 2**

```bash
git add src/services/reports.ts tests/report-status-cache-sync.test.mjs
git commit -m "feat: project report status into cached lists"
```

---

### Task 3: Add the persisted report-status event coordinator

**Files:**
- Create: `src/services/report-sync-events.ts`
- Create: `tests/report-sync-events.test.mjs`

**Interfaces:**
- Consumes:
  - `ticketStatusChangedEventFromPushData(data)`
  - `isIncomingReportStatusEventNewer(current, incoming)`
  - `projectComplaintReportStatus(projection)`
  - `markComplaintReportsForRevalidation(userId)`
- Produces:

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

- [ ] **Step 1: Add a source-contract test for persistence, projection, and event publication**

Create `tests/report-sync-events.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("report sync coordinator persists ordering and projects accepted pushes", async () => {
  const source = await readFile(
    new URL("../src/services/report-sync-events.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /report_status_event_markers_v1/);
  assert.match(source, /ticketStatusChangedEventFromPushData/);
  assert.match(source, /isIncomingReportStatusEventNewer/);
  assert.match(source, /projectComplaintReportStatus/);
  assert.match(source, /markComplaintReportsForRevalidation/);
  assert.match(source, /subscribeReportStatusChanged/);
  assert.match(source, /subscribeReportRevalidationRequested/);
  assert.match(source, /AsyncStorage\.setItem/);
});
```

- [ ] **Step 2: Run the test and confirm RED**

```bash
node --test tests/report-sync-events.test.mjs
```

Expected: FAIL because the service does not exist.

- [ ] **Step 3: Implement the ordering sidecar and listeners**

Create `src/services/report-sync-events.ts` with:

```ts
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  ticketStatusChangedEventFromPushData,
  type TicketStatusChangedPush,
} from "@/services/notification-navigation";
import {
  isIncomingReportStatusEventNewer,
  type ReportStatusEventMarker,
} from "@/services/report-sync-ordering";
import {
  markComplaintReportsForRevalidation,
  projectComplaintReportStatus,
} from "@/services/reports";

export type ReportStatusChangedEvent = TicketStatusChangedPush & {
  userId: string;
};

type MarkerMap = Record<string, ReportStatusEventMarker>;

const markerPrefix = "report_status_event_markers_v1";
const markerMemory = new Map<string, MarkerMap>();
const statusListeners = new Set<(event: ReportStatusChangedEvent) => void>();
const revalidationListeners = new Set<(userId: string) => void>();
```

Use one user-scoped sidecar key:

```ts
function markerKey(userId: string) {
  return `${markerPrefix}:${userId}`;
}
```

Load malformed/missing storage as `{}` and cache it in `markerMemory`.

- [ ] **Step 4: Implement accepted-event handling**

Use this sequence:

```ts
export async function handleReportStatusPush(data: unknown, userId: string) {
  const event = ticketStatusChangedEventFromPushData(data);
  if (!event || !userId) return false;

  const markers = await readMarkers(userId);
  const current = markers[event.ticketId] ?? null;
  if (!isIncomingReportStatusEventNewer(current, event)) return false;

  const nextMarker: ReportStatusEventMarker = {
    changedAt: event.changedAt,
    ...(event.revision === undefined ? {} : { revision: event.revision }),
  };
  markers[event.ticketId] = nextMarker;
  markerMemory.set(userId, markers);

  try {
    await AsyncStorage.setItem(markerKey(userId), JSON.stringify(markers));
  } catch (error) {
    console.warn("Failed to persist report status event ordering", error);
  }

  const accepted = { ...event, userId } satisfies ReportStatusChangedEvent;

  // Publish immediately after ordering acceptance; cache I/O failure must not delay visible UI.
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

`requestReportRevalidation` must mark the report service stale before notifying mounted views:

```ts
export function requestReportRevalidation(userId: string) {
  if (!userId) return;
  markComplaintReportsForRevalidation(userId);
  revalidationListeners.forEach((listener) => listener(userId));
}
```

Do not add a timer here. The report service's request registry deduplicates identical network work; the dedicated `revalidate` path exists specifically so correctness is not suppressed by manual-refresh cooldown.

- [ ] **Step 5: Implement subscribe/unsubscribe functions**

```ts
export function subscribeReportStatusChanged(
  listener: (event: ReportStatusChangedEvent) => void,
) {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
}

export function subscribeReportRevalidationRequested(
  listener: (userId: string) => void,
) {
  revalidationListeners.add(listener);
  return () => revalidationListeners.delete(listener);
}
```

- [ ] **Step 6: Run focused tests**

```bash
node --test tests/report-sync-ordering.test.mjs tests/report-sync-events.test.mjs
```

Expected: PASS.

- [ ] **Step 7: Commit Task 3**

```bash
git add src/services/report-sync-events.ts tests/report-sync-events.test.mjs
git commit -m "feat: coordinate push-driven report status sync"
```

---

### Task 4: Route foreground, tapped, and resumed notifications into report sync

**Files:**
- Modify: `src/app/_layout.tsx`
- Create: `tests/report-status-sync-ui.test.mjs` (initial root-layout assertions; screen assertions added in Task 5)

**Interfaces:**
- Consumes:
  - `handleReportStatusPush(data, userId)`
  - `requestReportRevalidation(userId)`
- Existing advisory cache invalidation and notification-list invalidation remain active.

- [ ] **Step 1: Add failing root-layout source assertions**

Create `tests/report-status-sync-ui.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("root notification bridge drives report sync without clearing all complaint metadata", async () => {
  const source = await readFile(
    new URL("../src/app/_layout.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /handleReportStatusPush/);
  assert.match(source, /requestReportRevalidation/);
  assert.match(source, /AppState\.addEventListener/);
  assert.doesNotMatch(source, /clearComplaintCache\(session\?\.user\.id\)/);
  assert.doesNotMatch(source, /clearComplaintCache\(session\.user\.id\)/);
  assert.match(source, /clearAdvisoryCache/);
  assert.match(source, /invalidateNotifications/);
});
```

- [ ] **Step 2: Run the test and confirm RED**

```bash
node --test tests/report-status-sync-ui.test.mjs
```

Expected: FAIL because `_layout.tsx` still clears complaint cache and does not call the sync coordinator.

- [ ] **Step 3: Replace blanket complaint-cache clearing for foreground pushes**

In `src/app/_layout.tsx`:

1. Remove the `clearComplaintCache` import.
2. Import:

```ts
import {
  handleReportStatusPush,
  requestReportRevalidation,
} from "@/services/report-sync-events";
```

3. In `handleForegroundNotification`, capture `data` once:

```ts
const data = notification.request.content.data;
```

4. When `session` exists, run report handling and preserve existing advisory/notification invalidation:

```ts
void Promise.all([
  clearAdvisoryCache(session.user.id),
  handleReportStatusPush(data, session.user.id),
]).then(() => invalidateNotifications(session.user.id));
```

Do not wait for this promise before showing the existing foreground toast.

- [ ] **Step 4: Replace ticket-tap complaint clearing with projection/revalidation**

In `openNotificationTarget`, before navigating a ticket:

```ts
const data = response.notification.request.content.data;
const ticketId = ticketIdFromPushData(data);

if (ticketId) {
  if (session) {
    void handleReportStatusPush(data, session.user.id).finally(() => {
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

Legacy ticket pushes may not satisfy the v1 parser; the unconditional revalidation request still makes the list authoritative later. Report detail navigation remains immediate.

- [ ] **Step 5: Mark reports stale on active session and app resume**

Import `AppState` from `react-native` and add a `previousAppStateRef` in `PushTokenBridge`:

```ts
const previousAppStateRef = useRef(AppState.currentState);
```

When a session becomes available, mark report data for revalidation once:

```ts
useEffect(() => {
  if (!session) return;
  requestReportRevalidation(session.user.id);
}, [session]);
```

Add resume handling:

```ts
useEffect(() => {
  const subscription = AppState.addEventListener("change", (nextState) => {
    const previousState = previousAppStateRef.current;
    previousAppStateRef.current = nextState;
    if (
      session &&
      nextState === "active" &&
      previousState !== "active"
    ) {
      requestReportRevalidation(session.user.id);
    }
  });
  return () => subscription.remove();
}, [session]);
```

Do not fetch report APIs directly from `_layout.tsx`; mounted report views own their view-specific revalidation.

- [ ] **Step 6: Run the root-layout test**

```bash
node --test tests/report-status-sync-ui.test.mjs
```

Expected: root-layout assertions PASS.

- [ ] **Step 7: Commit Task 4**

```bash
git add src/app/_layout.tsx tests/report-status-sync-ui.test.mjs
git commit -m "feat: route ticket pushes into report sync"
```

---

### Task 5: Patch mounted Recent Reports and Archive immediately, then revalidate

**Files:**
- Modify: `src/app/(tabs)/reports/index.tsx`
- Modify: `src/app/(tabs)/reports/list.tsx`
- Modify: `tests/report-status-sync-ui.test.mjs`

**Interfaces:**
- Consumes:
  - `subscribeReportStatusChanged(listener)`
  - `subscribeReportRevalidationRequested(listener)`
  - `fetchComplaintReportPage({ ..., revalidate?: boolean })`
- Both screens patch matching local `Report` rows without touching unrelated fields.

- [ ] **Step 1: Add failing screen-subscription assertions**

Extend `tests/report-status-sync-ui.test.mjs`:

```js
test("recent and archive report screens patch accepted ticket events and revalidate", async () => {
  const [recent, archive] = await Promise.all([
    readFile(
      new URL("../src/app/(tabs)/reports/index.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../src/app/(tabs)/reports/list.tsx", import.meta.url),
      "utf8",
    ),
  ]);

  for (const source of [recent, archive]) {
    assert.match(source, /subscribeReportStatusChanged/);
    assert.match(source, /subscribeReportRevalidationRequested/);
    assert.match(source, /report\.id === event\.ticketId/);
    assert.match(source, /status: event\.status/);
    assert.match(source, /revalidate: true/);
  }
});
```

- [ ] **Step 2: Run the UI test and confirm RED**

```bash
node --test tests/report-status-sync-ui.test.mjs
```

Expected: FAIL because the report screens do not subscribe yet.

- [ ] **Step 3: Update Recent Reports to preserve cached UI and inspect stale state**

In `src/app/(tabs)/reports/index.tsx`:

1. Replace `fetchComplaintReports` with `fetchComplaintReportPage`.
2. Extend `loadComplaints` options:

```ts
options?: { force?: boolean; revalidate?: boolean }
```

3. Fetch:

```ts
const [nextMeta, page] = await Promise.all([
  fetchComplaintMeta(options),
  fetchComplaintReportPage({
    force: options?.force,
    revalidate: options?.revalidate,
    userId: session?.user.id,
  }),
]);
setMeta(nextMeta);
setReports(page.reports);
```

4. Add `loadComplaintsRef` so event subscriptions can call the latest callback without resubscribing:

```ts
const loadComplaintsRef = useRef(loadComplaints);
useEffect(() => {
  loadComplaintsRef.current = loadComplaints;
}, [loadComplaints]);
```

5. After applying a cached page marked stale, request background authoritative refresh only when the current load was not already a revalidation:

```ts
if (page.isStale && !options?.revalidate && !options?.force) {
  queueMicrotask(() => {
    void loadComplaintsRef.current({ revalidate: true });
  });
}
```

Because existing `reports` state remains rendered during revalidation, do not set the full-screen loading skeleton when `options.revalidate` is true.

- [ ] **Step 4: Subscribe Recent Reports to accepted status events and revalidation requests**

Add:

```ts
useEffect(() => {
  if (!session) return;

  const unsubscribeStatus = subscribeReportStatusChanged((event) => {
    if (event.userId !== session.user.id) return;
    setReports((current) =>
      current.map((report) =>
        report.id === event.ticketId
          ? { ...report, status: event.status }
          : report,
      ),
    );
  });

  const unsubscribeRevalidation = subscribeReportRevalidationRequested(
    (userId) => {
      if (userId !== session.user.id) return;
      void loadComplaintsRef.current({ revalidate: true });
    },
  );

  return () => {
    unsubscribeStatus();
    unsubscribeRevalidation();
  };
}, [session]);
```

The status event updates React state immediately; the network call follows independently.

- [ ] **Step 5: Add the same semantics to Archive without breaking filtering/pagination**

In `src/app/(tabs)/reports/list.tsx`:

1. Extend `loadReports` options with `revalidate?: boolean`.
2. Pass `revalidate: options?.revalidate` into `fetchComplaintReportPage`.
3. Do not append during event-driven revalidation; it refreshes the current first page/view.
4. If a returned first page is stale and the current call is not already revalidation, schedule:

```ts
queueMicrotask(() => {
  void loadReportsRef.current({ revalidate: true });
});
```

5. Subscribe to status events and patch only rows currently held in `reports`:

```ts
const unsubscribeStatus = subscribeReportStatusChanged((event) => {
  if (event.userId !== session.user.id) return;
  setReports((current) =>
    current.map((report) =>
      report.id === event.ticketId
        ? { ...report, status: event.status }
        : report,
    ),
  );
});
```

6. Subscribe to revalidation requests and call the latest `loadReportsRef.current({ revalidate: true })`.

Keep query/category/sort state intact. If the updated ticket is absent from the current filtered page, the local patch is a no-op and authoritative revalidation handles inclusion/exclusion.

- [ ] **Step 6: Run UI and cache tests**

```bash
node --test tests/report-status-sync-ui.test.mjs tests/report-status-cache-sync.test.mjs
```

Expected: PASS.

- [ ] **Step 7: Commit Task 5**

```bash
git add 'src/app/(tabs)/reports/index.tsx' 'src/app/(tabs)/reports/list.tsx' tests/report-status-sync-ui.test.mjs
git commit -m "feat: sync visible report status from ticket pushes"
```

---

### Task 6: Verify missed, duplicate, reordered, and offline-safe behavior

**Files:**
- Modify tests only if a genuine uncovered requirement is found.

**Interfaces:**
- Produces: implementation ready to consume the backend v1 ticket push contract.

- [ ] **Step 1: Run all report/push focused tests**

```bash
node --test \
  tests/notification-navigation.test.mjs \
  tests/report-sync-ordering.test.mjs \
  tests/report-status-cache-sync.test.mjs \
  tests/report-sync-events.test.mjs \
  tests/report-status-sync-ui.test.mjs
```

Expected: PASS.

- [ ] **Step 2: Run the complete repository Node test suite**

```bash
node --test tests/*.test.mjs
```

Expected: PASS.

- [ ] **Step 3: Run TypeScript**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 4: Run Expo lint**

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 5: Run harness validation**

```bash
npm run harness:check
```

Expected: PASS.

- [ ] **Step 6: Review behavior against the accepted failure cases**

Verify from tests/source that:

```text
foreground valid push
  -> ordering accepted
  -> visible row patches immediately
  -> default cache patches without resetting fetchedAt
  -> report list marked for revalidation
  -> revalidate API request starts independently
  -> API result wins

duplicate/equal event
  -> no projection, no UI churn

older event
  -> no projection, no regression

cache write failure
  -> mounted UI still receives accepted event

revalidation failure/offline
  -> projected/cached status remains
  -> stale marker remains for later retry

app resume/cold session
  -> revalidation marker emitted
  -> mounted screen refreshes immediately
  -> unmounted screen later returns cache as stale, renders it, then revalidates

legacy tapped ticket push
  -> existing ticket navigation works
  -> report list is marked for revalidation even if v1 parsing is impossible
```

- [ ] **Step 7: Inspect final diff**

```bash
git diff --check
git status --short
git log --oneline --max-count=8
```

Expected: no accidental metadata cache clearing, no report TTL reduction, no polling timer, no WebSocket/SSE code, and no unrelated UI changes.

- [ ] **Step 8: Commit any verification-only test correction if required**

Only if necessary:

```bash
git add tests/*.test.mjs
git commit -m "test: finalize report status sync coverage"
```

Do not weaken assertions to make a regression pass.
