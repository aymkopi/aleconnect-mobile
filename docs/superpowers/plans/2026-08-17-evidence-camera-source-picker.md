# Evidence Camera Source Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let consumers add report evidence by either taking a new photo or selecting existing photos, while preserving the current evidence-processing, queue, upload, and backend contracts.

**Architecture:** Keep `prepareSelectedPhoto(uri)` as the single preparation entry point. Add one transient source-picker modal in the report route, split the existing gallery-only handler into camera and gallery flows, and enable the native camera permission through the existing `expo-image-picker` plugin configuration. No report payload, queue, R2, API, or database contract changes.

**Tech Stack:** Expo Router, React Native, TypeScript, `expo-image-picker`, Gluestack/Uniwind UI primitives, Node test runner.

## Global Constraints

- Keep the existing evidence minimum/maximum unchanged: 1 to 3 photos.
- Do not add video capture or microphone/audio permission.
- Do not add camera/gallery source metadata to `ComplaintFormState` or the report payload.
- Both camera and gallery assets must flow through the existing `prepareSelectedPhoto(uri)` and `prepareEvidencePhoto(...)` path.
- Camera captures exactly one photo per launch.
- Gallery retains multi-select and must cap `selectionLimit` to the remaining evidence slots.
- Camera and gallery permissions are requested lazily and independently.
- Permission denial and native-picker launch failures must surface concise user-facing feedback without adding a failed evidence item.
- Native picker cancellation is not an error and must not mutate evidence state.
- Close the source chooser before launching the operating-system camera/gallery UI.
- No backend, R2, queue, database, or report-submission contract change.
- `cameraPermission` text: `ALEConnect uses your camera to take photos for report evidence.`
- Keep `microphonePermission: false`.

---

## File Structure

- `src/app/(tabs)/reports/new.tsx`: owns source-picker state/UI plus camera/gallery handlers; continues to own `prepareSelectedPhoto()`.
- `app.json`: enables the `expo-image-picker` camera usage description while leaving microphone access disabled.
- `tests/report-evidence-picker.test.mjs`: source/config regression covering the approved interaction and contract boundaries.
- `docs/agent-harness/implementation-history.md`: records the native-config and report evidence behavior change after implementation.

---

### Task 1: Add camera/gallery evidence source selection

**Files:**
- Create: `tests/report-evidence-picker.test.mjs`
- Modify: `src/app/(tabs)/reports/new.tsx`
- Modify: `app.json`

**Interfaces:**
- Consumes: existing `prepareSelectedPhoto(uri: string)` in `NewComplaintRoute`.
- Produces: `openEvidenceSourcePicker()`, `takeEvidencePhoto()`, and `chooseEvidencePhotos()` route-local handlers.
- Preserves: `ComplaintFormState`, `prepareEvidencePhoto`, evidence queue payload, `minEvidencePhotos`, and `maxEvidencePhotos`.

- [ ] **Step 1: Create the failing source/config regression**

