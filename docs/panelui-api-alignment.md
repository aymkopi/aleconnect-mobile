# Mobile API alignment — 2026-10-10

Mobile worktree: C:/Users/Justine/VSCodeProjects/aleconnect-panelui. Staff worktree: C:/Users/Justine/.codex/worktrees/profile-update-auth/aleconnect. API origin: https://api.aleconnect.app. The original public API setting is compiled into the standalone APK; no server credential or environment file was copied.

## Source contract matrix

| Feature | Route family and methods | Server/client contract | Live evidence |
| --- | --- | --- | --- |
| Account/email sign-in and session | POST /api/auth/sign-in/username; GET /api/auth/get-session | Consumer role; account or mode=email body; bearer session; stale-token guards | Session200/null without credentials; real login not attempted |
| Password security | POST /api/mobile/auth/change-password | currentPassword/newPassword; same-principal session refresh | Authenticated mutation not attempted |
| Account identity/setup | GET/POST /api/mobile/consumer-identity | Server capabilities/access revision; setup is capability gated | Unauthenticated401; production ownership verification remains unavailable |
| Linked accounts | GET/PATCH /api/mobile/linked-accounts | setDefault/unlink; selected service ID, revision, password for unlink | Unauthenticated401 |
| Linking review requests | GET/POST /api/mobile/account-link-requests | Account/name/password, stable idempotency key, canonical review status | Unauthenticated401 |
| Reports | GET/POST /api/mobile/complaints; GET /meta and /:id; POST /evidence-upload | Account/revision, canonical status v1, source text/evidence limits, durable idempotency and scoped signing | Unauthenticated401; updated sort deployment still pending |
| Guest advisories | GET /api/mobile/public/advisories and /:id | Eligible All-target publications only; same date/photo projection | Live200 after approved API release |
| Guest ALECO feed | GET /api/mobile/public/updates and /posts/:id | Bounded union cursor; eligible standalone posts; no mirrored duplicates | Live200 after approved API release |
| Signed-in advisories/feed | GET /api/mobile/advisories and /:id; GET /api/mobile/public-updates | Consumer/subscription audience and consumer-scoped cache | Unauthenticated401 |
| Hotlines | GET /api/mobile/hotlines | Public directory/categories; calls/copy/website use platform APIs | Live200; category envelope present |
| Notifications inbox | GET/POST /api/mobile/notifications | Scope/revision, markRead/markAllRead, advisory/report destinations | Unauthenticated401 |
| Push and alerts | GET/POST /api/mobile/push-notifications | Preferences/selected stations/feeders; kind=token for Expo token | Unauthenticated401; physical push delivery not tested |
| Profile details | GET/PATCH /api/mobile/profile | field=details, selected-account password/revision, atomic validation, active-report edit lock | Unauthenticated401; batch edit contract deployed; authenticated mutation unverified |
| Profile photos | POST /api/mobile/profile/avatar-upload and /avatar-complete; PUT signed R2 URL | Authorized selected account, validated content/key and completion | Authenticated/provider mutation not attempted |
| Maps and service guides | Existing map providers/platform permission and official ALECO channels | Maps do not authorize reports; guides do not invent payment/connection APIs | Source integrated; live providers not certified |

## Verification and rollout

21 service paths resolve to the same handlers in current-release Worker and Vite. The assert-based route audit includes a missing-registration negative self-check; shared contract blocks match. Avatar prefixes precede profile and public guest routes stay separate from consumer routes.

User explicitly approved the reviewed API patch. It was applied with a three-way merge in C:/Users/Justine/.codex/worktrees/mobile-api-release/aleconnect at current remote main7c67df1, retaining newer advisory topics, Staff validation and Facebook changes. Canonical topic/selected-service test harness assumptions were updated; no additional production behavior was introduced beyond the approved patch.

Release gates pass:56 focused Staff checks with current locked dependencies, scoped lint with zero diagnostics, TypeScript/Vite production build, cross-project harness, whitespace and exact Worker dry-run. Read-only production schema and EXPLAIN confirm required columns, canonical report enum and existing user-index access. Updated reports use a bounded filesort with the existing index; no migration was applied. Mobile418/418 and TypeScript passed on the built application source.

