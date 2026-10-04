---
name: aleconnect-cross-project-change
description: Coordinate shared Staff and consumer Mobile API, authentication, notification, or media contracts.
---

# ALEConnect Cross-Project Change

This skill coordinates the Staff backend and consumer Mobile app. Identical copies live in all three repositories so either project can activate the workflow; Lineman's `/api/field*` contract is separate and uses `aleconnect-lineman-contract`.

## Establish ownership and current behavior

Inspect `git status` in `aleconnect` and `aleconnect-mobile`; preserve unrelated work. Read both `AGENTS.md` files, current source, relevant active-work handoffs, and task-specific contract docs. Start from Staff's authoritative `docs/agent-harness/cross-project-contracts.md`; from Mobile, the usual sibling path is `../aleconnect`. If the authoritative Staff contract or required repository is unavailable, report the missing evidence and do not guess the API contract.

Inspect the owning handler and consumer reader directly. Add backend/database guidance when that capability changes, and `aleconnect-staff-workflow` only for lifecycle, operational hardening or release work spanning subsystems. Load the Mobile-owned [`aleconnect-mobile-workflow`](../../../../aleconnect-mobile/.agents/skills/aleconnect-mobile-workflow/SKILL.md) for offline-state, native capability, SDK or release changes; routine reader/UI changes need no extra workflow. This link resolves to Mobile from Staff and Lineman, and to the current checkout from Mobile. Staff owns `/api/mobile/*`, authorization, database, R2 signing, and deployment order. Mobile owns consumer UI, device state, and native release behavior; it never connects to Staff's database or stores server secrets.

## Design a compatible change

Before implementation, map the authoritative handler, every affected reader, the authorization identity, private-cache scope/invalidation, and any offline queue or evidence lifecycle involved. State the compatibility window, rollout order, rollback path, and focused evidence needed from each repository.

Prefer additive server fields and readers that tolerate both old and new payloads. Preserve stable identifiers, error semantics, legacy fields, pagination/cursor behavior, and idempotency guarantees unless a separately coordinated migration explicitly retires them. Validate ownership and permissions on the server; cached consumer state is never authorization. Keep account identity and access revisions attached to queued work so stale drafts cannot be retargeted after an account change.

Deploy and verify the backward-compatible Staff contract before releasing Mobile readers that depend on it. Keep compatibility until supported Mobile versions have been verified. Do not remove an old reader or payload based only on source-level parity, and do not assume deployment or store release is part of ordinary verification.

## Verify both sides

- Staff: test authorization, validation, response compatibility, persistence, and relevant side effects; run focused tests, `npm run harness:check`, and `npm run build` for API/data-route changes. Inspect deployment output only when the task explicitly includes release work.
- Mobile: test response readers, identity/cache boundaries, offline and retry behavior, and relevant UI states; run focused tests, TypeScript and scoped lint. Run Expo diagnostics for native/configuration changes and device checks for claimed native behavior.
- Check failure, replay, pagination, and old-client scenarios where the contract uses them. A successful source test does not establish deployed compatibility or device acceptance.
- Update the affected task handoffs and active-work indexes without replacing unrelated state. Append verified evidence to both implementation histories, including commits when present, contract version, deployment or release state, rollback, and checks that were not run.

Keep this skill consumer-only. For Staff/Lineman field authorization, action receipts, offline field sync, or evidence finalization, use the separately maintained `aleconnect-lineman-contract` workflow in the owning Staff and Lineman repositories.
