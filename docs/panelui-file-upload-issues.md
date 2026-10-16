# PanelUI FileUpload audit and reproduction

Reviewed on 2026-10-16 against the published `panelui-native@0.112.0` tarball. The requested `0.122.0` returned npm E404; the task continued with the published `0.112.0` version. This app copies source rather than installing `panelui-native`. Exact upstream file hashes, package integrity and retained adaptations are recorded in [the source manifest](panelui-source-manifest.json).

The `0.109.0` to `0.112.0` comparison changes only existing icons, the package export barrel and the provider's optional keyboard loader. All previously existing component bodies are unchanged upstream. The app retains its newer individual registry overrides, Lucide mappings, accessibility, typography, border-free controls, single-sheet behavior and stable installed `KeyboardProvider` import. New FileUpload, Attachment, Menu and ImageViewer source is adapted to existing local primitives. Attachment uses a normal accessible title while busy, avoiding an otherwise unused masked-view native dependency.

## Confirmed issues and local fixes

These observations execute the actual published component/core through a deterministic mock React/native harness. They establish JavaScript behavior; they do not establish physical-device picker or gesture behavior.

| Issue | Exact trigger and observed upstream result | Local correction |
| --- | --- | --- |
| Late picker result changes an abandoned field | Start a deferred library pick, unmount its owner, then resolve the photo result. `onValueChange` still fires once. A rejected picker likewise calls the abandoned owner's `onError`. | Mounted and generation guards ignore late results and errors. |
| Disabled or cleared field can regain a photo | Start a pick; disable then reenable the field, or call `clear()`; resolve the original pick. It still adds a file. | Disabling and clear invalidate the pending generation. |
| Late camera permission opens a picker after navigation | Defer camera permission, unmount, then grant permission. `launchCameraAsync` still runs once. | Check the current owner after permission resolves. |
| Overlapping pickers and stale count can exceed the limit | Call `pick('library')` twice before either promise resolves with `multiple` and `maxFiles=1`. Both system picker calls run. Separately, append a controlled file while a picker is open; its old captured count allows another file. | Serialize picker calls and validate against the latest controlled count after await. |
| Exact image/video type hides the library source | `libraryMediaTypes(['image/png'])`, `['.png']`, `['.webp']` or `['video/quicktime']` returns an empty array. The component only probes JPEG and MP4 examples. | Determine the requested media family from MIME patterns and known extensions. |
| App-owned preparation cannot be removed correctly | Render a controlled `processing` file without an `upload` handler. Grid and List label the action “Cancel upload” and only change the local status to `canceled`; the ID remains. | Use Remove for app-owned processing; retain Cancel when a real `upload` handler exists. |

Single-file replacement remains supported. Mounted picker errors still reach `onError`. The tests also preserve cancellation for real upload handlers.

An app integration issue was also corrected: mapping a prepared report photo (`ready`) to FileUpload `done` makes `describeFileStatus` announce “Uploaded” before the durable report queue sends it. Reproduce by preparing a photo without submitting the report and reading the tile's accessibility label. The report adapter now maps `ready` to `idle`; an executable mapping regression covers this. This required no vendor change.

## Reproduce

Run the patched regressions:

```powershell
node --test tests/panelui-file-upload.test.mjs
```

To compare the same harness with untouched published source, unpack `panelui-native-0.112.0.tgz` under `.cache/panelui-upgrade/new`, then run:

```powershell
$env:PANELUI_FILE_UPLOAD_SOURCE = '.cache/panelui-upgrade/new/package/src/components/file-upload/index.tsx'
$env:PANELUI_FILE_UPLOAD_CORE = '.cache/panelui-upgrade/new/package/src/components/file-upload/file-upload-core.ts'
node --test tests/panelui-file-upload.test.mjs
Remove-Item Env:PANELUI_FILE_UPLOAD_SOURCE
Remove-Item Env:PANELUI_FILE_UPLOAD_CORE
```

The patched source passes all 13 checks, including the add-tile/limit/removal grid composition check. The published source fails the lifecycle, concurrent/count, exact media type and app-owned processing assertions. Single-file replacement and the known unknown-size behavior pass against both versions.

## Byte-limit limitation and app interaction

Upstream resizing sets the new file's `size` to `undefined`; `partitionFiles` deliberately permits unknown size. Reproduction: return a 100-byte, 100×100 image, set `maxSize=10` and `image.maxWidth=50`, and let the mocked manipulator save a 50×50 image without a reported size. The file is accepted with unknown size. This is a confirmed component limitation, not proof that a real compressed image is oversized.

Report evidence continues through the existing `prepareEvidencePhoto` compression and byte checks; durable report submission owns network upload. Profile Save continues through the existing 300×300 WebP preparation and 20 KiB limit before `uploadCurrentUserAvatar`. FileUpload only owns selection and presentation here. Reset/account changes must remount the field with the app's draft/account key; the local unmount guard prevents late selection from reaching a new owner. Removing a processing report file reaches the app's existing ID cancellation/cleanup path.

No new native modules were installed for FileUpload. Image-picker and image-manipulator already exist. Optional document-picker, haptics and blur calls remain inside direct `try` blocks; existing Scrim supplies its fallback. Physical camera/library permission flows, native crop behavior, gestures, iOS and account/device acceptance remain unverified by this harness. Export and broader app checks belong to the task handoff.

## Browser verification caveat

The final browser pass exercises the actual Grid add tile and profile camera badge with local image files. Do not resolve one web file chooser twice: combining `fileChooser.setFiles(...)` in a running Playwright script with the browser file-upload tool on that same chooser produced `NotFoundError: Failed to execute 'removeChild' on 'Node'`. The installed `expo-image-picker/src/ExponentImagePicker.web.ts` change listener calls `document.body.removeChild(input)` after resolving the selection; a second change can reach the removed input. Subsequent chooser completions handled once succeed. This records an automation/dependency interaction, not an established normal-use or native failure. No dependency source was patched.

Labelled location fixtures deliberately use `account-link-preview.invalid` and can log map style/worker failures; the location placeholder remains usable. These are separate from the photo controls. Account/photo selection and ordinary single-completion picker actions showed no new photo-control exceptions.
