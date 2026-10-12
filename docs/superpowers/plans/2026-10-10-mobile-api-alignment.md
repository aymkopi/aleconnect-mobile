# Mobile API alignment Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan in the existing isolated Mobile and Staff worktrees.

**Goal:** Connect the redesigned app to the current Staff-owned consumer API without breaking old clients or private device state.

**Architecture:** Reuse the current HTTPS request helper, consumer authorization and scoped readers. Staff owns compatible public guest readers, exact updated-sort pagination and atomic password-verified profile edits; no database migration or client secret is needed.

**Tech Stack:** Expo57/RN0.86, Node24.21, Better Auth, Cloudflare Worker/Vite, MySQL.

**Spec:** docs/panelui-completion-acceptance.md and the authoritative Staff docs/agent-harness/cross-project-contracts.md.

## Constraints
- Preserve com.kapecakes.aleconnectmobile, original local preview signer, existing storage and old server contracts.
- Use https://api.aleconnect.app; no server secrets or .env.local copying.
- Release compatible Staff handlers before Mobile distribution. Live deployment requires explicit authorization.

## Review focus
- Guest readers expose eligible All-target publications only.
- Stale token/access revisions cannot authorize private reads or mutations.
- Old pagination and unknown statuses remain fail closed.
- Profile changes authenticate the selected account and block active reports.
- HTTP route registrations and published deployment can differ despite source tests.

## Tasks
- [x] Verify original signing identity, embedded Firebase/Expo configuration, HTTPS origin and supported ARM64/x86_64 build. Reject the first cached fixture bundle and force a fresh bundle.
- [x] Inspect Mobile service routes and Worker/Vite handlers; read source graph leads and active contract handoffs.
- [x] Read-only deployed smoke: hotlines200, protected routes401, guest list routes404; no credential or data mutation.
- [x] Verify every Mobile API family against both router registries and existing focused contracts; correct stale route documentation in both worktrees. Record route/method/auth/capability matrix.
- [x] Run focused Staff/Mobile contracts, build/type/harness/whitespace. Record source and deployed evidence separately.
- [x] If authorized, release only compatible Staff API changes via the existing runbook, then repeat guest and authorization smoke. Otherwise leave a concrete reviewed deployment handoff.
- [x] Verify the final fresh live APK, replace the Desktop copy, install only on the clean emulator, and update acceptance/history.

Completed: current-main isolated release,56 locked-dependency checks/build/lint/harness, read-only schema/EXPLAIN, exact deployment339 at100% with unchanged bindings and25 live assertions. No current eligible Facebook post sample; real authenticated mutation/provider/native release gates remain open.
