# Active work

Last reviewed: 2026-08-20
Current branch: `codex/mobile-operations-parity` (unmerged local integration branch; prior `master` release evidence remains below).
Active plan: `../aleconnect/docs/superpowers/plans/2026-08-13-mobile-operations-parity.md`; Tasks 1–9 are locally implemented/verified, pending controller-owned full-branch review and integration.
Next task: obtain the fresh whole-branch Sol review, resolve any finding through the designated Terra lane, then repeat the listed gates before merge. Do not publish EAS/store artifacts or deploy staff infrastructure from this handoff.
Known blockers: no combined reviewed/integrated evidence for the separately owned `codex/push-dispatch-engine`; staff database runtime is intentionally unverified without worktree-local credentials. Preserve Graphify outputs.
Last verified: Task 9 mobile gates passed: `node --test tests/*.test.mjs` 111 passed/1 existing skipped, lint, TypeScript, Expo Doctor 19/19, explicit-output Android export, and harness (with its expected absent conventional-sibling warning). Redmi Pad 2 `25040RP0AG` remains connected with `com.kapecakes.aleconnectmobile` foreground; Task 8 proved the patched report form keeps the IME open through 2000 ms, preserves Tab focus/visibility, and retains the route after Android Back.

## Mobile operations parity integration (2026-08-13, unmerged)

The staff-owned `/api/mobile/complaints` and `/api/mobile/hotlines` contract remains the only mobile API path; consumer code does not gain MySQL, server secrets, or a cache authority bypass. Staff Task 9 proves Vite/Worker handler identity for those consumer endpoints plus `/api/service-memos` and `/api/data`; the Pages proxy forwards the exact path/query to the API Worker. No duplicate local handler was introduced.

Product commits are `4b8794f`, `80d7bee`, `3364902`, `8ee8a89`, and `fc31291`; paired staff commits and the push-engine dependency are recorded in the staff handoff. No database action, deployment, publish, secret copy, or push-engine branch edit occurred. Immediate push delivery from `codex/push-dispatch-engine` is not claimed pending its owner review plus combined integration and device evidence.

Harness fix evidence: `node --test tests/agent-harness.test.mjs` -> 28/28 passed; `npm run harness:check` -> exit 0; see implementation-history entry "ALEConnect agent harness final fix wave" for the full cross-repository command -> result record.

Verify branch, worktree, source, and connected device again before relying on this handoff.

## Unused module and dependency cleanup (2026-08-20, local and uncommitted)

- Scope: removed 14 generated UI/context files with no inbound runtime imports (`actionsheet`, `box`, `card`, `checkbox`, `fab`, `hstack`, `popover`, and the unused context barrel). Removed the no-op `expo-web-browser` config plugin and 11 redundant direct dependencies; transitive navigation/Gluestack/Expo packages required by retained code remain installed.
- Verification: `npx tsc --noEmit`, `npm run lint`, `npm run harness:check`, and `git diff --check` passed; lint retained five existing warnings in untouched profile/report/map files; serial Node tests reported 141 passed and 6 existing UI contract failures; `npx expo-doctor` passed 19/20 and reported only the pre-existing Expo SDK patch-version drift. Source/config reference scan found no deleted-module or removed-dependency references.
- Boundary: no API/shared contract, database, deployment, EAS/store release, native source behavior, or device state changed. Graphify was refreshed to 1,917 nodes, 3,083 edges, and 176 communities.
- Rollback: restore the deleted mobile files, app plugin line, package entries, and lockfile from `HEAD`; no API, database, native artifact, or persisted-data rollback is required.
- Next: resolve the existing six test failures and Expo patch drift separately before committing or publishing.
