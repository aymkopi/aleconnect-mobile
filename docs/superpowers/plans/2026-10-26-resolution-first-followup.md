# Resolution-first follow-up implementation plan

> **For agentic workers:** Use superpowers:executing-plans inline, task by task. One fresh whole-change review follows verification; preserve both existing isolated checkouts and all private evidence.

**Goal:** Implement the approved resolution-first, Staff-led exchange in both apps, immutable optional ratings, and visible follow-up work cycles.
**Architecture:** Staff owns authorization, durable turn pointers/revision and lifecycle provenance. Mobile keeps scoped snapshots and durable original intents; it never grants authority from cache. Existing routes/components remain.
**Tech Stack:** TypeScript, MySQL8, existing Node/Workers API, React/Vite Staff, Expo/React Native and copied PanelUI.
**Spec:** ../specs/2026-10-26-resolution-first-followup-design.md (approved October26, including latest amendments).

## Global constraints

- Billing excluded. Preserve dirty primaries, keys, device queues, APKs and old accepted receipts. No new dependency or public Message/chat component.
- Positive confirmation closes the exchange, even when rating is skipped. An initial negative answer requires1–250Unicode code points; later confirmation remains available while awaiting Staff if the official current cycle is resolved.
- One consumer query at a time, across devices/linked identities. Only a public Staff response to the latest query unlocks the next query. Multiple replies grant one turn. Review-only actions do not unlock.
- Submitted service ratings are final per account/report/cycle. Exact older receipt replays remain valid. No Update rating, Remove local copy, or rating comment inputs. Show a star beside the received score in the top-right app bar.
- Head reads fetch on cache miss/explicit pull only. Reuse refresh cooldown/single-flight patterns;10seconds between manual pulls, server6head reads/minute. All Mobile rate-limit errors display “Too many requests. Try again later.” Retain typed codes/timers/Retry-After and do not retry-flood.
- Keep the version1 read envelope. Add conversation and rating metadata; older readers ignore it. New exchange writes declare followupVersion:1. Missing new context fails safely; older exact receipts/read paths remain.
- Live schema inspection is read-only and records the current target separately. Prepare/rehearse the additive migration; do not infer live DDL or a release from this implementation checkpoint. Event history, canonical ticket/memo/trip state and Staff review remain independent.

## Review focus

- Concurrent linked consumers/Staff replies and replies to older queries must not grant extra turns.
- An accepted old2000-character/older rating-update request must replay before new text/finality gates.
- A later real resolution cycle must not receive an old queued intent, draft or cached permission.
- Delayed reads/receipts must not overwrite a newer scoped head; queued uncertain sends retain original IDs/evidence.
- Only paired canonical memo/ticket reopen history marks a follow-up; ordinary corrections and unknown/missing fields stay unclassified.

## Task1 — Turn storage and policy

Files: api/_lib/consumer-followup.ts (new); api/_lib/consumer-report-updates-schema.ts; scripts/apply-consumer-followup-turns.mjs (new); tests/lifecycle/consumer-followup-policy.test.mjs and tests/lifecycle-db/consumer-followup-migration.test.mjs (new).

Interfaces: ConsumerExchange {version:1,cycleId,revision,state:not_started|awaiting_staff|awaiting_consumer|confirmed,consumerUpdateId,replyTo,canSubmitUpdate,canConfirmResolution}. Persist nullable followup_update_id/followup_reply_id and unsigned followup_version(default0) on ticket_resolution_responses. loadConsumerExchange(connection,ticket) returns scoped internal context plus public state. Pure consumerExchangeActions() derives allowed actions; assertConsumerFollowupText() enforces new text after replay.

- [ ] Write/observe RED policy tests for initial query, waiting, replied, confirmed, active official work,250/251Unicode characters and required text.
- [ ] Implement the policy/context and three additive columns. Seed legacy negative rows conservatively from scoped existing events; after initialization use row pointers/revision rather than timestamp ordering. Ambiguous legacy ordering cannot silently grant a new turn.
- [ ] Implement an inspect-first migration CLI, target fingerprint including server UUID, fresh metadata snapshot, exact type guards, repeat no-op and refusal to drop used turn data. No production DDL.
- [ ] Rehearse inspect/wrong target/apply/no-op/empty rollback/populated refusal in a generated disposable schema; run policy tests and commit with [skip ci].

