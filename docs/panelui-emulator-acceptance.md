# PanelUI emulator acceptance — 2026-10-09

The approved five-main-page foundation is implemented, with a minimal sign-in bridge and explicit boundaries for later child workflows. The user selected an emulator instead of a physical phone. No production release is implied.

## Checkout and device

| Item | Verified value |
| --- | --- |
| Worktree | C:/Users/Justine/AppData/Local/Temp/aleconnect-panelui |
| Branch / base | codex/panelui-five-main / bf7b2a0bde74757ce37d8db052473121c7409146 |
| Runtime | Node 24.21.0; Expo 57.0.26; React Native 0.86.3 |
| Emulator | AleconnectPanelUIPreview / emulator-5554 |
| OS / ABI | Android 15, API35 Google APIs, 16 KB page size, x86_64 |
| Standard display | 1080x2400, density420; approximately 411x914 logical pixels |
| Extra display checks | density480 / 360x800 with font scale1.3; density360 / 480x1066 |
| Restored settings | Standard density420, font scale1.0, original accessibility and animation settings |

The primary Mobile checkout's six pre-existing task documents retain their starting SHA256 hashes. Staff and Lineman source/device state was not changed. Worktree source remains uncommitted. Old presentation sources are retained under legacy/presentation; no legacy renderer is mounted.

## Installed APK

| Item | Verified value |
| --- | --- |
| Package | com.kapecakes.aleconnectmobile |
| Version code | 7, greater than baseline1 |
| Certificate SHA256 | fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c |
| APK SHA256 | 16915b9ab2b0d79f0428c702e525e1330d1ad88b7150c7ef673bf472ea2681c9 |
| Size | 66,965,517 bytes |
| Native architecture | x86_64 only |
| Debuggable | False |
| First install | 2026-10-09 03:36:24, unchanged through final update |
| Final update | 2026-10-09 05:25:20, emulator package-manager clock |
| Delivery | C:/Users/Justine/Desktop/AleconnectApps/aleconnect-panelui-emulator-preview.apk |

The original preview APK and copied ignored preview key have matching certificates. This is the existing preview certificate (CN=Android Debug), not evidence of production/store signing readiness. The original key/APK were not overwritten. Updates used install -r, without uninstall, data clear, downgrade bypass or signature bypass. Desktop copy hash matches the built APK.

Preview embeds only the configured public HTTPS API endpoint and EXPO_PUBLIC_PANELUI_PREVIEW=1. Queue replay, background report writes, receipt consumption and push-token registration are paused. No environment file, credentials or new session was copied.

## Retained-data proof

An emulator-only seed refuses production builds, physical devices and existing queue/receipt data. It created one synthetic queued report, a pending completion receipt and a real 68-byte evidence PNG owned by __panelui_emulator_retention__. This does not impersonate a consumer.

Snapshots before the update and after v3, v4, v5 and finalv7 match exactly:

- Queue/receipt storage digest: ddda1e068222e377df3de9401a6ed7b6.
- Queued items: 1.
- Evidence exists, 68 bytes, digest d8bb5d59888d24b6e13af6a76b0bb7a5.

The seeded queue/receipt remain unconsumed. Real authenticated session continuity and a real user's retained data remain unverified. Automatic approval review rejected adb root; the successful proof uses app-owned APIs and public package metadata instead.

## Native UI acceptance

| Area | Observed result |
| --- | --- |
| Five destinations | Home, Reports, Advisories, Hotlines and Account render and switch through the floating pill |
| Themes | All five captured in light and dark; appearance select, Back and current setting checked |
| Home | 4x2 shortcuts retained; standard phone fits visible CTA; small/large-text overflow scroll makes CTA reachable; tall screen preserves breathing room |
| Fields | Password prefix/suffix align in equal48px columns with one border; keyboard-visible reveal/hide and email-mode switch checked without submitting |
| Reports | Canonical statuses, actual count badges, explicit count line metrics, period select sheet; counts describe loaded records, not complete server totals |
| Advisories | Notification action, compact tabs, featured interruption and story summaries; full-card subtle radial verified |
| Hotlines | Compact911 swipe card and agency/contact pills; category sheet excludes a second911 card; Back dismisses; fixture calling disabled |
| Sheets | Gallery and creation boundary open/dismiss; reduced-motion settings exercised and restored |
| Accessibility | Labels, selected/disabled states and enlarged-text rendering inspected; TalkBack did not bind during automation, so spoken order/focus-trap acceptance is unverified |
| Emergency calling | No911 call or automated dial was placed |

