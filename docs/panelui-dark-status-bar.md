# Dark surfaces, status bars and bottom sheets — 2026-10-11

**2026-10-11 update:** ScrollFade was subsequently removed from every application screen and all ten Figma main-screen previews at the user's request. Native status-bar/safe-area behavior remains. The ScrollFade section below records the prior v39 work; see [current removal handoff](panelui-scrollfade-removal.md).

Figma was updated before the application. The isolated PanelUI worktree remains uncommitted on codex/panelui-five-main; primary Staff, Mobile and Lineman source is preserved. This is a signed emulator preview, not production acceptance.

## Design and component changes

| Role | Dark color |
| --- | --- |
| Screen background | #00060F |
| Card | #0A1019 |
| Feature card / sheet / popover | #121720 |
| Secondary surface | #1A1F27 |
| Decorative outline | #292E35 |
| Input outline | #5E6268 |
| Foreground / muted foreground | #FFFFFF / #B8B9BC |
| Default primary / foreground on primary | #78C4FF / #00060F |

The dark, moon-dark and grass-dark themes share the neutral surface ramp. Accent and status semantics are retained. Light theme colors are retained. Theme regressions check readable text and contrasting primary control labels/icons. Subtle radial effects now use white at 3.5% opacity in dark mode.

Figma file 6uIaVRM63oHA723WKgjo5k, page 94:2045: both current/report token collections use the near-black ramp; all 23 explicitly Dark phone frames use the exact screen background. A Dark mode was added to the legacy color collection so inherited backdrop text and icons remain visible behind sheets. The audit normalized 1,286 eligible visible component outlines to 0.75px, with zero eligible 1px outlines remaining. Device frames, Lucide vector strokes, focus rings and 0.5px separators retain their intended widths.

The bottom-sheet audit inspected 42 actual sheet containers. Their fills use the new sheet-surface variable (white Light / #121720 Dark), with local border colors and 0.75px outlines. Fixed-white descendant card, chip, close-button and field paints were rebound to local surfaces. Field outlines retain a stronger semantic token. Sheet side padding is 16px; existing 12px content and footer gaps are retained. The shared app BottomSheet uses px-4 in both native and styled branches, bg-popover and no decorative shadow. Footer spacing remains 12px before and after the separator. Auto sizing, keyboard handling, single-sheet Back navigation and scroll-indicator suppression are retained.

Official PanelUI ScrollFade was imported with SDK-compatible expo-linear-gradient. Stable animated list types preserve refs; fade opacity clamps fitting content and overscroll. Main scroll containers and the shared ReportPage use the component. A root Expo status-bar owner selects native glyph contrast and covers the actual top safe inset without intercepting touches. Photo screens retain light glyphs. Figma uses an editable compact 16px ScrollFade representation on the ten Light/Dark main frames because the published library exposes only 40/48/56px variants. Rest opacity is zero; the gradient appears on scroll.

## Verification

- Final Mobile suite: 456/456 tests pass against the reviewed compatible Staff companion (mobile-api-release). TypeScript passes. Combined latest scoped UI lint: 17 files, zero errors, 16 documented warnings. Focused theme/scroll suite: 7/7; contrast and bounce regressions were reproduced before fixes.
- Expo dependency alignment and Doctor 21/21 passed after the compatible gradient dependency addition. Final Hermes bundle and preview Gradle assembly pass. No dependency-wide upgrade, native reset or environment-file copy was performed.
- Read-only final review found no actionable introduced defect. Graphify update passed: 4,382 nodes, 8,203 edges, 374 communities; generated output checkpointed separately.
- Native Android15 task AVD: main Dark screens and scrolled Account status-bar clearance checked on v38 with unchanged v39 source. Final v39 sign-in contrast, Appearance and Color theme, and compact hotline category sheet checked. Appearance fits at 130% text in Dark and Light. Contacts are disabled fixture data; the checked category state is empty. Report filters and Guest gate were also rendered in this turn. These are bounded visual checks, not every Figma state or live-auth journey.
- Original first-install timestamp 2026-10-09 03:36:24 remains. Read-only report queue, pending receipt and evidence aggregate hashes exactly match the pre-install values. All 30 built source/config hashes and all six preserved primary Mobile task-document hashes match.
- Captured crash buffer has no new ALEConnect crash. The Android mobile automation helper recorded a SIGSEGV at 05:46:01 UTC; historical ART/JIT/renderer instability remains undiagnosed. Successful rendering does not close the native stability gate.

## Preview artifact

Desktop/AleconnectApps/aleconnect-panelui-dark-scroll-fixture-v39.apk

- Package: com.kapecakes.aleconnectmobile; versionCode 39; x86_64 labelled fixtures.
- Size: 68,783,461 bytes.
- SHA256: 6a855533ec818661de9fd37ea680d251535753444e3e202b64b6a107d96b0b86.
- Signing certificate SHA256: fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c.
- Installed in place with adb install -r; original package/signing/Expo project identity retained. Older APKs retained. Android display settings restored to Light and font scale 1.0.

Evidence: outputs/redesign-04/native-implementation/dark-status-bar under the task visualization directory, including Figma audit ledger/screenshots, native screenshots, tests-v39.log, APK verification, source hashes, retention aggregates, crash buffers and graph checkpoints.

## Remaining acceptance

No production/API mutation, live submission, replay, queue action, seeding, emergency call, uninstall/data clear, commit, push or app publication. This color/scroll pass does not revalidate live APIs; existing Staff reconciliation and public-reader 404 findings remain in the Guest/API audit. Authenticated/provider/push/replay, physical ARM devices, native iOS and spoken accessibility are unverified. Historical native instability remains a release blocker. Follow the Guest/API audit and diagnose stability before supported-device production acceptance.

References: [PanelUI ScrollFade](https://panelui.dev/docs/components/scroll-fade), [PanelUI ScrollBlur](https://panelui.dev/docs/components/scroll-blur), [Expo system bars](https://docs.expo.dev/develop/user-interface/system-bars/), [Expo StatusBar](https://docs.expo.dev/versions/v57.0.0/sdk/status-bar/).
