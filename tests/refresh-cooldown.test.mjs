import assert from "node:assert/strict";
import test from "node:test";

import { claimRefresh } from "../src/utils/refresh-cooldown.ts";

test("refresh cooldown is scoped by resource and consumer", () => {
  assert.equal(claimRefresh("reports:user-a", 5_000, 10_000), true);
  assert.equal(claimRefresh("reports:user-a", 5_000, 12_000), false);
  assert.equal(claimRefresh("reports:user-b", 5_000, 12_000), true);
  assert.equal(claimRefresh("reports:user-a", 5_000, 15_001), true);
});
