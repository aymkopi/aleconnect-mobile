# Advisories child-page implementation

Worktree: C:/Users/Justine/VSCodeProjects/aleconnect-panelui. Branch codex/panelui-five-main. Consumer UI only; shared APIs and durable Report storage unchanged. Preview 23 is the final inspection build; preview 22 is diagnostic and superseded. Native release acceptance remains OPEN.

## Implemented journeys

| Journey | Implementation | Accepted Figma reference |
| --- | --- | --- |
| Advisory detail / notification destination | /advisory/[id]; full official message, canonical type, published date, control reference, schedule, audience, photos and contextual service help |94:4552;551:12257,12308,12357,12408 |
| Restoration | Explicit restoration type and Restored at; report CTA. A passed schedule end never means power restored |547:11279 |
| Information / billing reminder | Full ALECO message. Never infer balance, payment status or collection date from publication/effective dates |547:11365,11446 |
| ALECO post | /advisory/post/[id]; full message, publisher/date, actual photos and original HTTPS permalink when supplied |94:6279;275:4398 |
| Search updates | /advisory/search?q=; reference/message/audience search, All/Advisories/ALECO feed, clear, empty/error/saved states and older-page loading |547:11066 |
| Affected audience | One controlled BottomSheet with labelled search, published audience, no-match state, Close/native Back/Back to advisory |547:11151 |
| Photos | Reused Report photo viewer with update copy, pinch/pan, fit, bounded previous/next, spinner/error/retry and native Back | Existing shared photo layout |
| Entry points | Home carousel, main Advisory/story cards and search-result cards now open their child destination | Current main screens preserved |

All child pages reuse the compact shared header (18/26 Jakarta),16px side gutters,12px content rhythm,12px component radius, Inter body16 and semantic light/dark surfaces. No scrollbars. Search uses labelled PanelUI fields and the shared search icon/clear slots. Sheet Footer owns both12px separator gaps. Existing five main tabs are unchanged; child detail/search routes have no floating tab bar. Exact existing Mayon asset matches Figma SHA1 d9e33bb9e210d77d9e52660e3c58486ac02f4891; real photos always come from the official response.

## Source and authority

Advisory details read fetchActiveAdvisory with the live account scope. Identity, access revision, kind and ID key useScopedRead; older responses cannot populate a different scope.401 requires sign-in;403/404 replace prior detail with unavailable, rather than retaining withdrawn content. Ordinary network errors retain only the already-loaded item for that same scope, with a refresh warning. Signed-out and auth-loading states never activate a read scope. Production route flags cannot enable fixtures.

Post details use the existing scoped public feed because there is no post-by-ID endpoint. Lookup follows20-item pages until matching post or cursor exhaustion, detects repeated cursors and propagates network/auth errors. Main/search also use20; a reviewed50-versus20 cache-cursor skip was reproduced, fixed, and covered on both first and older pages. Shared service/cache/normalization files were not changed. Search explicitly describes loaded-record coverage and can load older pages; it is not server-side full-text search.

Both current Staff readers require consumer authentication, including All-target advisories. Guest public access remains blocked by the existing server contract. Structured affected-place/feeder rows, advisory topic, billing collection date/account metadata, update history and a post-detail API are not currently supplied. The UI shows verbatim audience/full message instead of inventing them. Ended/withdrawn/access-lost detail is unavailable; only an explicit restoration advisory can claim restoration. Refresh retrieves the latest published notice without fabricating a schedule-change history. New backend capability is a separate cross-project task.

## Verification

