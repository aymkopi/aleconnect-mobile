# Mobile harness map

Inspect affected source first. Use only the matching row; read [active work](active-work.md) for resumed/coordinated tasks or protected live/device state. Routine corrections need no documentation stack.

| Task | Read / inspect |
| --- | --- |
| Consumer screen or UI | [Product](../../PRODUCT.md), current nearby screens; `aleconnect-mobile-workflow` for offline/native/release changes |
| API/auth/account/cache/report/media | Current service and Staff handler; [shared contract](cross-project-contracts.md); `aleconnect-cross-project-change` if the boundary changes |
| Notifications/background/permissions | Current registration, session, queue and OS permission paths; device evidence for the affected behavior |
| Android/native/release | [README](../../README.md), package/lock/app config, [hardening tracker](../mobile-release-hardening-tracker.md) only for relevant release gates |
| Prior result or rollback | Search [history](implementation-history.md) and its archive by topic/date |
| Other documentation | [Documentation map](../README.md) |

Public Updates use the Staff-owned union feed with its documented legacy fallback. Native SDK upgrades do not by themselves change Staff contracts or authorize EAS/OTA/store publication.

## Worktrees and checks

Coordinated worktrees should be siblings named `aleconnect`, `aleconnect-mobile`, and `aleconnect-lineman`. Use `npm run harness:check -- --sibling <staff-worktree>` when Staff is elsewhere; `--staff` is unsupported. Do not copy environment files into the worktree.

Docs-only checks: `npm run harness:check`, `git diff --check`; validation changes also run `node --test tests/agent-harness.test.mjs tests/agent-worktree.test.mjs`. TypeScript, lint, Expo/build and device checks follow the changed behavior, as listed in AGENTS.


## Keep the harness small

- `AGENTS.md` is the entry point; this map routes optional reading.
- `active-work.md` is a short index of open tasks and critical restrictions. Keep each substantial task in `tasks/<task>.md` with owner, branch/base, status, verification, risks and next action. Update only the task you own; use history for completed outcomes.
- `implementation-history.md` records outcomes. New entries require only `Scope`, `Verification`, `Remaining risks`, and `Next`; include files, contracts, commit/release IDs, and rollback in those fields when relevant. Existing eight-field entries remain valid.
- Archives preserve dated evidence, including superseded pending states. Search them by topic/date rather than reading them at startup. Old plans and trackers are historical evidence, not proof of current source, deployment, schema, or device state.
- Update the owning contract and affected client snapshots together. Do not duplicate contract details into every handoff.

## Local environment and evaluation

Run `node scripts/check-agent-worktree.mjs` for a read-only Git, lockfile, and sibling-layout check. Add `--app` before app work to require Node 22 and the local toolchain; use `--sibling <path>` for a different contract-owner layout. See [worktree setup](worktree-setup.md).

The [evaluation guide](evaluation.md) compares representative tasks and records correctness, time, usage and user interventions. Validator tests are not evidence of agent performance. Routine edits use one agent; complex contracts, migrations, releases or uncertain changes benefit from an independent final review when available and authorized.
