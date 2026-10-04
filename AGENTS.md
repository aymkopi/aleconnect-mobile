# ALEConnect Mobile agent guide

Run `git status` and inspect the affected files. Use [the harness map](docs/agent-harness/index.md) when routing is needed; read [active work](docs/agent-harness/active-work.md) before resuming shared work, touching protected live/device state, or coordinating repos. Read [PRODUCT.md](PRODUCT.md) for product decisions and [history](docs/agent-harness/implementation-history.md) when prior evidence matters.

## Boundaries

This repo owns consumer UI, native configuration, private device storage, and Expo releases. `../aleconnect` owns `/api/mobile/*`, server authorization, MySQL, R2 signing, and deployment order.

- Inspect Staff handlers and client readers when changing API use, auth, notifications, media, or a [shared contract](docs/agent-harness/cross-project-contracts.md). A UI-only edit can use its established contract.
- Keep private caches and queued work consumer-scoped. Cache never bypasses auth or retargets work after an account change. Preserve old/omitted/null response handling.
- Never put server secrets or MySQL access in the app. Add compatible server readers/fields before releasing dependent clients.
- Preserve unrelated edits, generated files, stashes, signing keys, and device data. Use isolated worktrees for dirty or coordinated changes; never copy `.env.local`.

Handle routine changes directly; load a specialist only for the affected contract, durable sync, native release, or a requested audit. Plan multi-step work proportionally.

## Verification and handoff

| Change | Checks |
| --- | --- |
| Docs or harness | `npm run harness:check`; harness tests if validation changes; `git diff --check` |
| TypeScript/UI | Focused tests, `npx tsc --noEmit`, scoped lint; render checks for visual/interaction claims |
| Native/config/release | Above plus Expo alignment/Doctor, build/export, and installed-device checks for the claimed behavior |

Use Node 22 for Android previews. Build/hash/signature checks do not establish device acceptance or store publication. Use [the release tracker](docs/mobile-release-hardening-tracker.md) only for release/hardening work; EAS, OTA, and store distribution need release authorization.

Append compact scope, verification, remaining risks, and next steps to history for meaningful changes. Update the affected task handoff; active work is its index. Distinguish passed, baseline-failing, and unverified checks. Query Graphify for codebase questions when available and refresh it after code changes; preserve generated churn separately.
