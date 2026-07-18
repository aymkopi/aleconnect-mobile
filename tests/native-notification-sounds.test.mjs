import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("notification sounds use Android-safe bundled resource names", async () => {
  const config = JSON.parse(await readFile(new URL("../app.json", import.meta.url), "utf8"));
  const notifications = config.expo.plugins.find(
    (plugin) => Array.isArray(plugin) && plugin[0] === "expo-notifications",
  );

  assert.ok(notifications, "expo-notifications plugin config is required");

  const sounds = notifications[1].sounds;
  assert.deepEqual(sounds, [
    "./assets/sounds/high_critical_alert.wav",
    "./assets/sounds/info_alert.wav",
    "./assets/sounds/low_medium_alert.wav",
  ]);

  for (const sound of sounds) {
    const resourceName = sound.split("/").at(-1).replace(/\.[^.]+$/, "");
    assert.match(resourceName, /^[a-z][a-z0-9_]*$/);
    await access(new URL(`../${sound.replace(/^\.\//, "")}`, import.meta.url));
  }

  const service = await readFile(
    new URL("../src/services/push-notifications.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(service, /alerts-(?:high-critical|info|low-medium)-dev/);
  for (const channelId of ["alerts-high-critical", "alerts-info", "alerts-low-medium"]) {
    assert.match(service, new RegExp(`id: "${channelId}"`));
  }
});
