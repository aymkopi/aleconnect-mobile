# Manual refresh and photo selection

The PR adds pull-to-refresh to Hotlines and Notifications, uses PanelUI FileUpload for New Report evidence and profile-photo selection, and enables navbar pill dragging/swiping.

## Navbar gestures

A horizontal drag beginning inside the active pill picks it up at its current position. A swipe elsewhere on the navbar moves it relative to the selected tab without jumping to the initial touch. Movement follows the finger on the UI thread, stays inside the first/last tab, and commits the closest tab only on release. A canceled gesture restores the current tab; a guest-gated or prevented destination returns the pill to the actual page. Vertical movement and ordinary taps retain their existing behavior. Reduced motion removes settling animation while preserving direct manipulation.

## Refresh policy

Manual refreshes allow three attempts in a rolling 60-second window per resource and consumer, with at least three seconds between attempts and one request in flight. Reports list/detail/type retries share the Reports budget; Advisory list/detail share Advisories; Hotlines and Notifications each have their own budget. Changing filters or leaving and reopening a screen does not reset the budget. A blocked attempt shows the remaining wait and sends no loader request, including when the cache is empty. A failed request consumes its attempt and releases the in-flight guard.

The budget lives in process memory and resets when the app restarts. It prevents accidental repeated gestures; it is not a server security boundary. Background synchronization, account/access changes, pagination, and post-mutation reloads retain their existing behavior.

## PanelUI source

The requested `panelui-native@0.122.0` returns npm E404. The available published version is `0.112.0`, used for this PR after the user asked to continue. Both apps consume copied source, so the source manifests record package integrity and local adaptations rather than adding the package as a runtime dependency. Existing component bodies unchanged between upstream 0.109.0 and 0.112.0 retain their application adaptations.

New Report uses the [listing photos grid](https://panelui.dev/docs/components/file-upload#listing-photos); profile selection uses the [profile photo composition](https://panelui.dev/docs/components/file-upload#profile-photo). The component selects and displays local files. Existing services retain authority over actual uploads.

The report grid is led by its built-in Add photos tile. With a three-photo limit, that tile occupies one of the three visible slots while space remains; at three photos it disappears, and removing a photo restores it. There is no standalone upload/add button. Live and labelled visual-fixture screens use the same picker/grid controls; fixtures keep selected images local without writing durable evidence or sending uploads.

Profile selection uses a labelled camera icon in `Avatar.Badge`, wrapped by `FileUpload.Trigger`, instead of a text upload button. Account information shows the current avatar and a camera shortcut that retains the selected linked account when opening the photo editor. Explicit Save and removal of an unsaved selection retain their original behavior.

## Compression and saved work

Report evidence still goes through `prepareEvidencePhoto`: 1400-pixel-wide WebP, adaptive quality, a verified maximum of 5,000,000 bytes, and a durable document-directory copy. FileUpload IDs are retained through preparation. Removing a preparing photo discards its late durable copy. A draft/account change rejects late picker results. Reports still upload through the existing durable queue when submitted.

Profile photos retain square device cropping and explicit Save. `compressAvatarToStrictLimit` produces 300×300 WebP at no more than 20 KiB before the existing signed upload/completion flow. The selected service account and access revision remain attached. Removing a selection does not delete the saved remote avatar, and a failed upload keeps the current avatar.

## Verification and remaining acceptance

The PR verification record is maintained in the implementation history. Executable regressions cover the refresh window, rapid and overlapping attempts, screen wiring, stale picker/draft/account results, compression handoff, removal during preparation, and duplicate profile saves.

Real-device camera/library and navbar gestures, permission dialogs, native pull-to-refresh, provider uploads, and native iOS require separate acceptance. No deployment, APK publication, device reset, or production write is part of this PR.

See [FileUpload issue reproduction notes](panelui-file-upload-issues.md) for verified source defects, application adaptations, and reproduction tests.
