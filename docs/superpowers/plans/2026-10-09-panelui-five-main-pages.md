# ALEConnect PanelUI Five Main Pages Implementation Plan

> For agentic workers: use superpowers:executing-plans for native sequential delivery after review. Use superpowers:subagent-driven-development only if the user selects delegation. Steps use checkboxes for execution tracking.

**Goal:** Build the five approved main pages in an isolated Mobile worktree, replace the active Gluestack presentation with owned PanelUI source, and inspect a safely signed in-place Android update on emulator and physical device.

**Architecture:** Preserve Mobile business services and durable storage; rebuild only presentation and navigation. Expo Router owns five destinations, copied PanelUI primitives own controls/overlays, and small ALEConnect compositions implement the approved Figma. Preview builds pause server mutations and queue replay without deleting retained state.

**Tech Stack:** Existing Expo 57.0.26 / React Native 0.86.3 / React 19.2.3, Node 24.21.0, Uniwind/Tailwind 4, Reanimated/Worklets, lucide-react-native, expo-font, existing native services. Copied PanelUI through CLI 0.6.2; current package reference 0.107.1.

**Spec:** [First-stage design](../specs/2026-10-09-panelui-five-main-pages-design.md). Supporting source inventory: [PanelUI migration audit](../../panelui-migration-audit.md). Owning handoff: [Mobile PanelUI rebuild](../../agent-harness/tasks/mobile-panelui-rebuild.md).

Status: plan prepared on 2026-10-09; implementation, worktree creation and device installation have not started. Review the spec and this plan together.

## Global constraints

- Five main pages only: Home, Reports, Advisories, Hotlines, Account. Child features use an explicit preview boundary, never legacy rendered pages or false success.
- Preserve package com.kapecakes.aleconnectmobile, scheme aleconnectmobile, iOS identifier, EAS project identity and existing native plugins.
- In-place install selected by user. Retain private storage/evidence/queue keys; no uninstall, app-data clear, downgrade bypass or production credential replacement.
- Staff owns all API contracts and totals. No server/database/live-content changes, EAS/OTA/store publication or dependency upgrade unrelated to PanelUI.
- Node 24.21.0; 16 side padding; 12 section gap/card radius; 16 button radius; 24 dialog radius; 18 field icons in centered 48-wide slots.
- Home remains 4 x 2, including Explore services; normal-size/default-text Home fits, small/large-text views scroll.
- Keep canonical report statuses and source text/evidence limits. Unknown statuses remain pending/fail-closed.
- Preview flag EXPO_PUBLIC_PANELUI_PREVIEW=1 permits authenticated reads but pauses queue replay, background submissions, profile/account mutations and push-token writes. It never grants authorization.
- No new state/query framework, generic form engine, navigation replacement or whole-catalogue PanelUI import.

## Review focus

1. Retained queued evidence after APK update: same owner/access/idempotency/storage; visual preview must make zero replay calls. Task 2 tests both paused and normal paths.
2. Late requests after account change or logout: old identity data never paints the new screen. Tasks 4-6 test stale completion and cache scope.
3. Partial report pages: count badges/period KPIs never misrepresent loaded rows as complete totals. Task 5 tests cursor and status grouping.
4. Android gesture navigation, small displays and large text: pill, keyboard and sheets do not hide content; touch targets do not overlap. Tasks 3-8 have native checks.
5. Wrong signing certificate or lower versionCode: installation stops with data untouched. Task 9 verifies installed/candidate identity before replacement.

## Planned file responsibilities