## Task2 — Staff/API exchange and immutable ratings

Files: api/_lib/consumer-report-update-input.ts; api/_lib/consumer-report-updates.ts; api/_lib/consumer-feedback.ts; api/mobile/complaint-updates.ts; src/features/tickets/components/consumer-updates-panel.tsx; api/ticket-consumer-updates.ts if its DTO needs extension; focused lifecycle and disposable DB tests.

Interfaces: New payload adds followupVersion:1, expectedFollowupRevision:number, replyTo:UUID|null and a pinned cycleId/responseVersion. Absence preserves the old canonical hash for replay only. Receipts add optional conversation and resolutionCheck snapshots; finalize their stored JSON after the state mutation. Head adds serviceFeedback, serviceFeedbackEnabled and canRate so sheet opening needs no extra GET.

- [ ] Add RED domain tests: two linked identities/racing devices; first unresolved query; two Staff replies/one next query; old-query reply and review-only actions; negative-to-positive closure; optional rating; final rating/new-ID refusal and exact old replays; stale cycle, revision and evidence authorization.
- [ ] Validate bounded legacy payloads and find exact replay before enforcing new250/text/finality rules. Serialize all state changes with the ticket lock. A confirmation checks current resolution version and closes the conversation; new queries additionally require current reply/revision. Increment followup_version on authoritative conversation changes.
- [ ] Apply the same gate before evidence draft authorization. Keep old queued work at its original scope; reject missing new context with an actionable update/review error rather than silently retargeting.
- [ ] Public Staff replies to the current query update replyTo/revision. Replying remains possible after a review was marked addressed, but does not change that review state. Preserve old compound Reply-and-address as an actual public reply plus review audit; blank pure-address/escalation actions alone do not unlock. Do not send consumer pushes for purely internal review actions.
- [ ] Prefer the current query in the Staff panel while preserving a pinned older target/uncertain mutation. Keep repeated replies, expose awaiting-consumer/consumer-confirmed state and retain existing review/reopen authority. Correlated reopening supports the latest unresolved query, including a later consumer_update.
- [ ] Make an existing rating read-only after receipt; reject new-ID edits but retain exact old update receipts. Bundle current rating in the scoped head and add read throttling after authorization.
- [ ] Run domain/replay/authorization/evidence tests, current memo/reopen guards, scoped lint and Staff build; commit [skip ci].

## Task3 — Authoritative follow-up timeline grouping

Files: api/_lib/ticket-followup-history.ts (new); api/mobile/complaints.ts; api/data.ts; src/api/queries.ts; src/features/tickets/components/report-status-history.tsx; Mobile data.ts/detail-presentation.ts/report-timeline.tsx; focused shared/lifecycle/Mobile tests.

Interface: Optional per-history followUpCycle:number and followUpStart:boolean (Staff snake_case equivalent). Identify a root only when resolved-to-verified ticket history matches the canonical resolved-to-ready/open memo history, actor/source/time and membership valid at that instant. Subsequent rows inherit the numbered cycle in the full authoritative history. Never expose Staff reasons to consumers.

- [ ] Add RED provenance tests: genuine aggregate reopening, normal lifecycle, manual correction without paired memo event, unrelated memo, detached membership, multiple follow-up cycles and omitted legacy fields.
- [ ] Reuse existing history facts; no timeline DDL or lifecycle writer/authority change. Keep canonical status values and consumer-safe notes intact.
- [ ] Render Initial report / Follow-up1 headings only when a follow-up exists. Keep each existing status/date and current-state stepper behavior.
- [ ] Run focused reader/presentation tests and rendered Staff/Mobile checks; commit [skip ci].

## Task4 — Mobile DTO, cache, queue and shared rate-limit copy

Files: src/features/reports/consumer-updates-contract.ts; src/services/consumer-updates.ts; src/services/consumer-update-queue.ts; src/services/api.ts; src/services/auth.ts; src/utils/refresh-cooldown.ts; new scoped cache/policy module only if needed; affected verification notices and focused tests.

