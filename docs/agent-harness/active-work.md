# Active work

Last reviewed: 2026-10-04
Current branch: local `master` after runtime review integration; prepared on `codex/harness-node-review-20261004`.
Active plan: runtime policy and CI update complete; verified results are in the runtime task record.
Next task: final documentation checks and removal of this task's merged worktrees. Operational/native acceptance stays with its owning tasks.
Known blockers: no harness blocker. Source cleanup/CI completed; native/device acceptance limits remain in the operational handoff.
Last verified: 59/59 focused harness checks passed on both Node 22.23.2 and Node 24.14.1; all locked dependency engines accept both. Full GitHub CI passed dependency installation and application checks using .node-version: 37204741834. Workflow actionlint, metadata-only lock comparison and Graphify AST refresh passed. Dependency resolutions are unchanged; generated graph evidence is preserved externally. Full application suite: 244 passes, one absent-sibling skip and zero failures; TypeScript passed; lint passed with zero errors and 41 existing warnings.


- [Harness refinement](tasks/harness-refinement.md): isolated docs/skills/checks; no product release.
- [Operational acceptance](tasks/operational-acceptance.md): preserved native/CI/device acceptance and protected operational state; read before live/device work.
- Prior detail: [preserved handoff](archive/2026-10-04/active-work.md) and [history](implementation-history.md).

- [Harness CI alignment](tasks/harness-ci.md): completed and published; full GitHub gates passed, docs-only closeout verification recorded by commit.

- [Runtime review](tasks/runtime-review.md): current module requirements and validated CI/native runtime policy.
