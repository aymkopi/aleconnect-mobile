# Active work

Last reviewed: 2026-10-04
Current branch: codex/node24-runtime; integration target master.
Active plan: verify and select Node 24.21.0 for CI and client tooling.
Next task: finish Node 24 source/build checks and publish the verified update.
Known blockers: no harness blocker. Source cleanup/CI completed; native/device acceptance limits remain in the operational handoff.
Last verified: 59 harness/CI checks, 245 application tests, plus 10 focused signing/runtime-guard tests, TypeScript, lint (zero errors/41 existing warnings), Expo alignment and Doctor 21/21 passed. Android and iOS Hermes exports and Gradle createBundlePreviewJsAndAssets passed on Node 24.21.0. Mobile initial shared-cache EPERM was resolved by isolated TEMP/TMP without clearing another process's cache. Locked dependency engines accept 24.21.0; lockfiles/resolutions are unchanged. Graphify refresh passed with generated evidence preserved outside commits. Local dependency junctions reuse primary installations; GitHub clean-install acceptance is pending.


- [Harness refinement](tasks/harness-refinement.md): isolated docs/skills/checks; no product release.
- [Operational acceptance](tasks/operational-acceptance.md): preserved native/CI/device acceptance and protected operational state; read before live/device work.
- Prior detail: [preserved handoff](archive/2026-10-04/active-work.md) and [history](implementation-history.md).

- [Harness CI alignment](tasks/harness-ci.md): completed and published; full GitHub gates passed, docs-only closeout verification recorded by commit.

- [Runtime review](tasks/runtime-review.md): current module requirements and validated CI/native runtime policy.

- [Node 24 migration](tasks/node24-migration.md): current runtime update and fresh compatibility/build evidence.
