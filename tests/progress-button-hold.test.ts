import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createHoldAttempt,
  resolveHoldDuration,
} from "../src/components/panelui/progress-button-hold.ts";
test("emergency completion needs a continuous three second hold", () => {
  const hold = createHoldAttempt(3000);
  const first = hold.begin(100);
  assert.equal(hold.complete(first, 3099), false);
  hold.cancel();
  assert.equal(hold.complete(first, 3100), false);
  const second = hold.begin(3200);
  assert.equal(hold.complete(second, 6199), false);
  assert.equal(hold.complete(second, 6200), true);
  assert.equal(hold.complete(second, 7000), false);
});
test("background or route cancellation invalidates queued completion", () => {
  const hold = createHoldAttempt(3000);
  const token = hold.begin(0);
  hold.cancel();
  assert.equal(hold.complete(token, 5000), false);
  const newer = hold.begin(6000);
  assert.equal(hold.complete(token, 10000), false);
  assert.equal(hold.complete(newer, 9000), true);
  assert.equal(resolveHoldDuration(Number.NaN), 2000);
});

test("two-second emergency hold completes only once and cancels on early release", () => {
 const hold = createHoldAttempt(2000);
 const first = hold.begin(100);
 assert.equal(hold.complete(first, 2099), false);
 hold.cancel();
 assert.equal(hold.complete(first, 2100), false);
 const second = hold.begin(2200);
 assert.equal(hold.complete(second, 4200), true);
 assert.equal(hold.complete(second, 5000), false);
});