API Worker version a2e1d186-ef42-43d9-b2b2-036cf096b7ca (number339) is verified at100%, deployment62daf320-98d3-45a7-be57-e237cb96a215. All previous variable, secret-name, Hyperdrive and queue bindings compare unchanged. Source fingerprints match the deployed source. Rollback baseline4d3285df-ac18-493e-875f-4e70ae7bf11b preserves the recent Page-token rotation.

25 post-release read-only assertions pass: guest lists/advisory detail/cursor paging, malformed/unknown/missing paths, public hotlines, anonymous session and10 private unauthenticated boundaries. A bounded20-item public union read returned3 advisories and no eligible standalone Facebook post; actual public post detail therefore remains unverified, with its selector/route covered by focused tests. No login, POST/PATCH, push send, private record read or database write was performed.

The real fixture-free v33 APK loads live guest Home, Advisories and advisory detail on the clean Android16 emulator, then returns using hardware Back. No new crash-buffer entry; app PID remains8797. Native screenshot/hierarchy evidence is retained externally.

Source remains uncommitted. No Git publication, Pages/other Worker/store/EAS/OTA release was performed. Real authenticated profile/report/linking writes, email ownership/approved terms, physical push and old-emulator ART crash acceptance remain separate gates. See [device preview](panelui-device-preview.md).

## 2026-10-11 — Current-main compatibility restoration for v51

Safe live recheck found guest routes404 after a subsequent release. The previously approved patch was reapplied with a clean three-way merge onto6fb7d0c in the isolated panelui-device-api worktree, preserving recent Facebook reconciliation/topic changes.79 Staff checks, build/lint, read-only schema,21 route registrations and independent review pass; Mobile473/473 against this companion. Worker342/739692f3-129c-4859-b319-53e040e9c401 at100%, all21 bindings unchanged from rollbacka71b12d8.25 post-release read-only assertions pass; actual post detail/private mutations remain unverified. No migration. This patch is not merged; integrate it before future Staff deployments. [Current APK and acceptance](panelui-device-preview.md).

## 2026-10-11 — Staff compatibility merged and production verified

Staff PR37 is merged as04dceb8b0b50be303dc87595d138100a9fcc7488; [production pipeline](https://github.com/aymkopi/Aleconnect/actions/runs/38152350835) and all exact-head checks pass. API Workerab3eea9f-0447-474c-8d4d-d5fe2b23dd33 (345) is verified at100%; all21 binding definitions and runtime settings match the compatible342 checkpoint. Pagesaced1a0a reports main source04dceb8. No migration, secret/configuration change or production mutation was needed.

Fresh checks: Mobile473/473 against this Staff companion;113 focused API/deployment tests,7 typed auth behaviors, Staff build/lint/harness,21 reader routes, schema/index/EXPLAIN and independent review pass.35 post-release read-only checks cover Mobile guest/detail/cursor/private boundaries plus Staff HTML/entry asset, anonymous sessions and protected Staff/field APIs. The broader Staff suite has1,435 passes,7 unrelated assertions reproduced on untouched remote main and2 existing skips. Backend-main integration is complete; earlier uncommitted/unmerged warnings in this document are superseded by this release record.

The existing fixture-free v51 APK already uses https://api.aleconnect.app; no Mobile source/native rebuild, data clear, login, report/profile mutation, provider upload or push send occurred in this integration. Physical/authenticated/provider/native acceptance remains the device handoff's separate gate. [Authoritative Staff task](https://github.com/aymkopi/Aleconnect/blob/main/docs/agent-harness/tasks/consumer-mobile-preview-api-v51.md) retains rollback and release evidence.

Final live checkpoint after documentation closeout cc3cf66: Cloudflare's Git integration publishes the same application code as API Worker09b5513b-fe97-47b2-a39e-377a78658936 (346), deployment101d9ef7-038b-4ea9-b24f-8e2f71cad8ac at100%.21 binding definitions/runtime settings still match the342 rollback checkpoint; all35 read-only Staff/field/Mobile probes pass again. All closeout checks pass; production Staff entry assets8/8 match immutable Pagesaced1a0a. Earlier345 identifiers above describe the successful product CI deployment checkpoint. External final verification is retained with the release evidence. Mobile harness passes with the explicit deployed Staff sibling; its default primary-Staff mismatch remains because unrelated unpublished primary main was intentionally preserved.
