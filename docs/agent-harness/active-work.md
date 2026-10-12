# Active work

Last reviewed: 2026-10-12
Current branch: codex/mobile-borderless-ui; canonical master retains merged PanelUI 2.0.0.
Active plan: [PanelUI 2.0.0 integration](../panelui-major-migration.md).
Next task: review/merge the separate border-free UI PR; physical/native-iOS/private/provider acceptance remains separate.
Known blockers: no source blocker. Staff PR40 is merged/deployed; native/private/provider acceptance remains separate. Windows holds the empty former aleconnect-panelui directory; it contains no project contents.
Last verified: 433/433 tests with zero skips, TypeScript, lint 0 errors/181 existing warnings, harness/whitespace and fixture-free web export pass. Figma active families and representative Light/Dark browser fixtures are verified. Independent source review has no blocker. Staff PR40 is deployed; GitHub v2.0.0-preview.1 APK digest/signature/alignment match. Physical/private/provider acceptance remains separate.


- [Harness refinement](tasks/harness-refinement.md): isolated docs/skills/checks; no product release.
- [Operational acceptance](tasks/operational-acceptance.md): preserved native/CI/device acceptance and protected operational state; read before live/device work.
- Prior detail: [preserved handoff](archive/2026-10-04/active-work.md) and [history](implementation-history.md).

- [Harness CI alignment](tasks/harness-ci.md): completed and published; full GitHub gates passed, docs-only closeout verification recorded by commit.

- [Runtime review](tasks/runtime-review.md): current module requirements and validated CI/native runtime policy.

- [Node 24 migration](tasks/node24-migration.md): current runtime update and fresh compatibility/build evidence.

- [PanelUI mobile rebuild](tasks/mobile-panelui-rebuild.md): standalone live-API matching-signer v53 includes current report/Home/account-card fixes; ARM64/x86_64 build/signature/alignment,477 tests/TypeScript/Doctor and bounded native Guest acceptance pass. Staff PR37 integration complete; physical/private/provider acceptance, original Android15 ART and approved Terms/email gates remain open.

- [PanelUI0.109/Home/topic pass](../panelui-0109-facebook-topics.md): Figma/app fixed Home grids and Kpi complete; Staff topic migration/release and new native preview pending.

- [PanelUI 2.0.0 integration](../panelui-major-migration.md): completed PR #3 major update and canonical folder promotion; detailed changelog, recent VS Code edits, safe recovery and remaining release limits.

- [Border-free UI and release](../borderless-ui-review.md): Figma-first semantic fills, independent source review, signed GitHub preview and deployed Staff PR40; UI PR remains separate.
