# ALEConnect PanelUI first-stage design

Date: 2026-10-09, Asia/Manila. Status: proposed for implementation review.

## Outcome and scope

Create an isolated branch of aleconnect-mobile with a new PanelUI presentation layer. Build Home, Reports, Advisories, Hotlines and Account from the approved Figma frames. Deliver a signed Android preview for emulator and physical-device review; update the existing installation in place, as selected by the user. This stage is a main-page pilot, not a complete app or store release.

Keep consumer identity, API services, storage keys, linked-account authorization, evidence files and durable queues. Staff remains the API/authorization/database owner. Do not start a separate Expo project or change shared payloads to make screenshots work.

Scope includes the five main routes, their data displays, search/filter controls and essential sheets. New report forms, report/advisory detail pages, notifications inbox, onboarding, profile editing and payment-channel pages belong to later stages. Actions leading there must show an explicit phase-one boundary sheet, not a blank route or invented success. Preserve existing deep-link paths as thin boundary entries with safe return navigation.

## Approach selected for the plan

Recommended: an isolated worktree at the current Mobile commit; copy PanelUI source, retain business modules and rebuild presentation. A fresh Expo template risks losing native identity, plugins and durable state. Converting old pages in place preserves too much of the presentation the user explicitly asked to replace.

Original Mobile checkout remains intact. In the implementation branch, move old route and Gluestack-dependent presentation files to legacy/presentation before replacing them; exclude this archive from TypeScript/Metro entry graphs. Preserve unrelated reusable helpers. Remove Gluestack runtime packages after the active import graph is clean. The archive is source reference, never a running fallback.

No dependency installation, page removal, keystore copy, native build or device installation has occurred during planning.

## Current evidence

- Mobile branch master, commit bf7b2a0bde74757ce37d8db052473121c7409146; no existing implementation worktree.
- Four pre-existing documentation changes: active-work.md, implementation-history.md, mobile-panelui-rebuild.md and panelui-migration-audit.md. Preserve their existing content.
- Expo 57.0.26, React Native 0.86.3, React 19.2.3, Uniwind 1.12.1, Tailwind 4, Reanimated 4.5.1 and Worklets 0.10.1 already installed in the primary app.
- Selected Node pin is 24.21.0; shell currently reports 24.14.1. Activate the selected pin before application/native verification.
- Current npm metadata: panelui-native 0.107.1, panelui-cli 0.6.2. Previous audit used PanelUI 0.105.0. Registry contents remain mutable despite a pinned CLI; save hashes and reviewed source during import.
- ADB inventory succeeded after starting its daemon outside the restricted sandbox: zero devices connected. Emulator executable is available; zero AVD names returned. Native acceptance has not started.
- Saved preview APK is 146,081,429 bytes. Its certificate SHA-256 matches the original android/app/debug.keystore: fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c. This verifies a local preview identity, not the certificate of a presently installed device app or production signing.
- Existing complaint-list API returns reports, statusModelVersion and nextCursor; no period/status totals. Existing public-updates reader requires a consumer scope. Do not invent summary totals or anonymous API support.

## Figma implementation targets

These five nodes were freshly read with design context and screenshots on 2026-10-09:

