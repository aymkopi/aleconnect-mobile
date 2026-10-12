# Photo status-bar correction — 2026-10-11

The approved Home reference (Figma file 6uIaVRM63oHA723WKgjo5k, frame 94:2046) already places its photograph behind system icons. It was inspected before app changes and needs no alteration for this correction.

The shared AppStatusBar had painted an opaque #00060F View over the device-sized safe area even on photo screens. It now renders that masking View only on ordinary pages. Home and normal sign-in retain light native system icons over their already tinted, full-bleed photographs. Home greeting/search retain their existing device-safe content padding; regular-page scrolling remains masked beneath status icons. Session-ended sign-in still uses the ordinary-page treatment. No ScrollFade or ScrollBlur was added, and the 112dp advisory-height carousel and all interaction/data contracts remain unchanged.

## Verification

The focused regression failed against the prior opaque photo band, then passed with the fix. Twenty status-bar, direct-scroll/layout and carousel checks pass, alongside TypeScript and scoped lint with zero errors/warnings. Tests cover photo Light/Dark and ordinary Light/Dark/custom-Dark safe-area heights.

Fresh embedded Hermes bundle passed (3m13s) and Gradle assemblePreview passed (2m, 948 tasks). Signed x86_64 fixture v42 was copied, hash-verified and updated in place. APK: C:/Users/Justine/Desktop/AleconnectApps/aleconnect-panelui-photo-status-bar-fixture-v42.apk; 68771865 bytes; SHA256 f5526477ef6654f3dcaef39775419845e27851993b26e18b20e4f4a7e346a442. Original preview certificate, package, Expo project and first-install timestamp 2026-10-09 03:36:24 remain.

Android15 Light and Dark Home show the photo behind white status glyphs with greeting/search below the device-safe area. Light sign-in retains legible white glyphs over its tinted photograph. Light/Dark Account retain a solid theme-matched status area. The carousel still measures 294px at density2.625 (112dp). Five stable native screenshots retained. Android Light/font1.0 restored and Home fixtures reopened.

Final private storage/queue/evidence aggregate digests exactly match before; queued count1 and evidence68bytes remain. All8 source/config/test hashes match the build snapshot; six primary Mobile task-document hashes match. Staff/Lineman untouched. No ALEConnect crash appears in the bounded captured buffer; old helper/system crashes do not resolve prior native stability. Graphify refreshed4405nodes/8230edges/379communities, generated output checkpointed separately. Evidence is in outputs/redesign-04/native-implementation/photo-status-bar under the task visualization folder.

## Remaining acceptance

This is the existing labelled x86_64 emulator fixture preview. Background/replay/push writes remain paused. Physical Android/ARM, native iOS, spoken accessibility and live authenticated/provider/push/replay flows remain unverified. Prior Staff/public-reader reconciliation and undiagnosed native stability are separate release gates. No dependency/API changes, production mutation, queue action, uninstall/data clear, commit/push, deployment or publication.