Final status-bar icons contrast with Home's photo and the selected app theme. Native findings corrected: unsupported Hermes Array.toSorted, legacy color token, short count line boxes, padded-content SVG clipping, Home CTA overlap/overflow, cramped Emergency/Advisories labels and principal-bound consumer snapshot/sign-in transitions.

## Checks

| Check | Result |
| --- | --- |
| Full application suite | 272 tests: 271 passed, 0 failed, 1 pre-existing skip |
| Focused final auth/foundation/privacy/overflow/retention | 12 passed |
| TypeScript | Passed after final code changes |
| ESLint | 0 errors,167 warnings; baseline41. Copied/source hook/compiler warnings remain |
| Android final Gradle preview | Passed,2m42s warm build, signed/bundled |
| Android Hermes export | Passed; final Android bundle also built inside Gradle |
| Final iOS Hermes export | Passed; native iOS not tested |
| Expo Doctor | 20/21; sole failed check is six existing Expo patch recommendations |
| Harness / whitespace | Passed; isolated-worktree sibling warning remains expected |
| Graphify | AST refresh recorded separately from source changes |

No numeric startup speedup, runtime performance improvement or cross-ABI APK-size saving is claimed. Activity launch is not a JS-ready benchmark. The smaller candidate excludes three baseline ABIs.

## Remaining gates and deferred findings

- Child report creation/details, account editing/linking, alerts/notifications, onboarding, map/evidence and full directory/services screens are explicit phase boundaries, not implemented workflows.
- Required password setup fails closed at its boundary. Complete recovery/verification and authenticated native acceptance are later work.
- Full-period report KPIs require a Staff API contract; the page truthfully uses loaded records.
- Fresh review accepted two important fixes: cross-principal snapshot isolation and Home overflow. Two minor findings were deferred: category choices shrink to currently filtered report rows, and the main hotline category grid excludes the entire category containing ALECO, potentially hiding sibling agencies.
- Spoken TalkBack, real authenticated session retention, physical hardware and native iOS remain unverified. No live account/report/profile mutation or911 call was tested.
- Worktree stays in Temp to avoid Windows native path limits; the external source checkpoint protects it from temporary-directory cleanup.

## Artifacts and next step

Evidence: C:/Users/Justine/.codex/visualizations/2026/10/06/01a11159-52ae-76a2-8dfa-7672826bbaea/outputs/redesign-04/native-implementation. Includes final-apk.json, retention-final-v7.json, primary-preservation-final.json, logs, screenshots and source checkpoint.

Review the five pages on this emulator. Next: address the deferred filters and authenticated acceptance before adding child routes. No commit, push, merge, Staff/API deployment, EAS, OTA or store release was performed.

Closeout: emulator reopened as a visible Android Emulator window; installed version7 and exact retained-data snapshot survived the restart. Left on labelled Home fixtures for review. Task Metro stopped; temporary W: mapping removed. Final harness and whitespace checks passed. Staff/Lineman checkouts are clean; Mobile retains only the six original task documentation changes, hash-identical.


## Version 8 — Single-sheet navigation acceptance (2026-10-09)

Reports Category and Sort replace content within the existing filter sheet. Visible Back preserves staged criteria; Android Back returns from the picker to filters. Selection returns to filters. Apply commits both criteria and closes the sheet. Closing without Apply discards staged changes; reopening restores applied criteria. Backdrop dismissal closes the whole sheet.

