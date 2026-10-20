import assert from "node:assert/strict";
import test from "node:test";
import { welcomeEntryRoute } from "../src/features/onboarding/welcome-state.ts";
import { onboardingArtwork } from "../assets/aleconnect/onboarding-artwork.ts";

test("first-time visitors see the introduction only after session and local state are ready", () => {
  assert.equal(welcomeEntryRoute({ isLoading: true, hasSession: false, hasSeenWelcome: false }), null);
  assert.equal(welcomeEntryRoute({ isLoading: false, hasSession: false, hasSeenWelcome: null }), null);
  assert.equal(welcomeEntryRoute({ isLoading: false, hasSession: false, hasSeenWelcome: false }), "/welcome");
});

test("returning visitors bypass the introduction", () => {
  assert.equal(welcomeEntryRoute({ isLoading: false, hasSession: false, hasSeenWelcome: true }), "/home");
});

test("restored sessions bypass onboarding even before its device flag is loaded", () => {
  for (const hasSeenWelcome of [null, false, true]) {
    assert.equal(welcomeEntryRoute({ isLoading: false, hasSession: true, hasSeenWelcome }), "/home");
  }
  assert.equal(welcomeEntryRoute({ isLoading: true, hasSession: true, hasSeenWelcome: false }), null);
});

test("welcome illustrations are bundled vectors with no remote images or code", () => {
  assert.equal(onboardingArtwork.length, 3);
  for (const art of onboardingArtwork) {
    for (const xml of [art.light, art.dark]) {
      assert.match(xml, /viewBox="0 0 370 344"/);
      assert.match(xml, /<path/);
      assert.doesNotMatch(xml, /<image|<script|<foreignObject|(?:href|src)=/i);
    }
  }
});
