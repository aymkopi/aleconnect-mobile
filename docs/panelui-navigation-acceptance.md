# PanelUI navigation and interaction acceptance

Updated: 2026-10-11. Source: isolated `codex/panelui-five-main` worktree at `C:/Users/Justine/VSCodeProjects/aleconnect-panelui`. This pass completes the requested navigation and interaction changes. Native release acceptance remains open.

## Changes and acceptance

| Requested behavior | Implementation | Evidence and limit |
| --- | --- | --- |
| Main pages return to their roots and top | Floating tabs emit cancellable `tabPress`; Reports and Account explicitly target `index`. Shared scroll hook resets on focus/reselect. | Emulator Reports child → Account → Reports returns to main. Reports, Account, Home and Advisories scroll/reselect passed. Hotlines content fitted the tested screen; shared-hook regression covers its reset. |
| Notifications/settings Back follows the caller | Both bell and Account open root `/notification-settings`. Settings Back uses the actual history, with Account fallback for direct entry. Dirty changes retain discard protection. | Earlier v32 detour reproduced. Fixed Home and Hotlines → Notifications → settings → Back → Notifications → caller; Account opens Account main. |
| Child navigation follows real journeys | Notification detail returns to inbox; sign-in retains notification continuation. New Report close/discard returns to its caller, while received-report actions retain Reports destinations. | Fixture report discard returned to Reports; navigation regression checks pass. Authenticated continuation remains unverified on device. |
| Reuse old caches | Reports first page uses the existing consumer-scoped cache key/page size 25. Account keeps the cached profile during refresh. Archive revalidation is forced when requested. | Existing identity, offline and authorization regressions pass. Service/cache/durable-queue implementations are unchanged in this pass. |
| Tighter Reports/Advisories lists | One 8px separator; removed duplicate content gap. | Standard Reports and enlarged dark Advisories show 21 physical pixels at density 420 (8dp). |
| Remove redundant ALECO action | Removed “View ALECO contacts” from the main ALECO card. | Main Hotlines fixture rendered without the CTA; existing contact pills retained. |
| 911 hold is 2 seconds | Existing ProgressButton uses 2000ms and “Hold to call 911”, including accessible wording. | Short release did not activate; longer fixture hold produced feedback. No emergency call or real dialler activation. |
| Toast above navigation | Default PanelUI toast position is top. | Fixture emergency feedback appears near the top, clear of the floating navigation. |
| Hotline sheet fits content | Category sheet content uses auto sizing without a conflicting fixed root snap point. | Empty Police category opens a compact sheet near the bottom; Back dismisses it. Long real-directory permutations remain unverified. |
| Account input does not blink | Account-number input stays mounted while selected account data changes. | v35 fixture switched 4821 → 7604 with identical field bounds (42,1182;996×126 physical pixels). Source regression checks stable mounting. Network loading is unverified. |
| Type selection follows category cardinality | Exactly one type selects and advances; zero/multiple types open one owned type sheet. Picking a type advances. Change-category/review guards retained. | v35 No Light/Power auto-opened the three-option sheet; Primary Line advanced to Location. Line Clearing advanced directly to Location. Zero-type handling covered by regression. |
| Map address remains visible | Stable two-line address plus separate loading/status row; confirmation remains gated until valid. | Fixture marker interaction retained the address. Live GPS/reverse-geocode loading and race timing remain unverified. |
| Submitted reports refresh main | Main subscribes to existing submission revalidation/status events and forces a reload for the matching consumer. | Event/cache regressions and source wiring pass. No live report or retained queue item submitted. |
| Report account selectors show full identity | Main picker and filter-sheet account labels include full registered name and account number. | v35 picker shows “Home · 10004821” and “Shop · 10006822”; both label sites covered by regression. |
| Home carousel | Screen-wide track; cards rest at 16px sides, with 24px inter-card gap, dots only, 3s autoplay, equal heights and truncated overflow. | Standard and 1200×2400 dark/130% layouts rendered. Autoplay advanced and heights matched. Larger text can scroll to CTA. Existing first-touch/focus behavior retained; reduced motion removes transition animation, not the inherited autoplay timer. |

