# Mobile declutter refinement

## Status and ownership

- Owner: consumer Mobile presentation. Branch: `codex/mobile-declutter`, based on Mobile `master` at `8b1af18`.
- Stage: Figma revision prepared for acceptance. The user's requested unread-report revision now matches the existing unread notification state. Application implementation has not started. Keep this PR draft until the revised design is accepted and the implementation gates pass.
- [Editable Figma review page](https://www.figma.com/design/6uIaVRM63oHA723WKgjo5k/Aleconnect-mobile?node-id=1184-24615). Original reference screens remain unchanged.
- The separate user-requested chat, Reports accessible redesign proposal (`01a1461e-22c7-7d91-9653-68c2c6e2f3ea`), created a [new proposal page](https://www.figma.com/design/6uIaVRM63oHA723WKgjo5k/Aleconnect-mobile?node-id=1184-29946) with 12 editable Light/Dark report, filter, empty and loading frames. That broader redesign is outside this PR's implementation scope.

## Design direction

Keep the current visual identity, report cards, five destinations and existing service features. Reduce competing controls and repeated content rather than reducing text or touch-target sizes. Reuse copied PanelUI components and existing semantic colors, Inter/Plus Jakarta Sans typography, 16px gutters and borderless surfaces. Dark page backgrounds remain `#00060F`.

| Surface | Proposed change | Figma Light / Dark | Application status |
| --- | --- | --- | --- |
| Reports | Remove account and period controls from the overview. Keep heading, New report, KPI scope notice, search, status tabs and report cards. Use a labeled Filters button. | `1184:24617` / `1188:1334` | Pending design acceptance |
| Unread report state | Match unread notifications: the same full-card tint and small unread dot, with no separate update banner. Read and unread retain the same content, layout and fixture height. | Comparison `1204:2639` / `1204:2690`; component set `1203:2504` | Pending design acceptance |
| Report filters | Put service account, reporting period, status, type and sort in the existing sheet. One Apply filters action; Reset restores defaults. | `1184:24669` / `1188:1385` | Pending design acceptance |
| Period selection | Change the same sheet's content, with Back. Retain all dates, this month, last month, last 3 months, this year and custom dates. | `1186:2004` / `1188:1770` | Pending design acceptance |
| Account selection | Change the same sheet's content, with Back. Show registered names and complete account numbers. | `1186:2079` / `1188:1837` | Pending design acceptance |
| Custom dates | Reuse the existing bounded range calendar; retain January 1, 2026 through the current Manila date. Do not open a second sheet over the filter sheet. | `1187:1319` / `1188:1969` | Pending design acceptance |
| Contact cards | Remove visible contact-type text; keep number, optional meaningful carrier/service label, website, Call and Copy. Prefix icons identify the type. | Hotlines `1185:696` / `1188:1723` | Pending design acceptance |
| Account | Remove the redundant connected-account feature card and duplicate profile menu entry. Keep the profile entry, account management, security, preferences and support. Multiple-account subtitle uses the signed-in email. | `1184:24742` / `1188:1460` | Pending design acceptance |
| Single account | Profile subtitle uses the account number. Loading, missing identity and guest states must not expose another identity's data. | `1186:2154` / `1188:1901` | Pending design acceptance |
| Account information | One identity/photo-edit header, contact/email/location group and service details group. Remove the repeated flip card and introductory notice. Retain Edit profile, camera, verification and default-account functionality. | `1184:24810` / `1188:1528` | Pending design acceptance |
| Alerts and notifications | Keep delivery toggles together. Use a concise area summary with Change areas and sync status. Preserve permission/setup, errors, pending sync and autosave feedback. | `1184:24847` / `1188:1571` | Pending design acceptance |
| Advisories | Remove the repeated intro/date heading and redundant Read story action. Keep search, tabs, notification bell, featured advisory and stories. | `1184:24898` / `1188:1623` | Pending design acceptance |
| Advisory details | Use a neutral summary with a status badge, clear schedule, affected areas, message and safety guidance. Keep full content, photos, original-post access and relevant contacts. | `1184:24956` / `1188:1681` | Pending design acceptance |

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

Use existing `src/features/reports/main-screen.tsx`, shared `reports/report-card.tsx`, report period/calendar/filter helpers, `hotlines/contact-card.tsx`, `profile/account-screen.tsx`, `profile/details-screen.tsx`, `profile/alerts-screen.tsx` and advisory main/detail/publisher components. Inspect their shared callers and existing tests before edits. No API, schema, authentication contract, native configuration, dependency or release change is proposed.

- [x] Inspect incumbent source, Staff contact-type values and existing Figma components/tokens.
- [x] Create editable Light/Dark review frames and reusable contact assets without replacing canonical screens.
- [x] Revise the unread report state after user feedback: reuse notification tint/dot, remove the banner and keep read/unread sizing consistent.
- [x] Finish independent Figma review and record any remaining limitations.
- [ ] Obtain design acceptance before changing application code.
- [ ] Implement the accepted UI through existing shared PanelUI components.
- [ ] Test filter apply/cancel/reset, account/period preservation and single-sheet navigation.
- [ ] Test icon fallback, meaningful-label preservation and single/multiple/guest identity behavior.
- [ ] Run focused tests, TypeScript, changed-file lint, harness and whitespace checks.
- [ ] Render changed routes, filter states, guest/error states and both themes at phone/tablet widths with larger text. Device acceptance remains separate until actually checked.
- [ ] Run Graphify after source changes; keep generated graph churn separate.

## Verification and references

Figma checks are design evidence only. All 24 phone frames have 402×874 bounds, with 12 per theme; two additional panels compare read/unread report states. Independent review identified an inherited custom-calendar backdrop and an inherited mode/rendered-paint mismatch on the dark unread-report instance. The calendar now shows Reports behind one sheet with Back. The unread card now materializes the same resolved notification tint while retaining its binding: Light `#F0F9FF`, Dark `#1A1F27`; the final dark screenshot has readable foregrounds and the intended surface. The comparison cards retain the same 136px fixture height. Runtime behavior and accessibility remain unverified.

Baseline and draft documentation harness validation pass without errors/warnings; whitespace checks pass. No app tests, native build, physical-device check, merge, deployment or release has been performed for this draft.

The direction follows [W3C guidance for older users](https://www.w3.org/WAI/older-users/): readable contrast, clear layout and understandable interactions. Controls target at least 48 logical pixels, following [Android touch-target guidance](https://support.google.com/accessibility/android/answer/7101858?hl=en). Use native text scaling and test the actual implementation; static Figma frames do not establish accessibility compliance.

## Remaining risks and next

Ask the user to accept the revised Figma direction, then implement and run the listed checks. App behavior and accessibility remain unverified until implementation. Preserve unrelated source edits, existing source features and the separate Reports proposal; do not merge or release this draft automatically.
