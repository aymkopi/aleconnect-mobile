import assert from "node:assert/strict";
import test from "node:test";
import { currentTourCardHeight, nextTourCardMeasurement } from "../src/components/panelui/tour-card-measurement.ts";

test("a Tour step never borrows another step's measured height", () => {
  const first = 0, next = 1;
  const measurement = nextTourCardMeasurement(first, 200, null);
  assert.equal(currentTourCardHeight(first, measurement), 200);
  assert.equal(currentTourCardHeight(next, measurement), null);
  assert.equal(currentTourCardHeight(first, null), null);
  const updated = nextTourCardMeasurement(next, 240, measurement);
  assert.equal(currentTourCardHeight(next, updated), 240);
});

test("subpixel card measurement noise does not churn Tour state", () => {
  const owner = 0;
  const measurement = nextTourCardMeasurement(owner, 200, null);
  assert.equal(nextTourCardMeasurement(owner, 200.5, measurement), measurement);
  assert.notEqual(nextTourCardMeasurement(owner, 202, measurement), measurement);
  assert.notEqual(nextTourCardMeasurement(1, 200, measurement), measurement);
});

test("empty or invalid content measurements never reveal an empty Tour card", () => {
  const measurement = nextTourCardMeasurement(0, 200, null);
  for (const height of [0, -1, NaN, Infinity]) {
    assert.equal(nextTourCardMeasurement(0, height, null), null);
    assert.equal(nextTourCardMeasurement(0, height, measurement), measurement);
  }
});
