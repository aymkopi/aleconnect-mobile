# Notification Settings Offline Cache Design

## Goal
Keep the Alerts/Notification Settings substation and feeder tree visible when the device is offline, while preventing feeder-selection changes that cannot be saved reliably.

## Scope
This change applies only to the substation/feeder selection tree in `src/app/(tabs)/profile/push-notifications.tsx` and its data service in `src/services/notification-settings.ts`.

The top-level `Push notifications` and `Power advisories` preference switches remain unchanged.

## Current Problem
`fetchNotificationSettings()` is network-only. If the request fails while offline, the screen has no settings payload and therefore cannot render the substation/feeder hierarchy.

The feeder tree also autosaves changes. Allowing feeder selection changes while offline would create local state that has not been acknowledged by the server and could be lost or conflict with later server state.

## Chosen Approach
Use a per-user AsyncStorage cache containing the most recent server-confirmed `NotificationSettings` payload.

On a successful fetch or save, write the returned settings to the cache. On fetch failure, read and return the cached settings if available. Cached data may be stale, but it remains viewable offline.

Do not queue feeder-selection mutations while offline. Instead, render the cached tree read-only until connectivity returns.

## Cache Model
Use a user-scoped cache key such as:

`notification_settings_cache_v1:<userId>`

Cached value:

```ts
type NotificationSettingsCache = {
  fetchedAt: number;
  value: NotificationSettings;
};
```

The service should expose whether the returned data came from stale cache, for example with an optional `isStale` or equivalent metadata flag.

Unlike transient advisory content, this cache does not need a short stale expiry. Notification topology/settings are configuration data; an older server-confirmed copy is more useful offline than an empty screen. Cached state must still be visually identified as offline/stale and remain read-only.

## Service Data Flow

### Fetch
1. Attempt `GET /api/mobile/push-notifications`.
2. If successful:
   - write the returned `NotificationSettings` to the per-user cache;
   - return live settings.
3. If the request fails:
   - attempt to read the per-user cache;
   - if cache exists, return it as stale/cached data;
   - if no cache exists, propagate the load error.

### Save
1. Keep the existing server POST as the authoritative write.
2. On successful save:
   - update the per-user cache with the server response;
   - return the response.
3. Do not write draft/offline feeder changes into the cache before server confirmation.

This guarantees the cache always represents a known server-confirmed configuration.

## Connectivity State
`push-notifications.tsx` should subscribe to `@react-native-community/netinfo` and derive an offline flag from connectivity, treating the device as offline when either:

- `isConnected === false`, or
- `isInternetReachable === false`.

API failure alone must not permanently define offline state. NetInfo controls whether feeder mutation UI is enabled, while the service cache handles fetch failures and transient connectivity problems.

When connectivity returns, refresh notification settings from the server so cached topology/selections are reconciled with authoritative state.

## Offline UI Behavior
When cached settings are available offline:

- render all substations and feeders normally;
- show the last server-confirmed selected feeder count;
- show a non-destructive information message such as:
  `Offline — showing your last saved feeder settings. Reconnect to make changes.`

Disable feeder-selection mutation controls:

- substation tri-state checkbox actions;
- individual feeder toggle actions;
- `Clear`;
- `All`.

Keep non-mutating controls usable:

- expand/collapse of substation groups;
- scrolling;
- navigation/back actions.

Do not alter the behavior of the top-level `Push notifications` and `Power advisories` preference switches as part of this change.

## Autosave Safety
The existing feeder autosave effect must not initiate new feeder-selection saves while offline. Because all feeder mutation controls are disabled, draft feeder selection should remain identical to the last hydrated/server-confirmed selection.

Connectivity restoration should trigger a fresh fetch before normal feeder editing resumes where practical, preventing stale cached state from being edited against an outdated topology.

## Error Handling
- Offline + cache available: show cached data read-only; do not show a destructive load failure.
- Offline + no cache: retain the existing inability-to-load state, with messaging indicating that an internet connection is needed the first time settings are loaded.
- Online request failure + cache available: show cached data and a stale/offline-style notice where appropriate rather than an empty tree.
- Save failure while online: retain the existing autosave failure/retry behavior.

## Files Expected to Change
- `src/services/notification-settings.ts`
  - AsyncStorage cache helpers
  - user-scoped cache key
  - cache write after successful fetch/save
  - stale cache fallback after fetch failure
- `src/app/(tabs)/profile/push-notifications.tsx`
  - NetInfo connectivity subscription
  - offline/stale informational state
  - disable feeder/substation mutation controls offline
  - refresh from server when connectivity returns
- notification settings tests
  - fetch writes cache
  - failed fetch returns cache
  - no cache propagates failure
  - successful save refreshes cache
  - feeder mutation controls are disabled offline
  - expand/collapse remains available offline

## Non-Goals
- No offline mutation queue for feeder settings.
- No backend/API contract change.
- No change to notification delivery semantics.
- No global connectivity architecture refactor.
- No change to the top-level push/advisory preference switches.

## Acceptance Criteria
1. After the screen has loaded successfully at least once, the same substation/feeder tree remains visible without internet access.
2. The offline tree reflects the last server-confirmed feeder selections.
3. Substation/feeder selection controls, `Clear`, and `All` cannot change selection while offline.
4. Expand/collapse still works offline.
5. The UI clearly states that cached settings are being shown and reconnection is required to edit feeders.
6. Returning online refreshes settings from the server and restores feeder editing.
7. No unacknowledged offline feeder selection is autosaved later.
8. A first-time user with no cache still receives an appropriate load error when offline.
