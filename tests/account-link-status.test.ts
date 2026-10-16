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
  assert.equal(consumerAccountLinkRequestStatusLabel("approved"), "Approved");
  assert.equal(consumerAccountLinkRequestStatusLabel("denied"), "Declined");
  assert.equal(consumerAccountLinkRequestStatusLabel("superseded"), "No longer active");
  assert.equal(consumerAccountLinkRequestStatusLabel("escalated"), "Status unavailable");
});

test("approval history distinguishes a current link from historical or omitted metadata", () => {
  assert.equal(consumerAccountLinkRequestStatusLabel("approved", true), "Linked");
  assert.equal(consumerAccountLinkRequestStatusLabel("approved", false), "Previously approved");
  assert.equal(consumerAccountLinkRequestStatusLabel("approved"), "Approved");
});
test("inactive and unknown requests never assert current account access", () => {
  assert.equal(consumerAccountLinkRequestStatusLabel("superseded"), "No longer active");
  assert.equal(consumerAccountLinkRequestStatusLabel("unknown", true), "Status unavailable");
});


test("review copy preserves public decline reasons and distinguishes approval history", async () => {
  const { consumerAccountLinkRequestReviewMessage: message } = await import("../src/features/accounts/status.ts");
  assert.equal(typeof message, "function");
  assert.match(message({status:"approved",isCurrentLink:true}), /linked to your profile/);
  assert.match(message({status:"approved",isCurrentLink:false}), /historical/);
  assert.match(message({status:"approved"}), /check current access/);
  assert.equal(message({status:"denied",consumerReason:"Check the registered details."}), "Check the registered details.");
  assert.match(message({status:"superseded"}), /no longer active/);
  assert.match(message({status:"unexpected"}), /unavailable/);
});
