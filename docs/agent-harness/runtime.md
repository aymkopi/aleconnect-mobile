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

.node-version is the single CI pin: 22.23.2, the runtime that passed the current full GitHub pipelines, application checks and existing Windows Android previews. setup-node reads that file. Node 24.3+ is dependency-compatible and may be used for supported source/tooling work; changing the default requires its own full verification and native bundling acceptance. Earlier Node 24 crash evidence concerned an older dependency state and is not proof that Expo 57 is incompatible.

Existing Android preview/start wrappers retain Node 22.23.2 where explicitly pinned. This review updates the harness and engines, not Android/Gradle signing or preview behavior. A future CI-pin change must review those wrappers as well. Match the current package/lockfile and runtime policy after each module upgrade instead of assuming a major version from old handoffs.
