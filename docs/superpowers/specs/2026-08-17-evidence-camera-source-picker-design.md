# Evidence Camera Source Picker Design

Date: 2026-08-17

## Goal

Allow consumers to add report evidence either by taking a new photo with the device camera or by selecting existing photos from the device gallery, without changing the existing evidence-processing, queue, upload, or backend contracts.

## Current Behavior

`src/app/(tabs)/reports/new.tsx` currently uses `expo-image-picker` only for `launchImageLibraryAsync()`. Tapping an empty evidence slot calls the gallery picker directly. Selected images then flow through the existing `prepareSelectedPhoto()` path, which creates the local photo entry, processes/compresses it through `prepareEvidencePhoto()`, and updates the report form when processing finishes.

`app.json` currently configures the `expo-image-picker` plugin with `cameraPermission: false`, so native camera access is intentionally disabled.

## Approved Interaction

Tapping any empty evidence-photo slot opens a compact source-selection action sheet instead of opening the gallery immediately.

The sheet contains:

- **Take photo** — `Use your camera to capture the issue`
- **Choose from gallery** — `Select existing photos from your device`
- **Cancel**

The evidence tiles remain visually unchanged. The existing camera icon on an empty tile represents “add evidence,” not a direct camera shortcut.

## Camera Flow

When the consumer chooses **Take photo**:

1. Request camera permission only at that moment.
2. If permission is granted, launch the native camera through `ImagePicker.launchCameraAsync()`.
3. Restrict capture to images only.
4. Capture one photo per camera launch.
5. If the user cancels, return to the report form without changing evidence state.
6. If a photo is returned, send its URI to the existing `prepareSelectedPhoto()` function.
7. The photo then follows the same compression, local-storage, status, removal, review, queue, and upload flow as a gallery-selected image.

The camera flow must respect the existing maximum evidence-photo count. If no slots remain, no source picker or camera should open.

## Gallery Flow

When the consumer chooses **Choose from gallery**:

1. Request media-library permission only for the gallery path.
2. Open `ImagePicker.launchImageLibraryAsync()`.
3. Preserve the current multi-select behavior.
4. Set `selectionLimit` to the number of remaining evidence slots.
5. Pass each returned asset URI to `prepareSelectedPhoto()`.

No change is made to evidence compression, validation, storage, or submission.

## Permission UX

Camera and gallery permissions are independent.

If camera permission is denied:

- close/leave the source-selection interaction cleanly;
- do not navigate away from the report form;
- do not create a failed evidence item;
- show a concise user-facing message that camera access is required to take a photo;
- the consumer can still reopen the source picker and choose the gallery.

If media-library permission is denied, use equivalent behavior for gallery access.

The implementation should avoid silently returning on permission denial because that leaves the user without an explanation.

Do not request microphone permission because evidence capture remains image-only.

## Native Configuration

Update the `expo-image-picker` plugin configuration in `app.json`:

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

This is a native configuration change. A development/native build must include the updated configuration before camera capture can be fully verified on-device.

## Source Picker UI

Reuse the project's existing modal/bottom-sheet patterns rather than introducing a new dependency.

The picker should be lightweight and transient:

- title: `Add evidence photo`
- first action: camera icon + `Take photo`
- second action: image/gallery icon + `Choose from gallery`
- cancel affordance

The source picker should close before launching the selected native picker to avoid stacking modal presentation state behind the operating-system camera/gallery UI.

## State and Data Flow

Add only the local UI state required to control the source picker, for example whether it is open. Do not add source information to `ComplaintFormState` or the report payload because the backend does not need to know whether an image came from the camera or gallery.

Both sources converge on the existing path:

```text
camera/gallery URI
  -> prepareSelectedPhoto(uri)
  -> prepareEvidencePhoto(...)
  -> photoUploads[] status: processing -> ready/failed
  -> enqueueReport(... evidence ...)
  -> existing report queue/upload API
```

`prepareSelectedPhoto()` remains the single preparation entry point.

## Error Handling

- Native picker cancellation is not an error.
- Permission denial produces a concise UI message and no evidence mutation.
- Camera launch failure produces a concise error message and no evidence mutation.
- Gallery launch failure produces a concise error message and no evidence mutation.
- Existing `prepareSelectedPhoto()` processing failures retain the current `failed` photo state and error handling.
- Do not exceed `maxEvidencePhotos`, even if a picker returns more assets than requested.

## Accessibility

- Empty evidence slots retain a button role/pressable affordance.
- The source picker actions have explicit accessibility labels such as `Take evidence photo` and `Choose evidence photos from gallery`.
- Permission/error copy must not rely on iconography alone.

## Testing

Focused tests should verify:

- empty evidence slots open the source chooser rather than invoking the gallery directly;
- camera flow calls `requestCameraPermissionsAsync()` and `launchCameraAsync()`;
- gallery flow calls `requestMediaLibraryPermissionsAsync()` and `launchImageLibraryAsync()`;
- camera capture feeds exactly one returned asset into `prepareSelectedPhoto()`;
- gallery selection is limited by remaining photo slots and all accepted asset URIs use the same preparation function;
- cancellation from camera or gallery does not mutate evidence;
- permission denial does not mutate evidence and surfaces user feedback;
- the existing 1–3 photo evidence constraint remains unchanged;
- `app.json` enables a camera permission description while microphone permission remains disabled.

## Files in Scope

- `src/app/(tabs)/reports/new.tsx`
- `app.json`
- focused report/evidence regression test(s)
- `docs/agent-harness/implementation-history.md` when implementation begins

## Non-Goals

- changing the maximum number of evidence photos;
- video capture;
- microphone/audio capture;
- custom in-app camera UI;
- adding camera/gallery source metadata to the report payload;
- changing evidence compression or storage;
- changing R2, queue, API, or database contracts;
- redesigning the report wizard outside the Evidence photos source interaction.

## Rollout

This is a mobile-only feature. Because `app.json` gains native camera permission configuration, validate the feature in a fresh native development build or production build that contains the updated Expo configuration. No backend deployment or database migration is required.