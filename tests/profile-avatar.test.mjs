import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("profile avatar only shows fallback without a usable image", async () => {
  const [avatar, profile, details] = await Promise.all([
    readFile(
      new URL(
        "../src/features/profile/components/ProfileAvatar.tsx",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL("../src/app/(tabs)/profile/index.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../src/app/(tabs)/profile/details.tsx", import.meta.url),
      "utf8",
    ),
  ]);

  assert.match(avatar, /onLoad=\{\(\) => setImageFailed\(false\)\}/);
  assert.match(avatar, /onError=\{\(\) => setImageFailed\(true\)\}/);
  assert.match(avatar, /const showFallback = !uri \|\| imageFailed/);
  assert.match(profile, /<ProfileAvatar/);
  assert.match(details, /<ProfileAvatar/);
  assert.doesNotMatch(profile, /<AvatarFallbackText/);
  assert.doesNotMatch(details, /<AvatarFallbackText/);
});
