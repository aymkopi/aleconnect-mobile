# Direct Color theme and shared sheets

Date: 2026-10-11. Worktree: codex/panelui-five-main.

## Result

Account → Appearance opens Color theme directly, including the existing /profile?appearance=1 search/deep link. Device settings, Light and Dark have Lucide prefixes and short descriptions. Selection changes the existing Uniwind theme immediately and closes the sheet. Back returns to Account without changing the theme. Android Back, Close and backdrop dismiss; guest restrictions remain.

Figma section [45 · Single-sheet navigation · Content and Back](https://www.figma.com/design/6uIaVRM63oHA723WKgjo5k/Aleconnect-mobile?node-id=725-19612) retains three direct-theme frames. Deleted548:11859,729:19950,731:20309; incoming links redirected, zero dangling destinations. Existing Select option foundation635:15506 now has optional Show prefix/Prefix icon properties, leaving unrelated options unchanged. Theme illustrations use existing Smartphone212:2917 and new reusable Sun870:20903/Moon870:20907 components bound to the semantic muted token.

## Shared implementation

PanelUI BottomSheet.Content defaults to floating16px side margins, radius24, padding16 and no grabber. Header controls reserve48px height; Close has a48px target. Header/body spacing is12px; Footer retains12px gaps on each side of its0.75px semantic divider. Body auto-height, overflow scrolling, gesture handling, device safe-area clearance and route-blur dismissal remain.

Reports and other pickers keep one sheet/backdrop and replace the content. Visible/Android Back returns to an actual parent. The obsolete Appearance parent and Done action are removed. Standalone Select uses the shared Header so its first option cannot sit under Close.

Select.Item accepts startContent and description, with combined accessible labels and decorative icon containers. Disabled/selected behavior is unchanged. Rich or disabled options use the styled fallback because the portable native picker cannot preserve their semantics.

## Verification

- 37 focused tests pass, including direct selection/dismissal/reopen, guest identity/gates, embedded Select, native fallback, parent navigation, route blur, alerts and hotline consumers.
- TypeScript passes. Scoped ESLint:0 errors,12 existing hook warnings.
- Figma Light/Dark screenshots verified icon placement, descriptions and compact geometry.
- Fresh Hermes bundle and Gradle assemblePreview pass; known Gradle deprecation warnings remain.
- Android15 emulator checks passed: direct Appearance; Dark selection closes/reopens selected; visible/Android Back preserve theme; Close dismisses; Device settings follows OS Dark at130% text without clipping; report filters replace content and parent Back returns within the same sheet; hotline empty-category auto sizing.
- Graphify refreshed4411nodes/8239edges/380communities; output checkpointed separately.
- Harness against the reviewed Staff companion and repository-configured whitespace checks pass. Primary Staff and Lineman checkouts remain clean; original Mobile task documents remain unchanged.

## Preview and preservation

APK: C:/Users/Justine/Desktop/AleconnectApps/aleconnect-panelui-direct-appearance-fixture-v43.apk
SHA256: 550db4bc10fc2507b34f3ce58a30597e74927e77b39daebdbd1c5446b0205628
Size: 68772333 bytes.

Signed with the existing preview certificate fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c. Package, Expo project, embedded API origin and x86_64 ABI checked. Installed in place; first-install timestamp2026-10-09 03:36:24 retained. Original private-storage/queue/evidence digests match exactly.8 built-source hashes and6 primary Mobile task-document hashes match. Crash buffer unchanged. System theme, Light OS and font1.0 restored; Home fixtures open.

Evidence: C:/Users/Justine/.codex/visualizations/2026/10/06/01a11159-52ae-76a2-8dfa-7672826bbaea/outputs/redesign-04/native-implementation/direct-appearance

## Remaining limits

This is a labelled fixture preview with writes/replay paused, signed by the existing Android Debug preview certificate. It is not a store release. Physical Android/ARM, native iOS, spoken accessibility, optional native @expo/ui sheets/picker and live authenticated/provider/push/replay acceptance remain unverified. Prior Staff/public reconciliation and native stability release gates remain open. No backend/dependency change or live mutation.
