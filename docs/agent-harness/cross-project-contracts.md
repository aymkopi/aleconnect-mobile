# ALEConnect cross-project contracts

Authoritative source: `../aleconnect/docs/agent-harness/cross-project-contracts.md`
Snapshot synchronized with Staff account-linking refinement (server commit `e21c11f`, paired shared-contract update) on 2026-10-15.

<!-- shared-contract:start -->
## Ownership and routes

- `aleconnect` owns staff UI, `/api/*`, `/api/mobile/*`, MySQL, Cloudflare Worker behavior, R2 signing, and deployment order.
- `aleconnect-mobile` owns consumer UI, native configuration, device storage, and Expo release behavior. It never connects directly to MySQL or holds server secrets.
- Mobile traffic uses the staff-owned `/api/mobile/*` contract. New local API handlers also require Vite registration so localhost behavior remains available.

## Authorization and response rules

- Staff routes require staff session authorization; mobile routes require the canonical consumer role and server-side ownership checks for every consumer-scoped record.
- Preserve documented successful payloads and legacy top-level fields. Errors are machine-readable JSON with a stable `error` message and the appropriate HTTP status; do not expose secrets or internal SQL details.
- Preserve human-readable identifiers such as ticket, Service Memo, and dispatch-trip references. Do not substitute opaque IDs in user-facing text without a backward-compatible transition.

## Operational flows

- Consumer reports enter through `/api/mobile/*`; evidence uses validated R2 object keys and presigned upload flow, never mobile database access.
- Notifications and advisories are selected server-side from consumer scope, subscriptions, and preferences. Push work records remain idempotent and replay-safe.
- Status contracts are domain-specific. Ticket consumer projection v1 exposes only `under_review`, `verified`, `rejected`, `dispatched`, `in_progress`, `resolved`, and `closed`; unknown or internal values fail closed and are never shown raw. Mobile accepts response-envelope `statusModelVersion` only when absent or `1`; unsupported ticket push, row, or envelope versions preserve the last valid memory-or-persistent cached status and mark the report list for authoritative revalidation.
- Service Memo readers accept `open|draft|ready|dispatched|in_progress|resolved|closed|cancelled`, trip readers accept `planned|sent|assigned|acknowledged|in_progress|completed|denied|declined|cancelled|handed_off`, and field-item readers accept `pending|en_route|arrived|in_progress|paused|completed|skipped|cancelled|handed_off`. Server writers use Draft/Ready/Assigned/Declined unconditionally. Legacy values remain readable during historical backfill.
- Advisory publication, user access/password security, directory lifecycle/public visibility, account-link review, notification read state, delivery processing, and provider receipts remain separate status axes. Transport acceptance or read receipts never advance business lifecycle.
- Tickets, Service Memos, dispatch trips, public updates, agency media, avatars, and report media retain server validation, authorization, and audit boundaries.
- Cache invalidation is bounded to committed affected families. Mobile private caches are consumer-scoped and may provide a bounded last-successful offline view, never an authorization bypass.
- Public Updates are owned by Staff at `/api/mobile/public-updates`. Its opaque cursor pages the `kind: "advisory" | "facebook_post"` union; advisory records retain compatible fields plus optional ordered `photos`. Eligible standalone/imported Facebook posts are additive, while records with an `advisory_id` are excluded by that exact relationship so an advisory and its mirrored Page post never appear twice. Mobile keys the bounded cache by consumer identity/access revision and uses `/api/mobile/advisories` only for `404`, `405`, or `501`; release the backend contract before the mobile reader.


- Guest reads use additive unauthenticated `/api/mobile/public/advisories` and `/api/mobile/public/updates` endpoints. Only eligible published/effective/unexpired All-target advisories and eligible standalone published posts are returned; unknown scopes fail closed. Authenticated scoped endpoints/caches are unchanged.
- Consumer report lists accept additive `sort=updated`, ordering/continuing by exact `updated_at DESC, ticket_id DESC`; optional `updatedAt` preserves legacy DTO readers. Cursor precision remains six fractional digits. Counts from loaded records are not complete server totals.
- Profile detail editing adds authenticated `field:details` with serviceAccountId/accessRevision, a selected-service password and reviewed field batch. Server ownership/revision and selected-service password validation precede atomic updates; active reports do not block profile edits, and profile mutations never advance ticket lifecycle. Legacy single-field payloads remain compatible. Mobile locks editing when capability metadata is absent. Production email re-verification is unavailable and must not be simulated.

- Report list/detail add optional `unreadNotificationIds` from the existing owner/account/audience-scoped inbox rules. Opening a visible report uses the existing notification markRead endpoint; old readers ignore the field. Linked accounts add existing phone/readable PSGC address fields for account-card presentation; QR contains only the account identifier.

- Standalone/imported Facebook posts add optional topic metadata (General/Billing/Communications/custom1-80-character names) to private and guest Public Updates. Topic-only Staff classification never changes provider caption or delivery state; advisory mirrors/comments remain separate. Deploy the additive nullable post_topic schema before the new Staff reader; legacy consumer caches without topic remain compatible.

