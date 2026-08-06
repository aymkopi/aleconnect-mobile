import assert from "node:assert/strict";
import test from "node:test";

import {
  createKeyedSerialExecutor,
  createPromiseRegistry,
} from "../src/utils/async-coordination.ts";

test("serial executor preserves concurrent read-modify-write operations for one key", async () => {
  const runSerially = createKeyedSerialExecutor();
  let values = [];

  const append = (value, delay) =>
    runSerially("report-queue", async () => {
      const snapshot = [...values];
      await new Promise((resolve) => setTimeout(resolve, delay));
      values = [...snapshot, value];
    });

  await Promise.all([append("first", 20), append("second", 0)]);

  assert.deepEqual(values, ["first", "second"]);
});

test("promise registry coalesces one consumer without sharing another consumer request", async () => {
  const requests = createPromiseRegistry();
  let calls = 0;

  const firstA = requests.run("consumer-a", async () => {
    calls += 1;
    await new Promise((resolve) => setTimeout(resolve, 10));
    return ["A"];
  });
  const secondA = requests.run("consumer-a", async () => {
    calls += 1;
    return ["unexpected"];
  });
  const consumerB = requests.run("consumer-b", async () => {
    calls += 1;
    return ["B"];
  });

  assert.deepEqual(await firstA, ["A"]);
  assert.deepEqual(await secondA, ["A"]);
  assert.deepEqual(await consumerB, ["B"]);
  assert.equal(calls, 2);
});
