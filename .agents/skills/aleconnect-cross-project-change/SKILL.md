---
name: aleconnect-cross-project-change
description: Use when an ALEConnect request affects both repositories, changes /api/mobile routes, or changes authentication, notifications, advisories, tickets, evidence, avatars, identifiers, or response fields consumed by mobile.
---

# ALEConnect Cross-Project Change

## Start

Inspect `git status` in `aleconnect` and `aleconnect-mobile`; preserve unrelated work. Read both `AGENTS.md`, the applicable `$aleconnect-staff-workflow` and `$aleconnect-mobile-workflow` skills, active work, and the shared marker block in the staff [cross-project contract](../../../docs/agent-harness/cross-project-contracts.md). The staff repository owns the server contract and deployment order; mobile owns consumer UI, device storage, and release behavior.

## Plan

Return these slots for every shared change: authoritative owner and readers; additive server fields/readers plus legacy fallback; authorization and consumer ownership; affected mobile UI, notifications, evidence, permissions, and offline/private-cache behavior when relevant; staff and mobile tests; rollback; deployment order; both history and active-work updates.

Keep old fields, readers, and behavior through a compatibility window. Deploy a backward-compatible server contract, update and verify the consumer release, then remove compatibility only after the released mobile readers are confirmed. Do not accept an immediate removal or backend-only rollout because it is faster.

## Verify and record

Test the staff contract and authorization, then its focused tests, build, and deployment checks. Test mobile contract readers plus affected offline/auth/cache behavior, focused tests, type/lint, and Expo/device checks appropriate to the change. Record both commits, deployment/version evidence, rollback path, and verified results in both append-only implementation histories; update both active-work handoffs. Stage only scoped files.
