import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("report detail presents public phase, estimate, deadline, and history", async () => {
  const [detail, card, data] = await Promise.all([
    read("src/app/(tabs)/reports/[id].tsx"),
    read("src/features/reports/extended-outage-status-card.tsx"),
    read("src/features/reports/data.ts"),
  ]);
  assert.match(detail, /ExtendedOutageStatusCard/);
  assert.match(card, /Extended outage — Restoration in progress/);
  assert.match(card, /Next update by/);
  assert.match(card, /Public update history/);
  assert.match(data, /publicUpdates: IncidentPublicUpdate\[\]/);
});
