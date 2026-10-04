# Harness CI alignment

Owner: coordinated GitHub pipeline task.
Branch/base: codex/harness-cicd-20261004, integrated on master at cbfb1a744e754c47ac8318b23d8cc3c06e1810ae.
Status: pipeline complete, published locally/remotely, and full GitHub verification passed.

- Scope: dependency-free harness first, conservative event-base handling, conditional full app checks/deployment, current action runtimes and complete consumer test selection. See [CI guide](../ci.md).
- Verification: 56/56 focused harness/CI checks, 242/242 complete JavaScript/TypeScript tests, TypeScript, standalone harness validation and actionlint passed. Lint exited successfully with zero errors and 41 existing warnings. Full GitHub CI 37201186687 passed install, tests, TypeScript and lint. [GitHub run](https://github.com/aymkopi/aleconnect-mobile/actions/runs/37201186687). Shared runner copies match; regression tests cover docs/product paths, missing bases, renames and failures.
- Remaining risks: device/native publication remains outside this task. Existing client lint warnings and the Lineman skip do not block source CI.
- Next: documentation closeout verifies the docs-only path in the workflow attached to this commit. No further implementation is needed. Task worktrees can be removed after that final workflow passes; recovery evidence remains outside Git.
