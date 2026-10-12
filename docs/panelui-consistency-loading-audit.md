# Mobile consistency, missing-state and emulator audit

2026-10-11. Figma first, app second, in the existing isolated codex/panelui-five-main worktree. No API, auth, status, cache, queue or evidence contract changed. The original Mobile, Staff and Lineman checkouts remain preserved.

## Design standard

Inter for interface/body copy; Plus Jakarta Sans for page and feature headings. Current active phone designs use these families only. Screen background is #F6F7F9 in Light and exactly #00060F in Dark. Neutral semantic surfaces, white/primary Dark text, 0.75px decorative outlines, stronger control outlines, 12px default card radius, 16px buttons and 24px dialogs/sheet top corners. BottomSheets are attached, full width with square bottom corners, no outside bottom gap, and safe-area padding. Side gutters stay 16px; section spacing 12px, card-list spacing 8px, field-label gap 4px and field-group gap 12px. Intentional photo/map/carousel full bleed, safe-area spacing, dashed evidence targets, Lucide stroke widths and floating-navigation elevation are exceptions. Content and switch-thumb shadows were removed in Figma; the app keeps existing flat controls.

Dark inspection found static Light paints and bindings to a Light-only legacy collection. Rebound 956 role paints and 410 legacy bindings on 71 Dark phone variants, preserving photograph/feature white copy and the dark phone island. Default radius aliases and shared Card/Field spacing were aligned in source. Figma Home variants now reserve the same 112px advisory-height carousel slot; the app already scales this height for enlarged text.

