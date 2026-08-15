# Push-Driven Report Status Sync Design

## Goal
Make report status changes feel synchronized with ticket push notifications while keeping the server authoritative and avoiding polling, WebSockets, or reliance on background push execution.

## Current Problem
Foreground ticket pushes are already received globally. The current handler clears complaint caches and invalidates notifications, but it does not patch an already-mounted Reports or Archive screen. Those screens keep their existing React state until they explicitly load again.

The report service also intentionally treats the default report list as fresh for up to 60 seconds. This is useful for normal navigation efficiency, but without event-driven invalidation it allows a report row to remain visually stale even after a push notification has announced the new status.

## Chosen Architecture
Treat ticket push payloads as **change signals**, not as the permanent data source.

For a valid `ticket.status_changed` push:

1. Parse and validate the event payload.
2. Reject an event that is older than the latest known event for that ticket.
3. Immediately patch the matching report in memory and cached default report list.
4. Broadcast the event to mounted report views so visible rows update immediately.
5. Mark report data as needing authoritative revalidation.
6. Start a background forced API refresh when appropriate.
7. Replace the projected local status with the server response when it arrives.

If a push is missed entirely, app-foreground/focus/manual-refresh revalidation still restores correctness.

## Push Event Contract
The mobile client should accept the backend payload:

```ts
type TicketStatusChangedPush = {
  context: "ticket";
  event: "ticket.status_changed";
  version: 1;
  ticketId: string;
  ticketNumber?: string;
  status: string;
  changedAt: string;
  revision?: number;
};
```

Parsing must be defensive. Invalid or unsupported versions should not mutate report state, though existing navigation may continue using the legacy `context`/`ticketId` fields.

## Ordering and Idempotency
Push notifications can be duplicated or reordered.

Maintain the newest applied event marker per ticket for the current runtime and, where practical, persist enough ordering metadata with the cached report list to prevent stale background-delivered events from regressing status after restart.

Ordering rule:

1. If both current and incoming events have `revision`, accept only a strictly newer revision.
2. Otherwise compare valid server `changedAt` timestamps and reject an older timestamp.
3. Duplicate equal revision/timestamp events are idempotent and should not cause extra UI churn.

Do not attempt to infer lifecycle ordering from status names.

## Report Sync Event Service
Add a focused service, e.g. `src/services/report-sync-events.ts`, responsible for:

- parsing ticket status push data;
- publishing accepted report status events;
- subscribing/unsubscribing mounted consumers;
- coordinating cache projection and revalidation signals.

This keeps `_layout.tsx` from knowing about specific report screens.

Suggested interface:

```ts
type ReportStatusChangedEvent = {
  ticketId: string;
  status: string;
  changedAt: string;
  revision?: number;
};

subscribeReportStatusChanged(listener)
handleReportStatusPush(data, userId)
```

`handleReportStatusPush` should validate/order the event, patch report cache, publish it, and request revalidation. Screens only subscribe to accepted events.

## Report Cache Projection
Extend `src/services/reports.ts` with a targeted cache projection operation rather than deleting all complaint data.

For a matching ticket ID:

- update `complaintReportsMemoryCache.value.reports`;
- update the default `report_list_cache_v1:<userId>` AsyncStorage payload if present;
- preserve all unrelated report fields;
- preserve the cache's original `fetchedAt` value so a one-field projection does not falsely make the entire list fresh;
- attach/persist ordering metadata separately if needed rather than changing the public `Report` contract unnecessarily.

Do not clear complaint metadata for ticket status events. Categories, types, barangays, and municipalities are unaffected by a ticket lifecycle update.

## Mounted Screen Updates
Both report list surfaces must subscribe:

- `src/app/(tabs)/reports/index.tsx`
- `src/app/(tabs)/reports/list.tsx`

When an accepted event arrives, immediately patch only the matching report in local React state.

Example behavior:

```text
Pending  →  Verified
```

should appear without waiting for an API request.

If the ticket is not present in the current filtered/archive page, no local row patch is necessary; the following revalidation handles it.

## Authoritative Revalidation
After an accepted push event, initiate report revalidation without blocking the UI projection.

Use the existing report API with a targeted forced refresh of the relevant default list/view. The server response wins over projected local state.

Avoid triggering multiple concurrent full refreshes for a burst of ticket pushes. Deduplicate/coalesce revalidation with a short in-process coordination mechanism or the existing request registry/refresh-cooldown patterns.

