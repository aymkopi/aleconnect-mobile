# Lean harness update

Owner: this three-repo harness task.
Branch/base: codex/harness-finalization-20261004; Staff 4079c07, Lineman cc07760, Mobile 23c5be1. The earlier simplification worktrees preserve intermediate recovery state.
Status: update complete; scoped local integration is recorded in Git.

- Scope: simplified startup, narrow skills, structural metadata validation, task-scoped handoffs, read-only setup diagnostics and documentation navigation. Current cleanup/native-upgrade evidence is archived intact. Shared routing copies agree; shared API payloads and product behavior remain unchanged.
- Verification: 160 focused checks on Node 22.23.2; three harness checks; 13 Python skill validations; three Node 22.23.2 primary app diagnostics; six independent behavioral scenarios with all four findings corrected; final script review approved after fixing CLI and YAML schema gates; links/archive/whitespace/scope checks. See [final acceptance](../final-acceptance.md).
- Remaining risks: no unresolved harness acceptance blocker. Global plugins keep their settings. Scenario review and instruction-volume counts do not establish runtime/device acceptance or quantitative coding-agent performance.
- Next: no remaining harness implementation or acceptance checks. Remote push, production/native publication and optional quantitative performance experiments are outside this local update.
