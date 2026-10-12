# Mobile UX fixes — 2026-10-12

All 19 requested source changes are implemented. Acceptance below separates code/tests, rendered fixtures and live release. Current Mobile worktree: aleconnect-panelui. Staff companion: codex/mobile-ux-contracts / PR40. Primary checkouts, signing keys, saved device work and unrelated generated changes are preserved.

| # | Change | Result and evidence |
|---|---|---|
| 1 | Advisories background refresh | Explicit pull state only. Busy background refresh never starts the pull spinner; executable regression passes. First-load skeleton/retry remain. |
| 2 | New Report Back | Android steps return from location/type/category to Account; route exit/discard occurs only at the first step. |
| 3 | Confirm category/type | Android selections stay selected on Step2 until Continue. Multiple types render descriptive cards; no selection sheet or automatic advance. |
| 4 | Status palette | Under review yellow, Verified blue, Dispatched violet, In progress orange, Resolved/Closed green, Rejected red. Shared badge/timeline, receipt and seven-status guide plus Figma Light/Dark tokens. All six pairs meet4.5:1 text contrast. |
| 5 | Detail pull refresh | ReportPage exposes pull refresh; detail spinner state starts only from the pull handler. Refresh status action removed. |
| 6 | Reference copy | Copy reference action/clipboard code removed from detail. Reference stays selectable. |
| 7 | Incident warning | Existing server-published consumerMessage appears below the Verified timeline notes in a warning surface. Staff's current active-incident/public-notice rules remain authority; no guessed grouping or internal incident ID. |
| 8 | Profile edit restriction | Version1 capability allows edits with active reports. Staff removes only the active-report mutation guard. Password, ownership/revision, supported fields and transactions remain; shared identity email cannot bypass re-verification. Local authorization tests pass; production requires PR40 deployment. |
| 9 | FlipCard/QR accounts | Published PanelUI FlipCard/QRCode source reused. Front gradient/default indicator; back name, number, address, phone and white-plate QR; edit/default/unlink actions stay outside the flipping surface. Android flip and expanded accessible label verified. Independent QR decoder reads the exact account number. |
| 10 | Account information | Same ServiceAccountCard reused. Secure edit/default actions retained; Figma normal/active-report layouts updated. |
| 11 | Reveal number | Eye appears left of masked number; Android shows Hide account number plus full number after tap. Remasks on account/access/session changes. |
| 12 | Keyboard-aware sheets | Shared attached sheet root moves above IME and caps its body to remaining height. Android service-account filter search/options remain visible with software keyboard. Single-sheet Back retained. Test-only hardware-keyboard preference restored. |
| 13 | Preview footer | ALEConnect main-page preview label removed; labelled fixture safety notice retained. |
| 14 | Feed gradient | Shared SoftRadial uses an absolute wrapper and fills card bounds; no SVG percentage applied against unrelated parent flow. |
| 15 | Full map | Android tap on embedded location map opens Choose location. Returning retains issue/type/location draft. |
| 16 | Submission after leave | Leaving becomes available only after durable queue save. Owner-scoped provider emits submitted/queued toast after completion; idempotent replay and access revision checks remain. Real authenticated submit/failed replay was not performed. |
| 17 | Date range | Range picker min Jan1 2026; max Manila today. Initial route dates are clamped; invalid/reversed ranges remain disabled. |
| 18 | Tab counts | Real PanelUI Badge, compact20px box, centered count and align-self:center in All/Open/Resolved triggers. |
| 19 | Unread card | Optional bounded unread IDs render new card variant; visible authenticated detail calls existing markRead. Canonical-owner memory/persistent caches clear even after fast Back, and report readers receive revalidation. Failure retains unread data and allows later retry. Executable regressions cover success after Back, failure and cross-owner cache retention. Live/authenticated acceptance requires PR40. |