- Consumer password changes use `/api/mobile/auth/change-password` actions `status|verify|change|cancel`, with legacy single-request clients retained. Verification lasts five minutes and is bound to the live session and credential. Account-wide rolling limits pause verification after five failures in ten minutes and require fresh login after ten failures in 24 hours without banning the account. Generic consumer Better Auth password changes use the same gates; successful credential updates, other-session revocation, consumer notification and audit commit together.

## Account-link review refinement

- Account-link requests keep submission snapshots separate from current membership. Consumer request reads add optional `isCurrentLink`, true only for the same identity, service account and membership request provenance. Missing metadata remains supported; historical approval is never authorization.
- Staff adds nullable decision actor name/role and recorded-removal context. Public `consumerReason` remains the Staff-authored decline explanation; `internalReason` and other-owner information remain Staff-only. Known account-link audit notes are readable in existing Activity Logs without exposing raw metadata.
- Staff transfer requires `expectedCurrentOwnerIdentityId`; missing returns 400 `EXPECTED_OWNER_REQUIRED`, changed owner returns 409 `CURRENT_OWNER_CHANGED`. The client must explicitly review the refreshed owner before retrying. Open pending/conflict actions use current locked ownership; ordinary approval never transfers another owner's account.
- Matching terminal decisions replay without new access/delivery effects; opposing or closed decisions return 409 `LINK_REQUEST_CHANGED`. Same-owner reconciliation repairs provenance without granting access again. Restore requires a recorded removal plus current ownership/default/last-account checks.
- Deploy compatible Staff API and UI before dependent Mobile release. Older Mobile ignores additive reads. Cached Staff transfer writes without reviewed-owner metadata fail closed with refresh guidance. No schema migration or status-value retirement is required.

## Compatibility and release order

- Add backward-compatible server fields and readers first; preserve older mobile payload handling until the consumer release is verified.
- For coordinated changes: verify the server contract, deploy Worker-compatible changes, deploy Pages when needed, then publish the mobile consumer release. Record both commits and versions in each implementation history.
- Validate staff with focused Node tests and `npm run build`; validate mobile with its focused tests, TypeScript, lint, Expo checks, and device behavior appropriate to the change.
<!-- shared-contract:end -->

## Additive PanelUI integration contracts

The following reviewed companion snapshot records Mobile readers beyond the local Staff baseline. It does not assert that an unmerged server change is deployed. Staff PR40 remains a separate dependency for editable profile details without active-report locks, linked-account contact details and unread-report metadata. Existing payloads without these optional fields remain supported. See [API alignment](../panelui-api-alignment.md) and [major migration](../panelui-major-migration.md) for release limits.

- Guest reads use additive unauthenticated `/api/mobile/public/advisories` and `/api/mobile/public/updates` endpoints. Only eligible published/effective/unexpired All-target advisories and eligible standalone published posts are returned; unknown scopes fail closed. Authenticated scoped endpoints/caches are unchanged.
- Consumer report lists accept additive `sort=updated`, ordering/continuing by exact `updated_at DESC, ticket_id DESC`; optional `updatedAt` preserves legacy DTO readers. Cursor precision remains six fractional digits. Counts from loaded records are not complete server totals.
- Profile detail editing adds authenticated `field:details` with serviceAccountId/accessRevision, a selected-service password and reviewed field batch. Server ownership/revision and selected-service password validation precede atomic updates; active reports do not block profile edits, and profile mutations never advance ticket lifecycle. Legacy single-field payloads remain compatible. Mobile locks editing when capability metadata is absent. Production email re-verification is unavailable and must not be simulated.
- Report list/detail add optional `unreadNotificationIds` from the existing owner/account/audience-scoped inbox rules. Opening a visible report uses the existing notification markRead endpoint; old readers ignore the field. Linked accounts add existing phone/readable PSGC address fields for account-card presentation; QR contains only the account identifier.
- Standalone/imported Facebook posts add optional topic metadata (General/Billing/Communications/custom1-80-character names) to private and guest Public Updates. Topic-only Staff classification never changes provider caption or delivery state; advisory mirrors/comments remain separate. Deploy the additive nullable post_topic schema before the new Staff reader; legacy consumer caches without topic remain compatible.

## Account-link current-password confirmation (2026-10-18, implementation only)

Account-link writes require a separate five-minute current-session/current-credential verification proof from POST /api/mobile/auth/account-link-verification (status|verify|cancel), carried as verificationFlowId. The server revalidates and binds it to one idempotent intent in the linking transaction. Password-change grants cannot authorize linking. Missing/expired proof returns409 CURRENT_PASSWORD_VERIFICATION_REQUIRED; daily fresh-login enforcement returns ACCOUNT_LINK_REAUTHENTICATE. Target service-account credential checks, Staff approval and owned history remain required. No schema change. Deploy the guarded server before the paired Mobile release; older apps must update to create linking requests, while existing accounts/read APIs continue working. No deployment has occurred for this change.
