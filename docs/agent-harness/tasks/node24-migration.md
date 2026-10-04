# Node 24 migration

Owner: coordinated runtime migration.
Branch/base: codex/node24-runtime, integrated on master at d4b56df79d041101771d5d67291f852b9dbdc368.
Status: Node 24.21.0 selected, published and verified locally and in GitHub.

- Scope: .node-version, client Node 24 launch/preview wrappers and guards, current runtime/CI/README/worktree guidance. Dependency resolutions, API contracts and production signing policy are unchanged.
- Verification: 59 harness/CI checks, 245 application tests, plus 10 focused signing/runtime-guard tests, TypeScript, lint (zero errors/41 existing warnings), Expo alignment and Doctor 21/21 passed. Android and iOS Hermes exports and Gradle createBundlePreviewJsAndAssets passed on Node 24.21.0. Mobile initial shared-cache EPERM was resolved by isolated TEMP/TMP without clearing another process's cache. Locked dependency engines accept 24.21.0; lockfiles/resolutions are unchanged. Graphify refresh passed with generated evidence preserved outside commits. Local dependency junctions reuse primary installations; Full GitHub CI 37206566499 passed clean installation and required application gates on the .node-version runtime. [Full pipeline](https://github.com/aymkopi/aleconnect-mobile/actions/runs/37206566499). Hermes/Gradle bytecode hashes and logs are retained in external recovery evidence.
- Remaining risks: full APK/native compilation and installed-device/store acceptance were not repeated for this runtime-only change. Concurrent Windows bundles require isolated TEMP/TMP to avoid the observed shared-cache EPERM.
- Next: no remaining runtime implementation. Exact docs-only closeout checks and scoped worktree cleanup are recorded in external recovery evidence.
