# Resolution-first follow-up design

Status: approved for implementation on2026-10-26, including the amendments below.
Date: 2026-10-26, Asia/Manila.

## Intent and decisions

Use the user's latest resolution-first flow. Preserve Ticket details layout and each app's design system. Consumer updates use a simple feed, not a chat transcript. Billing is excluded.

The resolved report offers “Is the issue resolved?”. “Yes, resolved” records confirmation and opens optional rating immediately, without creating a consumer follow-up query. “Still having an issue” opens a required 1–250-character update with optional existing photo upload. Choosing this option alone creates no server record: the text is submitted as the initial unresolved query.

Confirming resolution ends the consumer exchange even if the consumer dismisses optional rating. This is the proposed completion rule for review: satisfaction must not keep a solved concern open. It supersedes the earlier draft that closed the exchange only after a rating. A negative answer opens an exchange and can later progress to confirmed resolution; only the positive confirmation is final for that real resolution cycle. This supersedes code77's one-answer-per-cycle rule for negative answers.

## Consumer flow

| State | Visible action and result |
| --- | --- |
| Official report is resolved; no current consumer answer | Existing follow-up slot opens the resolution question. |
| Yes, resolved | Confirm using the original cycle/version and receipt; then open the rating sheet. No update text or follow-up query is created. |
| Still having an issue | Open the separate Follow-up screen with the update composer. Require nonblank text of at most250 Unicode code points. |
| Update submitted | Show the accepted update and “Waiting for ALECO’s reply.” Hide new text submission. |
| ALECO replies to the latest consumer query | Show the reply and enable one next consumer update. Multiple Staff replies do not accumulate multiple consumer turns. |
| Consumer sends that next update | Return to waiting. Repeating a submission ID returns its original receipt, not a second turn. |
| Consumer says “It’s resolved” during the exchange | Record final positive confirmation, close new consumer updates and open optional rating. This confirmation can be made while waiting for Staff; it is not another text follow-up. |
| Rating skipped | Exchange stays closed, history stays readable and Rate remains in the top-right app bar. |
| Rating received | Show the score-specific acknowledgement for3seconds, then close the sheet and any empty composer, dismissing the keyboard. Keep readable history. |

The resolution-confirmation action is available only for the current official resolved/closed cycle. If Staff reopens actual work, keep the existing operational lifecycle and history; confirmation/rating waits for the next official resolution. A later genuine resolution creates a fresh cycle. Consumer confirmation does not change ticket, Service Memo, trip, dispatch or Staff review state.

## Layout and components

- Initial question is a bottom sheet above existing Ticket details. Only the affected app bar/follow-up controls are designed; the timeline, fields, map and evidence retain their layout.
- Follow-up uses existing ReportPage, with sender and timestamp on one compact line, text underneath, and minimal separators. Show received/review status only where useful. No chat bubbles, typing state, synthetic read receipts or resolution event log. Render the required unresolved text as an update, retaining the full Staff audit separately.
- The composer is a focused sheet with the existing multiline Input (represented by the linked PanelUI Textarea in Figma), a counter, photo button and Send follow-up. “Add photos” stays compact; render only selected attachments and no empty upload holders. Existing camera/library, image viewer, limits and error handling remain. The linked team library has no FileUpload asset, so Figma represents its existing native behavior with the house Button and selected-file row.
- Rating uses the existing PanelUI Rating and BottomSheet. Prompt: “How did ALECO handle your report?” No comment field or Remove local copy button. Keep a Close control and a disabled Submit rating until a valid whole-star selection exists.
- Rate appears at the right of the relevant app bar after positive confirmation. After rating, show a star icon beside the received score. Submitted ratings are final and open a read-only receipt; there is no Update rating action. Exact older accepted update receipts remain replayable.
- Reuse ALEConnect's current semantic variables, Inter body and Plus Jakarta Sans navigation. Use the existing Staff web components for any changed state labels. UI/UX Pro Max informed progressive disclosure and accessibility; its generic new palette/layout suggestions were not substituted for the house system.

## Rating acknowledgements

Show success only after a validated server receipt, never from a local draft or a timeout.

