# Implementation history

Search the [preserved history through October 4](archive/2026-10-04/implementation-history.md) for exact files, contracts, commands, release IDs and recovery evidence. It includes pre-existing uncommitted handoff notes captured before cleanup; historical pending states may be superseded by later entries.

New entries use four fields: scope, verification, remaining risks, next. Put affected files/contracts and commit/deployment/rollback details in scope or verification when needed. Keep old evidence intact; add a new dated outcome when facts change.

## 2026-10-04 — Harness and documentation simplification

- Scope: coordinated `aleconnect`, `aleconnect-lineman`, and `aleconnect-mobile` in isolated `codex/harness-simplification-20261004` worktrees. Shortened AGENTS/maps, separated current handoffs from archived logs, refreshed README/context/docs navigation and local workflow routing, and reduced new history entries to four required fields. Existing contract payloads, shared skill mirrors, product source, dependencies, CI/deployment order, production records and device queues are unchanged.
- Verification: final focused harness suites passed Staff 40/40, Lineman 37/37, Mobile 32/32 (109 total); all three sibling-aware npm run harness:check commands passed. Changed-document local-link audit passed; all six archived handoff/history snapshots match the captured originals apart from documented link relocation. Graphify AST refresh passed in all three worktrees; generated snapshots remain external under the task recovery directory. Scoped whitespace checks passed. Product/config/dependency/CI and shared contract/skill mirrors remain unchanged; no application build, browser/device/live request or release was needed for this docs/validator change.
- Remaining risks: concurrent Lineman Expo migration/source and native acceptance gates belong to their owning task. This task does not establish fresh browser/device/live-schema/provider acceptance.
- Next: isolated changes are ready for review. Integrate only the scoped docs/skills/validator/tests when requested; re-read concurrent handoffs before integration. No commit, push, merge, deployment or live write was performed.

## 2026-10-04 — Approved lean harness refinement

- Scope: applied the user-approved recommendation across three isolated repos: task-dependent startup, narrow specialist triggers, structural skill metadata checks, task-scoped operational handoffs, read-only worktree setup diagnostics and a six-case evaluation guide. Added only harness:doctor to package scripts; product source/configuration, lockfiles, CI and shared API payloads remain unchanged. Shared routing skills were updated identically across owning repos.
- Verification: Staff 55/55, Lineman 52/52, Mobile 47/47 focused checks pass (154 total). All three harness checks and docs-mode diagnostics pass; app-mode diagnostics correctly reject Node 24 and absent local tools. Changed-doc links and six archived snapshots pass integrity checks; extracted operational sections are preserved with relocated links. Graphify AST refresh passed; generated output is retained externally. Product/config/CI/lockfiles are unchanged; package.json adds only harness:doctor. Optional Python skill validation is unavailable because PyYAML is absent; repository skill metadata/mirror checks pass.
- Remaining risks: Primary repos independently advanced to Staff 4079c07, Lineman cc07760, Mobile 23c5be1; recorded status and tracked diffs are unchanged, but integration must use current source/handoffs. Installed global plugins retain their settings. Automatic skill selection and coding-agent performance are not benchmarked. No fresh app/browser/device/live-schema/deployed acceptance is claimed. Current primary aleconnect-mobile is 23c5be1.
- Next: Review the isolated diff and integrate task-owned changes against current heads when requested. No commit, merge, push, deployment, live write or device reset was performed by this task. Paired coding-agent evaluation remains unrun.

## 2026-10-04 — Final harness acceptance and local integration

- Scope: completed approved three-repo harness/documentation update on current primary bases, preserving ten newer documents plus six original archives. Corrected all four independent behavioral review findings. Package changes add only harness:doctor; source/lockfiles/CI/shared payloads unchanged.
- Verification: Staff 57/57, Lineman 54/54, Mobile 49/49 on Node 22.23.2; three harness checks; all 13 Python skill checks; three primary app diagnostics on Node 22.23.2; six scenario review/recheck; final script review approved after CLI/YAML schema regression fixes; document/archive integrity, whitespace and scope checks. [Final acceptance](final-acceptance.md) records measured instruction volume and limitations. Earlier missing-PyYAML and pending-review entries are superseded.
- Remaining risks: no harness acceptance blocker. Global plugins retain their settings; no coding-agent speed, device acceptance, live-schema or deployed behavior is inferred. Native/product acceptance remains with existing tasks.
- Next: local update complete after fast-forward and merged-tree validation; commit IDs are recorded in Git. No remote push, production/native release, live write or unrelated worktree cleanup performed.

## 2026-10-04 — GitHub pipeline alignment with the lean harness

- Scope: updated workflow actions and Node 22.23.2, added a dependency-free CI runner with conservative Git-base fallback and docs/harness-only app gating. Staff adds an independent push/PR harness job and retains deployment order; clients use their complete npm test and typecheck scripts. Product source, lockfiles, payloads, secrets and native publication are unchanged.
- Verification: Git-base/classification/output failure regression tests, focused harness suites, standalone checks and actionlint validate the pipeline. Remote workflow outcomes are attached to the resulting commit in GitHub after publication.
- Remaining risks: workflow changes intentionally require full app verification. Source/build CI does not establish installed-device or store acceptance; absent sibling checkouts still require coordinated checks for contract changes.
- Next: publish the reviewed pipeline changes, verify GitHub workflows and Staff read-only production smoke, and preserve this task's scoped recovery evidence.

## 2026-10-04 — GitHub pipeline acceptance and publication

