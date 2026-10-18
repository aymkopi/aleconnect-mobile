import test from "node:test";
import assert from "node:assert/strict";
import { formatAccountClass } from "../src/lib/account-class.ts";

test("service classes use Staff definitions, preserving unknown values", () => {
  for (const [code, label] of Object.entries({ RM: "Residential Mainland", RI: "Residential Island",
    LVM: "Low Voltage Mainland", LVI: "Low Voltage Island", HV: "High Voltage",
    CM: "Commercial Mainland", CI: "Commercial Island" })) assert.equal(formatAccountClass(code), label);
  assert.equal(formatAccountClass("Other class"), "Other class");
  assert.equal(formatAccountClass(null), null);
  assert.equal(formatAccountClass(undefined), null);
});
