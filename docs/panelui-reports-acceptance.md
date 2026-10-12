# Reports child pages — implementation and acceptance

Worktree: C:/Users/Justine/AppData/Local/Temp/aleconnect-panelui, branch codex/panelui-five-main, base bf7b2a0. This extends the approved PanelUI migration; primary checkouts are preserved. No commit, push, OTA, EAS, store or production mutation was performed.

## Implemented routes and surfaces

| Entry | Implemented behavior |
| --- | --- |
| /reports/new | Account → issue/type → location → details → photos → review. Conditional fields, source validation, review edit/return, discard/change-account/change-type protection and local-save failure recovery. |
| New report / Choose location | Full-screen map, search, location permission states, Albay validation, manual coordinate/address recovery, zoom/current-location actions and draft-preserving Back. |
| New report / Photos | Camera/library choices, permission guidance, preparing/failed/ready/removal/max states and evidence viewer. Source requires 1–3 prepared photos, each at most 5,000,000 bytes. |
| New report / Review and submission | Editable summary cards; known form stages use progress, unknown-time submission uses a spinner. Receipt only after confirmed server ticket id and reference. Saved/unconfirmed results route to the existing consumer-scoped durable queue. |
| Report received | Centered nested ticket, reference, canonical initial status, account/location/evidence context, next-step copy and Home/Track actions. No page header. |
| /reports/list | Search, account/status/type/period/custom-date/sort filters, badge counts, grouped card list, loaded-page pagination, empty/loading/error/offline/auth recovery and saved-device entry. |
| /reports/[id] | Existing detail layout preserved, canonical actual history, rejection reason, unknown/previously-known/unavailable states, evidence, refresh/reference copy and published service updates. |
| /reports/timeline | Status explanation and expandable guidance; describes statuses without inventing history or ETA. |
| Report evidence | Full-screen viewer, loading/failure/retry, next/previous bounds, Fit/double-tap/pinch/pan and Back. Restricted object paths are not treated as public image URLs. Bundled Android drawable identifiers are supported. |
| Report / Service update | Published operational phase, actual message/time, supplied estimate or explicit unavailable estimate, next update and public advisory navigation. |
| /reports/queue and ?id=… | Saved list/detail, account/location/photo sheets, connection check, privacy-safe diagnostics/copy, guarded retry/discard and confirmation/failure/sending/unconfirmed states. |
| /report/[id] | Notification compatibility redirect preserves id, account and focus; invalid identifiers recover to the report list. |

Home and Reports entry actions now use these routes. Report detail retains the floating five-tab bar; creation/archive/queue/status/full-screen overlays hide it. Child pages have hidden scroll indicators while remaining scrollable.

## Design and contract authority