Appearance Color theme also replaces content. Visible and Android Back return without changing the selected theme; selecting Dark returns to Appearance. The options and selected row were visually inspected in light and dark. Done closes the sheet. Original Use device setting was restored and the emulator left on Home. Drag dismissal was not repeated in this pass.

Signed/bundled version8 installed with adb install -r using the same package and preview certificate. APK SHA256: 94f20c946170607eacd24caed76fe308161dbe857c868ab213af130d3c420e27. Copy: C:/Users/Justine/Desktop/AleconnectApps/aleconnect-panelui-sheet-navigation-v8.apk. First-install time and exact synthetic queue/receipt/evidence digests were unchanged. After the user accidentally closed the emulator, the same AVD was reopened without wiping its data; version8 and the retention proof survived.

Final focused regressions:7 passed. Full suite before the final additional Select content regression:273 passed,1 baseline skip,0 failed. TypeScript passed; scoped lint0 errors/13 existing warnings; signed Android build passed. Figma22 states each contain one sheet and one scrim; picker Back uses Back, selection Navigate, and no nested overlay transitions remain in the inspected sheet frames.

Evidence: sheet-navigation/native-interactions.json, update-proof.json, figma-audit.json, light/dark screenshots and source-checkpoint overrides under the evidence directory above. Native iOS, physical hardware, spoken accessibility, authenticated real-data retention and production signing remain unverified; this preview still pauses replay/writes. No commit, push or release.


## Version 9 — Hidden page scroll indicators (2026-10-09)

Scope: all five main pages, sign-in and the development gallery hide vertical and horizontal indicators. Home keeps its existing conditional scrolling and horizontal carousel; ScrollView/FlatList layout, keyboard behavior and virtualization are unchanged. Shared PanelUI sheet/select/search/tab scrollers already hid indicators and were left intact.

Verification: all8 page/carousel scrolling elements inspected with TypeScript AST; both indicator flags are false. Six untracked screen files compare to the prior recovery checkpoint with only indicator props changed; sign-in adds the same two props. TypeScript passed; scoped lint0 errors/2 existing Hotlines hook warnings. Graphify refresh passed and generated output was retained separately.

Signed/bundled v9 build passed (10m43s) and installed in place; package/certificate/first-install time unchanged. Synthetic queue/receipt/evidence digests match before/after. Hotlines swipe moved content34px and Account666px; screenshots show no indicators. No account/profile/report mutation or call was invoked. Emulator remains open for review. One first-launch native HybridData DestructorThread crash was recorded immediately after installation; three subsequent cold launches rendered successfully and it did not repeat during page/swipe checks. The native race is unresolved and not attributed to the scroll props. Focused existing tests5 passed. APK: C:/Users/Justine/Desktop/AleconnectApps/aleconnect-panelui-no-scrollbars-v9.apk. SHA256:26d384e853ec55693785bf52d41abef8310f81c83f006775e3ee22fe263acea6. No uninstall/data clear.

Remaining risks: native iOS and physical hardware are unverified; future child pages must follow the same no-indicator policy.

## Version10 — Inter and Plus Jakarta Sans typography (2026-10-09)

Scope: current Figma page94:2045 and the active PanelUI app. Figma873 directly edited SF Pro text layers/ranges plus seven local text styles were migrated; final font audit reports zero SF Pro and zero missing-font text layers. Existing component instances, fixed geometry, font sizes, line heights, tracking and colors are preserved. Text boxes that size to content account for64 small geometry changes; inspected Home, five-page overview, report review, dark Home and dark password fields remain clear. The two Cousine ticket-ID exceptions were retained. Full font-role rationale: [typography handoff](panelui-typography.md).

App changes: native Inter400/500/600/700 utility aliases; shared Text removes class-string font parsing and forced inline defaults; Input uses its existing normal-weight utility; Home greeting uses Jakarta60025/31. Main titles/KPI figures retain Jakarta700. No dependency changes or new font assets. Containers, decorators, borders, scroll-indicator policy and click targets are unchanged.