| Area | Files | Responsibility |
| --- | --- | --- |
| Entry and providers | src/app/_layout.tsx, src/app/index.tsx, src/app/sign-in.tsx, index.ts | One PanelUI root; retained auth/account/queue lifecycle; minimal session bridge |
| Main routes | src/app/(tabs)/_layout.tsx, home.tsx, reports/index.tsx, reports/_layout.tsx, advisories.tsx, hotlines.tsx, profile/index.tsx, profile/_layout.tsx | Thin route entries for the five main pages; Account retains /profile |
| Navigation | src/components/floating-app-bar.tsx, floating-tabs-bar.tsx | Existing pill expanded to five routes, with safe insets and Back behavior |
| Owned primitives | panelui.json, theme.css, src/components/panelui/**, required src/lib/** foundations | Copied source, semantic light/dark tokens, exact Lucide decorators |
| Styling/fonts | global.css, metro.config.js, tsconfig.json, assets/fonts/**, assets/aleconnect/** | Single CSS entry, real fonts/assets/licences, archived presentation excluded |
| Shared compositions | src/components/main-page-header.tsx, search-field.tsx, phase-boundary-sheet.tsx, soft-radial.tsx | Only genuinely repeated anatomy; no universal page/schema abstraction |
| Page units | src/features/home/home-screen.tsx, src/features/reports/main-screen.tsx, src/features/advisories/advisories-screen.tsx, src/features/hotlines/hotlines-screen.tsx, src/features/profile/account-screen.tsx | Local presentation/state, existing readers and reusable domain helpers |
| Reused cards | src/features/advisories/publisher-card.tsx, src/features/reports/report-card.tsx, src/features/hotlines/contact-card.tsx | Shared across relevant main pages and later child work |
| Preview safety | src/constants/panelui-preview.ts, src/context/report-queue-context.tsx, src/services/report-background-sync.ts, root push bridge | Small guard around writes; default non-preview behavior unchanged |
| Legacy reference | legacy/presentation/** | Old route/Gluestack-dependent sources retained but excluded; no imports into active app |
| Tests/evidence | tests/panelui-*.test.mjs or .test.ts, existing affected suites, docs/agent-harness/tasks/mobile-panelui-rebuild.md | Logic checks, retained security regression, actual screenshots/logs |

Keep pure src/services, src/context, src/hooks, src/utils and src/features domain modules in place. Moving UI does not authorize moving or rewriting all modules in those folders.

## Task 1: Isolated worktree and reproducible baseline

**Files:** implementation worktree; identified planning/audit documents only. No application edits in primary checkout.

**Interfaces:** consumes Mobile master commit bf7b2a0bde74757ce37d8db052473121c7409146; produces branch codex/panelui-five-main with a recorded baseline and separate installation/cache.

- [ ] Re-read Mobile AGENTS, active work and operational acceptance. Capture git status, branch, HEAD, worktrees and hashes of the four pre-existing dirty documentation files. Confirm no source/signing/device work appeared since planning.
- [ ] Use a repository-targeted native worktree mechanism if available. Current chat's create_worktree targets Staff, so do not use it to create the Mobile branch. Otherwise create with Git at the artifact workspace's worktrees/aleconnect-mobile path, outside the primary Mobile tree; inspect resolved path before creation.

~~~powershell
$mobileSource = 'C:/Users/Justine/VSCodeProjects/aleconnect-mobile'
$mobileWorktree = 'C:/Users/Justine/.codex/visualizations/2026/10/06/01a11159-52ae-76a2-8dfa-7672826bbaea/worktrees/aleconnect-mobile'
git -C $mobileSource worktree add $mobileWorktree -b codex/panelui-five-main bf7b2a0bde74757ce37d8db052473121c7409146
~~~

- [ ] Copy only the identified audit, task handoff, new spec and new plan into the new checkout. Do not copy primary active-work/history wholesale, node_modules, .env.local or secret configuration. Re-author this task's index/history entry in the worktree.
- [ ] Activate Node 24.21.0; verify node --version. Run npm ci in the worktree rather than sharing writable node_modules with the primary app.
- [ ] Run npm test, npm run typecheck, npm run lint, npm run harness:check -- --sibling C:/Users/Justine/VSCodeProjects/aleconnect, npx expo install --check and npx expo-doctor. Save actual counts/warnings. Separate baseline failures; fix new in-scope failures before moving on.
- [ ] Produce a scoped import/test inventory before page moves: every Gluestack consumer, root provider, route destination, source-shape test and native plugin. Keep the graph as a lead and verify source. Do not rebuild Graphify just to write a plan.

**Pass:** correct Mobile branch/worktree, original checkout unchanged, install isolated, baseline evidence recorded. No key copied or APK installed yet.

## Task 2: PanelUI foundation and safe preview bootstrap

**Files:** panelui.json, theme.css, global.css, metro.config.js, tsconfig.json, package/lock, copied primitives, root layout, preview constant, queue provider/background sync, minimal sign-in bridge. Tests: tests/panelui-preview-safety.test.mjs, tests/panelui-foundation.test.mjs; retain auth/queue/signing suites.

**Interfaces:** PANELUI_PREVIEW: boolean comes from EXPO_PUBLIC_PANELUI_PREVIEW === '1'; ReportQueueProvider accepts optional syncEnabled: boolean = true. AuthSessionProvider, ConsumerAccountProvider, useAuthSessionContext().refreshSession and existing signInWithAccountNumber/signInWithEmail contracts remain unchanged.

- [ ] Write failing safety checks: preview startup/background callback does not call syncReportQueue/registerDevicePushToken; original queue JSON/evidence references stay unchanged; enabled normal path still executes existing replay/authorization behavior. Test a queued item, stale access and a pending completion event; do not test only an empty queue.
- [ ] Inspect CLI with npm exec --yes --package=panelui-cli@0.6.2 -- panelui --help, then init --dry-run. Review writes/dependencies. Set copied-source aliases to @/components/panelui before any component add; retain existing root CSS/Metro path and @/ alias.
- [ ] Import only the spec's requested modules and their dependency closure. Run add --dry-run first. Use no blind --overwrite. Record CLI version, module names, registry URL, source-file SHA-256, integrity and licence in docs/panelui-source-manifest.json; do not claim CLI pin freezes live registry source.
- [ ] Reconcile provider ownership by reading imported PanelUIProvider. For this foundation checkpoint, preview renders the development gallery under one PanelUI root while the old non-preview route tree remains temporary. Task 3 replaces that tree before removing Gluestack. Final app has exactly one gesture root, portal/toast viewport and keyboard host, and no legacy rendered fallback. Preserve app event subscriptions with cleanup; replace Gluestack toast rendering with PanelUI Toast.
- [ ] Add the minimal preview guards before mount-time sync, subscriptions, task registration and background callback submission. Keep the TaskManager task defined under its original name; paused callback returns without submitting or changing items. Defer consumeReportSubmissionCompletions in preview and retain pending receipts. Suppress push registration writes and pending-intent consumption while preserving background response capture.
- [ ] Add the minimal PanelUI sign-in bridge for empty/expired session, using existing real auth functions, labels, secure password field and refreshSession. Retain throttling/errors/setup restrictions. Do not build welcome/onboarding or fabricate verified identity.
- [ ] Load approved Inter/Jakarta weights and licensed assets, replace global Satoshi defaultProps patch with explicit typography roles, and map light/dark semantic tokens. Use muted-foreground for text and live navigation background tokens.
- [ ] Verify one component gallery overlay, labelled prefixed/suffixed field, Spinner, Toast and theme switch on Android before spreading them across pages. The gallery is development-only, not a sixth product tab.
- [ ] Run focused new and existing auth/queue/background/signing tests, TypeScript, scoped ESLint and Expo alignment. Preserve non-preview defaults. Save a local checkpoint containing only scoped files when implementing the reviewed plan.

**Pass:** PanelUI source renders; token, portal and keyboard ownership are correct; preview cannot replay retained work; normal queue safety tests remain green.

## Task 3: Five-route shell and presentation retirement

**Files:** tab/root layouts, five route entries, floating bar files, shared header/search/boundary/radial compositions, legacy archive, package/lock, tsconfig, compatibility entries. Tests: tests/panelui-main-routes.test.mjs and affected expo-router/native identity/navigation suites.

**Interfaces:** router order home, reports, advisories, hotlines, profile; visible labels Home, Reports, Advisories, Hotlines, Account. Existing FloatingTabsBar continues to receive Expo BottomTabBarProps. MainPageHeader accepts title: string, subtitle?: string, action?: ReactNode. PhaseBoundarySheet accepts open: boolean, onOpenChange(open: boolean): void and featureLabel: string.

- [ ] Write failing route checks: exactly five visible destinations in the agreed order, /profile retained, /advisories canonical once, existing deep-link compatibility returns safely, Account uses no replacement account URL, and tab content is not covered by the pill.
- [ ] Move old presentation sources to legacy/presentation; recreate the listed route entries. Keep business/data helpers at original paths. Move only Gluestack-dependent custom renderers, not entire feature domains. Exclude legacy from compilation and active Metro imports.
- [ ] Move the former root /advisories rendering into the new tab screen so there is one /advisories route. Keep /report/[id], /advisory/[id], /reports/queue, /notification-settings and push-linked account paths as thin preview-boundary entries; do not show protected content from unvalidated intent parameters.
- [ ] Reuse floating navigation structure, derive selected route from navigation state, add Megaphone tab, change Profile label to Account, reserve actual safe-area/pill height in every page. Keep lazy/detached screens unless a verified behavior requires otherwise.
- [ ] Implement repeated header/search anatomy and one phase-boundary sheet. Search uses a single PanelUI border and one prefix/suffix; compact visual controls retain non-overlapping touch targets.
- [ ] Remove @gluestack-ui/core and @gluestack-ui/utils only after zero active imports. Remove @gorhom/bottom-sheet/Feather only if the active import graph is empty; keep native product dependencies needed later. Preserve unrelated reusable UI helpers.
- [ ] Classify affected tests. Replace obsolete renderer/source-shape checks with tests of the same observable promise. Retain auth/account/queue/media/signing regressions; no blanket skips and no weakening tests just to accept a build.
- [ ] Run route/navigation/identity tests, full tests, TypeScript and scoped ESLint. Verify Android tab/back/overlay behavior and light/dark scenes. No device frame or Dynamic Island is painted into the Android app.

**Pass:** clean active app graph contains no Gluestack runtime; five routes and all visible actions resolve to implemented main behavior or explicit preview boundaries.

## Task 4: Home

**Files:** src/features/home/home-screen.tsx, src/app/(tabs)/home.tsx, shared publisher card, home assets. Tests: tests/panelui-home.test.ts and retained account/location/async tests.

**Interfaces:** existing useAuthSession/useConsumerAccount, fetchPublicUpdates(AdvisoryScope), resolveHomeReportLocation and existing hotline reader; PublisherCard consumes MobilePublicUpdate and onPress(): void, without rewriting source data contracts.

- [ ] Refresh Figma 94:2046 and required visible children; save geometry/font/asset manifest. Download actual image through Figma asset tool and retain attribution/licence. Do not use a Figma screenshot as an image background.
- [ ] Test late account-scope completion is ignored, no user/account data leaks after logout, eight shortcuts remain seven + Explore, and address selection never retargets queued reports. Use real helper behavior rather than string-only tests.
- [ ] Build rounded photo header, greeting and compact search; separate address row; 4 x 2 quick-action card; horizontal publisher carousel; help/create-report card with compact button height. Reuse publisher card for Advisories later.
- [ ] Measure minimum content against usable height after OS insets and pill. Fit standard reference at default font size; scroll when smaller/landscape/large text needs it. Avoid fixed whole-screen scaling, magic empty spacers or stretching individual icon touch regions.
- [ ] Wire existing main-tab shortcuts; out-of-phase report/services/account editing opens boundary sheet. Scope search to supported recent/service data and label partial search honestly. Preserve authenticated-reader restrictions; no invented anonymous endpoint.
- [ ] Show publisher loading/empty/retry/stale states. Fresh error is not no advisories; refresh failure keeps readable cached cards. Review equal 12-gap rhythm and carousel overflow exemption.
- [ ] Run focused checks and inspect Android at reference/small/tall widths, 1x and large font, both themes. Record screenshots before proceeding.

**Pass:** reference Home fits, 4 x 2 survives, smaller content remains usable, imagery/spacing/cards match approved target.

## Task 5: Reports

**Files:** src/features/reports/main-screen.tsx, report-card.tsx, main-filter.ts, report route; existing status/data helpers. Tests: tests/panelui-report-main.test.ts plus status/pagination/account/cache/Manila-time suites.

**Interfaces:** fetchComplaintReportPage retains userId, identityUserId, accessRevision, serviceAccountId, cursor, query, categoryId, sort and limit. getReportTabCounts(reports: readonly Report[]) returns all/open/resolved counts; filterReportTab(reports, tab: 'all' | 'open' | 'resolved') returns Report[]. Counts describe that input collection only.

- [ ] Refresh Figma 94:2233; capture exact summary padding, radial layer, compact tabs, badges and report-card anatomy.
- [ ] Write logic tests for all seven canonical statuses, unknown status/model, cursor-present incomplete page, account switch with late response and Manila month boundary. Assert Open contains only under_review/verified/dispatched/in_progress; Resolved only resolved; closed/rejected remain All.
- [ ] Build compact header/new action, uniform-padding radial summary, labelled Selects, SearchBar plus filter sheet, compact Tabs with Badge count indicators, section heading and report cards. Do not concatenate numbers into tab text.
- [ ] Reuse existing typed report reader and request-generation/account-scope guards. Keep pagination/retry/stale handling and stable row keys; use native FlatList instead of nested unbounded ScrollView lists.
- [ ] Live period/status totals are unavailable in the current contract. Render unknown totals as a dash with a concise explanation, or explicitly label loaded-page metrics/counts. Period control filters loaded records in Manila time and says so; it must not claim server-complete data. Use complete deterministic data only in labelled visual fixtures. Do not fetch every cursor for decoration or change Staff API in this task.
- [ ] Implement supported query/category/sort/account controls with existing reader options. Filter failures retain old rows and criteria; unknown data never appears resolved. New report/view-all/detail child actions use preview boundary.
- [ ] Run focused and full relevant tests, TypeScript/scoped lint. Inspect selection/count alignment, balanced card padding, long references/location text, keyboard and dark-state contrast on Android.

**Pass:** compact report page/card layout matches target; counts are honest, filters remain scoped and status semantics are canonical. Complete server KPI totals remain an explicit later contract gate.

## Task 6: Advisories

**Files:** src/features/advisories/advisories-screen.tsx, publisher-card.tsx, tab route. Tests: tests/panelui-advisories.test.ts and existing public-updates/advisory-cache suites.

**Interfaces:** fetchPublicUpdates(AdvisoryScope & { limit?, cursor?, force? }) returns MobilePublicUpdatesPage. Existing union kinds advisory and facebook_post remain unchanged. All includes both, Advisories includes advisory, ALECO feed includes facebook_post.

- [ ] Refresh Figma 94:2846; test union filtering, nullable photos/permalink, unknown kinds, page append deduplication, stale cache and late identity-response rejection.
- [ ] Build header with notification action, search, compact three filters, featured interruption/update, community/story summaries. Reuse publisher card typography/radius and a theme-correct soft radial; preserve source type/target rules and null scheduled-end meaning.
- [ ] Use Facebook post message/photos/pageName/permalink for feed summaries. Do not invent a new CMS or serve static examples as live ALECO announcements. Client-only search is labelled as search of loaded/recent posts until a server search contract exists.
- [ ] Preserve source pagination and accessRevision identity. Notifications and main-post child navigation show preview boundary without discarding the selected item/return context.
- [ ] Verify readable image-free fallbacks, empty/error/refresh failure, compact tabs, equal gutters and both themes on Android. Run scoped checks.

**Pass:** both supported union kinds render consistently and no publisher card claims fake news, targeting or successful navigation.

## Task 7: Hotlines

**Files:** src/features/hotlines/hotlines-screen.tsx, contact-card.tsx, copied slide-button adaptation, route. Tests: tests/panelui-hotlines.test.ts plus hotline cache/data/category tests.

**Interfaces:** fetchHotlines({force?}) retains HotlineCategory/HotlineAgency/HotlineContact. ContactCard consumes agency: HotlineAgency; call/copy/website actions validate their source value. SlideButton completion opens the dialler once, never starts an automatic call.

- [ ] Refresh Figma 94:2431; write tests for contact types, missing URL/avatar/description, invalid phone or website, duplicate swipe completion, copy failure, offline cache and category sheet excluding 911.
- [ ] Build compact rose/crimson emergency card with PanelUI SlideButton, Lucide Siren and Copy. Support assistive activation without dragging; no additional confirmation dialog or automatic call. Automated tests spy on the dialler boundary; do not call 911.
- [ ] Build compact agency header and contact pills with type prefix, number/type, primary Call, secondary Copy and optional website. Reuse existing safe phone formatting/URL handling rather than another phone parsing dependency.
- [ ] Build search, pinned categories, controlled BottomSheet and lightweight category customization. Keep local preferences in the existing identity scope; service reader, offline cache and stale labels remain intact. Directory child action opens preview boundary.
- [ ] Verify bottom-sheet Back, scroll, touch targets, no clipped contact numbers, denied/unavailable dialler handling and dark contrast. Run focused checks; manual native dialler checks use a verified non-emergency contact and stop before placing a call.

**Pass:** compact cards retain all source contact context and emergency interaction is accessible without unsafe automated dialing.

## Task 8: Account

**Files:** src/features/profile/account-screen.tsx, profile route, theme/appearance sheet using current Uniwind preference support. Tests: tests/panelui-account-main.test.ts plus existing profile/account/privacy tests.

**Interfaces:** useConsumerProfile/useConsumerAccount supply actual identity/account snapshots; existing auth invalidation remains authoritative. UI child entries use PhaseBoundarySheet; no profile/linking write endpoint is invoked in preview.

- [ ] Refresh Figma 94:2613; test partial profile/nullable contact/avatar, masked linked-account number, pending/locked account, zero/two linked accounts and identity reset. Test no profile/account mutation is dispatched by phase-one actions.
- [ ] Build compact profile identity, subtle-radial ALECO account card and grouped Account & security / Preferences / About & support rows. Keep 16 gutters, consistent row geometry and visible dividers in dark mode.
- [ ] Implement appearance sheet (system/light/dark) with existing theme mechanisms; restore the source preference key/semantics rather than wiping preferences. Display current setting. Personal information, manage accounts, password, alerts and support/legal children use explicit boundary.
- [ ] Keep actual active-report editing restrictions in presentation descriptions; do not create editable controls that bypass them. No billing balance, old Account billing reminder popup, collection/payment execution or invented deletion option.
- [ ] Run focused checks and verify long names, screen reader focus/labels, lower groups/footer visibility above pill, dark/light/system transitions and native Back.

**Pass:** Account layout matches target and local appearance works without enabling out-of-scope account/profile mutations.

## Task 9: Signing, APK and real Android acceptance

**Files:** app.json versionCode only where needed; original signing plugin retained. Evidence: docs/agent-harness/tasks/mobile-panelui-rebuild.md plus local artifact directory screenshots/logs/APKs/public fingerprint manifest. No private keys or credentials in tracked evidence.

**Interfaces:** original source android/app/debug.keystore signs preview if its certificate matches the installed app; candidate package stays com.kapecakes.aleconnectmobile. Original production release guard remains fail-closed.

- [ ] Run full tests, npm run typecheck, scoped lint plus npm run lint, npm run harness:check with Staff sibling, Expo alignment/Doctor and git diff --check. Re-run no affected stage without a new reason. Refresh Graphify after code changes and keep generated churn separate.
- [ ] Capture Android and iOS JS/Hermes exports with npx expo export --platform android --output-dir dist/android and --platform ios --output-dir dist/ios. This is not a native iOS build or iOS Simulator acceptance.
- [ ] Discover devices with adb devices -l and choose one explicit serial. Read installed package path/version using adb -s SERIAL shell pm path com.kapecakes.aleconnectmobile and shell dumpsys package com.kapecakes.aleconnectmobile. Pull base APK to a task-local evidence file; inspect it with apksigner verify --print-certs and SDK aapt/aapt2. Do not pull private app databases or tokens.
- [ ] Compare installed certificate to original preview key/candidate. Saved desktop APK/key match alone is insufficient. For a different signer, stop install and resolve authorized original signing source; do not use upload key as a Play app-signing substitute.
- [ ] Record retained session/account/queue state without exposing personal data; preview guard must already pass before installation. Raise candidate android.versionCode strictly above installed/reference values. Capture old source/identity metadata for rollback, not a promise that a lower-code APK can be reinstalled.
- [ ] Generate native project only in worktree with npx expo prebuild --no-clean --platform android --no-install. Native folder is ignored. After generation, verify target path/ignore status and copy the explicitly authorized original debug.keystore into worktree android/app/debug.keystore. Keep original untouched. Do not copy .env.local or credentials files, print key bytes or commit the key.
- [ ] Activate pinned Node and isolated TEMP/TMP below worktree .expo/preview-temp; set EXPO_PUBLIC_PANELUI_PREVIEW=1 and use npm run android:preview. Preserve all signing/backup/predictive-back plugins. Verify candidate package, higher versionCode, certificate, non-debuggable bundled preview and SHA-256. Copy APK to Desktop/AleconnectApps with a distinct modernized-preview filename and hash-verify the copy.
- [ ] Create one task-owned Android Studio AVD if none exists (planning found none). Use installed/approved SDK image with API coverage appropriate to current physical Android; record image/API/logical size. Emulator is Android tooling; do not promise an iOS simulator on Windows. Start only the selected task AVD, not other devices/processes.
- [ ] Test emulator first with deterministic labelled visual fixtures and a separate retained-data update journey. Baseline APK installation on emulator is allowed only if its architecture is compatible; otherwise build baseline from original source with the same signer, and record that limitation. Then install candidate in place on the explicitly selected physical serial:

~~~powershell
adb -s SERIAL install -r PATH_TO_VERIFIED_MODERNIZED_APK
~~~

- [ ] On signature mismatch or version downgrade, stop and fix signing/version identity. Do not uninstall, clear data, use install -d or turn off signing protection. A connected physical device is a completion gate, not something an emulator screenshot replaces.
- [ ] Inspect all five pages, all tab switches/Back behavior, supported controls and sheets, light/dark/system, keyboard, offline/error/stale/empty fixtures, small/tall viewport and large text. Use TalkBack and reduced motion. Verify retained queue/evidence remain unchanged and no mutation/replay/push-token registration occurred during preview. Never trigger an actual 911 call.
- [ ] Capture adb screenshots and scoped logcat without clearing system logs or exposing auth data. Compare native content to Figma after excluding device chrome; record screenshot scale/insets. Fix in-scope mismatches page by page before acceptance.
- [ ] Record actual startup/tab responsiveness, list scrolling and APK/bundle size on the same device/data. Report measured results, not an assumed speedup. Preserve new versus baseline failures. Current stage has no numeric performance claim or store-release gate.
- [ ] Update only task handoff/index/history with passed, baseline-failing and unverified outcomes; final git status in worktree and primary checkout. Keep source checkpoints local. Commit/push/merge/EAS/OTA/store release require their authorized next scope.

**Pass:** all scoped checks pass; matching-signer/higher-version in-place update retains data; both emulator and physical-device evidence cover five pages. If no device is connected, mark physical acceptance pending and continue independent corrections rather than declaring complete.

## Completion checklist and handoff

- [ ] Exactly five reviewed main pages and documented infrastructure/boundary routes.
- [ ] Copied-source provenance, no active Gluestack dependencies/imports, no duplicate provider roots, real fonts/assets/licences.
- [ ] Main layout, radius/spacing/icons/fields, compact badges/tabs, dark contrast and adaptive Home accepted on native renders.
- [ ] Preview read-only guard preserves existing queue/state; normal production safety tests still pass.
- [ ] Signing identity/package/version/hash verified; in-place update tested with no destructive workaround.
- [ ] Original Mobile documentation/source/device work preserved; no secrets/env files copied or committed.
- [ ] Full checks and both Android targets evidenced; native iOS and complete report totals/child workflows remain explicitly pending.

Proposed execution: native sequential tasks, inspect each page before the next. Start only after the user reviews this spec/plan. This plan does not authorize a production release or complete the previously documented Figma release gates.

## References and evidence limits

PanelUI [CLI](https://panelui.dev/docs/cli), [installation](https://panelui.dev/docs/installation), [Tabs](https://panelui.dev/docs/components/tabs), [SlideButton](https://panelui.dev/docs/components/slide-button); Android [signing](https://developer.android.com/studio/publish/app-signing) and [emulator](https://developer.android.com/studio/run/emulator). Versions and local certificate were checked on 2026-10-09. No product install, worktree, app test/build or installed-device UI acceptance was performed while preparing this plan.

## Execution outcome — 2026-10-09

User direction "Make an emulator instead" supersedes the physical-device gate in Task9. Tasks1–8 implemented for approved foundation scope; Task9 completed emulator acceptance with explicitly unverified authenticated/TalkBack/native-iOS gates. Original checklist remains specification, not a claim that every future gate passed. See [acceptance report](../../panelui-emulator-acceptance.md) and [handoff](../../agent-harness/tasks/mobile-panelui-rebuild.md). Source uncommitted; publication not authorized.
