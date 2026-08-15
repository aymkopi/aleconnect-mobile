import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("notification feeder controls are read-only offline", async () => {
  const source = await read("src/app/(tabs)/profile/push-notifications.tsx");

  assert.match(source, /@react-native-community\/netinfo/);
  assert.match(source, /const \[isOffline, setIsOffline\]/);
  assert.match(source, /isFeederEditingDisabled/);
  assert.match(
    source,
    /Offline[^\n]*showing your last saved feeder settings[^\n]*Reconnect to make changes\./,
  );
  assert.match(source, /if \(isFeederEditingDisabled\) return;/);
  assert.match(source, /isDisabled=\{[^}]*isFeederEditingDisabled/s);
});

test("expand collapse remains available offline", async () => {
  const source = await read("src/app/(tabs)/profile/push-notifications.tsx");

  assert.match(source, /onPress=\{\(\) => toggleExpanded\(substation\.id\)\}/);
  assert.doesNotMatch(
    source,
    /toggleExpanded\(substation\.id\)[\s\S]{0,200}isDisabled=\{isFeederEditingDisabled\}/,
  );
});

test("reconnect refreshes server settings before feeder edits resume", async () => {
  const source = await read("src/app/(tabs)/profile/push-notifications.tsx");

  assert.match(source, /hasReconnectedPendingRefresh/);
  assert.match(source, /NetInfo\.addEventListener/);
  assert.match(source, /void load\(\)/);
  assert.match(
    source,
    /isOffline \|\| hasReconnectedPendingRefresh/,
  );
  assert.match(
    source,
    /!hasHydrated \|\|[\s\S]*isOffline \|\|[\s\S]*hasReconnectedPendingRefresh/,
  );
});