Figma file [ALEConnect concept](https://www.figma.com/design/6uIaVRM63oHA723WKgjo5k/Untitled?node-id=94-2045), page94:2045. Saved high-fidelity contexts cover account, issue, type, location, details, photos, review, receipt, archive, detail, large map and saved-device flows. The 79-frame inventory is mapped in the external reports-child-pages/figma-state-coverage.json. Shared/dynamic states reuse a screen or sheet rather than creating 79 routes. Coverage of source states is distinct from exhaustive rendered parity for every frame.

Inter body/control text and Plus Jakarta Sans display titles; 16px page sides, 12px section gaps, 12px card radius and existing semantic light/dark tokens. PanelUI Button, Input, Field, Label, Select, Tabs/Badge, Dialog, BottomSheet and Spinner are reused. Only one sheet host is open per flow; subviews replace its content and expose Back. BottomSheet body content now defaults to12px gaps, while callers may override contentContainerStyle. Footer owns its established separator/action spacing.

ReportPage measures its footer and uses the installed KeyboardStickyView alongside KeyboardAwareScrollView so keyboard and enlarged actions do not hide the form controls. This follows the library's [sticky-footer example](https://github.com/kirillzyusko/react-native-keyboard-controller/blob/main/example/src/screens/Examples/AwareScrollViewStickyFooter/index.tsx). No new dependency was added.

The existing report contract, metadata, statuses, service, queue, access checks, map runtime and evidence preparation are unchanged from the task baseline (9 SHA-256 comparisons). Description/action limits remain2000, registered-name limit160. Canonical statuses: under_review, verified, rejected, dispatched, in_progress, resolved, closed. Unknown statuses remain pending; no fabricated completion percentage, milestones, arrival time or restoration estimate.

Server filtering supports account/category/search and newest/oldest/status sorting. Report status, type and period filters apply to loaded pages and are explicitly labelled; the client does not claim complete period totals. Saved queue payloads cannot be edited or reassigned with the current source API. Uncertain final submission, a prior ambiguous attempt or sending blocks discard. Retry retains the original account/idempotency key. Published update responses do not carry a reliable advisory id, so the public-advisory action opens the existing advisory list.

## Verification

- Final application suite:316 passed, zero failures, one existing skip (317 total), including the reproduced child deep-link regression.
- Final TypeScript passed. Scoped lint: zero errors and zero Reports/navigation warnings; nine existing copied BottomSheet compiler warnings remain outside the changed lines.
- Fresh 6.1 Sol/xhigh review: four concrete issues reproduced and fixed (receipt/local-cache failure discard, canonical home barangay, Android search permission, late status baseline). Follow-up native fixes reviewed with31 independent passing checks and no concrete functional/security regression. Final navigation/content-gap review independently passed12/12 with no concrete finding.
- Root regressions reproduce and verify signed-out metadata gating, keyboard/footer measurement and Android bundled evidence support.
- Android signed version17 built and installed in place. Original preview certificate/package and first-install time preserved; exact queue/receipt/evidence snapshot matches baseline. Versions14–16 are diagnostic superseded candidates.
- Final version17 iOS Hermes export passed. Native iOS was not run.
- Final Graphify AST refresh passed (3701 nodes,6185 edges); generated output is retained separately from source checkpoints. Harness validation and git diff --check passed; harness retains only the existing absent Temp sibling warning. Primary Mobile six task-document hashes and all nine protected report-service hashes match the task baseline.

## Rendered Android checks

Dedicated AVD AleconnectPanelUIPreview, Android15/API35, x86_64/16KB pages,1080×2400,density420. Labelled fixtures use memory only, with no live report/photo submission or retained queue action.

Observed: six-stage creation; category/type Select; larger map/Use this location/return; text entry; zero-photo validation; three-photo maximum/removal; review edit/back; simulated save failure/retry; centered receipt/Track; detail/status guidance; actual rendered evidence and next/Back; published ETA service update; unknown and rejected status; archive/custom-date calendar and one-sheet Back; queue list/detail/discard confirmation/Keep/unconfirmed protected state/simulated retry confirmation. Keyboard footer fix verified in installed15. Dark130% detail/rejection, archive/filter and queue/discard controls remain readable and scrollable. Final shared spacing verified in installed16 at100% and130%: about31 physical pixels/12 logical pixels between fields, with footer actions fitting. One-sheet status Back and Apply verified. An archive deep-link tab-visibility defect was reproduced and corrected in17; native17 confirms all four utility routes hide tabs and detail retains five tabs. Screenshots saved in the ledger.

A system_server SIGSEGV at12:38 interrupted one diagnostic check; read-only logs identify Android PermissionService as the crash origin. Reboot recovered the emulator without wiping data. This does not establish an app crash fix. Earlier HybridData DestructorThread app race remains a separate baseline risk.

## Remaining acceptance limits

Preview intentionally pauses replay/background/push and prevents live submissions; authenticated live creation, permission/camera/GPS/provider failure, queue replay/upload and signed-evidence renewal still need a disposable authenticated acceptance account. No existing user report was submitted, deleted or retargeted. Native iOS, physical-device, spoken TalkBack, real map tiles/provider behavior, pinch gestures and every79-state visual permutation are unverified. In-memory unsent form/fixture state is not a persisted draft and resets on process recreation; durable saved queue/evidence are preserved.

## Final artifact and preservation

- Final APK: C:/Users/Justine/Desktop/AleconnectApps/aleconnect-panelui-reports-v17.apk; 68,278,149 bytes; SHA256 2b895a15a96e3c9e25501f1dc438fcff04beb47e2eff24bc99e3cd4c38865751.
- Package com.kapecakes.aleconnectmobile/versionCode17; original preview signer SHA256 fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c. This is the existing preview certificate, not production/store signing readiness.
- Installed in place with firstInstallTime2026-10-09 03:36:24 unchanged; lastUpdateTime2026-10-09 13:09:28. No uninstall, data clear, downgrade bypass or signature bypass.
- Read-only retained-data snapshot matches exactly: storage digest ddda1e068222e377df3de9401a6ed7b6, one queued report, existing68-byte evidence digest d8bb5d59888d24b6e13af6a76b0bb7a5. Real authenticated session continuity remains a separate gate.
- Final build source31 SHA256 comparisons match before/after build. Primary six task-doc hashes and protected report-service nine hashes match baseline. Staff/Lineman remain clean; existing six primary Mobile documentation changes preserved.
- Post-install17 crash buffer has no new app crash. Font scale1.0/light restored; temporary stylus setting restored to null, original hardware-IME setting1 retained.
- Source/APK/evidence handoff: C:/Users/Justine/.codex/visualizations/2026/10/06/01a11159-52ae-76a2-8dfa-7672826bbaea/outputs/redesign-04/native-implementation/reports-child-pages. Source checkpoint layers onto the prior accepted v13 foundation, excludes keys/environment/dependencies and keeps generated graph output separately.



## 2026-10-09 continuation — Reports period and main filter completion

Fresh design context94:3347 and94:3231 exposed the remaining missing child flow. Added a dedicated Reporting period route (/reports/period): all dates, current month, previous month, current plus two preceding calendar months, year and inclusive custom range. Reused the existing Archive calendar; invalid/reversed dates block Apply. Apply returns to the existing main route and preserves its local filters. Utility tabs stay hidden on this child route.

Main Reports now stages Service account, Report status, Report type and Sort by in a single PanelUI sheet. Lucide prefixes, labels, masked account suffixes and searchable account/type options follow the design. Back changes content within the same host. Dismiss drops pending choices; Show reports applies; Reset resets the staged criteria. View all carries account/status/type/sort/query/period/date criteria into Archive. Three Reports sheets use16px side padding. Date and overview period labels use14px for compact consistent text. Guest/fixture metadata requests remain disabled.

The server remains authoritative for account scope; older rows without optional account IDs stay visible. Account/status/type fixture examples now have coherent linked accounts. Report/status/service/queue/map/evidence protected sources remain unchanged. Period/status/type filter loaded records only; counts do not claim complete server totals. Three months means current and preceding two calendar months, not90 rolling days. Installed Expo CLI cannot resolve its route-generator module; only ignored local route declarations were supplemented, with no dependency/runtime change. Fresh checkout typed-route regeneration remains a separate tooling issue.

Source verification: full321 total/320 passed/zero failures/one existing skip; TypeScript and scoped lint pass; iOS20 Hermes export passes. Fresh6.1 Sol/xhigh review found one Important optional-account compatibility defect; reproduced0→fixed1 and the full suite passed. No Critical/Minor findings. Final20 Android build passed; native acceptance remains open as detailed below.

Native19: dark130% main sheet/actions, account/type selectors, Sort→Back with staged values, custom period/calendar/Back/Apply and retained main criteria observed. A native renderer SIGSEGV occurred once while applying filters at15:04:51 (CompositeBackgroundDrawable.getOutline JIT frame). Exact sequence succeeded after relaunch; cause unresolved and no fix claimed. Prior baseline native cleanup/system crashes also remain documented. Preview only; native acceptance is not sufficient for release. Live authenticated creation/providers/upload/replay, physical Android, native iOS and spoken accessibility remain unverified.

## Final preview20 — source completion, native acceptance open

- Source checks: 321 tests / 320 passed / 0 failed / 1 existing skip; TypeScript and scoped Reports/navigation lint passed. Android assemblePreview passed; iOS Hermes export passed. Final11 build-source hashes match. Graphify refresh3817nodes/6394edges/335communities is retained separately.
- Preview20 APK: C:/Users/Justine/Desktop/AleconnectApps/aleconnect-panelui-reports-v20.apk, 68,287,817 bytes, SHA256 cdb63321d3d89019bdf80faf9dc95887865c7ddf5261764dded33c010c6f451c. Package com.kapecakes.aleconnectmobile; original preview certificate fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c. Installed in place, firstInstallTime2026-10-09 03:36:24 unchanged, lastUpdateTime2026-10-09 15:17:08 (emulator clock). Version20 supersedes17–19 for inspection; it is not release accepted.
- Retained data: exact storage digest ddda1e068222e377df3de9401a6ed7b6, one queued report and existing68-byte evidence digest d8bb5d59888d24b6e13af6a76b0bb7a5. No uninstall/data clear/signature bypass/live report writes. Protected9 source and primary6 documentation hashes match their baseline.
- Observed on20 at dark130%: equal-height custom date buttons, visible dates/calendar navigation,16px calendar sheet sides, Apply returning with criteria retained, and main account Home/type Primary Line → Sort → Android Back → Show reports. Archive inherited all three criteria.
- Native acceptance is OPEN and release-blocking. Opening Archive filters at15:21:38 caused another native SIGSEGV (FabricUIManager MountItemDispatchListener.didDispatchMountItems in dalvik-jit-code-cache; addr0x18). Version19 also crashed applying main filters at15:04:51 (CompositeBackgroundDrawable.getOutline JIT). A pre18 ViewManager native JIT crash at14:24:50 remains separate evidence. Root cause is unknown; no runtime/dependency workaround or fix is claimed. archive-carried-filters-dark130-final20.png is launcher/failure evidence, not a passing Archive-sheet screenshot.
- Remaining checks: authenticated live submission/upload/replay/permissions, physical Android, native iOS and spoken TalkBack. Preview pauses live writes and background replay. Route-generator module resolution remains an installed-tooling limitation; ignored generated route declarations only were supplemented.
- Changes remain isolated and uncommitted in codex/panelui-five-main. Source overlay, build/test logs, reviewer result and native diagnostics are retained in native-implementation/reports-child-pages/sheet-completion; keys, environment files and dependencies are excluded.

Bounded final20 light100% repeat: labelled fixtures → Reports → View all → Filter opened successfully with account/status/type/period/sort and both footer actions visible. Android Back dismissed and returned to main. Screenshot archive-filters-light-final20-repeat.png records this repeat; native stability remains unresolved.
