# Implementation history

## 2026-08-02 — Mobile agent harness foundation

- Repositories: mobile; sibling staff contract at `../aleconnect`.
- Scope: added mobile harness documents, dependency-free validation, and focused validator tests without product behavior changes.
- Files: scripts/validate-agent-harness.mjs, tests/agent-harness.test.mjs, docs/agent-harness/, package.json.
- Contracts: copied the authoritative shared backend/mobile contract block exactly; `npm run harness:check` validates local documents and sibling parity when both repositories are present.
- Verification: RED `node --test tests/agent-harness.test.mjs` failed because the validator did not exist; GREEN `node --test tests/agent-harness.test.mjs` passed 12/12, `npm run harness:check` exited 0 with the expected missing-cross-skill warning, and focused `git diff --check` passed.
- Git/Deployment: local commit only; no deployment.
- Remaining risks: the cross-project skill has not yet been created in both repositories, so the validator warns until the later task supplies it.
- Next: run the mobile harness checks, preserve unrelated dirty work, and complete the isolated commit.

## 2026-08-02 - Mobile harness enforcement

- Repositories: mobile; sibling staff contract at `../aleconnect`.
- Scope: replaced the mobile root map and added validation-only GitHub Actions enforcement without product, dependency, or release changes.
- Files: AGENTS.md, .github/workflows/agent-harness.yml, tests/agent-harness.test.mjs, docs/agent-harness/.
- Contracts: root instructions identify consumer Expo ownership, staff API ownership, cross-project contracts, and real-device checks only for native/runtime changes.
- Verification: RED `node --test tests/agent-harness.test.mjs` failed because `.github/workflows/agent-harness.yml` was absent; GREEN passed 17/17 after adding the workflow and concise map. Full validation passed: Node tests 79/79, `npm run harness:check` 0 with the expected missing-cross-skill warning, `npx tsc --noEmit` 0, and lint 0 errors with one pre-existing warning in user-owned profile code.
- Git/Deployment: local commit only; the workflow runs checks only and contains no Expo/EAS publishing or deployment command.
- Remaining risks: GitHub Actions has not run on the remote yet; the existing cross-project-skill warning remains outside this task.
- Next: use the harness on the next mobile change and preserve the user-owned worktree.

## 2026-08-02 - ALEConnect mobile workflow skill

- Repositories: mobile; verifies staff-owned consumer API contract at `../aleconnect` before shared changes.
- Scope: added the reusable `aleconnect-mobile-workflow` skill and its generated agent manifest; no product or dependency changes.
- Files: `.agents/skills/aleconnect-mobile-workflow/SKILL.md`, `.agents/skills/aleconnect-mobile-workflow/agents/openai.yaml`, and this handoff.
- Contracts: requires staff-first additive fields, omitted/null mobile compatibility, consumer authorization and ownership boundaries, private offline cache rules, and no mobile MySQL or server secrets.
- Verification: RED fresh-agent baseline proposed UI-only files and lint, omitting staff contract, cache, auth, handoff, and runtime checks. GREEN fresh-agent forward test inspected `GET /api/mobile/complaints/:id`, found `crew_eta` absent, required server-first addition plus optional/null fallback, consumer ownership, no stale cache after auth failure, focused checks, Expo runtime render, and post-change history/active-work handoff. `quick_validate.py` passed using an external temporary PyYAML target because the bundled interpreter lacked PyYAML; body is 239 words.
- Git/Deployment: local skill commit only; no deployment.
- Remaining risks: forward test is read-only and did not implement or run a device render; future product work must provide that evidence.
- Next: use the skill for the next scoped consumer mobile change and preserve unrelated worktree state.
