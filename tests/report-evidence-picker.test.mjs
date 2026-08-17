import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("evidence photos offer camera and gallery sources", async () => {
  const [route, appConfigText] = await Promise.all([
    read("src/app/(tabs)/reports/new.tsx"),
    read("app.json"),
  ]);

  const appConfig = JSON.parse(appConfigText);

  const imagePickerPlugin = appConfig.expo.plugins.find(
    (plugin) => Array.isArray(plugin) && plugin[0] === "expo-image-picker",
  );

  assert.ok(imagePickerPlugin);

  assert.equal(
    imagePickerPlugin[1].cameraPermission,
    "ALEConnect uses your camera to take photos for report evidence.",
  );

  assert.equal(imagePickerPlugin[1].microphonePermission, false);

  assert.match(route, /isEvidenceSourcePickerOpen/);

  assert.match(route, /openEvidenceSourcePicker/);

  assert.match(route, /requestCameraPermissionsAsync\(\)/);

  assert.match(route, /launchCameraAsync\(/);

  assert.match(route, /requestMediaLibraryPermissionsAsync\(\)/);

  assert.match(route, /launchImageLibraryAsync\(/);

  assert.match(route, /allowsMultipleSelection:\s*true/);

  assert.match(route, /selectionLimit:\s*availableSlots/);

  assert.match(route, /void prepareSelectedPhoto\(result\.assets\[0\]\.uri\)/);

  assert.match(
    route,
    /forEach\(\(asset\) => void prepareSelectedPhoto\(asset\.uri\)\)/,
  );

  assert.match(route, /Take photo/);

  assert.match(route, /Choose from gallery/);

  assert.match(route, /Camera access is required to take an evidence photo\./);

  assert.match(
    route,
    /Photo library access is required to choose evidence photos\./,
  );

  assert.match(route, /accessibilityRole=\{photo \? undefined : "button"\}/);

  assert.doesNotMatch(route, /onPress=\{photo \? undefined : addPhotos\}/);
});
