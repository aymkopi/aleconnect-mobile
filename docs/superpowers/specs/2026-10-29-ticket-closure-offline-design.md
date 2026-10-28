# Ticket closure and offline reporting

Date: 2026-10-29, Asia/Manila. Status: proposed design, awaiting user approval.

## Intent and confirmed decisions

ALECO treats resolution as the end of repair work. Remove the consumer/Staff follow-up cycle. A resolved ticket closes when its consumer submits a service rating, Staff closes it, or 24 hours elapse after resolution. A remaining or recurring issue requires a new ticket. Rating stays optional and cannot be edited after submission.

The user selected a full Albay offline map pack, downloaded during onboarding while profile information is completed. The user also selected a full 24-hour grace period from rollout for tickets already Resolved. Previously redispatched tickets that are currently active remain active.

Persist connected ALECO accounts so an already signed-in consumer can create and save a report without an internet connection. A saved report is not received by ALECO until the server accepts it.

Billing, unrelated screen redesigns, field workflow changes, map routing, new POI services, and destruction of historical records are excluded. This design authorizes no production migration, deployment, push, distribution, or device installation by itself.

## Existing behavior and affected readers

- Staff owns lifecycle, account authorization, rating receipts, MySQL, maintenance and notification delivery. Current code permits a resolution exchange, Staff replies, reopening and a 48-hour timer after a Staff response. Ratings currently require a positive resolution answer and do not close the ticket.
- `api/_lib/consumer-followup*.ts`, `consumer-report-updates.ts`, `consumer-feedback.ts`, `incident-lifecycle.ts`, the relevant handlers and `worker/maintenance/ticket-push.ts` are affected. Inspect the actual schema and all resolution writers before selecting migration details.
- Staff Reports, its consumer review queue/panel, Service Memo close/reopen actions, status histories and notification readers must agree with the new policy. Existing field completion receipts must replay normally.
- Mobile's `consumer-account-context.tsx` keeps the account snapshot only in memory. `use-consumer-profile.ts` persists account-scoped profiles, but a failed refresh currently makes New report reject even a usable cached profile. Complaint metadata and the original report queue already have persistent storage.
- Mobile detail/rating/follow-up screens, old update queues, auth invalidation, account linking/default/unlinking, profile reads, report creation and setup guides are affected. Preserve original draft account, access revision, mutation IDs, evidence and uncertain receipts.
- Mobile already uses `@maplibre/maplibre-react-native` 11.5 and ALEConnect's bright map style. The style currently references OpenFreeMap vector resources. Keep this map appearance/provider configuration; do not add CARTO or another mapping SDK.
- Lineman has an Android offline-pack and bounded-download reference implementation. Its iOS guard is not implemented. Reuse relevant patterns without editing Lineman or claiming that its Android evidence proves Mobile/iOS behavior.

## Approaches

1. **Chosen coverage: one full Albay pack.** One setup download supports reports throughout Albay and avoids account changes triggering additional downloads. It needs more initial storage/data than account-area packs.
2. **Not selected: packs around linked accounts.** Smaller initial downloads leave gaps elsewhere and require more setup management.
3. **Implementation proposal: use the installed MapLibre offline manager.** Save tiles, style, fonts and sprites in its local offline store. A separate pre-generated archive/download service or a second map library adds ownership and compatibility work that is not needed unless a measured native limitation prevents the existing package from meeting the requirements.

Retain existing authenticated APIs and queue formats. Add the smallest compatible closure metadata instead of deleting old endpoints/tables or rewriting receipts. These implementation choices are proposals for approval, not additional user decisions.

## Ticket closure

### Authoritative transitions

| Trigger | Result |
| --- | --- |
| Repair workflow marks a ticket Resolved | Record a server-owned deadline 24 hours after that resolution. |
| Consumer submits its first valid service rating | Persist rating/receipt and close that owned ticket in one transaction. |
| Authorized Staff closes a resolved case | Use the existing explicit close action and required audit reason. |
| Deadline is reached while still Resolved | Scheduled maintenance closes it once. |
| Issue remains or returns | Consumer creates a new ticket through the normal report flow. |