Do not lower the normal 60-second report cache TTL globally. Event-driven invalidation/revalidation solves status freshness without increasing ordinary API/database traffic.

## Foreground Notification Flow
Update the global notification bridge so a foreground ticket push does more than clear caches.

Recommended order:

1. parse ticket event;
2. handle/publish report status event;
3. invalidate notification-list cache/unread state;
4. show the existing foreground toast;
5. revalidate reports asynchronously.

Remove blanket `clearComplaintCache()` for ticket status pushes. Use targeted report projection/revalidation instead.

Advisory push behavior remains unchanged unless handled separately.

## Background and Resume Behavior
A visible push received while the app is backgrounded may not execute foreground React listeners. Therefore app resume must provide the correctness fallback.

When the app transitions to active:

- if report data may have become stale while backgrounded, mark it for revalidation;
- mounted report screens should show cached data immediately and refresh in the background;
- opening Reports from the app icon should not require waiting on the API before anything is shown.

Do not depend on a background notification task for correctness.

A later Phase 2 optimization may register a notification background task to patch AsyncStorage before the app opens. This is optional and best-effort only.

## Notification Tap Behavior
Existing ticket navigation remains intact through `ticketIdFromPushData()`.

When a user taps a ticket notification:

- navigate to `/report/[id]` as today;
- do not clear all complaint metadata;
- the report detail route should fetch authoritative detail as it already does;
- report list cache may be projected/revalidated independently.

## Offline Behavior
If a valid ticket push is received while the foreground app has no usable network:

- apply the local status projection because the event represents a committed server transition;
- update the cached report list;
- do not show a destructive sync error solely because revalidation cannot run;
- retain a pending revalidation marker and retry on connectivity/app resume/manual refresh.

If ordering metadata cannot establish that an incoming event is newer, prefer not to regress the local state; server revalidation resolves ambiguity later.

## Error Handling
- Invalid push payload: ignore status mutation; retain notification/navigation behavior where safe.
- Duplicate event: no-op.
- Older event: no-op.
- Cache write failure: still publish to mounted screens; log non-fatal diagnostic and revalidate.
- API revalidation failure: retain projected/cached state and retry on normal lifecycle/manual refresh.
- API response conflicts with projection: API wins.

## Expected Files
- `src/services/notification-navigation.ts`
  - add typed/validated ticket event parser while preserving navigation helpers.
- `src/services/report-sync-events.ts`
  - new report status event bus/coordinator.
- `src/services/reports.ts`
  - targeted report-list cache projection and revalidation marker/helper.
- `src/app/_layout.tsx`
  - route foreground ticket pushes into the report sync coordinator instead of clearing all complaint caches.
- `src/app/(tabs)/reports/index.tsx`
  - subscribe and patch visible recent-report state.
- `src/app/(tabs)/reports/list.tsx`
  - subscribe and patch archive state.
- tests covering payload parsing, ordering, cache patching, mounted-screen contract, and resume/revalidation behavior.

## Testing Requirements
At minimum cover:

1. Valid status-change push patches matching report immediately.
2. Unrelated report rows are untouched.
3. Duplicate event is idempotent.
4. Older revision/timestamp cannot regress status.
5. AsyncStorage cache is patched without refreshing its `fetchedAt` age.
6. Mounted Recent Reports and Archive subscribers receive the event.
7. A revalidation is requested after projection.
8. Revalidation failure preserves projected state.
9. Server response replaces projected state on success.
10. Ticket notification tap navigation remains compatible.
11. Ticket push no longer clears complaint metadata.
12. App foreground/resume causes stale report data to revalidate.

## Non-Goals
- No WebSocket/SSE connection.
- No short-interval polling.
- No global reduction of report cache TTL.
- No new persistent client state-management library.
- No offline mutation of ticket status.
- No requirement that background push JavaScript execute.

## Acceptance Criteria
1. If a ticket status push arrives while the report list is visible, the matching row changes status immediately without waiting for the report API.
2. The server is revalidated asynchronously and remains authoritative.
3. Report status cannot regress because an older push arrives late.
4. Normal report-list navigation still benefits from the existing cache TTL.
5. Ticket pushes do not clear unrelated complaint metadata.
6. If the app missed push execution while backgrounded, opening/resuming the app triggers report revalidation while cached UI remains immediately available.
7. Missed, duplicate, reordered, and offline-delivered pushes cannot permanently corrupt report status state.