Create `tests/report-evidence-picker.test.mjs` with:

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("evidence photos offer camera and gallery sources through the shared preparation path", async () => {
  const [route, appConfigText] = await Promise.all([
    read("src/app/(tabs)/reports/new.tsx"),
    read("app.json"),
  ]);

  const appConfig = JSON.parse(appConfigText);
  const imagePickerPlugin = appConfig.expo.plugins.find(
    (plugin) => Array.isArray(plugin) && plugin[0] === "expo-image-picker",
  );

  assert.ok(imagePickerPlugin, "expo-image-picker plugin must remain configured");
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
  assert.match(route, /forEach\(\(asset\) => void prepareSelectedPhoto\(asset\.uri\)\)/);
  assert.match(route, /Take photo/);
  assert.match(route, /Choose from gallery/);
  assert.match(route, /Camera access is required to take an evidence photo\./);
  assert.match(route, /Photo library access is required to choose evidence photos\./);
  assert.match(route, /accessibilityLabel="Add evidence photo"/);
  assert.match(route, /accessibilityLabel="Take evidence photo"/);
  assert.match(route, /accessibilityLabel="Choose evidence photos from gallery"/);

  assert.doesNotMatch(route, /onPress=\{photo \? undefined : addPhotos\}/);
  assert.doesNotMatch(route, /mediaTypes:\s*\["videos"\]/);
});
```

- [ ] **Step 2: Run the focused test and verify it fails for the missing camera/source-picker behavior**

Run:

```powershell
node --test tests/report-evidence-picker.test.mjs
```

Expected: FAIL because `cameraPermission` is currently `false` and `new.tsx` has only the gallery-only `addPhotos()` flow.

- [ ] **Step 3: Enable the native camera permission in `app.json`**

Find the existing `expo-image-picker` plugin block:

```json
[
  "expo-image-picker",
  {
    "photosPermission": "ALEConnect uses selected photos as complaint evidence and profile images.",
    "cameraPermission": false,
    "microphonePermission": false
  }
]
```

Replace only `cameraPermission`:

```json
[
  "expo-image-picker",
  {
    "photosPermission": "ALEConnect uses selected photos as complaint evidence and profile images.",
    "cameraPermission": "ALEConnect uses your camera to take photos for report evidence.",
    "microphonePermission": false
  }
]
```

Do not add `CAMERA` manually to the Android permission array; let the Expo plugin own native camera permission configuration.

- [ ] **Step 4: Extend the report-route icon imports**

In `src/app/(tabs)/reports/new.tsx`, extend the existing `lucide-react-native` import from:

```tsx
import {
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  CircleX,
  MapPin,
} from "lucide-react-native";
```

to:

```tsx
import {
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  CircleX,
  Images,
  MapPin,
} from "lucide-react-native";
```

- [ ] **Step 5: Add source-picker and evidence-error state**

Immediately after:

```tsx
const [isMapSheetOpen, setIsMapSheetOpen] = useState(false);
```

add:

```tsx
const [isEvidenceSourcePickerOpen, setIsEvidenceSourcePickerOpen] =
  useState(false);
const [evidencePickerError, setEvidencePickerError] = useState<string | null>(
  null,
);
```

Do not add source state to `ComplaintFormState`.

- [ ] **Step 6: Replace the existing gallery-only `addPhotos()` handler**

Delete the entire existing `const addPhotos = async () => { ... }` function and replace it with:

```tsx
const availableEvidenceSlots = () =>
  Math.max(0, maxEvidencePhotos - form.photoUploads.length);

const openEvidenceSourcePicker = () => {
  if (availableEvidenceSlots() <= 0) return;
  setEvidencePickerError(null);
  setIsEvidenceSourcePickerOpen(true);
};

const runAfterEvidenceSourcePickerCloses = (action: () => void) => {
  setIsEvidenceSourcePickerOpen(false);
  setTimeout(action, 250);
};

const takeEvidencePhoto = async () => {
  if (availableEvidenceSlots() <= 0) return;
  setEvidencePickerError(null);

  try {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      setEvidencePickerError(
        "Camera access is required to take an evidence photo.",
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    void prepareSelectedPhoto(result.assets[0].uri);
  } catch {
    setEvidencePickerError(
      "Camera could not be opened. Try again or choose from gallery.",
    );
  }
};

const chooseEvidencePhotos = async () => {
  const availableSlots = availableEvidenceSlots();
  if (availableSlots <= 0) return;
  setEvidencePickerError(null);

  try {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setEvidencePickerError(
        "Photo library access is required to choose evidence photos.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: availableSlots,
      quality: 0.8,
    });

    if (result.canceled) return;

    result.assets
      .slice(0, availableSlots)
      .forEach((asset) => void prepareSelectedPhoto(asset.uri));
  } catch {
    setEvidencePickerError(
      "Photo library could not be opened. Try again.",
    );
  }
};
```

The `250` ms delay belongs only to source-picker action presses in the next step; the native picker handlers themselves remain directly testable/readable.

- [ ] **Step 7: Make Android/back navigation close the source chooser first**

In `handleBackPress`, immediately after:

```tsx
if (isSubmitting) return;
```

add:

```tsx
if (isEvidenceSourcePickerOpen) {
  setIsEvidenceSourcePickerOpen(false);
  return;
}
```

Then add `isEvidenceSourcePickerOpen` to the `useCallback` dependency array for `handleBackPress`.

This prevents a hardware/system Back action from moving report wizard steps while the chooser is visible.

- [ ] **Step 8: Change empty evidence slots to open the chooser**

In the evidence tile `Pressable`, replace:

```tsx
onPress={photo ? undefined : addPhotos}
```

with:

```tsx
onPress={photo ? undefined : openEvidenceSourcePicker}
accessibilityRole="button"
accessibilityLabel={photo ? undefined : "Add evidence photo"}
```

Keep the existing empty-slot camera icon and all existing selected-photo rendering/removal behavior.

- [ ] **Step 9: Surface evidence-source errors inside the evidence section**

Immediately after the existing evidence description:

```tsx
<Text className="mt-1 text-sm text-muted-foreground">
  Add 1 to 3 clear photos to help us assess the issue and
  verify your report faster.
