# ALEConnect cross-project contracts

Authoritative source: `../aleconnect/docs/agent-harness/cross-project-contracts.md`
Last synchronized staff commit: `adfa9c41ad89f33f47f4704743f46499b87485b8`

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
- Notifications and advisories are selected server-side from consumer scope, subscriptions, and preferences. Push/SMS work records must remain idempotent and replay-safe.
- Tickets, Service Memos, dispatch trips, public updates, agency media, avatars, and report media retain server validation, authorization, and audit boundaries.
- Cache invalidation is bounded to committed affected families. Mobile private caches are consumer-scoped and may provide a bounded last-successful offline view, never an authorization bypass.

## Compatibility and release order

- Add backward-compatible server fields and readers first; preserve older mobile payload handling until the consumer release is verified.
- For coordinated changes: verify the server contract, deploy Worker-compatible changes, deploy Pages when needed, then publish the mobile consumer release. Record both commits and versions in each implementation history.
- Validate staff with focused Node tests and `npm run build`; validate mobile with its focused tests, TypeScript, lint, Expo checks, and device behavior appropriate to the change.
<!-- shared-contract:end -->
