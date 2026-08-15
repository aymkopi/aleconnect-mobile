# Notification Settings Offline Cache Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the notification substation/feeder tree visible from the last server-confirmed state while offline and prevent feeder selection mutations until connectivity returns.

**Architecture:** `notification-settings.ts` owns a user-scoped AsyncStorage cache and returns metadata indicating cached fallback. `push-notifications.tsx` owns connectivity state via NetInfo, keeps expand/collapse interactive, disables only feeder/substation mutations offline, and refreshes from the server on reconnect before edits resume. Server POST responses remain authoritative and are the only writes that update the cache.

**Tech Stack:** React Native 0.83, Expo SDK 55, TypeScript 5.9, AsyncStorage, @react-native-community/netinfo, Node test runner.

## Global Constraints

- Cache must be scoped by authenticated user ID.
- Cache must contain only server-confirmed `NotificationSettings` values.
- Do not queue offline feeder/substation mutations.
- Disable substation tri-state actions, feeder toggle actions, Clear, and All while offline.
- Keep expand/collapse, scrolling, navigation, Push notifications, and Power advisories behavior unchanged.
- Reconnect must refresh authoritative server settings before feeder mutation controls become editable again.
- No backend/API contract changes.

---

### Task 1: Add server-confirmed notification settings cache

**Files:**
- Modify: `src/services/notification-settings.ts`
- Create: `tests/notification-settings-cache.test.mjs`

**Interfaces:**
- `fetchNotificationSettings(userId: string, options?: { force?: boolean }): Promise<NotificationSettingsResult>`
- `saveNotificationSettings(userId: string, input: SaveNotificationSettingsInput): Promise<NotificationSettingsResult>`
- `NotificationSettingsResult = NotificationSettings & { readonly isStale?: boolean }`

- [ ] **Step 1: Write failing source-contract tests**

Create `tests/notification-settings-cache.test.mjs` that reads `src/services/notification-settings.ts` and asserts the service imports AsyncStorage, declares `notification_settings_cache_v1`, scopes the cache key by user ID, writes cache after successful GET and POST, and falls back to cache on GET failure.

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("notification settings service caches server-confirmed settings per user", async () => {
  const source = await read("src/services/notification-settings.ts");
  assert.match(source, /@react-native-async-storage\/async-storage/);
  assert.match(source, /notification_settings_cache_v1/);
  assert.match(source, /cacheKey\(userId: string\)/);
  assert.match(source, /writeCache\(userId, response\)/);
});

test("notification settings fetch falls back to stale cache", async () => {
  const source = await read("src/services/notification-settings.ts");
  assert.match(source, /readCache\(userId\)/);
  assert.match(source, /isStale: true/);
});
```

- [ ] **Step 2: Run the tests to verify failure**

Run: `node --test tests/notification-settings-cache.test.mjs`
Expected: FAIL because the service is still network-only.

- [ ] **Step 3: Implement the cache in `notification-settings.ts`**

Add AsyncStorage, `NotificationSettingsResult`, `NotificationSettingsCache`, `cacheKey`, `readCache`, and `writeCache`. Change GET and POST signatures to require `userId`. GET attempts the API, caches success, and on failure returns `{ ...cached, isStale: true }` when cache exists. POST caches only the returned server response and returns `{ ...response, isStale: false }`.

- [ ] **Step 4: Run the cache tests**

Run: `node --test tests/notification-settings-cache.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `feat: cache notification settings for offline viewing`

---

### Task 2: Make feeder/substation tree read-only offline

**Files:**
- Modify: `src/app/(tabs)/profile/push-notifications.tsx`
- Create: `tests/notification-settings-offline-ui.test.mjs`

**Interfaces:**
- Consumes Task 1's user-scoped fetch/save signatures and `isStale` metadata.
- Produces `isOffline` and `isFeederEditingDisabled` state used only by feeder/substation mutation controls.

- [ ] **Step 1: Write failing UI contract tests**

Create `tests/notification-settings-offline-ui.test.mjs` asserting the screen imports NetInfo, subscribes to connectivity, renders the offline copy, disables Clear/All and feeder/substation mutation actions when offline, and does not disable expand/collapse.

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("notification feeder controls are read-only offline", async () => {
  const source = await read("src/app/(tabs)/profile/push-notifications.tsx");
  assert.match(source, /@react-native-community\/netinfo/);
  assert.match(source, /isFeederEditingDisabled/);
  assert.match(source, /Offline.*last saved feeder settings/s);
  assert.match(source, /isDisabled=\{[^}]*isFeederEditingDisabled/s);
});

test("expand collapse remains available offline", async () => {
  const source = await read("src/app/(tabs)/profile/push-notifications.tsx");
  assert.match(source, /onPress=\{\(\) => toggleExpanded\(substation\.id\)\}/);
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `node --test tests/notification-settings-offline-ui.test.mjs`
Expected: FAIL because the screen has no NetInfo/offline guard.

- [ ] **Step 3: Implement offline view behavior**

Import NetInfo. Track `isOffline`, `hasReconnectedPendingRefresh`, and cached/stale state. Pass `session.user.id` into service calls. Render cached settings normally. Show `Offline — showing your last saved feeder settings. Reconnect to make changes.` when offline with settings. Define `isFeederEditingDisabled = isLoading || isOffline || hasReconnectedPendingRefresh || !settings`.

Guard `toggleSubstation`, `toggleFeeder`, `selectAllFeeders`, and `clearAllFeeders` against `isFeederEditingDisabled`. Pass disabled state into substation/feeder pressables/checkboxes and Clear/All. Do not apply it to `toggleExpanded`, top-level preference switches, scrolling, or navigation.

- [ ] **Step 4: Run UI tests**

Run: `node --test tests/notification-settings-offline-ui.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `feat: make feeder settings read only offline`

---

### Task 3: Refresh on reconnect and protect autosave

**Files:**
- Modify: `src/app/(tabs)/profile/push-notifications.tsx`
- Modify: `tests/notification-settings-offline-ui.test.mjs`

**Interfaces:**
- Reconnect callback invokes the existing load path with a forced server refresh.
- Feeder autosave exits while `isOffline` or reconnect refresh is pending.

- [ ] **Step 1: Extend failing tests**

Add assertions that NetInfo transition from offline to online triggers forced reload, and the autosave effect contains an offline/reconnect guard.

- [ ] **Step 2: Run tests to verify failure**

Run: `node --test tests/notification-settings-offline-ui.test.mjs`
Expected: FAIL on reconnect/autosave assertions.

- [ ] **Step 3: Implement reconnect refresh and autosave guard**

Make `load` accept `{ force?: boolean }`, forward it to `fetchNotificationSettings(userId, { force })`, and retain stale metadata. NetInfo subscription marks offline immediately; when transitioning back online, keep feeder editing disabled, call `load({ force: true })`, then clear the reconnect-refresh flag. Add `isOffline` and reconnect-refresh checks to the feeder autosave effect so no feeder save starts while offline/stale reconciliation is pending.

- [ ] **Step 4: Run focused tests**

Run: `node --test tests/notification-settings-cache.test.mjs tests/notification-settings-offline-ui.test.mjs tests/notification-settings-navigation.test.mjs`
Expected: PASS.

- [ ] **Step 5: Run project verification**

Run: `npm run lint`
Expected: PASS with no new TypeScript/ESLint errors.

- [ ] **Step 6: Commit**

Commit message: `fix: refresh notification settings before offline edits resume`