</Text>
```

add:

```tsx
{evidencePickerError ? (
  <Text
    className="mt-2 text-xs text-destructive"
    accessibilityLiveRegion="polite"
  >
    {evidencePickerError}
  </Text>
) : null}
```

This feedback is intentionally separate from `submitError`; permission/native-picker errors belong to the evidence control, not report submission.

- [ ] **Step 10: Add the source chooser before the existing submitting modal**

Immediately before:

```tsx
<Modal isOpen={isSubmitting} onClose={() => undefined} size="sm">
```

insert:

```tsx
<Modal
  isOpen={isEvidenceSourcePickerOpen}
  onClose={() => setIsEvidenceSourcePickerOpen(false)}
  size="sm"
>
  <ModalBackdrop />
  <ModalContent>
    <ModalHeader>
      <Heading size="md">Add evidence photo</Heading>
    </ModalHeader>

    <ModalBody className="mb-0 mt-4 gap-2">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Take evidence photo"
        className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-4 active:bg-secondary"
        onPress={() =>
          runAfterEvidenceSourcePickerCloses(() => {
            void takeEvidencePhoto();
          })
        }
      >
        <View className="h-10 w-10 items-center justify-center rounded-full bg-secondary">
          <Camera size={19} color={mutedColor} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-sm font-semibold text-foreground">
            Take photo
          </Text>
          <Text className="mt-0.5 text-xs text-muted-foreground">
            Use your camera to capture the issue
          </Text>
        </View>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Choose evidence photos from gallery"
        className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-4 active:bg-secondary"
        onPress={() =>
          runAfterEvidenceSourcePickerCloses(() => {
            void chooseEvidencePhotos();
          })
        }
      >
        <View className="h-10 w-10 items-center justify-center rounded-full bg-secondary">
          <Images size={19} color={mutedColor} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-sm font-semibold text-foreground">
            Choose from gallery
          </Text>
          <Text className="mt-0.5 text-xs text-muted-foreground">
            Select existing photos from your device
          </Text>
        </View>
      </Pressable>

      <Button
        className="mt-2"
        variant="secondary"
        onPress={() => setIsEvidenceSourcePickerOpen(false)}
      >
        <ButtonText>Cancel</ButtonText>
      </Button>
    </ModalBody>
  </ModalContent>
</Modal>
```

The chooser closes before the OS picker launches; the short delay gives the existing modal exit animation time to release presentation state.

- [ ] **Step 11: Run the focused regression**

Run:

```powershell
node --test tests/report-evidence-picker.test.mjs
```

Expected: PASS.

- [ ] **Step 12: Run the existing report review/navigation regression**

Run:

```powershell
node --test tests/report-review-preview.test.mjs
```

Expected: PASS; static-map preview, evidence viewer, consumer-safe review copy, and Android navigation-mount guarantees remain unchanged.

- [ ] **Step 13: Commit the feature implementation**

```powershell
git add `
  "app.json" `
  "src/app/(tabs)/reports/new.tsx" `
  "tests/report-evidence-picker.test.mjs"

git diff --cached
git commit -m "feat: add evidence camera picker"
```

---

