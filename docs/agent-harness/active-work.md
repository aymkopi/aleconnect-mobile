# Active work

Last reviewed: 2026-10-12
Current branch: codex/panelui-five-main; preparing PanelUI 2.0.0 integration into master.
Active plan: [PanelUI 2.0.0 integration](../panelui-major-migration.md).
Next task: finish source/review/CI gates, merge PR and promote the modernized tree to the canonical Mobile folder.
Known blockers: no harness blocker. Source cleanup/CI completed; native/device acceptance limits remain in the operational handoff.
Last verified: 59 harness/CI checks, 245 application tests, plus 10 focused signing/runtime-guard tests, TypeScript, lint (zero errors/41 existing warnings), Expo alignment and Doctor 21/21 passed. Android and iOS Hermes exports and Gradle createBundlePreviewJsAndAssets passed on Node 24.21.0. Mobile initial shared-cache EPERM was resolved by isolated TEMP/TMP without clearing another process's cache. Locked dependency engines accept 24.21.0; lockfiles/resolutions are unchanged. Graphify refresh passed with generated evidence preserved outside commits. Local dependency junctions reuse primary installations; Full GitHub CI 37206566499 passed clean installation and required application gates on the .node-version runtime.


- [Harness refinement](tasks/harness-refinement.md): isolated docs/skills/checks; no product release.
- [Operational acceptance](tasks/operational-acceptance.md): preserved native/CI/device acceptance and protected operational state; read before live/device work.
- Prior detail: [preserved handoff](archive/2026-10-04/active-work.md) and [history](implementation-history.md).

- [Harness CI alignment](tasks/harness-ci.md): completed and published; full GitHub gates passed, docs-only closeout verification recorded by commit.

- [Runtime review](tasks/runtime-review.md): current module requirements and validated CI/native runtime policy.

- [Node 24 migration](tasks/node24-migration.md): current runtime update and fresh compatibility/build evidence.

- [PanelUI mobile rebuild](tasks/mobile-panelui-rebuild.md): standalone live-API matching-signer v53 includes current report/Home/account-card fixes; ARM64/x86_64 build/signature/alignment,477 tests/TypeScript/Doctor and bounded native Guest acceptance pass. Staff PR37 integration complete; physical/private/provider acceptance, original Android15 ART and approved Terms/email gates remain open.

- [PanelUI0.109/Home/topic pass](../panelui-0109-facebook-topics.md): Figma/app fixed Home grids and Kpi complete; Staff topic migration/release and new native preview pending.

- [PanelUI 2.0.0 integration](../panelui-major-migration.md): detailed changelog, recent VS Code Home edits, deprecated presentation cleanup, source verification and safe local/remote integration.
