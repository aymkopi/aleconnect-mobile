# Node 24 migration

Owner: coordinated runtime migration.
Branch/base: codex/node24-runtime from 8f067ba1e08262fc3515883f8a957dfc9e69f89d, targeting master.
Status: Node 24.21.0 local verification passed; publication and remote verification pending.

- Scope: runtime pin, client preview/start wrappers and guards, runtime documentation. Dependencies, API contracts and signing policy are unchanged.
- Verification: 59 harness/CI checks, 245 application tests, plus 10 focused signing/runtime-guard tests, TypeScript, lint (zero errors/41 existing warnings), Expo alignment and Doctor 21/21 passed. Android and iOS Hermes exports and Gradle createBundlePreviewJsAndAssets passed on Node 24.21.0. Mobile initial shared-cache EPERM was resolved by isolated TEMP/TMP without clearing another process's cache. Locked dependency engines accept 24.21.0; lockfiles/resolutions are unchanged. Graphify refresh passed with generated evidence preserved outside commits. Local dependency junctions reuse primary installations; GitHub clean-install acceptance is pending.
- Remaining risks: installed-device/store acceptance is separate; Windows build space is limited.
- Next: finish Node 24 checks, publish, confirm pipelines and clean up task worktrees.