### Task 2: Record the native-config change and complete verification

**Files:**
- Modify: `docs/agent-harness/implementation-history.md`

**Interfaces:**
- Documents: camera/gallery evidence source chooser, native camera permission, unchanged evidence/backend contracts, and verification scope.

- [ ] **Step 1: Add the newest implementation-history entry**

Immediately below `# Implementation history`, add:

```md
## 2026-08-17 - Evidence camera and gallery source picker

- Repository: `aleconnect-mobile`, branch `agent/evidence-camera-source-picker`.
- Scope: tapping an empty report evidence slot now opens a compact source chooser with `Take photo` and `Choose from gallery`; camera captures one image per launch while gallery selection remains multi-select up to the existing remaining 1–3 evidence-photo limit.
- Files: `src/app/(tabs)/reports/new.tsx`, `app.json`, `tests/report-evidence-picker.test.mjs`, and this implementation-history entry.
- Contracts: camera and gallery URIs both reuse the existing `prepareSelectedPhoto()` / `prepareEvidencePhoto()` path and existing report queue payload. No backend, R2, database, evidence schema, or report-submission contract changed. Camera/gallery permissions are requested lazily and independently; microphone permission remains disabled.
- Native configuration: `expo-image-picker` now declares `ALEConnect uses your camera to take photos for report evidence.` as its camera permission description. A fresh native development/production build is required before on-device camera behavior can be considered verified.
- Verification: focused evidence-picker and report-review tests plus TypeScript, lint, Expo Doctor, harness validation, and `git diff --check` are required before handoff.
- Git/Deployment: mobile source/native-config change only; no EAS/store publication or backend deployment is included.
- Remaining risks: simulator/emulator behavior cannot substitute for a physical-device camera check, and a previously installed native binary that predates the new permission configuration will not contain the updated camera usage declaration.
- Next: run a fresh native build, verify camera permission grant/deny, capture/cancel, gallery fallback, 3-photo cap, photo removal, and report review on-device before release.
```

- [ ] **Step 2: Run focused Node tests**

```powershell
node --test tests/report-evidence-picker.test.mjs tests/report-review-preview.test.mjs
```

Expected: all focused tests pass.

- [ ] **Step 3: Run mobile static gates**

```powershell
npx tsc --noEmit
npm run lint
npx expo-doctor
npm run harness:check
git diff --check
git status --short
```

Do not claim native camera verification from these commands; they validate source/configuration only.

- [ ] **Step 4: Build and verify the native permission/configuration path**

Use the project's normal development-build path. For a connected Android development device, the expected command is:

```powershell
npx expo run:android
```

Then manually verify in one report flow:

1. Step 3 `Evidence photos` shows the same 3 slots.
2. Empty slot opens `Add evidence photo`.
3. `Take photo` requests camera access only when first used.
4. Denying camera access shows the evidence-local permission message and still allows reopening the chooser to use Gallery.
5. Granting camera access opens the native camera and adds exactly one captured photo.
6. Cancelling the camera adds nothing.
7. `Choose from gallery` requests library access independently and supports selecting only the remaining slots.
8. Camera and gallery photos both show `Preparing` then normal ready thumbnails through the existing processing path.
9. The combined count never exceeds 3.
10. Removal and Review Report behavior remain unchanged.

- [ ] **Step 5: Commit the harness history after verification**

```powershell
git add "docs/agent-harness/implementation-history.md"
git diff --cached
git commit -m "docs: record evidence camera picker"
```

- [ ] **Step 6: Final branch gate**

```powershell
node --test tests/report-evidence-picker.test.mjs tests/report-review-preview.test.mjs
npx tsc --noEmit
npm run lint
npx expo-doctor
npm run harness:check
git diff --check
git status --short
```

Expected: tests/typecheck/lint/Expo Doctor/harness/diff checks pass and the feature branch contains no unintended product changes.

---

## Release Notes

This feature changes native Expo configuration, so a JavaScript-only reload/update of an older installed binary is insufficient to validate or deliver camera permission behavior. Release through a fresh native build containing the updated `expo-image-picker` config. No backend deployment or database migration is required.