## Verification

- Mobile suite: **430/430 passed**, no failures/skips, using `ALECONNECT_STAFF_ROOT=C:/Users/Justine/.codex/worktrees/mobile-api-release/aleconnect` (the reviewed compatible Staff companion). Default primary Staff shared-contract text lacks the additive previously released block; that baseline cross-repo mismatch was not repaired in this UI pass.
- TypeScript: passed. Scoped lint: **0 errors, 8 existing warnings** in Carousel/Reanimated compiler rules and Hotlines effect dependencies.
- Expo offline dependency alignment passed; no dependency change in this pass.
- Fresh Android Hermes bundle and signed preview assembly passed. All **19 scoped source hashes** match the built v35 snapshot.
- Independent read-only review found no actionable introduced defect. Review used current source, snapshot hashes and saved test/native evidence; an exact full pre-pass source archive was unavailable.
- Graphify update passed; generated graph has 4,331 nodes / 8,068 links and is preserved separately from scoped source changes.
- Harness passed with the documented --sibling option targeting the reviewed Staff companion. Default primary-sibling validation is baseline-failing on the existing shared-contract mismatch. git diff --check passed with existing CRLF notices; all six preserved primary Mobile document hashes match, and Staff/Lineman remain clean.

External evidence: `C:/Users/Justine/.codex/visualizations/2026/10/06/01a11159-52ae-76a2-8dfa-7672826bbaea/outputs/redesign-04/native-implementation/navigation-polish`. Includes plan, source hashes, test/build logs, AX journeys, screenshots and APK identity checks.

## Installed preview and preservation

Final fixture preview: [aleconnect-panelui-navigation-fixture-v35.apk](C:/Users/Justine/Desktop/AleconnectApps/aleconnect-panelui-navigation-fixture-v35.apk), 68,741,117 bytes. SHA256: `80466f4c3ecf7311b376abe926aaeabf7593b5b4fbef6f89581134fbe6f65d4f`.

This APK is x86_64 for emulator inspection with explicitly labelled visual fixtures, embedded JavaScript and queue replay paused. It is not the physical ARM device build. Original v32 test-account and fixture-free ARM64/x86_64 v33 APKs are preserved.

Package remains `com.kapecakes.aleconnectmobile`; original preview certificate SHA256 is `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`. Installed with `adb install -r` on the existing Android 15 `AleconnectPanelUIPreview` AVD. First-install timestamp remains **2026-10-09 03:36:24**.

Read-only retained-data check exactly matches the earlier snapshot: storage digest `ddda1e068222e377df3de9401a6ed7b6`, queue count **1**, evidence present (**68 bytes**, digest `d8bb5d59888d24b6e13af6a76b0bb7a5`). No seed/replay/delete/data-clear/uninstall or physical-phone action. Temporary 130% text/dark/wider-screen settings restored to font 1.0, light, 1080×2400. Labelled Reports main left open.

Primary Mobile six existing task documents preserved; Staff and Lineman source untouched. No Figma mutation, commit, push, API deployment, OTA/EAS/store publication in this pass.

## Remaining acceptance and risks

1. **Current guest-feed backend drift:** fresh read-only GET `https://api.aleconnect.app/api/mobile/public/updates?limit=5` returns **404**; Hotlines endpoint returns **200**. Guest feed is unavailable from the current live server. Earlier deployment acceptance does not prove the current deployment retained the reviewed readers. Reconcile Staff-owned deployment before guest release; no deployment performed here.
2. **Native stability remains a release blocker:** historical Android ART/JIT/renderer SIGSEGVs have no diagnosed fix. Captured v35 inspection crash buffer contains no ALEConnect crash and does contain an Android Messaging SIGSEGV; a bounded successful run is not a crash fix.
3. Live authenticated submit→refresh, account/network switching, map geocoding/GPS, push, upload/replay, physical device, native iOS and spoken accessibility were not accepted. The test emulator preserves its synthetic queue rather than exercising it.