Verification: focused typography/shared-control regressions9 passed, including actual Tailwind native-face output and RTL/caller-style preservation. TypeScript passed; scoped lint passed with0 errors/0 warnings. Impeccable type detector returns zero findings before/after. Graphify AST refreshed and saved separately. Android Gradle preview passed in4m44s (44 tasks executed,904 up-to-date); final iOS Hermes export passed. Expo alignment still reports the same six baseline patch recommendations; no dependency upgrade included.

Signed/bundled x86_64 version10 installed with adb install -r, after verifying both the actual installed APK and candidate certificates. Package com.kapecakes.aleconnectmobile and preview signer fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c are unchanged. FirstInstallTime2026-10-0903:36:24 retained; last update07:43:11. Exact synthetic retention after update: storageDigest ddda1e068222e377df3de9401a6ed7b6, queueCount1, evidence68bytes/d8bb5d59888d24b6e13af6a76b0bb7a5. No fixture reseeding, uninstall or data clear.

Rendered checks: all five populated pages in light/dark; sign-in labels/fields/buttons; 130% dark sign-in, Home and Reports. Enlarged Reports labels/cards wrap without clipping, and Home scrolls to reveal the CTA (Create report moved from y2206 to1950; bottom navigation begins2186). Standard Home fits with4x2 shortcuts and existing carousel. Scrollers still hide indicators. No calls, report submissions or account mutations were invoked. Android font_scale1.0 and system night mode no restored; app Appearance remains System. Post-version10 crash buffer contains no new crash during the observed startup/configuration checks. This does not resolve the earlier v9 native cleanup race.

APK: C:/Users/Justine/Desktop/AleconnectApps/aleconnect-panelui-inter-jakarta-v10.apk. SHA256 a6b98abd74e5553242c3a7f4a7c2426d1eec3ab662de2805c34d86019cfc7a73; 66,964,909bytes. Evidence and recovery overrides: native-implementation/typography. Before snapshots, current source checkpoint, Figma changed IDs/font audit, emulator screenshots, signature/retention proof and generated graph are retained there.

Remaining risks: native iOS/physical hardware/spoken accessibility/authenticated real-data acceptance remain unverified; six Expo patch recommendations and prior native cleanup race remain open. This is an emulator preview, not a store release. Primary checkouts remain preserved. No commit/push/deploy/publication.

Next: review typography on the open emulator; keep the role mapping for future child screens. Final harness/whitespace and primary preservation results are recorded with the source checkpoint.

## Version11 — Shared bottom-sheet footer spacing (2026-10-09)

Scope: BottomSheet.Footer now owns12px above its1px semantic separator and12px below, fixing Reports, Appearance, hotline pin customization and the shared phase-boundary sheet. The optional native host root no longer adds another8px child gap. Footerless contact and picker sheets remain unchanged. Figma23 action-sheet variants use the same12px separator gaps and light/dark border tokens; all fit inside their phones with existing bottom anchors and action IDs/prototypes retained.

Verification: TypeScript passed; focused7 regressions passed; scoped lint0 errors/9 warnings, identical to saved pre-change source. Signed x86_64 version11 Gradle build passed in5m9s after task-only worker limits resolved a Metro allocation failure; no dependency/build-setting change included. Figma all23 geometry checks passed and Reports/Appearance renders were inspected. Native Reports, Appearance, pinned categories and shared Service Requests sheets were visually inspected; the last body elements end at2152–2153px and footer buttons begin2218–2219px, with a semantic divider between equal12dp gaps. Reports dark130% text remained readable and its action reachable.

In-place version11 install verified actual installed and candidate certificates: fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c, package com.kapecakes.aleconnectmobile, firstInstallTime2026-10-09 03:36:24 unchanged. Exact synthetic retention matched before/after (storageDigest ddda1e068222e377df3de9401a6ed7b6, queueCount1, evidence68bytes/d8bb5d59888d24b6e13af6a76b0bb7a5). APK C:/Users/Justine/Desktop/AleconnectApps/aleconnect-panelui-sheet-spacing-v11.apk, SHA256 bc21e5a05317dac087393ffd5e4c7678918cac772faadefd868136b2ed24fc43, 66,965,005bytes.

