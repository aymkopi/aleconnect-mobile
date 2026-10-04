# Runtime policy reviewed against the module upgrade

Reviewed on 2026-10-04 after the published Expo 57 upgrades: consumer Mobile 2312009 and Lineman b79c3d1, followed by cleanup commits 54b7810 and 82df5a9. These changes are already present in current main/master; no newer remote module commit was found at review.

| Component | Locked version | Declared Node requirement |
| --- | --- | --- |
| Staff Vite | 8.0.16 | ^20.19.0 or >=22.12.0 |
| Client Expo | 57.0.26 | SDK 57 minimum 22.13.x |
| Client React Native | 0.86.3 | ^20.19.4 or ^22.13.0 or ^24.3.0 or >=25 |
| Client Metro | 0.84.6 | same as React Native |

The committed lockfiles are the local evidence. [Expo's SDK requirements](https://docs.expo.dev/versions/v57.0.0/) document SDK 57's minimum; [its SDK 57 build images](https://docs.expo.dev/build-reference/infrastructure/) also use Node 22.23.x. Upgrading modules to Expo 57 does not require Node 24.

The common supported LTS policy is ^22.13.0 or ^24.3.0, reflected in package engines and read-only harness diagnostics. This deliberately excludes too-old patches and non-LTS majors from the project's accepted runtime policy even where upstream engines are broader. Doctor checks tool presence and version policy; it does not prove dependency alignment or native bundling.

The selected runtime is Node 24.21.0 in .node-version. All GitHub setup-node steps read that file. [Node 24 is an LTS release](https://nodejs.org/en/about/previous-releases). The user's Node 24 migration supersedes the earlier Node 22 default; compatibility checks and build outcomes are recorded in [the migration task](tasks/node24-migration.md). Node 22.13+ remains dependency-compatible but is no longer the selected CI/native runtime.

Lineman start/Android/prebuild/preview wrappers select Node 24.21.0. Mobile's Windows preview guard requires Node 24; run it with the pinned version active on PATH so Expo and Gradle use the same runtime. Earlier Node 24 crash evidence came from an older dependency stack; fresh Node 24 bundling results take precedence. Do not infer installed-device or store acceptance from build/export checks.