| Rating | Heading | Body |
| --- | --- | --- |
| 1–2 | Thanks, Juan. | We’ll use your feedback to improve our service. |
| 3 | Thanks, Juan. | Your feedback helps us serve you better. |
| 4–5 | Thank you, Juan! | We’re glad we could help. We’ll keep improving. |

Use the consumer's first name when available, otherwise a generic short thank-you. Start the3-second timer from the receipt while the sheet is visible and the app is foregrounded. Keep a Close control, announce success once, and retain the received rating in the app bar so the timeout does not remove access to the result. Low ratings describe service quality; they never automatically reopen or prioritize official work.

For uncertain delivery, keep the original scoped draft and mutation ID, freeze conflicting edits, and offer Retry rating with “Delivery unconfirmed. Your rating is kept.” No success or timer until the original receipt is recovered. Existing historic comments remain stored; star-only edits preserve them. Legacy unsent/stale drafts and evidence remain at their original scope and require safe review/recovery rather than hidden deletion or retargeting. No general draft-deletion control is reintroduced on the normal rating sheet.

## Staff/API authority and turn-taking

Staff owns the persisted conversation state. The gate is per report, authorized service account and real resolution cycle, across devices/linked identities. Only the first unresolved query is allowed without an earlier Staff response. Subsequently allow one consumer update after an actual public Staff reply to the latest consumer query. A reply to an older query, review/address/escalation, push receipt or cached flag does not unlock a turn. Staff may send multiple public replies using existing authorized review/reply controls.

Expose additive current-cycle state and explicit allowed actions/revision in the existing consumer-updates reader and compatible mutation receipts. Separate canSubmitUpdate from canConfirmResolution. Do not change the version1 envelope until old readers are supported: the current Mobile normalizer rejects unsupported versions. Persist the current consumer query and reply/turn generation under the existing ticket lock; choose the smallest verified existing-row extension or additive migration after current-schema inspection during implementation planning. Timestamp ordering or client state alone must not grant permission.

Check authorization, cycle, current query/turn and final confirmation at evidence-upload authorization and final submit. Serialize competing devices and retain exact replay before new turn/finality checks. Legacy accepted receipts, including old longer payloads, must still replay exactly. Preserve prior events, ratings, Staff audits and queued mutation IDs. Existing old-client writes receive an explicit business-state error when waiting/closed; this is not HTTP429. Staff review ownership and canonical workflow authority remain unchanged. A public reply changes turn eligibility, not Staff review completion.

The Staff panel keeps repeated reply available and reflects the authoritative waiting/consumer-confirmed state using its current components. A consumer's confirmation is visible to Staff but does not silently address a pending review or remove operational work.

## Cached reading and refresh limits

- Store private memory/disk snapshots using principal, identity, service account, access revision and ticket. Keep cycle/turn versions in the data. Purge or isolate on logout, account/access change and current cache policy. Cache never grants authority.
- Fetch on the first uncached view, then show cache immediately on subsequent visits. Fetch a new head only on pull-down; no focus, sheet-open, timer, reconnect or notification-triggered head refresh. Old pages load only on an explicit older-history request and do not replace current head/turn state.
- Reuse the current API/cache/promise patterns. Plan one head snapshot that includes current resolution, turn eligibility and rating summary so a refresh does not double-count multiple resources. Merge accepted local mutation receipts into cache without another GET. An incoming reply may mark a small new-update hint; a pull obtains it.
- Reuse claimRefresh with a proposed10-second manual-refresh cooldown shared across screen mounts and one in-flight head request. Propose a Staff-owned ceiling of6head reads/minute per authorized identity/account/ticket; paginate separately. Confirm the final limits against the existing limiter during implementation. Preserve cached content on rejection or offline failure.
- Use exactly “Too many requests. Try again later.” for Mobile HTTP429, known server rate-limit codes and local rate-limit rejections, including login/verification and manual refresh. Retain Retry-After, security rules, existing countdowns and typed errors; do not flatten unrelated validation or waiting-for-Staff errors into rate-limit text. Suppress retry floods and do not auto-retry mutations or refresh429s.
- Expiring private photo URLs are renewed on pull or explicit photo opening, with current authorization. No timer-driven feed refresh or expanded media retention.

## Pending work and compatibility

