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

## 2026-08-02 - ALEConnect cross-project change skill

- Repositories: staff and mobile.
- Scope: copied the validated staff `aleconnect-cross-project-change` skill byte-for-byte; no product or dependency change.
- Files: `.agents/skills/aleconnect-cross-project-change/SKILL.md`, `.agents/skills/aleconnect-cross-project-change/agents/openai.yaml`, and both repositories' harness handoffs.
- Contracts: shared API changes require server-owned additive compatibility, consumer-first compatible release ordering, consumer authorization/ownership, private offline-cache checks where affected, rollback, and dual-repository evidence.
- Verification: staff RED fresh-agent plan omitted dual-field server compatibility, rollback, and both handoffs; GREEN explicitly rejected immediate removal/backend-only rollout and required dual fields, authorization, mobile cache/notification readers, staff/mobile validation, rollback, and both histories. Both `npm run harness:check` commands exited 0. SHA-256 parity: SKILL.md `564C21196B8D3A1DF3179C9E906CC401F95CF2F34EFC27A8E73DA7023C5AE323`; manifest `00E7A4ED009C2D878309C5CD19047FD368375A5522D65909EFCF6154BC5A2FFF`.
- Git/Deployment: local skill commits only; no deployment.
- Remaining risks: read-only forward tests did not change a live contract or run a device release; the bundled validator still needs external temporary PyYAML.
- Next: Task 8 cross-repository verification and final handoff.

## 2026-08-02 - ALEConnect cross-project skill portability fix

- Repositories: staff and mobile.
- Scope: copied the staff fix that replaces a mobile-relative shared-contract link with an explicit authoritative staff-contract lookup; no product or dependency change.
- Files: both `.agents/skills/aleconnect-cross-project-change/SKILL.md` copies and both harness handoffs.
- Contracts: the staff `aleconnect/docs/agent-harness/cross-project-contracts.md` is authoritative; mobile uses the sibling `../aleconnect` path when present and stops/reports if it is unavailable.
- Verification: RED path resolution showed the old identical relative link reached staff docs from staff but mobile docs from mobile. `quick_validate.py` passed with temporary external PyYAML; a fresh forward test named the staff contract as authoritative and retained compatibility, authorization, cache, release, rollback, and dual-handoff requirements. Both `npm run harness:check` commands exited 0. Synchronized SKILL.md SHA-256 is `505CBD16B364C1D6FBAB29CBF04404BF5D20F520F096FE10939146371661FAD1`; manifest SHA-256 remains `00E7A4ED009C2D878309C5CD19047FD368375A5522D65909EFCF6154BC5A2FFF`.
- Git/Deployment: local fix commits only; no deployment.
- Remaining risks: validation is documentation-only; the bundled validator still needs external temporary PyYAML.
- Next: Task 8 cross-repository verification and final handoff.
