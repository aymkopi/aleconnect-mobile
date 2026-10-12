# PanelUI page-specific recovery handoff

Verified: 2026-10-11. Scope: consumer Mobile presentation in the existing isolated `codex/panelui-five-main` worktree, based on `bf7b2a0`. Changes remain uncommitted. Staff, Lineman and the original Mobile checkout were preserved.

## Design and implementation

[Figma section 43: Completion audit · Page-specific recovery](https://www.figma.com/design/6uIaVRM63oHA723WKgjo5k/Aleconnect-mobile?node-id=685-17347) contains 76 editable 402×874 phone frames: the original 20 plus 56 added Light/Dark specimens. Frames are grouped by feature and recovery state, with the handoff section below the grid.

Figma was standardized before app implementation. Both use existing PanelUI EmptyState, Spinner, Button, Text and Lucide compositions; shared child headers and navigation remain. Foundation: Inter/Plus Jakarta Sans, 16px side padding, 12px section gaps, 12px card radius, subtle 0.75px decorative borders, flat surfaces and dark background `#00060F`. Layout wrappers and text slots have no decorative outline. Recovery headings use 18px/26px; supporting text uses the existing compact body scale. Detail recovery regions use a 300px minimum, rather than an oversized full-page card.

No new dependency, API, schema or route was needed. The app adds one shared `DataState`/`DataNotice` composition and distinguishes initial/refresh failures from pagination failures in the existing scoped reader. Existing authorization, consumer-scoped cache, queue/evidence storage and mutation validation remain authoritative. Guest gates stay in place.

## State rules

| State | Presentation and action |
| --- | --- |
| Initial read pending | Labelled indeterminate Spinner. No fake progress estimate, business totals or unread badges. |
| Initial read failed | Page-specific explanation and one appropriate Retry action. Do not show a successful empty state. |
| Successful empty result | Explain the real absence and offer a relevant next step, such as creating a report or browsing advisories. |
| Successful filtered/search empty | Explain the query/filter mismatch; reset the relevant criteria. |
| Refresh failed with usable scoped data | Keep loaded content, drafts and context. Add a compact refresh notice; do not replace the page. |
| Pagination failed | Keep loaded rows and scroll position. Retry from the footer using the existing cursor. Do not activate the pull-to-refresh spinner. |
| Access or resource unavailable | Offer the appropriate parent destination or refresh account context. Do not repeatedly retry a request without valid access. |

Stale saved data is clearly distinguished from a completed current read. Cached data never grants business authority, changes account ownership or bypasses access checks. Reports main totals use `—` until data is available; archive counts are explicitly counts of loaded reports. Inbox count badges stay hidden until its data is available, including loading and first-load failure. Valid loaded/offline counts are retained.

## Coverage

| Page or flow | Recovery coverage |
| --- | --- |
| Home | Compact publisher loading/failure within the existing region; shortcuts, address, CTA and navigation stay available. Retained carousel on refresh failure. Existing full-width 112px advisory-height cards, 24px slide gaps, dots and 3s autoplay remain. |
| Reports main | Loading, first-read failure, first report and filtered empty; truthful KPI/tab totals; retained reports on refresh failure. |
| All reports | Loading, initial failure, true/filtered empty, cached refresh notice and footer pagination retry. Search, filters and saved-work access remain available. |
| Report detail | Loading, retry with valid access, retained detail/status during refresh failure, unavailable account/report routing and account-context refresh. Guest Sign in remains separate. |
| Advisories main and search | Initial loading/failure, empty feed, no matching query/filter, retained cards on refresh failure and footer retry for earlier updates. |
| Advisory/post detail | Initial loading/failure, unavailable content and retained article on refresh failure. |
| Hotlines main and directory | Directory loading/failure, empty/no-match and retained contacts on refresh failure. The independent 911 control remains available on the main page. |
| Notifications inbox | Loading, initial failure, first-use empty, all caught up, no matching criteria, retained offline/refresh content and pagination retry. Read actions require valid loaded data. |
| Notification detail | Loading, initial failure, unavailable message and retained message during refresh failure. |
| Account information | Loading and retry; editing stays hidden until valid details/eligibility arrive. Cached refresh failure retains existing profile context. |
| Account-link requests | Loading, failure and empty requests with a Link account next step; retained requests on refresh failure. |
| Alerts & notifications | Initial settings loading/failure and last-saved settings notice. Existing recipient choices and drafts survive a read failure; mutation errors remain distinct. Figma recipient selection now explicitly uses “Use selected areas.” |
| Account main | Profile refresh notice while keeping the standard menu layout and guest restrictions. |
| Search services | Module-specific retry while keeping successfully loaded results. Failed readers do not create a misleading “no results” state. |

Existing authentication, form validation, upload/evidence limits, map/GPS/provider recovery and durable queued-report screens were preserved. Static service previews do not get artificial API-loading pages. No duplicate recovery routes or additional business features were added.

## Verification

| Check | Result |
| --- | --- |
| Complete Mobile tests | 467/467 passed, zero skipped, using the reviewed compatible Staff companion. |
| TypeScript | Passed on final v45 source. |
| Harness and whitespace | Passed against the reviewed Staff companion; Git reported only existing LF/CRLF normalization notices. |
| Scoped lint | Zero errors; four pre-existing warnings in hotline effect dependencies, Account session-sheet effect and reader cleanup. Final inbox change separately passes with zero warnings. |
| New regression coverage | Six rendered recovery tests and three additional scoped-reader tests. Covers retry vs empty, indeterminate loading, criteria reset, retained refresh content, footer paging, access-aware report recovery and unknown unread-count visibility. |
| Independent read-only review | No actionable findings, including the final unread-count change. |
| Impeccable detector | No findings. |
| Native build | Final Hermes bundle and signed Gradle preview assembly passed. |
| Graphify | Refreshed: 4,430 nodes / 8,320 edges / 377 communities. Generated output retained separately from scoped source. |

The default primary Staff sibling still differs from the reviewed companion's shared contract. This is a previously recorded integration baseline, not fixed by this UI task. Test success with the companion does not establish current production API compatibility.

Native inspection used the existing Android 15/API35 x86_64 emulator. Bounded checks covered the actual public Home reader failure; fixture inbox loading, initial failure/retry, true empty, offline retained rows, pagination failure/retry; All reports initial failure/retry; and advisory detail refresh/first-read failures. Final v45 was inspected in Dark mode at 130% text and Light mode at normal size. Unread numeric badges remain absent during loading/initial failure. Footer pagination retry retained the current rows and position.

The advisory first-read failure used an unloaded fixture ID to distinguish it from the existing-ID refresh failure. It proves the failure presentation, not a successful live article refetch. No live private submission, emergency call, queue replay or push delivery was performed. Light OS appearance and font scale 1.0 were restored, with labelled Home fixtures open.

## Preview and preservation

Final artifact: `Desktop/AleconnectApps/aleconnect-panelui-page-recovery-fixture-v45.apk`.

- Version code: 45; 68,781,245 bytes; x86_64 labelled emulator fixture preview.
- SHA256: `8019a1f72d70759a654e7001435a7df1a42065b6eea4bcd616019b83061ad5d7`.
- Original package: `com.kapecakes.aleconnectmobile`. Original Expo identity, HTTPS API origin and embedded bundle verified.
- Matching original preview certificate SHA256: `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`.
- Installed in place without uninstall/data clear; first-install timestamp `2026-10-09 03:36:24` retained. Older v43 and interim v44 APKs remain available.
- Read-only before/after storage, queued-report and evidence aggregate digests match exactly. One retained queued item and its 68-byte evidence file remain intact.
- All 26 final scoped source/test/config hashes match. The original Mobile checkout's six task-document hashes remain unchanged; Staff and Lineman primary checkouts remain untouched.
- No ALEConnect mention appears in this bounded final captured crash buffer. Previously recorded native instability remains unresolved; this is not a stability certification.

Evidence is saved under `outputs/redesign-04/native-implementation/page-recovery` in this chat's visualization workspace. Final logs use the `v45` suffix; interim v44 evidence remains for traceability. Source/config baselines, screenshots, final test/build logs, APK verification, aggregate retention checks and generated graph output are preserved there.

## Remaining acceptance

This completes the requested Figma-first recovery pass and emulator preview. It does not establish production readiness. Current Staff/public-reader reconciliation and the previously observed native stability issue remain open release gates. Live authenticated API/provider/upload/push/replay flows, physical Android ARM, native iOS and spoken accessibility still need separate acceptance. Preview background/replay/push writes remain paused.

Next: use the existing Guest/API and native release handoffs to reconcile the Staff companion onto the current backend, diagnose native stability, and run disposable authenticated and supported-device acceptance. Preserve the current signing and saved device work; no commit, push, deployment or publication occurred in this task.
