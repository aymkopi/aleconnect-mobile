import test from "node:test";
import assert from "node:assert/strict";
import {
  validateProfileDraft,
  validatePasswordChange,
  expandAreas,
  compactAreas,
  profileEditAllowed,
} from "../src/features/profile/profile-state.ts";
const stations = [
  {
    id: "s",
    name: "Bitano",
    feeders: [
      { id: "a", name: "A" },
      { id: "b", name: "B" },
    ],
  },
  { id: "t", name: "Ligao", feeders: [] },
];
test("subscription round trip compresses complete substations and partial feeders", () => {
  assert.deepEqual(expandAreas(stations, ["s"], ["a", "unknown"]), ["a", "b"]);
  assert.deepEqual(compactAreas(stations, ["a", "b", "unknown"]), {
    selectedSubstationIds: ["s"],
    selectedFeederIds: [],
  });
  assert.deepEqual(compactAreas(stations, ["b"]), {
    selectedSubstationIds: [],
    selectedFeederIds: ["b"],
  });
  assert.deepEqual(compactAreas(stations, []), {
    selectedSubstationIds: [],
    selectedFeederIds: [],
  });
});
test("secure profile editing remains available with active reports", () => {
  for (const activeReportCount of [0, 2, -1, NaN])
    assert.equal(profileEditAllowed({ version: 1, activeReportCount }), true);
  for (const value of [undefined, { version: 0, activeReportCount: 0 }])
    assert.equal(profileEditAllowed(value), false);
});
test("profile and password validation preserves server limits and exact secrets", () => {
  assert.equal(
    validateProfileDraft({ phone: "0917 123 4567", email: "user@example.com" }, true),
    null,
  );
  assert.match(
    validateProfileDraft({ phone: "123", email: "user@example.com" }, true) ?? "",
    /11 digits/,
  );
  assert.match(validateProfileDraft({ phone: "09171234567", email: "bad" }, true) ?? "", /email/);
  assert.equal(validateProfileDraft({ phone: "09171234567", email: "bad" }, false), null);
  assert.equal(validatePasswordChange("current", "Frosty-River!93", "Frosty-River!93"), null);
  assert.match(validatePasswordChange("current", "short", "short") ?? "", /8–128/);
  assert.match(validatePasswordChange("current", "Frosty-River!93", "different") ?? "", /match/);
  assert.match(validatePasswordChange("Frosty-River!93", "Frosty-River!93", "Frosty-River!93") ?? "", /different/);
  assert.equal(validatePasswordChange(" current ", " Frosty-River!93 ", " Frosty-River!93 "), null);
});
