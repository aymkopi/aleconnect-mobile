import assert from "node:assert/strict";
import test from "node:test";
import { filterComplaintOptions } from "../src/features/reports/issue-search.ts";
import { creationFixtureMeta } from "../src/features/reports/creation-fixtures.ts";

test("issue search matches category, type and description without changing selection", () => {
  const meta = structuredClone(creationFixtureMeta);
  meta.types[0]!.description = "An outage affecting several streets.";
  assert.equal(filterComplaintOptions(meta, " STREETS ").categories[0]?.id, meta.categories[0]?.id);
  assert.equal(filterComplaintOptions(meta, "primary line", meta.categories[0]!.id).types[0]?.id, meta.types[0]?.id);
  assert.equal(filterComplaintOptions(meta, "no results").categories.length, 0);
  assert.equal(filterComplaintOptions(meta, "", meta.categories[0]!.id).types.length, 3);
  assert.equal(filterComplaintOptions(meta, "meter", meta.categories[0]!.id).types.length, 0);
  delete meta.types[0]!.description;
  assert.equal(filterComplaintOptions(meta, "primary").categories[0]?.id, meta.categories[0]?.id);
});
