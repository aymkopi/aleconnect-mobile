# Home carousel height correction — 2026-10-11

The Home carousel forced every card to 136px, leaving space below a compact advisory. The Figma advisory reference (6uIaVRM63oHA723WKgjo5k, Publisher example / Advisory 193:2888) is 112px. Home now uses that 112px baseline for both the track and every slide; the height scales with enlarged system text. The existing 16px resting sides, 24px slide gap, dots-only controls and 3s autoplay remain.

Fixed-height carousel titles truncate to one line while retaining their full accessible labels and detail navigation. Standalone list/featured cards retain their existing two/three-line titles. Schedule, affected area, severity and open cue remain visible. This is a two-line presentation correction with no API/cache/business behavior change.

## Checks

- RED reproduced: prior height136 did not match112, and compact titles allowed2 lines.
- GREEN:20/20 focused advisory, carousel and presentation regressions passed; TypeScript passed; scoped lint0 errors/0 warnings.
- Figma reference inspected; no Figma design mutation in this correction.

Build, emulator and preservation results are appended after native inspection. Evidence is under outputs/redesign-04/native-implementation/carousel-height in the task visualization folder. Historical native stability and Staff/API/device acceptance gates from the previous handoff remain open. No release/deployment/production data mutation.

## Preview build

Hermes bundle and Gradle preview assembly passed. Signed x86_64 fixture v40 was copy/hash-verified and installed with adb install -r using the existing preview certificate, package and Expo project. All6 scoped source/config hashes match, and all26 unchanged runtime hashes from v39 match. No dependency/API change, data clear or live write.

APK: C:/Users/Justine/Desktop/AleconnectApps/aleconnect-panelui-carousel-height-fixture-v40.apk

SHA256: 3af47f914e67fdacd52a5e6221db3abf47fa2d8e4dcd4c54f86719d88e9f68d9; 68783469 bytes.

## Native inspection and preservation

- Android 15 / 1080x2400 / density 420: all three standard-text cards measure 996x294 physical pixels, equivalent to 379.4x112dp. The dot row is separate from the card. Advisory control number, severity, title, time, affected area and open cue fit; feed summaries truncate without changing card height. Normal Home fits without scrolling or navigation overlap.
- Dark mode with 130% system text: all three cards measure 996x383 physical pixels (146dp, rounded from the scaled baseline). Advisory context and longer feed previews remain readable. Home scrolls 97 physical pixels to expose the complete lower CTA above the navigation; no scrollbar appears. Horizontal track overflow remains intentional.
- Restored Android Light/font scale 1.0 and reopened labelled Home fixtures. Existing package, preview certificate, Expo identity and first-install time 2026-10-09 03:36:24 retained. Final private-storage/queue/evidence aggregate digests exactly match the pre-update snapshot; queued count 1 and evidence 68 bytes retained. No queue replay, live submission, emergency call, uninstall or data clear.
- No ALEConnect crash appears in the captured buffer for this inspection. The buffer contains prior messaging, automation-helper and Google Play Services crashes; historical ALEConnect ART/JIT/renderer instability remains undiagnosed. This bounded render check does not establish overall native stability.
- Graphify refresh passed: 4390 nodes/8212 edges/382 communities; generated output checkpointed separately. Six source/config hashes match the installed build and 26 unchanged runtime hashes match v39; primary Mobile task documents remain preserved.

## Remaining acceptance

Physical Android/ARM, native iOS, spoken accessibility and live authenticated/provider/push/replay flows were not exercised. Prior Staff/public-reader reconciliation and native stability remain release gates. This APK is the signed x86_64 labelled fixture preview, with background/replay/push writes paused. No dependency upgrade, API change, production write, commit/push, deployment or publication was included.