A selected photo or unsent draft is not discarded by closing a sheet. An update already sending/awaiting its original receipt must be reconciled before confirming resolution; show the short sending state rather than dropping it. Preserve any unsubmitted draft at its original cycle when confirmation ends the conversation. Old drafts over250characters remain available for editing; do not silently truncate. New Staff replies retain their current text limits;250applies to consumer follow-up text.

Deploy the compatible Staff contract and any rehearsed/verified additive migration before the dependent Mobile reader. Inspect current readers/schema before choosing the persistence change. Preserve old read/replay paths and disable new writes through the existing controls for rollback; never remove populated history or queues. New release, live schema work and device acceptance are not performed during this design review.

## Design references and verification

Current page: Mobile · Resolution & follow-up · v3.
Figma: https://www.figma.com/design/6uIaVRM63oHA723WKgjo5k?node-id=1506-71
Question1506:71; composer1506:198/342; waiting1506:479; two Staff replies1506:532; next waiting1506:617; confirmed history1506:688/1936; rating1506:751/1411; low acknowledgement1506:1759; high1506:1827; offline1506:1999; rate limit1506:2052; dark1506:2139; tablet1512:1053.

Earlier feed study and prior released design pages remain preserved and are superseded for this change. Primary click paths and three-second acknowledgements are connected. The direct path includes1–5rating states; the exchange prototype illustrates4stars. Incoming Staff response, pull-refresh, cache, persistence, keyboard and server enforcement are design states/requirements, not runtime proof. Static Figma interactions do not establish authorization or delivery.

Rendered phone, selected-photo, dark-rating, tablet and acknowledgement views were checked; auto-layout wrapping and semantic colors were corrected. Source read confirms current2,000-character parser, immutable negative response and absence of this turn gate; these require implementation, not a cosmetic-only change. No new app/API code, production migration, deployment or native test is claimed.

## Required implementation evidence after design approval

Test first query, duplicate/racing devices, linked identities, two Staff replies granting one turn, old-query replies not granting a turn, review actions not granting a turn, positive confirmation while waiting, rating skipped, uncertain original receipts, direct/after-exchange closure, new real cycle, legacy exact replay, old long drafts, scoped photo upload rejection, account/cache isolation, no automatic head GETs, cooldown/single-flight/Retry-After and app-wide rate-limit copy. Verify the existing Staff review/memo/trip regressions, production-screen phone/tablet/light/dark/keyboard and native same-signer acceptance as applicable. Billing is excluded.

Builder check: a fresh brief-only reviewer found “nothing important left”. This checks planning clarity, not product/runtime behavior. Saved-rating review references:1518:863 (direct) and1518:996 (after exchange). Figma structural checks verify no chat/local-copy control, waiting/reply/closed actions, compact empty photo state,250counter and six3-second acknowledgement timers.

## Approved amendments (2026-10-26)

The user explicitly approves implementation in both apps, optional rating and closure on resolution confirmation. Remove rating edits, add the star beside the appbar score, and distinguish normal lifecycle history from genuine reopened follow-up work/redispatch. Figma amendments: read-only1518:863/996 and timeline example1522:1215. Canonical paired memo/ticket reopen history provides explicit provenance; do not classify a mere correction as a follow-up. Preserve all prior audit, receipts, devices and billing boundary. The implementation plan pins exact interfaces and verification before source edits.


## Approved inactivity and delivery amendment

The latest public Staff reply to the current unresolved consumer query starts a48-hour response window. A new consumer update or positive confirmation cancels it. Staff may reply multiple times; the latest current-query reply resets the window. Remind the consumer once with24hours remaining (explicit user selection), using the in-app inbox and the existing preference-aware durable push path. Revalidate a pending reminder at delivery so answered/superseded/expired work is not pushed.

At48hours without a consumer response, close the exchange and change only an eligible still-Resolved ticket to Closed, with system history/audit and a short closure notice. In-progress/reopened work is excluded. Inactivity is not positive resolution confirmation and must not fabricate a rating. History remains readable. Preserve sibling reports and closed terminal reports during later aggregate work; test the narrowly evidenced lifecycle exception before release. Add followup_closed_at to the additive migration; no production DDL at this checkpoint.


## UI copy amendment

Remove explanations such as “History stays available” from screens, acknowledgements and notifications. Data retention remains an invariant; the interface states only the result or next action.
