# Mobile declutter refinement

## Status and ownership

- Owner: consumer Mobile presentation. Branch: `codex/mobile-declutter`, based on Mobile `master` at `8b1af18`.
- Stage: user approved app implementation and shipping on October17. The final instruction changes ticket-card dates to the latest event for the current status. PR14 is merged and alpha1.2.0-alpha.1/code68 is published after verified Staff PR50 deployment. Final evidence is below.
- [Editable Figma review page](https://www.figma.com/design/6uIaVRM63oHA723WKgjo5k/Aleconnect-mobile?node-id=1184-24615). Original reference screens remain unchanged.
- The separate user-requested chat, Reports accessible redesign proposal (`01a1461e-22c7-7d91-9653-68c2c6e2f3ea`), created a [new proposal page](https://www.figma.com/design/6uIaVRM63oHA723WKgjo5k/Aleconnect-mobile?node-id=1184-29946) with 12 editable Light/Dark report, filter, empty and loading frames. That broader redesign is outside this PR's implementation scope.

## Design direction

Keep the current visual identity, report cards, five destinations and existing service features. Reduce competing controls and repeated content rather than reducing text or touch-target sizes. Reuse copied PanelUI components and existing semantic colors, Inter/Plus Jakarta Sans typography, 16px gutters and borderless surfaces. Dark page backgrounds remain `#00060F`.

| Surface | Proposed change | Figma Light / Dark | Application status |
| --- | --- | --- | --- |
| Reports | Remove account and period controls from the overview. Keep heading, New report, KPI scope notice, search, status tabs and report cards. Use a labeled Filters button. | `1184:24617` / `1188:1334` | Implemented; source/browser verified |
| Unread report state | Match unread notifications: the same full-card tint and small unread dot, with no separate update banner. Read and unread retain the same content, layout and fixture height. | Comparison `1204:2639` / `1204:2690`; component set `1203:2504` | Implemented; source/browser verified |
| Ticket dates | Show the current canonical status and its latest matching history timestamp. If history metadata is absent/invalid, use labelled Updated or Submitted fallbacks. Read/unread content remains identical. | Reports `1184:24617` / `1188:1334`; scoped date masters `1216:4368` / `1216:4490` | Implemented; source/browser verified |
| Report filters | Put service account, reporting period, status, type and sort in the existing sheet. One Apply filters action; Reset restores defaults. | `1184:24669` / `1188:1385` | Implemented; source/browser verified |
| Period selection | Change the same sheet's content, with Back. Retain all dates, this month, last month, last 3 months, this year and custom dates. | `1186:2004` / `1188:1770` | Implemented; source/browser verified |
| Account selection | Change the same sheet's content, with Back. Show registered names and complete account numbers. | `1186:2079` / `1188:1837` | Implemented; source/browser verified |
| Custom dates | Reuse the existing bounded range calendar; retain January 1, 2026 through the current Manila date. Do not open a second sheet over the filter sheet. | `1187:1319` / `1188:1969` | Implemented; source/browser verified |
| Contact cards | Remove visible contact-type text; keep number, optional meaningful carrier/service label, website, Call and Copy. Prefix icons identify the type. | Hotlines `1185:696` / `1188:1723` | Implemented; source/browser verified |
| Account | Remove the redundant connected-account feature card and duplicate profile menu entry. Place the avatar, name, raw identifier and Account information affordance in a distinct borderless profile card. Keep account management, security, preferences and support. Multiple-account subtitle uses the signed-in email without a prefix. | `1184:24742` / `1188:1460` | Implemented; source/browser verified |
| Single account | Profile subtitle uses the raw account number, without concatenating an ALECO account label. Loading, missing identity and guest states must not expose another identity's data. | `1186:2154` / `1188:1901` | Implemented; source/browser verified |
| Account information | One identity/photo-edit header showing only the account number or appropriate session email, without a concatenated ALECO account prefix; contact/email/location group and service details group. Remove the repeated flip card and introductory notice. Retain Edit profile, camera, verification and default-account functionality. | `1184:24810` / `1188:1528` | Implemented; source/browser verified |
| Alerts and notifications | Keep delivery toggles together. Use a concise area summary with Change areas and sync status. Preserve permission/setup, errors, pending sync and autosave feedback. | `1184:24847` / `1188:1571` | Implemented; source/browser verified |
| Advisories | Remove the repeated intro/date heading and redundant Read story action. Keep search, tabs, notification bell, featured advisory and stories. | `1184:24898` / `1188:1623` | Implemented; source/browser verified |
| Advisory details | Use a neutral summary with a status badge, clear schedule, affected areas, message and safety guidance. Keep full content, photos, original-post access and relevant contacts. | `1184:24956` / `1188:1681` | Implemented; source/browser verified |

The Figma frames show visual states, not a functional application prototype. Sample identities and notices come from existing design/fixture content. Permission allowed and device push registration remain separate facts; do not hide setup merely because permission is allowed. The Hotline reference uses the already implemented hold-to-call label; this change does not alter the existing duration or dialer behavior.

## Contact-type mapping

The Staff directory accepts these six values. Retain the underlying type and expose it in accessibility labels even when its text is removed visually. Unknown or omitted types use the generic contact icon.

| API value | Lucide icon | Accessible type |
| --- | --- | --- |
| `mobile` | `Smartphone` | Mobile number |
| `landline` | `Phone` | Landline number |
| `telephone` | `Phone` | Telephone number |
| `hotline` | `PhoneCall` | Hotline |
| `fax` | `Printer` | Fax number |
| `other`, unknown, omitted | `ContactRound` | Contact number |

Existing copied components and contact helpers remain the implementation source. Reuse the shared ContactCard across the main page, directory and category sheets; do not create screen-specific replacements. Optional contact labels that only repeat the type should also disappear; meaningful labels such as a department or carrier remain.

## Behavior that must remain intact

- Draft filter selections do not alter results until Apply. Cancel discards the draft; Back within the sheet retains it. Reset includes account, period, custom dates, status, type and sort. Preserve existing fetched-data scope, pagination, manual refresh and consumer cache boundaries.
- Keep one non-detached, keyboard-aware sheet. Account, period and other filter choices replace its content. Calendar selection must not nest another BottomSheet.
- Account identity text comes from the current authenticated account/session context. Keep guest restrictions, stale/error recovery and missing-data fallbacks. Do not use cached identity as authorization.
- Keep profile photo editing, identity-session email restrictions, password verification, change review, unsaved-change guards and service-account ownership/default-account checks.
- Keep notification preference persistence, device registration, permission recovery, area targeting, sync/retry feedback and report-update scope. Removing repetitive labels must not remove behavior.
- Keep advisory severity, schedule/time zone, affected audience, message, media, public/guest targeting, original-post link, refresh/recovery and pagination. Main report-card data and canonical statuses remain unchanged.

## Affected source and checks for implementation

Use existing `src/features/reports/main-screen.tsx`, shared `reports/report-card.tsx`, report period/calendar/filter helpers, `hotlines/contact-card.tsx`, `profile/account-screen.tsx`, `profile/details-screen.tsx`, `profile/alerts-screen.tsx` and advisory main/detail/publisher components. Inspect their shared callers and existing tests before edits. Staff PR50 adds nullable statusChangedAt to the existing owned report-list payload; no schema, authentication, native configuration or dependency change is needed. Deploy and verify Staff first; then merge Mobile PR14 and publish its alpha through the existing pipeline.

- [x] Inspect incumbent source, Staff contact-type values and existing Figma components/tokens.
- [x] Create editable Light/Dark review frames and reusable contact assets without replacing canonical screens.
- [x] Revise the unread report state after user feedback: reuse notification tint/dot, remove the banner and keep read/unread sizing consistent.
- [x] Apply the next requested revision in both themes: raw identity values, a distinct Account profile card and restored submitted dates on ticket cards.
- [x] Finish independent Figma review and record any remaining limitations.
- [x] User approved the revised design and shipping, with current-status dates replacing submitted-only dates.
- [x] Implement the accepted UI through existing shared PanelUI components.
- [x] Filter draft/Back/dismiss/Apply and account/period behavior pass executable regressions; browser verifies same-sheet account/range flow.
- [x] Icon fallback/meaningful labels, single/multiple identity and guest data isolation pass regressions.
- [x] 503 tests pass with1 expected missing-sibling skip; TypeScript, scoped lint0 errors/1 existing warning, explicit Staff-sibling harness and whitespace pass.
- [x] Render changed routes and staged filter flow in Light/Dark at phone/tablet widths; verify guest privacy/gates. Exact-release tablet public-flow checks are recorded below. Larger text, assistive technology and private/provider/iOS acceptance remain separate.
- [x] Graphify refresh attempted; installed launcher references a missing Python runtime. No generated refresh claimed.

## Verification and references

Figma checks are design evidence only. All 24 phone frames have 402×874 bounds, with 12 per theme; two additional panels compare read/unread report states. Independent review identified an inherited custom-calendar backdrop and an inherited mode/rendered-paint mismatch on the dark unread-report instance. The calendar now shows Reports behind one sheet with Back. The unread card now materializes the same resolved notification tint while retaining its binding: Light `#F0F9FF`, Dark `#1A1F27`; the final dark screenshot has readable foregrounds and the intended surface. The comparison cards retain the same 136px fixture height.

The latest requested revision was visually checked on Light/Dark Reports, Account profile and Account information, plus the Dark read/unread comparison. Four single/multiple-account profile cards are 370×104 with 16px padding, token-bound 12px corners, semantic card fills and no borders/shadows. Their subtitles show only email or account number. Account information uses a full-width identity row with the raw account number in this sample. Ticket dates now show the current status and matching history date. Read/unread examples use the same In progress date, and normal cards retain their restored date line and114px design height. Twenty scoped normal-card instances, including filter backdrops, use the two local date masters; original components/screens remain unchanged. Dates are illustrative fixture values, not live results. Runtime verification is recorded below; full accessibility acceptance remains separate.

Historical draft checkpoint: baseline documentation harness and whitespace passed before app implementation. The approved implementation and release evidence below supersedes the draft's former pending source/native/merge/deployment state.

The direction follows [W3C guidance for older users](https://www.w3.org/WAI/older-users/): readable contrast, clear layout and understandable interactions. Controls target at least 48 logical pixels, following [Android touch-target guidance](https://support.google.com/accessibility/android/answer/7101858?hl=en). Use native text scaling and test the actual implementation; static Figma frames do not establish accessibility compliance.

## Remaining risks and next

Implementation, paired merge/deployment, alpha publication and bounded tablet acceptance are complete. Finish documentation-only synchronization and task-owned cleanup; retain manual changes, private queues, signing/provider configuration, rollback evidence and the separate Reports proposal. Full accessibility, private/provider and iOS acceptance remain separate.

## Approved implementation verification (2026-10-17)

- Reused copied PanelUI0.112.0, existing routes, Calendar/RadioGroup/Select content and semantic surfaces. Reports has one non-detached sheet, with draft account/period/status/type/sort choices and bounded January1,2026–today custom dates.
- Reused notification-style unread dot and a shared notification-unread token (Light #F0F9FF, Dark #1A1F27); removed the update banner. Status dates come from Staff history rather than ordinary edit time. Accepted push projections clear old dates even on same-status cycles; unknown statuses preserve their prior matching date.
- Account removes the redundant service-account feature card and duplicate profile row. Its profile entry is a card with raw account/email identity. Information keeps photo editing, secure edits and default-account actions without repeating the flip card. Guest gates remain.
- Alerts summarizes selected areas while retaining all selections, permission/setup, sync/retry and autosave behavior. Advisories removes repeated introductory/read-story labels; details uses a neutral summary and clearer content grouping. Source review found no remaining blocker after the cache-date correction.
- Full regression run:503 pass,1 expected missing-sibling skip,0 failures. TypeScript passes; scoped lint has0 errors and1 existing Account effect warning. Final refinements retain the same passing full-suite/type/harness results; fixture-free Android/Hermes export passes.
- Browser verification used isolated labelled fixture mode on localhost:8103, not production records. No secrets or .env.local were copied. Figma's initial read-only response later cleared; the final current-status-date examples are now updated and visually checked in Light/Dark.
- Graphify refresh is required/attempted; the installed launcher references a missing Python runtime. Record the failure separately rather than committing unrelated generated churn.
- Final rendered checks cover the changed routes in Light/Dark fixture mode, same-sheet account/date selection and Apply, 320px phone and 834px tablet widths. Reduced horizontal tab padding keeps Resolved and its count fully visible on narrow phones. These are browser checks; physical-device and larger-text acceptance remain separate.

## Release and bounded device acceptance

| Gate | Verified evidence |
| --- | --- |
| Staff first | PR50/source5c34ed3d, [deployment39028867284](https://github.com/aymkopi/Aleconnect/actions/runs/39028867284), Staff1.1.1-alpha.1. Active APIe0b373bf at100%, unchanged bindings/runtime, ten matching live assets and nine before/after read-only probes. No migration. |
| Mobile integration | [PR14](https://github.com/aymkopi/aleconnect-mobile/pull/14), sourcef4130b9a191e1fc1d901752790aa3a7b78a42eb4, merged tree equals the reviewed/tested tree. Existing manual changes retained. |
| Alpha | [1.2.0-alpha.1](https://github.com/aymkopi/aleconnect-mobile/releases/tag/v1.2.0-alpha.1), code68, [workflow39029160520](https://github.com/aymkopi/aleconnect-mobile/actions/runs/39029160520). All jobs succeed; all3 downloaded asset digests and source/tag match. |
| APK | 104272617 bytes; SHA25630431a735f39ff15d51f5d3d2160e05e1542ee10da7e6b6f9abba2045cf3fefc. Packagecom.kapecakes.aleconnectmobile, original certificatefac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c; standalone non-debuggable live-API/fixture-off Hermes, ARM64/x86_64 and54-library ZIP/ELF16KB pass locally and in CI. Desktop copy matches. |
| Tablet | 25040RP0AG,1600×2560. In-place install retains first-install date2026-08-06 and guest state. Three cold launches succeed; no crash-buffer or React runtime error during bounded public navigation. Home, Reports login gate, Hotlines/contact prefixes, category sheet, Account profile card, Advisories list and full detail render correctly. |
| Preserved boundaries | No sign-in/session replacement, private report/profile mutation, call, push subscription or device-data clearing. Existing queues/signing/provider settings and unrelated Staff/manual work stay untouched. |

The retained task artifact directory mobile-declutter-20261017 holds original installed APK/signature, release metadata/APK, browser/Figma/tablet screenshots and crash/source/deployment evidence. Figma's final date masters now show the corresponding In progress/Under review/Resolved sample dates in both themes. Static examples remain illustrative. Browser UI control was disabled after those checks; the task preview server was stopped and no browser settings were changed.

Read-only Expo Doctor20/21 identifies six newer patch releases against the unchanged dependency lockfile. This UI/API release does not upgrade dependencies. Private authenticated/push/provider, full large-text/TalkBack and iOS acceptance remain open; bounded launch/public rendering is not full production certification.
