# Report details and follow-up implementation plan

> Execute inline with superpowers:executing-plans. Preserve both dirty primaries, native data and accepted Phases 1–4 evidence.

**Goal:** Declutter Ticket details, move report communication into its own window, and collect optional service stars in a bottom sheet.

**Architecture:** Staff remains the authority for authorization, resolution cycles, review and receipts. Mobile reuses ReportPage, the existing scoped communication controller, durable queue, PanelUI BottomSheet, RadioGroup and Rating. No migration or new dependency is needed.

**Design:** [Editable Figma proposal](https://www.figma.com/design/6uIaVRM63oHA723WKgjo5k?node-id=1475-9), page “Mobile · Follow-up only · Final”. Existing ALEConnect semantic tokens, Inter body and Plus Jakarta Sans navigation. UI/UX Pro Max informed progressive disclosure and accessibility; retain the house visual system.

## Scope and decisions

- Change only the existing follow-up section after report information. Keep Ticket details, its official timeline, report fields, map, evidence and public service updates in their existing layout and positions, per the user clarification.
- Separate full-screen Follow-up uses pull-to-refresh. Resolution selection requires an explicit Submit response; no comment. One accepted answer per ticket/account/resolution cycle. The receipt says it cannot be changed. New information can still be sent as an ordinary follow-up; Staff controls status and dispatch.
- Hide resolution event logs from the consumer view, retain public messages/replies and the complete Staff audit. Negative answers remain in Dispatcher review.
- Optional whole-star PanelUI Rating opens in a controlled BottomSheet. No rating comment or explicit refresh button. Keep drafts, original IDs, pending retry and matching receipts. Existing historical comments remain stored; legacy draft content is preserved for review. Ratings remain editable using the existing versioned contract; do not add an unrequested rating lock.
- Distinguish saved locally, sending, received and awaiting Staff review. An accepted resolution with a failed subsequent read still has a durable receipt. No pending payload may be edited or retargeted after an account change.
- Billing, new dispatch logic, schema changes, app-feedback text and unrelated Lineman work are excluded.

## Tasks and checks

- [x] Staff: test both no-comment answers, reject changed/new-ID answers after acceptance, preserve exact replay and legacy text/photos; implement the small locked-cycle rule in consumer-report-update-input.ts and consumer-report-updates.ts. Existing ticket lock serializes concurrent answers. Test new resolution cycles and Dispatcher/public reply regression.
- [x] Mobile: keep consumer-updates-section.tsx as the scoped controller, add compact entry and full-screen route/ReportPage, final resolution receipt and choice controls, preserve legacy drafts and retry controls, remove exposed resolution events. Enqueue requires text only for ordinary updates.
- [x] Mobile: replace service-feedback-section.tsx form with an entry button and PanelUI BottomSheet/Rating. Copy only Rating source from the official registry, mapped to existing local helpers. Save draft before mutation; keep receipt state if the refresh fails.
- [x] Ticket details: wire pull-to-refresh into the communication read and replace only the existing inline follow-up section. Preserve all other layout and content.
- [ ] Verify focused API and queue/storage tests, disposable MySQL domain/replay/review tests, Mobile TypeScript/scoped lint/full suite, Staff build, and actual production-screen browser interactions at phone/tablet widths in light/dark. Refresh Graphify, keep graph churn separate, run both harnesses and diff checks.
- [ ] Close out the completed native Staff-reply readback in both handoffs/history. Release Staff before dependent Mobile; keep existing release/signer/device state and [skip ci] instructions. Source, deployment and native acceptance are separate evidence.

## Rollout and recovery

No schema change. Deploy Staff first so no-comment disputes work and finality is real. Older clients retain reads and exact receipt retry; their answer-change attempt gets a clear 409 RESOLUTION_ALREADY_SUBMITTED. Existing latest accepted legacy answers become final without deleting their history. A later genuine re-resolution provides a fresh cycle. Rollback pauses writes or restores prior artifacts while retaining tables, drafts, receipts and audit. Do not remove queues or reinstall with data loss.

## Review focus

Concurrent answer submissions; committed response with lost receipt; legacy disputed drafts with text/photos; account/session change during asynchronous reads; large text/keyboard and native Modal/BottomSheet focus. Browser results cannot establish Android/iOS accessibility or provider delivery.
