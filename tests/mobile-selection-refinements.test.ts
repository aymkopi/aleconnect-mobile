import assert from "node:assert/strict";
import test from "node:test";
import { requestRadioValueChange } from "../src/components/panelui/radio-group-value.ts";
import { signInIntent, signedInDestination } from "../src/features/auth/auth-state.ts";
import { consumerMessageTimelineIndex } from "../src/features/reports/data.ts";

test("all normal sign-in destinations land on Home without bypassing password setup", () => {
  for (const mode of ["account", "email"]) for (const context of ["new", "current", "new-device", "returning", "session-ended"]) {
    const intent = signInIntent({ mode, context, returnTo: "/reports/new" });
    assert.equal(signedInDestination(intent, { user: { id: "owner" } }), "/home");
    assert.deepEqual(signedInDestination(intent, { user: { id: "owner", mustChangePassword: true } }),
      { pathname: "/required-password", params: { returnTo: "/home" } });
  }
});

test("RadioGroup only reports an actual change, including unset initial selections", () => {
  const choices: string[] = [];
  requestRadioValueChange("home", "home", value => choices.push(value));
  requestRadioValueChange("home", "shop", value => choices.push(value));
  requestRadioValueChange(undefined, "home", value => choices.push(value));
  assert.deepEqual(choices, ["shop", "home"]);
});

test("a memo notification belongs to the latest Verified step and never invents one", () => {
  const history = [
    { toStatus: "verified" as const, changedAt: "2026-10-01T00:00:00Z" },
    { toStatus: "under_review" as const, changedAt: "2026-10-02T00:00:00Z" },
    { toStatus: "verified" as const, changedAt: "2026-10-03T00:00:00Z" },
    { toStatus: "in_progress" as const, changedAt: "2026-10-04T00:00:00Z" },
  ];
  assert.equal(consumerMessageTimelineIndex(history, "Multiple reports describe a similar electrical issue in your area."), 2);
  assert.equal(consumerMessageTimelineIndex(history, null), null);
  assert.equal(consumerMessageTimelineIndex(history.slice(3), "Incident update"), null);
});
