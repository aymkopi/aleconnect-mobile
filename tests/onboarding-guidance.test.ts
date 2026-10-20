import assert from "node:assert/strict";
import test from "node:test";
import { appGuides, guideOfferKey, pendingWelcomeOffer, isInteractiveSignIn } from "../src/features/onboarding/guidance-state.ts";

test("only an interactive sign-in is a new setup opportunity, not session restoration or refresh", () => {
  const guest = { isLoading: false, userId: null };
  const account = { isLoading: false, userId: "account-a" };
  assert.equal(isInteractiveSignIn(guest, account), true);
  assert.equal(isInteractiveSignIn({ isLoading: true, userId: null }, account), false);
  assert.equal(isInteractiveSignIn(account, account), false);
  assert.equal(isInteractiveSignIn(account, { ...account, userId: "account-b" }), false);
  assert.equal(isInteractiveSignIn(account, guest), false);
  assert.equal(isInteractiveSignIn(guest, { ...account, isLoading: true }), false);
});

test("welcome offers distinguish guests, signed-in accounts and security setup", () => {
  const ready = { isLoading: false, hasSession: false, mustChangePassword: false, alreadyOffered: false, interactiveSignIn: false };
  assert.equal(pendingWelcomeOffer("guest", ready), "guest");
  assert.equal(pendingWelcomeOffer("account", ready), null);
  assert.equal(pendingWelcomeOffer("account", { ...ready, hasSession: true }), null, "a persisted choice must not reopen setup after restoration");
  assert.equal(pendingWelcomeOffer("account", { ...ready, hasSession: true, interactiveSignIn: true }), "account");
  assert.equal(pendingWelcomeOffer("guest", { ...ready, hasSession: true }), null);
  for (const flag of ["isLoading", "mustChangePassword", "alreadyOffered"]) {
    assert.equal(pendingWelcomeOffer("account", { ...ready, hasSession: true, interactiveSignIn: true, [flag]: true }), null);
  }
  for (const pending of [null, "", "reset", "unknown"]) assert.equal(pendingWelcomeOffer(pending, ready), null);
});

test("guest and account offer records never share a storage key", () => {
  const guest = guideOfferKey(null);
  const account = guideOfferKey("guest");
  assert.notEqual(guest, account);
  assert.notEqual(guideOfferKey("account/a"), guideOfferKey("account%2Fa"));
  assert.notEqual(guideOfferKey("first"), guideOfferKey("second"));
});

test("public guides cannot introduce protected report or account routes", () => {
  assert.deepEqual(appGuides.filter((guide) => guide.public).map((guide) => guide.route), ["/home", "/advisories", "/hotlines"]);
  assert.equal(new Set(appGuides.map((guide) => guide.id)).size, appGuides.length);
  for (const guide of appGuides) {
    assert.ok(guide.steps.length >= 3 && guide.steps.length <= 4);
    assert.equal(new Set(guide.steps.map((step) => step.target)).size, guide.steps.length);
    assert.ok(guide.steps.every((step) => step.title.length > 0 && step.description.length > 0));
  }
});