- There is no separate resolution confirmation, dispute, reply-turn gate, follow-up timer or reminder. Do not require a rating to finish a repair or to permit automatic closure.
- New follow-up and resolved-ticket redispatch/reopen actions are unavailable in both clients and rejected on the server. An active ticket reopened before rollout continues its current lifecycle; the policy does not forcibly resolve or close it.
- Staff's existing Service Memo close operation retains its reviewed group scope. A rating or individual automatic timeout closes only its ticket. Close the parent memo only after its eligible linked tickets are all closed; never close siblings because one consumer rated.
- Preserve canonical aggregate locking and current membership/version checks. Serialize rating, Staff closure, timeout and late field/replay operations. A stale job must not close an active ticket. Receipt replay must not append duplicate history, ratings, audits or notifications.
- Store the due time durably; a nullable ticket deadline plus a status/deadline index is the proposed minimum schema change, subject to schema inspection. Every real resolution writer must stamp it transactionally. No dependency on a follow-up response row or on a client clock.
- At activation, use one recorded rollout instant to assign all currently Resolved tickets a deadline exactly 24 hours later. Do not reuse their original age, a Staff reply timestamp or `updated_at`. Preserve an identity-checked snapshot and exact affected-row/readback evidence for the separately authorized migration/backfill.
- The scheduler uses the existing maintenance Worker, bounded batches and locked rechecks. It continues after restarts and handles overdue work once. Record consumer-rating, Staff and automatic closure reasons in canonical audit/history.

### Ratings and UI

- On a Resolved report, show **Rate service**, opening the existing PanelUI star-rating bottom sheet directly. Remove the resolution question and all follow-up actions/composers.
- Keep concise context: **How did ALECO handle this report?** No comment field and no Update rating/Remove local copy actions.
- Keep the score-specific acknowledgement and three-second sheet close. Only a committed matching receipt permits the success message or local Closed projection. An offline/uncertain rating retains its original intent for reconciliation and does not claim the ticket closed.
- Optional rating remains available once after Staff/automatic closure, so closing early does not take away feedback. A rating submitted on an already Closed ticket records feedback without another lifecycle transition. A previously submitted score is read-only in the appbar with its star.
- Use **Report another issue** as the route to the existing New report flow. The account is visible and confirmed there; do not silently clone or submit the old ticket.
- Keep the existing Ticket details layout. Show the actual chronological status steps without new follow-up-cycle labels. Retain historical events and legacy fields for compatible readers/audit.

### Compatibility and notifications

- Return additive policy version, current due time and rating eligibility in the existing report read. Current clients recognize the new policy; absent policy keeps compatible handling against an older server.
- Old update GET routes remain readable. Once the policy is active, advertise them as non-writable and reject new follow-up uploads/messages/reopens with concise guidance to update the app or submit a new report.
- Exact already-committed legacy update/rating receipts remain replayable before retirement checks. Do not hash old payloads using the new format, reinterpret an uncertain old update as a new report, erase drafts, or retarget their account. Unsent legacy work remains reviewable on its original scope.
- Remove the positive-resolution-answer requirement from new ratings. Version the new rating input so old rating payloads/receipts remain compatible and a resolved-history reference still prevents stale ratings from attaching to the wrong resolution.
- Continue ordinary in-app ticket status notifications and preference-aware push for resolution/closure. Stop new follow-up reminders and suppress their unsent delivery intents through existing delivery eligibility checks. Do not delete delivered notifications or unrelated advisory reminders.
- No new advance closure reminder is proposed. The report's resolved state can show **Closes in 24 hours** or its concise deadline, and the normal closure notification confirms the actual transition.

## Offline accounts and reporting

- Persist a validated, versioned snapshot keyed to the authenticated login principal. Preserve canonical identity, service-account IDs, names/numbers needed by the picker, default account and access revision. Do not store credentials or treat cached capability/access data as server authorization.
- Hydrate before an online refresh and coalesce refreshes. Cached usable details stay available during connectivity/server failures; distinguish those failures from explicit authentication/access rejection. Use one concise notice: **Offline. Your report will send when connected.**
- Keep snapshots within the retained session's offline lifetime; enforce the existing session expiry, schema and identity checks. Corrupt/mismatched snapshots fail safely. A fresh empty/revoked account response replaces stale data.
- Explicit sign-out/auth invalidation hides and clears private read snapshots. A principal/identity/revision change prevents late reads from writing to the current session. Existing private drafts, evidence and uncertain queued submissions remain preserved under their original owner.
- Refresh/invalidate snapshots after account linking/unlinking/default changes, identity setup and reauthentication. Warm the required profile/report metadata for linked accounts after a fresh consistent snapshot; bounded parallelism and existing cache helpers suffice.
- A cached profile plus a network-only refresh error must not disable New report. Missing required uncached data still shows a concise reconnect request rather than inventing an account/profile.
- Offline creation writes to the existing durable report queue, with the original account, access revision, mutation ID and photos. Reconnect must obtain fresh consistent access before upload/submit; revoked/revised accounts need review, and work is never moved to the current default.
- Retain current idempotent receipts and submission UX. This change must preserve the previously fixed Saved report retry, failure/discard and successful readback behavior.

## Offline maps and onboarding

