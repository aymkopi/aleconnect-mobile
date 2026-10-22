# Mobile service UX refinements — 2026-10-22

## Scope

Coordinated Mobile UI work with Staff's report-type-description companion. Primary checkouts, existing open work, device data and signing state are preserved.

- Session expiry uses the regular Login form immediately. Both methods, contextual help, principal-race checks and saved-report recovery remain.
- Four Home shortcuts, always two rows of two: Report an issue, Request Billing, Request Connection, Explore services. Rectangular cards keep icons on the left and two-line labels. The existing one-third header, fixed advisory/CTA heights and compact-screen scroll fallback remain.
- Explore services adds [Request Billing](https://web.alecoinc.com.ph/billing-inquiry.html). Connection opens the [official guide](https://web.alecoinc.com.ph/newconnection.html); no duplicated checklist is maintained. Pay Bills and unverified channel claims are removed; historical payment deep links redirect to Explore services.
- Report and Advisory use the same `ActivityCard` signature. Report cards remove location and repeated status wording, retaining one status badge and Latest update or Submitted date. Operational advisory titles use their type plus the existing comma-separated feeder audience; general/custom titles are preserved. The separate audience footer is removed.
- The branch synchronizes with newly merged PR25 and retains its shared Tour remeasurement after ancestor scrolling. The duplicate event-driven prototype is saved only in local recovery evidence; no redundant application hooks are added.
- The report account radio shows the full account number. An editable fallback remains only if the authorized profile has no number. Category/type search matches names and descriptions without changing selection, with an explicit empty state. Type descriptions tolerate absent/null values; the metadata cache key advances once so old 90-day snapshots refresh.

## Figma

[Editable pilot](https://www.figma.com/design/6uIaVRM63oHA723WKgjo5k?node-id=1438-4) is isolated on `Mobile · Service UX refinements · Pilot`. Shared component `1438:5`, Light `1438:17`, Dark `1438:63`; eight instances share the same master. Editable text properties cover reference, title, metadata and badge, with optional unread/status visibility and an icon instance-swap property. Existing pages remain intact. Auto-layout, existing variables/styles, one-line badges and content-driven cards with equal12px padding are retained.

## Compatibility and rollout

Apply and verify Staff's additive `ticket_type.description VARCHAR(500) NULL` migration before deploying its metadata reader, then release Mobile. Old Mobile ignores the extra field; new Mobile tolerates older API/cache payloads. No ticket identity, authorization, validation, priority, submission, notification or offline-queue contract changes.

The Staff script defaults to inspection; applying requires an exact database target and explicit production confirmation. It backs up the schema/catalog before DDL, fills only blank reviewed descriptions and preserves custom wording. Restore only reverts unchanged seeded descriptions and retains the additive column for deployed readers. The 27-type disposable rehearsal, production backfill and Staff API deployment are verified; see Staff PR59.

## Verification

- Passed: 572 Mobile tests, TypeScript, scoped lint with one existing warning, fixture web export, and Tour regression checks. Staff's focused 11 tests, scoped lint and production build pass after a fresh isolated lockfile install.
- Figma Light/Dark screenshots inspected; final badge reflow verified structurally and visually.
- Final exported-browser checks pass: immediate session-ended Login; exactly four Home shortcuts/no horizontal overflow at 320x640, 402x874 and 820x1180; full account numbers/no redundant input; category/type description search and empty state; shared report cards without location/repeated status. The PR25 Tour stays aligned after resize and a later 64px ancestor scroll (card284px, spotlight276px, expected8px padding), with its description visible. All API/external traffic is intercepted; no production writes.
- Both Graphify code graphs are refreshed separately from scoped source changes.

## Remaining risks and next steps

PR26 and Staff PR59 are merged with CI skipped. The user authorized the migration and Staff-first deployment, then excluded GitHub release publication/Actions. The unpublished same-signer code75 APK passed native tablet Home, official links, shared cards, full account number, live description search/empty state, and Reports Tour Back/Next scroll alignment. The signed-in session, original install/data inodes and unread report state are retained. iOS, real report submission and provider delivery remain unverified.

## Equal card padding follow-up — 2026-10-22

The tablet review prompted a shared spacing correction: remove the96px minimum height that left unused space below short card content. Both Report and Advisory list cards now hug their content with12px padding on every side and4px row gaps. Fixed-height Home carousel cards center the content stack within their existing allocation. Figma master1438:5 and eight Light/Dark instances match, with measured12px top/bottom padding and86–90px single-line height. The follow-up stays separate from merged PR26; Actions/releases remain excluded. Native reinspection of this spacing correction is pending.
