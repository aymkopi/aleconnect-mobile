# Harness CI alignment

Owner: coordinated GitHub pipeline task.
Branch/base: codex/harness-cicd-20261004 from the published harness update.
Status: pipeline updated; local verification and publication underway.

- Scope: dependency-free harness checks first, conservative event-base handling, conditional full app checks/deployment, current action runtimes and complete consumer test selection. See [CI guide](../ci.md).
- Verification: base/classification/failure regression cases, focused harness suites, standalone validation and actionlint. Final GitHub outcomes are recorded by commit/run ID after publication.
- Remaining risks: device/native publication remains outside this task. Workflow changes exercise full app checks; docs-only changes skip them after successful harness checks.
- Next: confirm local gates and final remote runs; preserve unrelated work and recovery stashes.
