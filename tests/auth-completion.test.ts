import test from "node:test";
import assert from "node:assert/strict";
import {
  authReturnRoute, authResumeRoute, signInIntent, signedInDestination, signInCopy, validateSignIn, passwordChangeConfirmed,
} from "../src/features/auth/auth-state.ts";
import { validatePasswordChange } from "../src/features/profile/profile-state.ts";

test("sign-in accepts only canonical local destinations and scalar route parameters", () => {
  assert.equal(authReturnRoute("/reports/new"), "/reports/new");
  assert.equal(authReturnRoute("/profile/link-account"), "/profile/link-account");
  for (const route of ["https://example.com", "//example.com", "/home?next=evil", "/sign-in", "/required-password", "/profile/../home", ["/reports"]])
    assert.equal(authReturnRoute(route), "/home");
  assert.deepEqual(signInIntent({ mode: ["email"], linked: ["1"], context: ["returning"] }), {
    mode: "account", linked: false, linking: false, context: "new", returnTo: "/home",
  });
  assert.equal(signInIntent({ linked: "1" }).mode, "email");
  assert.equal(signInIntent({ mode: "email" }).mode, "email");
});
test("purpose copy is shared by account contexts and email mode", () => {
  assert.equal(signInCopy("account", "new-device").title, "New device. Same account.");
  assert.equal(signInCopy("account", "returning").title, "Good to see you again.");
  assert.equal(signInCopy("account", "current").title, "Continue to ALEConnect.");
  assert.equal(signInCopy("email", "new").description, "Use the email linked to your ALECO account.");
});
test("sign-in checks empty values and email shape without trimming the secret", () => {
  assert.equal(validateSignIn("account", " 001-123 ", " "), null);
  assert.equal(validateSignIn("email", " user@example.com ", "secret"), null);
  assert.ok(validateSignIn("email", "user@", "secret"));
  assert.ok(validateSignIn("account", " ", "secret"));
  assert.ok(validateSignIn("account", "001", ""));
});
test("mandatory password completion keeps server length, difference and confirmation rules", () => {
  assert.ok(validatePasswordChange("", "new-secret", "new-secret"));
  assert.ok(validatePasswordChange("temporary", "short", "short"));
  assert.ok(validatePasswordChange("temporary", "a".repeat(129), "a".repeat(129)));
  assert.ok(validatePasswordChange("temporary", "temporary", "temporary"));
  assert.ok(validatePasswordChange("temporary", "new-secret", "different"));
  assert.equal(validatePasswordChange("temporary", "new-secret", "new-secret"), null);
});
test("only a refreshed same-principal session with an explicit cleared requirement confirms completion", () => {
  assert.equal(passwordChangeConfirmed("owner", null), false);
  assert.equal(passwordChangeConfirmed("owner", { user: { id: "other", mustChangePassword: false } }), false);
  assert.equal(passwordChangeConfirmed("owner", { user: { id: "owner", mustChangePassword: true } }), false);
  assert.equal(passwordChangeConfirmed("owner", { user: { id: "owner" } }), false);
  assert.equal(passwordChangeConfirmed("owner", { user: { id: "owner", mustChangePassword: false } }), true);
});


test("sign-in lands on Home while retaining required password and identity gates", () => {
  const intent = signInIntent({ linking: "1" });
  assert.equal(intent.mode, "account");
  assert.equal(intent.returnTo, "/profile/link-account");
  assert.equal(signInIntent({ linking: ["1"] }).linking, false);
  assert.equal(signInIntent({ linking: "1", returnTo: "//evil" }).returnTo, "/home");
  const account = { user: { id: "target-account", sessionMode: "legacy" as const, mustChangePassword: false } };
  assert.deepEqual(signedInDestination(intent, account), {
    pathname: "/required-password", params: { returnTo: "/home", linking: "1" },
  });
  const identity = { user: { id: "email-owner", sessionMode: "identity" as const, mustChangePassword: false } };
  assert.equal(signedInDestination(intent, identity), "/home");
  assert.deepEqual(signedInDestination(signInIntent({ returnTo: "/reports/new" }), {
    user: { id: "owner", mustChangePassword: true },
  }), { pathname: "/required-password", params: { returnTo: "/home" } });
});

test("session-ended recovery uses allowlisted route targets and retains mandatory-route intent", () => {
  assert.equal(authResumeRoute("/reports/new", {}), "/reports/new");
  assert.equal(authResumeRoute("/required-password", { returnTo: "/reports/queue" }), "/reports/queue");
  assert.equal(authResumeRoute("/sign-in-help", { linking: "1" }), "/profile/link-account");
  assert.equal(authResumeRoute("/sign-in", { returnTo: ["/reports/new"] }), "/home");
  assert.equal(authResumeRoute("/reports/new?private=1", {}), "/home");
  const intent = signInIntent({ context: "session-ended", returnTo: "/reports/new" });
  assert.equal(intent.context, "session-ended");
  assert.match(signInCopy("account", intent.context).description, /already saved.*queue/);
  assert.match(signInCopy("email", intent.context).description, /Unsaved changes/);
});

test('guest sign-in retains the allowlisted appearance and service submission destinations', () => {
  for (const route of ['/profile?appearance=1', '/services/request/lighting', '/services/request/disconnection']) assert.equal(authReturnRoute(route), route);
  for (const route of ['/profile?appearance=1&next=evil', '/services/request/unknown']) assert.equal(authReturnRoute(route), '/home');
});