- [ ] Add RED reader/cache tests for omitted new fields, unsupported versions, identity/account/access revision isolation, first miss versus repeated visits, pull-only head requests, single-flight/cooldown, receipt revision ordering, exact429copy/Retry-After, and stale queue review without evidence loss.
- [ ] Keep memory/disk snapshots bounded and scoped to principal/identity/account/revision/ticket. Retain paged history through explicit reads. Invalidate safely on auth/access change; do not delete queues. No focus, reconnect, notification or sheet-open head fetch.
- [ ] Merge accepted receipts locally only when their cycle/revision is current; preserve newer heads. Keep original mutation IDs and all uncertain payloads. Only a definitive conflict permits explicit same-scope draft review; a new cycle/account requires new reviewed intent.
- [ ] Centralize rate-limit text for HTTP429/known rate-limit codes and local cooldowns, retaining typed failures and existing security countdowns. Stop refresh429retry loops.
- [ ] Run full Mobile suite/types/scoped lint; commit [skip ci].

## Task5 — Mobile resolution/feed/rating UI

Files: consumer-updates-section.tsx; service-feedback-section.tsx; report-detail-screen.tsx; existing ReportPage/BottomSheet/FileUpload helpers only as required; browser fixtures/tests.

- [ ] Add RED production-screen journeys: initial Yes bypasses query text; No requires250-or-less text; photo holders absent until attachment; waiting hides submission; Staff reply unlocks one update; confirmation closes even with skipped rating; immutable received rating/star score; low/neutral/high acknowledgement and3-second close; read-only history; cached Back/sheet visits issue no GET; rate-limit text preserves history.
- [ ] Implement the approved question sheet, simple sender/time feed and focused composer with existing house controls. Use compact FileUpload trigger and selected-file previews only. Preserve drafts and error/retry controls.
- [ ] Keep rating optional and receive-only acknowledgement. Submitted ratings show a read-only receipt; show Star plus score in the app bar. No update/comment/local-copy controls. Pause/cancel scoped success timers on background/scope change and dismiss form/keyboard after completion without deleting work.
- [ ] Preserve the rest of Ticket details. Keep native large-text/keyboard/focus/error semantics; do not infer any authority from cached flags.
- [ ] Run actual-screen phone/tablet/light/dark browser journeys and types/lint; commit [skip ci].

## Task6 — Integrated verification and handoff

- [ ] Run all affected DB/migration/API/Staff policy contracts, Staff build, full Mobile suite and focused browser regression journeys. Record baseline warnings separately from failures.
- [ ] Refresh Graphify after code changes; preserve generated churn separately. Run paired harnesses and whitespace checks.
- [ ] Obtain one fresh read-only whole-change review; reproduce/fix required findings and rerun the relevant checks.
- [ ] Record exact source, schema/release status, verification and remaining native/provider/AT gates in only the affected handoffs/history. Finish with git status. No billing work or destructive cleanup.


## Approved inactivity and delivery amendment

The latest public Staff reply to the current unresolved consumer query starts a48-hour response window. A new consumer update or positive confirmation cancels it. Staff may reply multiple times; the latest current-query reply resets the window. Remind the consumer once with24hours remaining (explicit user selection), using the in-app inbox and the existing preference-aware durable push path. Revalidate a pending reminder at delivery so answered/superseded/expired work is not pushed.

At48hours without a consumer response, close the exchange and change only an eligible still-Resolved ticket to Closed, with system history/audit and a short closure notice. In-progress/reopened work is excluded. Inactivity is not positive resolution confirmation and must not fabricate a rating. History remains readable. Preserve sibling reports and closed terminal reports during later aggregate work; test the narrowly evidenced lifecycle exception before release. Add followup_closed_at to the additive migration; no production DDL at this checkpoint.


## UI copy amendment

Remove explanations such as “History stays available” from screens, acknowledgements and notifications. Data retention remains an invariant; the interface states only the result or next action.


## Execution record

The implementation is complete locally. Passing evidence:617 Mobile tests;46 focused Staff checks;20 disposable MySQL/migration/reconciliation cases;14 Staff/Mobile browser journeys; types, scoped lint, Staff build, paired harnesses and whitespace checks. Fresh whole-change review findings are fixed and rechecked. Source is committed once per app as a coordinated unit rather than per partial task; production rollout is separate. Native/provider/iOS acceptance remains explicitly unverified. Generated Graphify/device/test evidence stays outside source commits.