- Scope: integrated and published pipeline commit cbfb1a744e754c47ac8318b23d8cc3c06e1810ae on local/remote master. Harness checks run before dependency installation, docs/harness-only changes skip app work, workflow/product/unknown paths retain full verification, missing Git bases force full checks, and manual dispatch retains full verification.
- Verification: 56/56 focused harness/CI checks, 242/242 complete JavaScript/TypeScript tests, TypeScript, standalone harness validation and actionlint passed. Lint exited successfully with zero errors and 41 existing warnings. Full GitHub CI 37201186687 passed install, tests, TypeScript and lint. [Full pipeline result](https://github.com/aymkopi/aleconnect-mobile/actions/runs/37201186687). The shared runner copies match across all three repos; product source, dependencies, lockfiles and contracts are unchanged. Renaming a product file into docs still triggers app checks; validator/test failure never publishes a successful app decision. Graphify AST updates passed with generated output preserved outside commits.
- Remaining risks: installed-device/store acceptance remains outside this CI change. Client lint warnings and one Lineman environment-dependent skip are pre-existing source limits. Absent sibling repos warn in standalone CI; shared-contract work still needs coordinated local checks.
- Next: no remaining pipeline implementation. This documentation closeout exercises the docs-only GitHub path; its exact commit/run result is retained in GitHub and external task recovery evidence. Remove only this task's merged worktrees after those checks pass.

## 2026-10-04 — Runtime policy rechecked after Expo 57 module commits

- Scope: inspected current local/remote heads and module commits 2312009/b79c3d1 with cleanup 54b7810/82df5a9. Added a shared .node-version CI pin, corrected harness LTS minimum-patch checks and admitted dependency-compatible Node 24.3+, aligned package/lock root engines, and documented why validated CI/native defaults retain Node 22.23.2. Dependency resolutions and Android preview behavior are unchanged.
- Verification: committed lock engines and official Expo SDK/build-image requirements confirm Node 22.23.2 remains supported. Regression cases cover Node 22/24 lower boundaries, stable alternatives, invalid pins and non-LTS/prerelease rejection. 59/59 focused harness/CI regression checks passed on both Node 22.23.2 and Node 24.14.1. All locked dependency Node engines accept both tested versions. Workflow actionlint and metadata-only lockfile comparison passed; no dependency resolutions changed. Graphify AST refresh passed; generated changes preserved in external recovery evidence. Remote application checks remain pending publication.
- Remaining risks: dependency-compatible Node 24 is distinct from installed-device or Android preview acceptance. Historical older-stack failures do not prove current incompatibility. No Node 24 native build or device acceptance is inferred from doctor checks.
- Next: verify focused harness suites on both accepted runtimes, inspect metadata-only lock changes, publish and confirm the pipelines using .node-version, then remove the task worktrees.

## 2026-10-04 — Android preview assertion follows validated pin

- Scope: full GitHub application checks exposed the Android signing-guard test still asserting the old package-wide 22.x engine range. The preview test now checks .node-version = 22.23.2; supported runtime range is covered separately by harness tests. Native scripts and signing behavior are unchanged.
- Verification: Initial remote run identified the exact stale assertion. Local Node 22 preview/signing guard tests passed (9 tests), resolving config plugins from the primary checkout. Fresh worktree npm ci was disk-space blocked; session-created partial installs were removed using scoped Git cleanup. Graphify refresh passed with generated evidence preserved externally. Corrected clean-runner full CI remains pending.
- Remaining risks: no Node 24 native acceptance is inferred.
- Next: rerun complete client checks and record successful pipeline results before cleanup.

## 2026-10-04 — Runtime policy publication and acceptance

- Scope: published ebb9d5d672a05549c7ce899bab1797da4715edaf on local/remote master. CI uses .node-version; dependency-compatible Node 24 is accepted by harness diagnostics without changing Windows Android defaults.
- Verification: 59/59 focused harness checks passed on both Node 22.23.2 and Node 24.14.1; all locked dependency engines accept both. Full GitHub CI passed dependency installation and application checks using .node-version: 37204741834. Workflow actionlint, metadata-only lock comparison and Graphify AST refresh passed. Dependency resolutions are unchanged; generated graph evidence is preserved externally. Full application suite: 244 passes, one absent-sibling skip and zero failures; TypeScript passed; lint passed with zero errors and 41 existing warnings. [GitHub pipeline](https://github.com/aymkopi/aleconnect-mobile/actions/runs/37204741834).
- Remaining risks: Node 24 native/device acceptance remains unverified; compatibility metadata and harness checks do not imply it.
- Next: no remaining runtime implementation; final docs-only checks precede task worktree cleanup.

## 2026-10-04 — Node 24 selected for CI and client tooling

- Scope: set .node-version to 24.21.0, update client launch/preview runtime selection and current harness/README guidance. The supported dependency range remains unchanged; Node 22 is no longer the selected default.
- Verification: 59 harness/CI checks, 245 application tests, plus 10 focused signing/runtime-guard tests, TypeScript, lint (zero errors/41 existing warnings), Expo alignment and Doctor 21/21 passed. Android and iOS Hermes exports and Gradle createBundlePreviewJsAndAssets passed on Node 24.21.0. Mobile initial shared-cache EPERM was resolved by isolated TEMP/TMP without clearing another process's cache. Locked dependency engines accept 24.21.0; lockfiles/resolutions are unchanged. Graphify refresh passed with generated evidence preserved outside commits. Local dependency junctions reuse primary installations; GitHub clean-install acceptance is pending.
- Remaining risks: build evidence and device acceptance are distinct. No production signing or device state changed.
- Next: verify source/build/bundling on Node 24, publish and confirm full GitHub gates.