- Final suite: 331 tests, 330 passed, 0 failed, 1 existing skip. TypeScript passed; scoped lint passed with 0 errors and 0 warnings. No dependency or lockfile edits were made in this task.
- Canonical schedule/search/post lookup/access/URL checks and rendered anonymous/scope/revocation/deep-link checks passed. Shared photo-viewer regressions retain the default Report behavior. Independent review reproduced a shared-cache pagination defect: a 50-item post read let the 20-item feed skip records 21–50. Matching all readers to 20 fixed it; the first/cursor-page regression passed and the reviewer confirmed the finding closed.
- Final signed Android preview 23 build and iOS Hermes export passed. The installed source matches all 19 build-source hashes. Android package com.kapecakes.aleconnectmobile and original signer fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c are preserved. In-place installation retained firstInstallTime 2026-10-09 03:36:24; lastUpdateTime is 2026-10-09 17:08:57 UTC.
- Native light preview 22: main → detail → affected-audience search/no match/native Back; main → post → full-size photo/Fit/native Back; reference search → feed empty state → clear checked and captured. Preview 23: signed-out preview URL remains gated, canonical unscheduled/restoration/maintenance/weather/information/billing/updated variants, unavailable, spinner, retry/retained-content, saved-post warning checked. These are explicitly labelled fixtures; they do not prove live network behavior.
- Preview 23 dark mode at 130% text: detail wrapping and surfaces, audience search/no-match/footer/native Back, full post with scrollable footer, photo/Fit/native Back, reference search/filter empty/clear, and retry dismissal checked. Tabs wrap at enlarged text; buttons remain reachable. Scrollbars stay hidden. Keyboard obstruction is not independently accepted from the automation typing check.
- Final read-only retained-data check exactly matches storageDigest ddda1e068222e377df3de9401a6ed7b6, queueCount 1 and existing 68-byte evidence digest d8bb5d59888d24b6e13af6a76b0bb7a5. No seed, report submission or queue action. Emulator left on labelled Advisories main, light mode and font scale 1.0.
- All 9 protected Report contract/storage/map/evidence source hashes and 6 primary Mobile task-document hashes match preserved records. Core Advisory/PublicUpdates services, auth and scoped-read hooks unchanged. Staff and Lineman checkouts are clean; primary Mobile retains its pre-existing six documentation paths.
- Graphify update passed: 4,014 nodes, 7,045 edges and 350 communities. It also indexes retained scratch/generated content; these are not source-only counts. Generated artifacts are retained separately from the source checkpoint.

## Remaining risks

Native release acceptance remains OPEN. A confirmed preview 23 SIGSEGV occurred at 2026-10-09 17:11:41 UTC while opening the labelled fixture entry point; the JIT stack includes ElevationOverlayProvider.<init> and a null fault. The pre-update version 21 HeapTaskDaemon/ART MarkCompact SIGSEGV at 16:15:26 UTC and earlier renderer crashes remain separate evidence. Cause is undiagnosed; no runtime/dependency fix is claimed.

During resumed checks, the app exited at 20:39:59 UTC with an ActivityManager process-death record and no crash-buffer stack; do not label that exit as another confirmed SIGSEGV. A separate com.android.systemui SIGSEGV occurred at 20:44:07 UTC during restoration of normal display settings. The bounded repeat rendered the pages successfully; it does not resolve any crash.

Physical-device, native iOS, spoken TalkBack and live authenticated targeted-advisory/network/cache/media-renewal acceptance remain unverified. Anonymous All-target advisories, structured affected-place rows, billing topics/collection metadata and publication history need separate Staff API capability. Search covers loaded pages, not full server-side search. Existing Home fixture fit follow-up remains separate.

No commit, push or production release. No live account/report write, retained queue action, uninstall/data clear or physical-phone interaction. Preview writes/replay stay paused.

Harness validation and git diff --check passed with only the existing absent Temp sibling and repository line-ending notices. 29 native screenshots are retained.

## Inspection build and handoff

Final APK: C:/Users/Justine/Desktop/AleconnectApps/aleconnect-panelui-advisories-v23.apk, 68,322,165 bytes.

SHA256: c4d2c7d5c0c5b2b48b59c235a5caa2a59ad72d9f436d2ec7a4b49aadee7c5cc8.

Evidence is preserved in .superpowers/sdd/2026-10-10-advisories-child-pages and the stable external checkpoint outputs/redesign-04/native-implementation/advisories-child-pages. Source, before-state overlay, APK, screenshots/test/build/review/crash logs and generated Graphify output are kept separately.
