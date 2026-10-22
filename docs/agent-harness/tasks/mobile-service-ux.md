# Mobile service UX refinements — 2026-10-22

## Scope

PR-only work, coordinated with Staff's report-type-description companion. Primary checkouts, existing open work, device data and signing state are preserved.

- Session expiry uses the regular Login form immediately. Both methods, contextual help, principal-race checks and saved-report recovery remain.
- Four Home shortcuts, always two rows of two: Report an issue, Request Billing, Request Connection, Explore services. Rectangular cards keep icons on the left and two-line labels. The existing one-third header, fixed advisory/CTA heights and compact-screen scroll fallback remain.
- Explore services adds [Request Billing](https://web.alecoinc.com.ph/billing-inquiry.html). Connection opens the [official guide](https://web.alecoinc.com.ph/newconnection.html); no duplicated checklist is maintained. Pay Bills and unverified channel claims are removed; historical payment deep links redirect to Explore services.
- Report and Advisory use the same `ActivityCard` signature. Report cards remove location and repeated status wording, retaining one status badge and Latest update or Submitted date. Operational advisory titles use their type plus the existing comma-separated feeder audience; general/custom titles are preserved. The separate audience footer is removed.
- The branch synchronizes with newly merged PR25 and retains its shared Tour remeasurement after ancestor scrolling. The duplicate event-driven prototype is saved only in local recovery evidence; no redundant application hooks are added.
- The report account radio shows the full account number. An editable fallback remains only if the authorized profile has no number. Category/type search matches names and descriptions without changing selection, with an explicit empty state. Type descriptions tolerate absent/null values; the metadata cache key advances once so old 90-day snapshots refresh.

## Figma

[Editable pilot](https://www.figma.com/design/6uIaVRM63oHA723WKgjo5k?node-id=1438-4) is isolated on `Mobile · Service UX refinements · Pilot`. Shared component `1438:5`, Light `1438:17`, Dark `1438:63`; eight instances share the same master. Editable text properties cover reference, title, metadata and badge, with optional unread/status visibility and an icon instance-swap property. Existing pages remain intact. Auto-layout, existing variables/styles, one-line badges and 96px minimum cards are retained.

## Compatibility and rollout

Apply and verify Staff's additive `ticket_type.description VARCHAR(500) NULL` migration before deploying its metadata reader, then release Mobile. Old Mobile ignores the extra field; new Mobile tolerates older API/cache payloads. No ticket identity, authorization, validation, priority, submission, notification or offline-queue contract changes.

The Staff script defaults to inspection; applying requires an exact database target and explicit production confirmation. It backs up the schema/catalog before DDL, fills only blank reviewed descriptions and preserves custom wording. Restore only reverts unchanged seeded descriptions and retains the additive column for deployed readers. Live mutation and disposable-MySQL rehearsal are pending separately.

## Verification

- Passed: 572 Mobile tests, TypeScript, scoped lint with one existing warning, fixture web export, and Tour regression checks. Staff's focused 11 tests, scoped lint and production build pass after a fresh isolated lockfile install.
- Figma Light/Dark screenshots inspected; final badge reflow verified structurally and visually.
- Final exported-browser checks pass: immediate session-ended Login; exactly four Home shortcuts/no horizontal overflow at 320x640, 402x874 and 820x1180; full account numbers/no redundant input; category/type description search and empty state; shared report cards without location/repeated status. The PR25 Tour stays aligned after resize and a later 64px ancestor scroll (card284px, spotlight276px, expected8px padding), with its description visible. All API/external traffic is intercepted; no production writes.
- Both Graphify code graphs are refreshed separately from scoped source changes.

## Remaining risks and next steps

Independent read-only review has no blocking findings; final synchronized tests, export, browser, harness and whitespace checks pass. Next: review the paired PRs and authorize the separate migration rehearsal/release when ready. No migration application, deployment, merge, native/store build, installation, real credential mutation, real report submission or device acceptance is included. Physical Android/iOS Tour timing remains a release acceptance gate.
