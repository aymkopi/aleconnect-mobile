# Operational acceptance handoff

Owner: existing native/operations tasks; preserved by harness finalization.
Status: cleanup integration and source CI completed according to the current primary handoff. Browser/device and native iOS limits remain separate.
Branch/base: primary 23c5be104b4ce6e0c596df5ba97c51fdbc54c660 captured before harness integration.
Reviewed: 2026-10-04. Existing acceptance evidence was preserved, not rerun by this harness task.

Current source and release evidence: [pre-integration handoff](../archive/2026-10-04/pre-integration/docs/agent-harness/active-work.md) and [pre-integration history](../archive/2026-10-04/pre-integration/docs/agent-harness/implementation-history.md). These supersede older source integration or CI pending states.

Preserve existing saved device work, signing material, recovery branches/stashes and protected weekly QA records. Build/CI/source acceptance does not prove native iOS, retained-data, cold-process/background or provider acceptance.

## Earlier operational checkpoints

The following prior facts are dated; pending integration/CI statements below may be superseded by the current source handoff above.

## Current source and remaining acceptance

- Expo 57 source `2312009` was merged into `master` and pushed; `3001d63` records successful GitHub run `37187330785`. Read installed versions from package/lockfiles before applying framework guidance.
- Recorded release-tree checks: 215 tests, TypeScript, harness, Expo alignment/Doctor 21/21, zero peer problems, Android prebuild and Android/iOS JS/Hermes exports. Lint had zero errors/44 existing warnings.
- Android preview compilation, signature, ABIs, static font/bundle, original preview-key retention and SHA-256 were verified. Physical-device discovery was unresponsive, so this does not establish native runtime acceptance.
- Native iOS was not built on Windows. EAS/OTA/store publication remains outside that source integration.
- Preserve ignored SDK/native checkpoints, signing keys, generated Graphify outputs and recovery stashes. Never uninstall/reset to resolve a signing mismatch without a device-data decision.

Public Updates and the current consumer status/cache contracts are established. Staff owns backend changes and deploys compatible contracts first. Older “online contract release pending” notes are historical; source/device evidence must still be verified for the task at hand.

Detailed prior evidence: [captured handoff](../archive/2026-10-04/active-work.md) and [history](../implementation-history.md).
