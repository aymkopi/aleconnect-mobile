import assert from "node:assert/strict";
import test from "node:test";
import { reportCardDate } from "../src/features/reports/data.ts";
import { contactPresentation } from "../src/features/hotlines/contact-actions.ts";
import { accountProfileIdentifier } from "../src/features/profile/profile-state.ts";

test("ticket dates follow the latest current-status event, not unrelated edits", () => {
  const row = { status: "resolved" as const, statusChangedAt: "2026-10-16T02:00:00Z", updatedAt: "2026-10-17T02:00:00Z", createdAt: "2026-10-01T02:00:00Z" };
  assert.deepEqual(reportCardDate(row), { label: "Latest update", date: row.statusChangedAt });
  assert.equal(reportCardDate({ ...row, status: "under_review" }).label, "Latest update");
  assert.deepEqual(reportCardDate({ ...row, statusChangedAt: null }), { label: "Latest update", date: row.updatedAt });
  assert.deepEqual(reportCardDate({ ...row, statusChangedAt: "invalid", updatedAt: "invalid" }), { label: "Submitted", date: row.createdAt });
});

test("contact prefixes cover canonical types and retain meaningful labels only", () => {
  for (const [type, icon] of [["mobile", "Smartphone"], ["landline", "Phone"], ["telephone", "Phone"], ["hotline", "PhoneCall"], ["fax", "Printer"], ["other", "ContactRound"], [null, "ContactRound"], ["unexpected", "ContactRound"]]) {
    assert.equal(contactPresentation(type, type).icon, icon);
    assert.equal(contactPresentation(type, "Emergency desk").label, "Emergency desk");
  }
  assert.equal(contactPresentation("mobile", " Mobile ").label, null);
  assert.equal(contactPresentation("hotline", "Hotline/Emergency").label, null);
  assert.equal(contactPresentation("mobile", "Globe").label, "Globe");
});

test("profile identifiers use raw identity email for multiple accounts and a number for one", () => {
  assert.equal(accountProfileIdentifier(2, "identity@example.com", "10004821"), "identity@example.com");
  assert.equal(accountProfileIdentifier(1, "identity@example.com", "10004821"), "10004821");
  assert.equal(accountProfileIdentifier(1, "identity@example.com", null), "identity@example.com");
  assert.equal(accountProfileIdentifier(0, null, null), null);
});
