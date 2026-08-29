import assert from "node:assert/strict";
import test from "node:test";

const references = await import("../src/utils/human-reference.ts");

test("mobile treats compact and legacy human references as opaque display values", () => {
  assert.deepEqual(references.classifyHumanReference("tk260828-0001"), { kind: "ticket", scheme: "compact" });
  assert.deepEqual(references.classifyHumanReference("ALECO-260828-00001"), { kind: "ticket", scheme: "legacy" });
  assert.deepEqual(references.classifyHumanReference("DT260828-10000"), { kind: "dispatch_trip", scheme: "compact" });
  assert.deepEqual(references.classifyHumanReference("ADSO-260828-00001"), { kind: "advisory", scheme: "legacy" });
  assert.equal(references.normalizeHumanReference("  TK260828-0001  "), "TK260828-0001");
});
