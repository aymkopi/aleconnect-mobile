import assert from "node:assert/strict";
import test from "node:test";

import { shouldRetryHttpRequest } from "../src/utils/http-retry.ts";

test("only safe transient GET failures are retried", () => {
  assert.equal(shouldRetryHttpRequest("GET", undefined, false), true);
  assert.equal(shouldRetryHttpRequest("GET", 503, false), true);
  assert.equal(shouldRetryHttpRequest("GET", 401, false), false);
  assert.equal(shouldRetryHttpRequest("POST", 503, false), false);
  assert.equal(shouldRetryHttpRequest("POST", 503, false, true), true);
  assert.equal(shouldRetryHttpRequest("POST", 400, false, true), false);
  assert.equal(shouldRetryHttpRequest("GET", 503, true), false);
});
