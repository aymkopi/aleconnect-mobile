# Android Alpha CI Release Plan

> Execute inline with executing-plans; one read-only release review at completion. No implementation agents.

Goal: validate, build and publish standalone Android alpha APKs for application updates on the default branch, and release the merged border-free source now.

Design: make the existing Agent Harness workflow reusable and retain PR/manual checks. A new Android Alpha Release workflow owns default-branch pushes, calls those same checks, skips docs-only builds, and exposes manual rebuild. Build/publish permissions exist only for a trusted default-branch job. Reuse copied Expo native plugins and the existing non-debuggable preview build; no private environment or credentials are uploaded. Expo's bundled preview key hash matches the installed certificate.

Version ruling: source baseline is 1.0.0-alpha.1/code55. CI alpha ordinal is its dedicated workflow run_number and Android code is54+ordinal; docs-only runs may leave gaps. Counters never decrease; reruns of the same workflow run do not replace published release assets. Keep old 2.0.0/code54 release as history. Production/store signing remains guarded separately.

Files: .github/workflows/agent-harness.yml (reusable checks/output), android-alpha-release.yml (trusted build/publish); scripts/android-alpha-release.mjs (version configuration and fixture proof), verify-android-release.py (manifest/signature/ZIP/ELF verification); tests/android-alpha-release.test.mjs and existing agent-harness assertions; app/package/lock version metadata; scoped handoff/history/README/changelog.

- [x] Tests first: monotonic codes, bad run numbers, counter limits, fixture-disabled bytecode and main-only/CI gate behavior; observe failure.
- [x] Add the minimal CI metadata and APK verifier, existing workflow reuse and trusted publish job. Assert original signer, non-debuggable identity/code/ABIs, 16KB ZIP/ELF, HTTPS API and compiled fixtures off. Generate SHA256SUMS and build metadata.
- [x] Validate tests/types/lint/harness/Expo Doctor/alignment and YAML; refresh Graphify separately; source review and green PR. Merge to activate the authorized pipeline.
- [x] Observe the actual GitHub build, repair only proven failures; publish verified draft+APK/checksum/metadata to prerelease, download/hash Desktop copy.
- [x] Record exact release/CI/source identities, native/private/provider limits, local/remote sync and safe task cleanup.

Constraints: retain package ID, signer, Firebase/Expo configuration, queues/device state and nine stashes. Node24.21 and JDK21. No dependency/server/schema/UI change. ARM64/x86_64 only. No EAS/OTA/store deployment. No .env.local copies. Current user authorizes automated GitHub APK publication and current release; all implementation is solo.

Ledger: source gates436/436, Python2/2, types, lint0 errors/181 retained warnings, harness/YAML/whitespace, Expo alignment/Doctor21/21 and source review pass. Initial ignored map-worker setup was repaired through existing sync:web-map. PR #5 is merged as 2d39979; release run38253889473 attempt2 passed and published alpha.1/code55. Attempt1 passed native verification but GitHub publication timed out before creating a draft. Docs-only run38254901886 passed validation and skipped its release job. Downloaded/GitHub/checksum/Desktop hashes match; task worktree and feature branches are removed without force. See the release handoff for exact source/hash/certificate and device/private/provider limits.
