# Active work

Last reviewed: 2026-10-12
Current branch: master; PanelUI 2.0.0 major integration merged through PR #3.
Active plan: [PanelUI 2.0.0 integration](../panelui-major-migration.md).
Next task: complete separate Staff PR40/native/private acceptance gates; source integration and canonical folder promotion are complete.
Known blockers: no source/harness blocker. Staff PR40 and native/private/provider acceptance remain separate. Windows holds the empty former aleconnect-panelui directory; it contains no project contents.
Last verified: 431/431 active tests with zero skips, TypeScript, lint 0 errors/181 retained warnings, harness/whitespace, Expo alignment and Doctor 21/21; fixture-free Android/iOS Hermes and web exports passed on Node 24.21.0. Both exact-head PR checks passed. PR #3 merge ae90471440269f35b18a9261693822eb01ac8e8c is on local/remote master. Canonical physical source promotion retains the full common Git repository, nine stashes, signer/provider configuration and byte-identical recent VS Code Home edits. Android prebuild now uses 2.0.0/code 54 without a dependency change. Old acceptance detail remains in its task handoff.


- [Harness refinement](tasks/harness-refinement.md): isolated docs/skills/checks; no product release.
- [Operational acceptance](tasks/operational-acceptance.md): preserved native/CI/device acceptance and protected operational state; read before live/device work.
- Prior detail: [preserved handoff](archive/2026-10-04/active-work.md) and [history](implementation-history.md).

- [Harness CI alignment](tasks/harness-ci.md): completed and published; full GitHub gates passed, docs-only closeout verification recorded by commit.

- [Runtime review](tasks/runtime-review.md): current module requirements and validated CI/native runtime policy.

- [Node 24 migration](tasks/node24-migration.md): current runtime update and fresh compatibility/build evidence.

- [PanelUI mobile rebuild](tasks/mobile-panelui-rebuild.md): standalone live-API matching-signer v53 includes current report/Home/account-card fixes; ARM64/x86_64 build/signature/alignment,477 tests/TypeScript/Doctor and bounded native Guest acceptance pass. Staff PR37 integration complete; physical/private/provider acceptance, original Android15 ART and approved Terms/email gates remain open.

- [PanelUI0.109/Home/topic pass](../panelui-0109-facebook-topics.md): Figma/app fixed Home grids and Kpi complete; Staff topic migration/release and new native preview pending.

- [PanelUI 2.0.0 integration](../panelui-major-migration.md): completed PR #3 major update and canonical folder promotion; detailed changelog, recent VS Code edits, safe recovery and remaining release limits.
