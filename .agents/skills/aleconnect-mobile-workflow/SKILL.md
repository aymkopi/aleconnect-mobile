---
name: aleconnect-mobile-workflow
description: Use when changing ALEConnect Mobile Expo screens, consumer API usage, authentication, notifications, offline state, evidence, maps, native configuration, or Android and iOS release behavior.
---

# ALEConnect Mobile Workflow

Keep Expo a consumer client; the sibling staff repository owns API, authorization, MySQL, R2 signing, and deployment order.

## Required plan

Before planning, read `AGENTS.md`, relevant mobile code, cross-project contract, active work, and history. Inspect the current staff `/api/mobile/*` route and response in `../aleconnect`; this read-only step is required for proposals. UI urgency or an assumed field never replaces it.

Return these exact headings, even when asked for only files and validation:

- **Contract:** Staff endpoint/response evidence; coordinate shared changes server-first.
- **Compatibility:** Add fields/readers compatibly; accept omitted or `null` mobile fields and name the unavailable fallback. Preserve successful payloads and cached data.
- **Ownership:** Keep consumer authorization and record ownership server-side. Never use MySQL, secrets, or cached UI as authority.
- **Offline:** State cache behavior even when none exists: private consumer scope, bounded last-successful view, invalidation, and that auth/session failure cannot show cached data; cache never bypasses authorization.
- **Permissions:** Request only feature-required device permissions and handle denial.
- **Verification:** List focused tests, TypeScript, lint, and Expo checks. Include an Expo/emulator/device render check for UI; require real device/runtime evidence for native config, permissions, notifications, or background work.
- **Handoff:** Include this post-implementation action: append an append-only history entry with verified scope, contracts, commands/results, commits, and risks; update active work without replacing unrelated state.

**Stop:** Report a blocker only when the staff contract is unavailable; do not invent field names or give a files-and-validation-only plan.