- One public, device-owned Albay pack can serve all signed-in users. Keep it separate from private account/evidence caches; signing out does not delete the public map. No consumer location or ticket data is sent as map-pack metadata.
- Derive coverage from the bundled Albay boundary, including islands. The 720-feature dataset spans `[123.280548, 12.986185, 124.220096, 13.523255]`; the current reporting rectangle incorrectly stops at longitude 124.0. Align relevant Mobile/Staff validation and picker bounds with the authoritative coverage without weakening point-in-Albay validation.
- Package detailed vector tiles plus the style, fonts and sprites needed for cold offline rendering. Use the source's actual maximum detail, then allow normal zooming/overzooming; do not imply that zooming creates data the source lacks. Keep attribution visible.
- Start on Wi-Fi when account onboarding begins, so form entry can proceed during download. On mobile data, show the existing confirmation pattern before transferring; mandatory setup is not permission to silently consume mobile data.
- Use one compact setup item: **Albay map**, progress, then **Ready offline**. Failed/paused states expose **Resume** or **Retry** with a short cause. Do not add explanatory cards or duplicated labels to Ticket details.
- New native onboarding cannot finish until the map pack is complete and verified. Preserve entered form data during failure, restart or lack of space. Onboarding completion must check the actual native pack, not only a saved boolean.
- Existing users get a one-time map setup requirement on their next online setup visit. Proposal: do not block an existing user's emergency contacts or already available offline report drafting solely because an update introduced the pack requirement. A missing pack uses existing manual location/address fallback and clearly does not claim offline map readiness.
- Retain original pack IDs when resuming; avoid duplicate province downloads. Pause safely on interrupted network/background conditions, enforce bounded requests/tiles/bytes and storage checks, and never purge the global map database or private report work. Choose resource budgets from a measured full-pack download rather than silently truncating required coverage/detail.
- Reuse compatible Lineman safeguards where appropriate. Android and iOS need their own native capability/failure and cold-start verification; do not copy Lineman's Android-only gate into mandatory iOS onboarding. Web keeps its existing online map and does not pretend to have a native downloaded pack.
- GPS pin placement and the bundled boundary lookup remain usable offline. Network address search/reverse lookup must fail gracefully; map storage does not create offline geocoding or routing.
- Confirm current provider resource/attribution requirements and measure a full-pack size before presenting a size estimate. Current live asset metadata could not be read in the restricted shell; no size or download-time claim has been verified.

## Verification and delivery

1. Prepare compatible Staff lifecycle/rating/read contracts, retirement handling, deadline schema/backfill and timer tests. Include concurrent rating/Staff/timeout cases, grouped tickets, old receipts, no-history legacy tickets and already-active redispatch.
2. Update Mobile rating/detail/navigation/legacy-queue readers and concise copy. Test success, low/high ratings, optional dismissal, uncertain receipt, existing Closed/rated reports and new-report account selection.
3. Persist account snapshots and correct offline profile/report gates. Test cold offline restart, multiple linked accounts, cached metadata/photos, reconnect, revision changes, revoked links, principal switches and late responses.
4. Add the MapLibre pack/setup flow. Test partial download/resume, storage and mobile-data consent, all boundary extremes/islands, actual fonts/icons/roads at close zoom, and cold restart with networking unavailable. Render phone/tablet, dark/light, large text and accessible progress/error actions.
5. Run focused Staff contracts/disposable DB tests, harness/build/scoped lint, Mobile tests/types/lint/harness, native alignment/Doctor and relevant build/export checks. Refresh Graphify after code changes while preserving unrelated generated work. Report provider/device/iOS acceptance separately.

Deployment order for a later authorized rollout: pause old follow-up producers/deadlines; apply guarded additive schema; deploy compatible Staff API/UI and maintenance; record the rollout instant and assign legacy grace deadlines under the new writer; enable/check policy; then distribute Mobile. Preserve bindings, schedules, old APKs, signing, primaries and original queues. Rollback pauses new closure processing/writes and retains all populated schema, receipts and already recorded closure events; it never reopens tickets automatically.

## Approval calls

Confirmed by user: full Albay coverage; 24 hours from rollout for existing Resolved tickets; no follow-up; rating/Staff/24-hour closure; mandatory map setup; cached linked accounts; billing excluded.

Additional proposals to approve with this design: optional first rating after Staff/automatic closure, no separate resolution question, no new advance reminder, preserving existing users' offline drafting during one-time map setup, and using MapLibre's installed offline manager rather than a new map service/library.

Technical choices left to implementation: exact additive field/index names after schema inspection, measured pack budgets/source zoom, internal cache serialization, and reused native safeguards. A discovered constraint that changes coverage, required onboarding, supported platforms or lifecycle behavior comes back to the user before implementation diverges.
