import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("image-only uploads avoid microphone access while camera capture declares its rationale", async () => {
  const config = JSON.parse(await readFile(new URL("../app.json", import.meta.url), "utf8"));
  const imagePicker = config.expo.plugins.find(
    (plugin) => Array.isArray(plugin) && plugin[0] === "expo-image-picker",
  );

  assert.ok(imagePicker, "expo-image-picker plugin config is required");
  assert.equal(
    imagePicker[1].cameraPermission,
    "ALEConnect uses your camera to take photos for report evidence.",
  );
  assert.equal(imagePicker[1].microphonePermission, false);
});
