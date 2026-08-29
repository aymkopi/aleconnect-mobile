import assert from "node:assert/strict";
import test from "node:test";

import {
  CONSUMER_ACCOUNT_LINK_REQUEST_STATUSES,
  consumerAccountLinkRequestStatusLabel,
  parseConsumerAccountLinkRequestStatus,
} from "../src/features/accounts/status.ts";

test("consumer account-link statuses are explicit and unknown values fail closed", () => {
  assert.deepEqual(CONSUMER_ACCOUNT_LINK_REQUEST_STATUSES, [
    "pending",
    "conflict",
    "approved",
    "denied",
    "superseded",
  ]);
  assert.equal(parseConsumerAccountLinkRequestStatus("pending"), "pending");
  assert.equal(parseConsumerAccountLinkRequestStatus("escalated"), null);
  assert.equal(consumerAccountLinkRequestStatusLabel("pending"), "Under review");
  assert.equal(consumerAccountLinkRequestStatusLabel("conflict"), "Needs staff review");
  assert.equal(consumerAccountLinkRequestStatusLabel("approved"), "Linked");
  assert.equal(consumerAccountLinkRequestStatusLabel("denied"), "Declined");
  assert.equal(consumerAccountLinkRequestStatusLabel("superseded"), "Removed");
  assert.equal(consumerAccountLinkRequestStatusLabel("escalated"), "Status unavailable");
});