The final Back/theme restoration was temporarily stopped by automatic approval review usage exhaustion. On continuation, restoration succeeded: font_scale1.0 and system night mode no. Later crash-buffer read includes an emulator system_server/phone DeadSystemException; it does not establish a cause or resolution for the prior native cleanup race.

Remaining risks: native iOS/optional native-host sheet/physical hardware/spoken accessibility remain unverified; prior native cleanup race and Expo patch recommendations remain open. Preview only, no release. Evidence/recovery: native-implementation/sheet-footer-spacing.


## Version13 — Full-width Home publisher carousel (2026-10-09)

Scope: Home From ALECO reuses the copied PanelUI Carousel with swipe and centered tappable dots only. Every slide uses the measured content width inside16px side padding; no neighboring-card peek or arrow controls. Card height follows the longest currently displayed item and remeasures after width/font changes. Existing card actions, bounded summaries, empty/error states,4x2 shortcuts and Home fit/overflow policy remain. Shared Carousel now freezes the drag origin and cancels a settling animation when a new gesture begins; cumulative pan updates no longer skip slides. Figma11 populated Home variants use full-width cards and24px dot targets, with2 availability variants resized. Normal screens retain their fixed height; the short phone retains scrolling. Figma dot links scroll to existing cards; its canvas shows the initial selected-dot state, while the app synchronizes selection after swipes.

Verification: TypeScript passed; all8 focused regressions passed. The saved pre-change Carousel fails the new cumulative-gesture regression; the final source passes. Home scoped lint has0 errors/warnings; Carousel has0 errors/6 warnings, matching the copied-source baseline exactly. Final x86_64 signed Gradle build passed in3m48s and its packaged source map contains the final dragStart.set implementation. Same-source iOS Hermes export passed. Graphify refreshed; generated files preserved separately. Figma width/dot/prototype/fit audit and light/dark renders passed.

Android version13 was installed in place on AleconnectPanelUIPreview. Package com.kapecakes.aleconnectmobile, actual installed/candidate certificate fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c and firstInstallTime2026-10-09 03:36:24 preserved; lastUpdateTime11:06:02. Exact synthetic storage/queue/evidence retention matched (storageDigest ddda1e068222e377df3de9401a6ed7b6, queueCount1, evidence68bytes/d8bb5d59888d24b6e13af6a76b0bb7a5), without reseeding or clearing data. Native Home carousel measured x42,width996 on1080px, giving equal16dp margins. Dot3 selects slide3; a single right swipe moves3->2, left swipe2->3, and dot1 returns to1. Card tap retains its existing phase-boundary action. Standard Home fits; dark130% text wraps within the card and vertical scrolling reveals the complete CTA above navigation. Font_scale1.0/system night mode no restored and Home reopened. No new crash was recorded in the post-version13 crash buffer; the earlier native cleanup race remains unresolved.

APK: C:/Users/Justine/Desktop/AleconnectApps/aleconnect-panelui-home-carousel-v13.apk. SHA256 721f18aad5dd27f680e8d263776cbb50bbdbbe9d891fcb04be6032990f4362f3;66,986,473bytes. Version12 is an intermediate diagnostic artifact: its right overflow and cumulative-swipe defect were corrected and retested in13. Evidence/recovery: native-implementation/home-carousel; apply its source checkpoint after sheet-footer-spacing. Preview only, no store release or remote publication.

Remaining risks: native iOS/physical hardware/spoken accessibility/authenticated live-data acceptance remain unverified;6 Expo patch recommendations and the earlier native cleanup race remain open.

Next: review the open emulator and version13 APK; reuse the measured-width/dots pattern for later publisher carousels. Final harness/whitespace and primary-preservation results accompany this checkpoint.

Closeout verification: harness validation passed with only the existing absent Temp sibling warning; git diff --check passed. All6 primary Mobile task-document hashes match preserved evidence; Staff/Lineman checkouts are clean. Changes remain isolated and uncommitted in codex/panelui-five-main.
