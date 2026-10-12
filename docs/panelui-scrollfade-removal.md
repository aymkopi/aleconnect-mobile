# ScrollFade removal — 2026-10-11

User requested removal of the misplaced ScrollFade treatment. Figma was updated first: the ten start-fade instances were removed from the five Light and five Dark main phone frames on page 94:2045 in file 6uIaVRM63oHA723WKgjo5k. The structural result reports zero remaining screen fades. The shared foundation library is retained.

The application removes the six ScrollFade imports/wrappers: Home, Reports, Advisories, Hotlines, Account and shared ReportPage. Native ScrollView/FlatList/KeyboardAwareScrollView remain direct flex children. Measured Home overflow, route refs, scroll reset, keyboard handling, scroll-indicator suppression, footer clearance and native safe-area/status-bar handling are retained. No ScrollBlur replacement was added. The reusable PanelUI ScrollFade implementation remains available in the component library.

The prior Home carousel correction remains: 112px standard advisory baseline for every slide, scaled for system text, compact titles/summaries with full accessible labels, dots-only controls, 24px slide gap and 3s autoplay. API, cache, business behavior, dependencies and dark theme colors are unchanged.

## Checks

- RED: removal regression failed while Home still used ScrollFade.
- GREEN: 27/27 focused status-bar/layout/guest/carousel/presentation checks passed. The existing measured Home test was updated to read the direct scroll child.
- TypeScript passed. Scoped lint: zero errors, three pre-existing hook warnings on unchanged Hotlines/Account logic.
- Harness and whitespace checks passed before build; final handoff checks run after native inspection.
- Figma Dark Account screenshot inspected: layout and native status area retained; no screen fade remains.

Build, emulator and preservation results are appended after inspection. Evidence is under outputs/redesign-04/native-implementation/scrollfade-removal in the task visualization folder.

## Remaining acceptance

Prior Staff/public-reader reconciliation and undiagnosed native stability remain release gates. Physical Android/ARM, native iOS, spoken accessibility and live authenticated/provider/push/replay flows are unverified. This remains a signed x86_64 emulator fixture preview with background/replay/push writes paused; no production deployment, publication or data mutation.

## Final preview and native checks

- Fresh embedded Hermes bundle passed (3m51s); Gradle assemblePreview passed (1m31s, 948 tasks). Signed x86_64 fixture v41 copied/hash-verified and updated with adb install -r. Original preview certificate, package, Expo project and first-install timestamp 2026-10-09 03:36:24 remain.
- APK: C:/Users/Justine/Desktop/AleconnectApps/aleconnect-panelui-no-scrollfade-fixture-v41.apk; 68,771,857 bytes; SHA256 f98f3cab491fd12be2b81de66cf4460b3fe44b3e7b429455f7862067849e3103.
- Emulator Android15: Light Home, Reports, Advisories, Hotlines and Account inspected; Reports and Account scroll, and the shared Advisory detail body scrolls under its fixed header with no fade. Fitting Home/Advisories/Hotlines remain usable without forced scrolling. Dark130% Home and Account scroll without fades; Home's lower CTA is reachable above the navigation. Carousel remains112dp standard,146dp enlarged. Eight screenshots retained.
- No ALEConnect crash appears in the captured buffer for this bounded inspection. An additional mobile-automation helper crash appears; system/helper crashes and this visual check do not resolve historical native stability.
- Restored Android Light/font1.0 and reopened Home fixtures. Final private storage, queue and evidence aggregate digests exactly match before; queued count1 and evidence68bytes retained. No queue action, live login/submission, emergency call, uninstall or data clear.
- All14 scoped source/config/test hashes match the build snapshot. Primary Mobile six task-document hashes match their prior checkpoint; Staff/Lineman remain untouched. Graphify refresh passed4398nodes/8221edges/380communities; generated output checkpointed separately.