| Page | Frame | Native route |
| --- | --- | --- |
| Home | [94:2046](https://www.figma.com/design/6uIaVRM63oHA723WKgjo5k/Untitled?node-id=94-2046) | /home |
| Reports | [94:2233](https://www.figma.com/design/6uIaVRM63oHA723WKgjo5k/Untitled?node-id=94-2233) | /reports |
| Advisories | [94:2846](https://www.figma.com/design/6uIaVRM63oHA723WKgjo5k/Untitled?node-id=94-2846) | /advisories |
| Hotlines | [94:2431](https://www.figma.com/design/6uIaVRM63oHA723WKgjo5k/Untitled?node-id=94-2431) | /hotlines |
| Account | [94:2613](https://www.figma.com/design/6uIaVRM63oHA723WKgjo5k/Untitled?node-id=94-2613) | /profile, displayed as Account |

Use the existing Figma completion audit/handoff as supporting state coverage. Read fresh design context again at implementation time; correlate sparse responses with visible child nodes. Download real static assets through Figma's asset tool. Never render a screenshot as the app or ship temporary Figma asset URLs.

Figma's phone bezel, Dynamic Island, status indicators and home indicator are presentation chrome. Native builds use OS status/navigation bars and actual safe-area insets, not painted iPhone chrome on Android.

## Visual contract

- Standard design canvas: 402 x 874. Adapt to actual logical device dimensions; no whole-screen scale transform.
- Light background #F6F7F9. Dark background #0B1220, dark raised surface #152132, distinct borders and contrast-checked semantic foregrounds.
- Side padding 16; section gap 12; child header/body gap 8; field label gap 4.
- Card radius 12; button radius 16; dialog radius 24; floating navigation remains a pill.
- Search height normally 48, compact Home search 44. Compact filter-tab visual height 32 with at least 48-dp Android touch targets and 44-point iOS targets; expanded targets must not overlap.
- Field icons 18, centered in symmetric 48-wide slots; unadorned edge padding 16. Other icon sizes follow role: metadata 16, control/navigation 20, prominent action 24.
- Semantic primary #006BB8. Decorative #008FF5 must not substitute for accessible text/button foreground combinations.
- Inter for controls/body, Plus Jakarta Sans for the specified display/title roles. Load real licensed font weights with expo-font. Use native SF Pro only on iOS where the approved Home/Account reference calls for it; Android uses Inter for those roles. Record this platform-specific typography exception in visual evidence rather than bundling SF Pro on Android.
- Use existing react-native-svg RadialGradient for the subtle card gradients. No new rendering engine. Avoid heavy blur on every card; keep an opaque theme-correct fallback for blur-enabled overlays.
- Unknown-duration requests use Spinner/Skeleton. Use determinate progress only for genuinely measured duration or steps.
- Respect font scaling and reduced motion; communicate status through text as well as color.

## PanelUI ownership and minimum import

Use copied-source mode, which the [PanelUI CLI](https://panelui.dev/docs/cli) supports for editable components. Import into @/components/panelui, not the old @/components/ui folder. Keep generated module dependency closure and licensing/provenance; do not install the whole catalogue.

Requested first-stage modules: panel-ui-provider, text, typography, button, card, surface, avatar, badge, input, input-group, field, label, search-bar, tabs, select, bottom-sheet, dialog, item, separator, empty-state, skeleton, spinner, toast, carousel, slide-button, switch. Add checkbox only if required by the category-customization sheet. Include automatically required registry foundations; review each optional native peer before adding it.

Keep lucide-react-native. Adapt copied glyph imports to exact Lucide equivalents used by Figma, preserving size, stroke and semantic color. Do not introduce a second app icon language. PanelUI's generated internal icon dependency is reviewed separately; remove it only after its references are replaced.

PanelUIProvider owns gesture/portal/toast/conditional keyboard infrastructure. Reconcile existing GestureHandlerRootView and KeyboardProvider; do not mount duplicate roots or hosts. Replace Gluestack toast rendering while preserving submission-event subscription and cleanup.

Copy source tokens to one theme.css, import through existing root global.css, and keep Metro's cssEntryFile at ./global.css. Change the old text meaning of muted to muted-foreground. Navigation scene backgrounds must use live theme tokens. Review [PanelUI installation](https://panelui.dev/docs/installation) against the chosen copied-source modules rather than blindly installing every optional peer.

## Routes, data and preview safety

Use Expo Router for the five navigation destinations. Reuse FloatingTabsBar/FloatingAppBar structure, add Advisories between Reports and Hotlines, rename only the visible Profile label to Account. Keep /profile URLs and app scheme stable. PanelUI Tabs are intra-page filters, not a replacement router: [Tabs documentation](https://panelui.dev/docs/components/tabs).

Default Android pilot builds set EXPO_PUBLIC_PANELUI_PREVIEW=1. This is a public build flag, never a secret or an authorization bypass. It allows existing authenticated GET readers and local UI preferences, plus deliberate credential sign-in if no session exists. It blocks queue replay/submission, background report-sync writes, profile/account mutations and push-token registration during visual inspection. Preserve queue records and pending notification intents. Production behavior defaults to the existing sync semantics when the flag is absent; do not weaken server authorization.

The root must preserve AuthSessionProvider and ConsumerAccountProvider. Extend ReportQueueProvider with an optional syncEnabled boolean defaulting true; preview sets false and still permits read-only queue inspection. Apply the same guard before the existing background-sync callback can access or submit queue work. Keep TaskManager task names and definitions stable; do not unregister tasks or erase storage. In preview, also defer completion-event consumption so existing pending receipts are not silently drained. Test both disabled preview behavior and unchanged enabled behavior.

A minimal PanelUI sign-in bridge is required for an empty emulator/expired session. It reuses signInWithAccountNumber/signInWithEmail, existing throttling, password handling and refreshSession. It is infrastructure for inspecting the main pages, not the redesigned welcome/onboarding deliverable. If server response requires email setup/verification, retain that restriction and show a safe boundary state; never manufacture verification success.

Deterministic fixtures live only in development visual tests/gallery; real screen readers use existing services. A fixture preview must be conspicuously labelled and must never pass fixture identifiers to real mutations or diallers.

Existing services retain account/user/accessRevision cache scope and stale-data labels. Late responses after account changes must not paint another account's data. Failed first load is distinct from empty data; failed refresh retains visible cached data. No fake phone numbers, sample account balances or simulated successful requests in live views.

## Main-page behavior

Home: photo header with rounded bottom corners, greeting/search, separate address row, 4 x 2 shortcut card, publisher carousel and compact create-report CTA. Seven shortcuts plus Explore services remain eight cells. Request Connection and Pay Bills stay in later Explore services. Standard-size/default-text Home fits without scrolling; small screens, landscape or large text switch to scrolling. Larger screens cap/stretch intended containers without giant gaps. Address identifies the linked service location and scope; it does not imply GPS tracking. For phase one, tapping it shows linked-account context without changing report destinations or queue ownership.

Reports: compact title/new-report control, layered KPI card, real labelled account/period selectors, search/filter sheet, counted All/Open/Resolved tabs and report cards. Preserve canonical statuses under_review, verified, rejected, dispatched, in_progress, resolved, closed, and existing label/tone helpers. Open groups the four active statuses; Resolved contains resolved only. Rejected and closed remain visible under All and explicit status filters. Unknown/future statuses retain the existing fail-closed/pending label. Count badges share the same scope as the displayed list. Live data may show a clearly labelled loaded-page count; never present it as an all-time/month total. If complete totals are required, a separate Staff-owned aggregate contract is a later dependency; no all-pages fetch solely to paint KPIs.

Advisories: notification control, search, compact All/Advisories/ALECO feed filters, featured interruption/update and community/story cards. Reuse the public-updates union and existing targeted access rules. Staff Billing reminders remain information-topic advisories; do not revive Account billing popups or payment handling. Detail actions show the phase boundary until the actual detail route is rebuilt.

Hotlines: compact emergency card, Swipe to call 911, ALECO agency/contact card, category cards, controlled category sheet and search. Contact row has type icon, number/type, primary Call and secondary Copy. Website button appears only for a validated available URL. Source phone values come from the hotline service. Dialling opens tel: through the existing supported platform mechanism; no direct-call permission, automatic call or extra emergency confirmation. Never exercise 911 calling during automated device checks. Add an accessible non-drag activation for the [SlideButton](https://panelui.dev/docs/components/slide-button). Category sheets contain no duplicate 911 card. Persist category customization locally with existing consumer scope.

Account: compact profile summary, masked linked-account card, grouped settings rows, appearance sheet and clear unavailable-next-stage feedback for editing/linking/security/settings child pages. Current profile and linked-account services remain authoritative. Do not add a balance, collection payment flow or app-account deletion policy. Pending/locked account state stays visible. No false editable profile fields while active reports forbid updates.

## Signing and in-place installation

Retain Android package com.kapecakes.aleconnectmobile, iOS bundle identifier, scheme aleconnectmobile, Expo project identity and native config plugins. App display name is already Aleconnect. Do not rename slug/EAS project as part of visual modernization.

The original private signing key, not a signature blob extracted from an APK, signs the new APK. The [Android signing guide](https://developer.android.com/studio/publish/app-signing) documents identity and update requirements. The verified local preview uses the original debug.keystore; keep it ignored and copy only that explicitly authorized local preview key into the generated implementation Android tree after prebuild. Never copy .env.local, credentials JSON, Gradle secret files or production passwords into Git.

Before physical installation, read the installed package version and certificate. If it matches the preview certificate, build a strictly higher versionCode and install with adb -s SERIAL install -r APK. If it differs, stop the install and resolve the original authorized signing source. A Play-distributed app may use a Play app-signing certificate distinct from the upload key; local preview signing cannot update it. Do not uninstall, clear app data, use downgrade bypasses or swap package IDs to conceal mismatch.

Build preview only; production signing stays fail-closed. Verify candidate and copied APK SHA-256, package, version, certificate and non-debuggable preview properties before installation. The saved old APK is a signing/baseline reference, not a guaranteed in-place rollback: its lower versionCode will be rejected by ordinary update installation. Prepare rollback from the prior source with the same signer and a new higher versionCode, with credential/storage compatibility review.

## Acceptance and stop conditions

Each page gets rendered inspection before starting the next page. Final matrix covers 402 x 874 reference, small logical Android viewport, taller viewport, dark/light, large text, reduced motion, offline/cache/empty/error, five-tab Back behavior, overlays/keyboard and account-scope changes. Use actual screenshots and logs from both an Android emulator and a connected physical device. Follow [Android Emulator setup](https://developer.android.com/studio/run/emulator); Windows provides no native iOS Simulator, so iOS device/simulator acceptance remains separate.

Preserve existing application/security tests. Replace obsolete Gluestack/source-shape assertions with equivalent PanelUI behavior checks; no blanket skips or removal of authorization, private-storage, queue, replay or signing tests. Run TypeScript, scoped lint, full tests, Expo dependency alignment/Doctor, Android and iOS JS exports, and the actual Android preview build. Separate prior baseline failures from new failures and device-unverified behavior.

Stop dependent work for missing signing identity, unsafe retained queue state, inaccessible devices or unsupported real data contracts; continue independent layout work. Do not publish EAS/OTA/store releases or change live Staff data in this stage.

## Plan review

Implementation uses the [phase-one plan](../plans/2026-10-09-panelui-five-main-pages.md). Review it before worktree setup/source changes. Proposed execution: native sequential implementation with explicit verification at each task; delegation is optional and requires the selected workflow/user authorization.