Figma: [service-card component family](https://www.figma.com/design/6uIaVRM63oHA723WKgjo5k/Aleconnect-mobile?node-id=1052-24525), [unread report variant](https://www.figma.com/design/6uIaVRM63oHA723WKgjo5k/Aleconnect-mobile?node-id=1052-24538). Default indicator is editable; status variables support Light/Dark. Report Back glyph is foreground-bound; reporting-range, submission-leave copy, active-edit screen and incident warning are updated.

Verification:
- Fresh full Mobile suite 487/487 after final source fixes (ALECONNECT_STAFF_ROOT points to the reviewed companion). Focused 16/16 also pass. TypeScript passes; scoped lint zero errors, with Reanimated/library warnings and one remask-effect warning documented.
- Staff profile/unread8/8 plus account/notification/intake/replay/address42/42; production TypeScript/Vite build and scoped API lint pass.
- Independent review corrected fast-Back cache invalidation and native card accessibility; follow-up has no blocking finding.
- Graphify Mobile refreshed 4884 nodes/9236 edges/396 communities; generated churn remains separate from product source.
- Matching signer/package QA APK built for ARM64/x86_64, API24/target36. In-place Android16 install retains firstInstallTime2026-10-10 14:45:42. Source-map checks matched the actual included components to source. Original fixture-free Desktop v52 remains unchanged. Final rebuild after card typography and receipt/status-guide fixes passed in 3m55s and was installed in place. Nine bundled modules exactly match current source; emulator crash buffer is empty after cold launch and card navigation. Log: .superpowers/ux-fixes-native-final.txt.
- Android labelled fixtures validate number reveal, card flip, category/type Continue, Back steps, full-map tap, keyboard sheet and Dark surfaces. No real login, profile/default mutation, submission, emergency call or provider delivery was used.

Release boundary: [Staff PR40](https://github.com/aymkopi/Aleconnect/pull/40) is ready for review, with all four checks passing on exact head fb25c8ca8a011c0dd4be1576cc60945b8c3e13f8. Updated contract documentation is published in the same PR. No schema migration. New fields are optional for legacy readers. Deploy Staff first; roll back by restoring the compatible API/code. No production release is claimed here.

Remaining acceptance: real Android phone, native iOS, TalkBack/VoiceOver interaction, authenticated profile save/default change, unread push-to-report round trip, leaving during a real upload and queued replay. QR is scannable account data; no new Staff scanner screen was requested. Approved legal content and existing provider/device gates remain in earlier handoffs. Native evidence is in the task's external output folder; no private production fixtures were created.

Final QA artifact: aleconnect-ux-fixes-QA-v52.apk in the external evidence folder, SHA256 9F61FCD3EC2E554A27F26489ECD11FC898CA979E4C119102A68B4875589D8068. Package com.kapecakes.aleconnectmobile / versionCode52; original certificate SHA256 fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c. This labelled fixture build pauses queue replay and is for emulator QA, not public distribution. ARM64/x86_64 are included; the 32-bit ABI build hit an existing Reanimated/Ninja manifest regeneration error and is not certified.

Final visual proof: service-card-figma-final.png, service-account-back-android-final.png, sheet-keyboard-android.png, location-map-android.png and service-card-dark-android.png in the same external evidence folder. Card captions use 11/13px and values 12/16px; front label wraps and card height scales with system font size. Integrated browser flip/accessibility checks and native final flip pass. Physical large-font/TalkBack acceptance remains pending.

Harness and whitespace checks pass against the reviewed Staff companion. Running the harness against the older primary Staff contract reports the expected shared-block mismatch; the primary was not overwritten. No Mobile commit bundles the preexisting dirty source; scoped backups are retained under before/.

## Home and service-account refinement — 2026-10-12

- Home selects 2 or 3 rows of 4; extra services remain behind the final Explore services shortcut. Added Quick actions heading. All icon tiles are 48×48px with 24px Lucide glyphs; labels remain 11/14px and two lines.
- Photo header including top safe area is exactly one-third of window height. Rounded photo corners and bottom-anchored search remain. Advisory carousel112px and report CTA64px retain their sizes. Normal Android/iOS layouts stay fixed; the prior tiny-screen/accessibility scrolling exception protects readable controls when mandatory dimensions cannot physically fit.
- Shared PanelUI FlipCard is216px at standard font scale (previously260px), with12px padding. Removed its redundant back title; all four identification fields,128px QR, actions/default indicator and number masking remain. Account information uses the same card.
- Updated18 Figma Home variants, including Light/Dark/Guest/loading/recovery and taller three-row examples, plus the shared service-account component family and its four screen instances. Fixed legacy compact shortcut labels and the affected Home Publisher-card theme/border binding. Existing assets/tokens reused; no dependency/API/auth change.
- Verification: focused31/31 and complete487/487; TypeScript passes, scoped lint zero errors with the existing remask-effect warning. Harness/whitespace checks recorded at closeout. Graphify refreshed with generated output kept separate. Android16 signed in-place QA build passes, and all three bundled files match current source. Home quick-action coordinates are unchanged after a600px upward swipe; all8 normal-phone shortcuts are visible. Card height216px and flip/QR/details verified. No crash-buffer entry after these interactions.
- Integrated browser cold development bundling timed out; restarting the task-owned Metro process restored sign-in/Home. AX confirms Quick actions and8 shortcuts; DOM icon bounds are47.99×47.99px (browser rounding). The preexisting Sign In SVG accessibility-prop warning was dismissed, not changed by this task.
- QA artifact home-card-QA-v52.apk in external home-card-refinement-2026-10-12 evidence, SHA256 A553E54C3981957DDAA828486B65F3FB54C0AAF2DCEB0CB55213FC90A8CEA6AD; retained certificate/package/version52. Labelled fixtures/replay pause, not public distribution. Original Desktop live-API preview and earlier QA copies remain intact.
- Unverified: physical phones, native iOS, large-font/private long-address card acceptance. No production API deployment or real account mutation was attempted. See prior PR40 release boundary separately.

### Fixture-free real Android APK — v53

[Install v53](C:/Users/Justine/Desktop/AleconnectApps/aleconnect-panelui-device-preview-v53.apk). Standalone live API, no Metro; Android7/API24+, ARM64/x86_64, package com.kapecakes.aleconnectmobile, versionCode53. APK SHA256: 6b43037b61d5ef0c44f421e47e0557e3c2a6b289b5dbbe47c014dc1082ff88fb; retained certificate SHA256 fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c. Fresh Hermes bundle has fixtures disabled.487/487 tests, TypeScript, Expo alignment, Doctor21/21,25 read-only API assertions, map-style smoke,54-library16KB alignment and copied-APK hash pass. No Android device attached for v53 installation; PR40 remains open for pending backend contract behavior. Full native/Firebase verification: [device handoff](panelui-device-preview.md).
