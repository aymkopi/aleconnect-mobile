# Active work

Last reviewed: 2026-10-12
Current branch: master; PR #5 alpha CI and the current border-free UI are merged locally/remotely.
Active plan: [Android alpha release](../android-alpha-releases.md); source integration complete, first native build in progress.
Next task: verify the first automatic native build/prerelease and its downloaded checksum; physical/private/provider/native-iOS acceptance remains separate.
Known blockers: no source/integration/cleanup blocker. Staff PR40 is deployed; physical/native-iOS/private/provider acceptance remains separate. The former empty aleconnect-panelui folder is removed.
Last verified: fresh pre-merge and merged-canonical runs pass 433/433 tests with zero skips; merged TypeScript/harness/whitespace and exact-head PR/merged-master GitHub CI pass. Prior UI lint had 0 errors/181 existing warnings and fixture-free web export passed. Figma active families and representative Light/Dark browser fixtures are verified. Independent source review has no blocker. Staff PR40 is deployed; GitHub v2.0.0-preview.1 APK digest/signature/alignment match. Physical/private/provider acceptance remains separate.


- [Harness refinement](tasks/harness-refinement.md): isolated docs/skills/checks; no product release.
- [Operational acceptance](tasks/operational-acceptance.md): preserved native/CI/device acceptance and protected operational state; read before live/device work.
- Prior detail: [preserved handoff](archive/2026-10-04/active-work.md) and [history](implementation-history.md).

- [Harness CI alignment](tasks/harness-ci.md): completed and published; full GitHub gates passed, docs-only closeout verification recorded by commit.

- [Runtime review](tasks/runtime-review.md): current module requirements and validated CI/native runtime policy.

- [Node 24 migration](tasks/node24-migration.md): current runtime update and fresh compatibility/build evidence.

- [PanelUI mobile rebuild](tasks/mobile-panelui-rebuild.md): standalone live-API matching-signer v53 includes current report/Home/account-card fixes; ARM64/x86_64 build/signature/alignment,477 tests/TypeScript/Doctor and bounded native Guest acceptance pass. Staff PR37 integration complete; physical/private/provider acceptance, original Android15 ART and approved Terms/email gates remain open.

- [PanelUI0.109/Home/topic pass](../panelui-0109-facebook-topics.md): Figma/app fixed Home grids and Kpi complete; Staff topic migration/release and new native preview pending.

- [PanelUI 2.0.0 integration](../panelui-major-migration.md): completed PR #3 major update and canonical folder promotion; detailed changelog, recent VS Code edits, safe recovery and remaining release limits.

- [Border-free UI and release](../borderless-ui-review.md): Figma-first semantic fills, independent source review, signed GitHub preview and deployed Staff PR40; PR #4 merged; local/remote master match and task worktree/local/remote feature branch are removed.

- [Android alpha releases](../android-alpha-releases.md): user-authorized default-branch CI build/prerelease, version policy and current release verification.