[Figma section 46: Content loading and route recovery](https://www.figma.com/design/6uIaVRM63oHA723WKgjo5k/Aleconnect-mobile?node-id=928-23609) adds 28 editable Light/Dark phone frames. Existing section 43 has 16 loading specimens updated to Skeleton; it retains its empty/failure/offline/refresh/paging variants. [Section 44 state components](https://www.figma.com/design/6uIaVRM63oHA723WKgjo5k/Aleconnect-mobile?node-id=694-17735) contains 10 reusable sized layouts built from the published PanelUI Skeleton component. Loading child headers use their actual page titles. Recovery has one action, standard outline styling and vertical scrolling fallback for large text/small windows.

## Gap resolution and relevance

| Gap | Importance | Resolution |
|---|---|---|
| Missing initial structured-content states | High | Added/updated Figma Light/Dark states, implemented shared ContentSkeleton and existing DataState loading composition. |
| Home publisher load | High | One 112px advisory skeleton; greeting, address, 4×2 shortcuts and CTA remain usable. Cached carousel is retained during refresh. |
| Reports main/archive/details | High | 112px report list, 152px detail and 54×34 KPI number placeholders. Reports, Resolved and Open counts use existing canonical definitions; unknown counts stay—. |
| Advisories/feed/details | High | 112px publisher cards and 152px detail blocks; actual photo bounds stay reserved while images load. |
| Hotlines/directory | High | 136px agency/contact placeholders; independent 911 control remains available. Existing single-sheet contacts, search/no-match and permissions feedback are reused. |
| Notifications/inbox/detail | High | 96px inbox rows and 152px detail blocks. Numeric unread counts remain hidden until valid data exists. Existing filters/read feedback/paging remain. |
| Account/profile/service accounts/link requests/alerts | High | Unframed 80px identity with fixed 64×64 avatar; 176px account/profile, 116px settings and matching request-list placeholders. No false zero-linked total. Existing menu/guest restrictions remain. |
| New report metadata and type selection | High | 180px form sections; 56px type rows inside the existing single sheet with Back. Submission and validation flows unchanged. |
| Search mixed results | Medium | Report and contact loading regions are separate; already-loaded sections remain usable. Static service guides do not pretend to fetch content. |
| Map preview/full map/evidence imagery | High | Skeleton fills actual map/photo bounds; map failure/manual fallback remains. GPS/reverse geocoding and evidence preparation use Spinner. |
| Unknown deep link | High | New Expo Router +not-found screen; contextual explanation and Back to Home. Designed in Figma first. |
| React render failure | High | Root ErrorBoundary uses standard recovery, guarded retry and Home escape; does not delete caches/queue/auth/evidence or expose exception details. Designed first. It cannot catch native ART/process failures. |
| Compact tabs and fixed-height navigation | Medium | One-line labels preserve full accessible names and the existing touch targets; 13px/17px nonexpanding tab labels follow Figma. |
| Extreme text-size layout limits | Medium / follow-up | Standard Light and Dark 130% inspected. Smaller-window 180% recovery and single-line navigation checked; Home search hint clips at this extreme size. Broader large-text controls still need supported-device acceptance. |
| BottomSheet presentation | High | All 46 Figma sheet surfaces dock to the phone edges and bottom. Both shared PanelUI defaults use detached=false, covering all 18 Content usages including Select, guest gates and content/Back navigation. Fixed guest bottom padding was removed so system safe-area clearance remains authoritative. |
| Hidden/background loading motion | High | Skeleton cancels animation off-route, when app is backgrounded and with reduced motion. One announced loading region instead of every decorative bone. |

No other missing non-onboarding business page was identified by the bounded thin-route/feature inventory and existing completion map. Shared states reuse existing routes/sheets instead of adding duplicates. This is source coverage, not certification of every 446 Figma frame/rendered permutation.

Skeleton geometry: identity 80, selection 56, report 112, advisory 112, contact 136, notification 96, profile 176, settings 116, form 180 and detail 152dp at normal text size. Text-sized bones/card reservations grow with font scale; avatar remains 64×64. Media uses actual rendered bounds.

## Loading policy

- Initial structured API read: component-sized Skeleton. Never show fabricated totals, content or timed progress.
- Refresh/pagination: retain loaded data and location; existing refresh/footer busy indicator and explicit retry notice.
- Short blocking actions: Button loading/Spinner for sign-in, submit, save, verify, account linking, copying/opening actions when relevant, GPS and photo processing. Actual payment occurs in external channels; there is no invented in-app payment operation.
- Step progress remains only for the known report sequence; 2-second 911 hold remains a deliberate timed safety control.
- Unknown-duration read/action uses no determinate progress estimate.

## Native crash and lag evidence

The preserved Android 15/API 35 task AVD is an x86_64 16KB-page system image. It reproduced an ALEConnect ReferenceQueueDaemon NullPointerException at 11:07:06 and unrelated Google/system runtime crashes. No application source stack identifies a proven app root cause. Existing ART/JIT instability remains an open release gate.

GPU was disabled. On the same old AVD and same signed v46 APK, enabling verified NVIDIA host graphics changed measured median frame time from 150ms to 17ms and jank from 96.58% of 117 frames to 5.83% of 3,104 frames. These samples differ in length; this supports the lag correction, not a crash fix. Host rendering is now persisted for the existing Android 16/API 36.1 standard 4KB control AVD. Both AVDs and older APKs remain intact; no data clear, uninstall or snapshot reset. The control installed the same v46 APK before app changes, then the reviewed v47/v48/v49 previews and final v50.

[Android emulator acceleration](https://developer.android.com/studio/run/emulator-acceleration), [Android page sizes](https://developer.android.com/guide/practices/page-sizes) and [Expo Router error handling](https://docs.expo.dev/router/error-handling/) are reference guidance, not proof that this crash is a known platform defect.

## Verification and preview

- Passed: complete Mobile suite 473/473 (MJS and TypeScript tests, reviewed Staff companion), TypeScript, 34 scoped source files with zero lint errors, and harness validation against the reviewed Staff companion. All 30 lint warnings have matching pre-task counts/rules; the final sheet and guest-context messages exactly match their preserved baselines. New navigation has zero warnings. Fresh read-only reviews found no remaining actionable issue in loading/recovery, navigation or attached sheets. The guest fixed-bottom-padding finding was corrected before the final build.
- Build: final v50 Hermes/Gradle x86_64 preview succeeded in 4m 23s. Original package/certificate and first-install timestamp 2026-10-10 14:45:42 retained. APK 68,795,429 bytes; SHA256 a5b219162faae579673dbf7e8307f5bdfd4325af143753d84c61d171889845f2. Certificate SHA256 fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c.
- [Final labelled emulator APK](C:/Users/Justine/Desktop/AleconnectApps/aleconnect-panelui-consistency-loading-fixture-v50.apk). v46/v47/v48/v49 and earlier artifacts were preserved. This fixture build pauses queue/background/push/live-write paths and includes a visible sample-content label; it is not an ARM or production release.
- Native: control Android 16/API 36.1, 4KB pages, verified host graphics. Light five-main layouts at normal size checked on v48; final normal Home and single-line navigation checked on v49. Dark 130% Home/Reports/Advisories/Hotlines/Account, report/type/category/Color-theme sheets and guest access gate checked on v47/v48. Advisory tab heights now equal 84px at scale 2.625 and 130% text. Smaller-window 180% recovery stays readable; final navigation remains single-line. Full spoken accessibility/extreme-size acceptance is not inferred.
- Native v50 attached-sheet acceptance: Light report filters and service-account picker use one full-width sheet; Android Back returns to filters, then dismisses. Hotline category remains auto-height. Dark 130% Color theme shows rich prefix options. Shared Select scrolls to its final detail item above three-button navigation (item ends 2253px, system bar starts 2274px). Guest gate Keep browsing ends 2273px above that same bar, and dismisses without navigating into Reports. Full sheet surfaces have no exterior bottom gap. OS configuration recreation resets the in-memory fixture mode; fixtures were explicitly reopened after each configuration change. Gesture navigation, Light, System theme and font 1.0 were restored.
- Sized loading regions: normal report preview two 112dp cards plus 8dp gap measures 609px at density 2.625; Dark 130% measures 785px. Dark 130% contact preview measures 949px. Fixed 64px identity avatar, media bounds, single announced busy region and off-route/background/reduced-motion cleanup are covered by source/render tests. Actual initial guest Home displayed its advisory-sized loading region before explicit fetch failure; no fabricated content/counts.
- Route checks: Notifications settings Back returns to Notifications, then Account. Color theme opens directly in one sheet, with prefixes and descriptions. Report-type sheet Back returns to parent content. Leaving an open sheet for another main page dismisses it. Unknown route exposes Home escape. Guest Reports opens the login-required sheet over Home. No live sign-in, call, report submission, payment, seed or queue action was performed.
- Control crash buffer stayed empty through the bounded v46–v50 pass. The v49 motion/loading sample had 5,053 frames: deadline jank 4.08%, legacy jank 75.12%, median 21ms, p90 28ms. Metrics use different deadline definitions and include gallery loading animations/configuration changes; they are not a production smoothness guarantee. A separate v49 Home-only sample had 3,562 frames: deadline jank 7.22%, legacy jank 24.82%, median 17ms and p90 25ms. The older Android 15 ART/ReferenceQueueDaemon problem remains unresolved.
- Retention: control storageDigest 2bc3e460444cb3cd069fb15fbd993d6a, queueCount 0, evidence [] match before/after v50. The preserved old AVD's existing queue/evidence/storage digests also matched after its v46 host-graphics check; it was shut down without clearing data. All 41 final source/test/config staging hashes match; 264 originally inventoried source/test files have no unexpected edits, and all 6 original Mobile document hashes remain unchanged. Staff/Lineman source untouched.
- Graphify refreshed after final source edits; 4,472 nodes/8,413 edges. Generated graph is checkpointed separately from source. Final whitespace/harness/status closeout is recorded in the task handoff. Emulator restored to 1080×2400, Light, System theme, font 1.0, with labelled signed-in Home fixtures open.
- [Evidence folder](C:/Users/Justine/.codex/visualizations/2026/10/06/01a11159-52ae-76a2-8dfa-7672826bbaea/outputs/redesign-04/native-implementation/consistency-loading-audit) contains Figma audit JSON, source hashes/before files, reviews, test/lint/build/retention/crash/GFX logs and captured screenshots.


## Remaining production acceptance

Approved app Terms and real production email ownership verification remain capability-limited with explicit unavailable/support UI. Prior current-Staff/shared-contract/public-reader reconciliation stays open; tests use the reviewed mobile-api-release Staff companion. This presentation audit does not deploy or activate backend capabilities. Physical Android/ARM, native iOS, spoken TalkBack, real authenticated/provider/push/upload/replay and live payment/channel acceptance are not established by fixtures. Onboarding remains excluded.

No new dependency, production write, emergency call, queue replay, seed, commit/push, deployment or publication. Native fixture APK is x86_64; it is not a physical ARM release.
