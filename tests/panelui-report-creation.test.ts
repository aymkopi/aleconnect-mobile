import test from "node:test";
import assert from "node:assert/strict";
import {
  creationStepErrors,
  nextCreationStep,
  previousCreationStep,
  confirmedReportReceipt,
  isDraftScopeCurrent,
  creationSubmissionMode,
  changeReportIssue,
} from "../src/features/reports/creation-state.ts";
import { initialComplaintForm } from "../src/features/reports/data.ts";
import { buildFixtureEvidence } from "../src/features/reports/creation-fixtures.ts";

test("each creation stage validates its own contract fields", () => {
  const errors = {
    typeId: "Choose type",
    location: "Choose pin",
    typeDescription: "Describe",
    evidence: "Wait for photo",
  };
  assert.deepEqual(creationStepErrors(2, errors, true), ["Choose type"]);
  assert.deepEqual(creationStepErrors(3, errors, true), ["Choose pin"]);
  assert.deepEqual(creationStepErrors(4, errors, true), ["Describe"]);
  assert.deepEqual(creationStepErrors(5, errors, true), ["Wait for photo"]);
  assert.equal(creationStepErrors(1, {}, false).length, 1);
  assert.equal(creationStepErrors(6, errors, true).length, 4);
});
test("editing a stage from review returns to review on continue or back", () => {
  assert.equal(nextCreationStep(3, true), 6);
  assert.equal(previousCreationStep(3, true), 6);
  assert.equal(nextCreationStep(3, false), 4);
  assert.equal(previousCreationStep(3, false), 2);
});
test("only a confirmed submitted ticket may produce a receipt", () => {
  assert.equal(confirmedReportReceipt(undefined), null);
  for (const status of ["queued", "submitting", "failed"])
    assert.equal(
      confirmedReportReceipt({ status, ticketId: "id", ticketNumber: "TK-1" }),
      null,
    );
  assert.equal(
    confirmedReportReceipt({
      status: "submitted",
      ticketId: null,
      ticketNumber: "TK-1",
    }),
    null,
  );
  assert.equal(
    confirmedReportReceipt({
      status: "submitted",
      ticketId: "id",
      ticketNumber: null,
    }),
    null,
  );
  assert.deepEqual(
    confirmedReportReceipt({
      status: "submitted",
      ticketId: "id",
      ticketNumber: "TK-1",
    }),
    { ticketId: "id", ticketNumber: "TK-1" },
  );
});
test("draft scope fails closed after principal, identity, revision, profile or authorization changes", () => {
  const draft = {
    principalId: "login",
    identityUserId: "consumer",
    serviceAccountId: "home",
    accessRevision: 3,
  };
  const current = {
    ...draft,
    authorizedServiceAccountIds: ["home", "family"],
    profileId: "home",
  };
  assert.equal(isDraftScopeCurrent(draft, current), true);
  for (const override of [
    { principalId: "other" },
    { identityUserId: "other" },
    { accessRevision: 4 },
    { authorizedServiceAccountIds: ["family"] },
    { profileId: "family" },
  ])
    assert.equal(
      isDraftScopeCurrent(draft, { ...current, ...override }),
      false,
    );
});
test("preview without explicit fixtures cannot submit live work", () => {
  assert.equal(creationSubmissionMode(true, false), "disabled");
  assert.equal(creationSubmissionMode(true, true), "fixture");
  assert.equal(creationSubmissionMode(false, false), "live");
});
test("changing report type clears conditional details and preserves location, action and photos", () => {
  const form = {
    ...initialComplaintForm,
    categoryId: "power",
    typeId: "old",
    categoryDescription: "General",
    typeDescription: "Old type",
    currentRegisteredName: "Old name",
    requestedRegisteredName: "New name",
    desiredAction: "Restore",
    latitude: 13.18,
    photos: ["photo"],
  };
  const changed = changeReportIssue(form, "power", "new");
  assert.equal(changed.categoryDescription, "General");
  assert.equal(changed.typeDescription, "");
  assert.equal(changed.currentRegisteredName, "");
  assert.equal(changed.requestedRegisteredName, "");
  assert.equal(changed.desiredAction, "Restore");
  assert.equal(changed.latitude, 13.18);
  assert.deepEqual(changed.photos, ["photo"]);
  assert.equal(changeReportIssue(form, "other", "").categoryDescription, "");
  assert.equal(changeReportIssue(form, "power", "old"), form);
});
test("visual evidence fixtures represent preparing, failed, maximum and removed states without device processing", () => {
  const uris = ["asset-one", "asset-two", "asset-three"];
  assert.deepEqual(buildFixtureEvidence(uris, "removed"), []);
  assert.deepEqual(
    buildFixtureEvidence(uris, "preparing").map((photo) => [
      photo.status,
      photo.size,
    ]),
    [
      ["processing", null],
      ["processing", null],
      ["processing", null],
    ],
  );
  assert.deepEqual(
    buildFixtureEvidence(uris, "failed").map((photo) => photo.status),
    ["failed", "ready", "ready"],
  );
  assert.equal(buildFixtureEvidence(uris, "ready").length, 3);
});
