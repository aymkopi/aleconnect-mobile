# ALEConnect mobile harness

Repository role: consumer Expo app, native configuration, device storage, and release behavior. The staff API and authoritative shared contract are normally available from the sibling `../aleconnect` checkout.

Read in this order: [AGENTS.md](../../AGENTS.md), [active work](active-work.md), [PRODUCT.md](../../PRODUCT.md), [release hardening plan](../mobile-release-hardening-plan.md), [release hardening tracker](../mobile-release-hardening-tracker.md), and [implementation history](implementation-history.md). Current source and device evidence outrank older documents.

The app owns consumer UI only. It calls the staff-owned `/api/mobile/*` contract, stores session state in device storage, and never connects directly to MySQL or contains server secrets. Shared backend/mobile rules are in [cross-project contracts](cross-project-contracts.md).

Use `npm run harness:check` after harness edits, focused Node tests for code changes, and TypeScript, lint, Expo checks, and device behavior appropriate to a mobile release. Inspect the sibling staff repository before changing shared API contracts, consumer authentication, notifications, media flows, or coordinated releases.

The existing dirty worktree is user-owned. Preserve it without enumerating volatile file lists in AGENTS.md. After a verified change, append an implementation-history entry and update active work without overwriting unrelated handoff state.
