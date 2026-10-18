# iOS alpha version alignment

## Scope

Correct the Mobile release version applied to unsigned iPhone IPAs and the About
label. Keep one allocation for the parallel Android/iOS builds, existing alpha
policy, package identities, Android signer and local Apple signing. No API,
database, dependency or installed-device changes.

The user's installed `Aleconnect-ios-build25-df8a225` predates PR #15. Exact
published build 27 / `dc6ed48b` contains the approved profile verification/editor
changes, while build 25 does not. Both binaries report native `1.0.0`: the old
iOS job stripped the unchanged source version instead of using Android's
allocated alpha. No OTA updater is configured; an older IPA cannot acquire this
new code automatically.

- [x] Compare the exact build 25 and 27 metadata and compiled bundles.
- [x] Add red/green regressions for native configuration, publication and retries.
- [x] Share allocated version/build context before the parallel native jobs.
- [x] Retain the full alpha in the app label; validate native core/build on upload.
- [x] Verify configuration, production iOS export, source checks and review.
- [x] Publish [Mobile PR #20](https://github.com/aymkopi/aleconnect-mobile/pull/20).
- [x] Verify exact application-head and final PR-head CI (`4024c525`, `bd7a6730`).
- [x] Merge the user-authorized PR as `ff011146` and fast-forward clean local master.
- [x] Allocate `1.3.1-alpha.1` / code `72` once for both native jobs.
- [x] Verify newly published IPA/APK versions, digests and original Android signer.
- [x] Copy the new IPA to Desktop and verify existing IPA files are unchanged.

The user explicitly authorizes merge/publication and the Desktop IPA copy on
2026-10-19. Automatic combined release workflow `39148140791` owns both builds;
do not dispatch a duplicate release. Device installation/signing is outside this
request and remains separate from artifact acceptance.

## Implementation

The readonly version job allocates once; Android and iOS consume the same
attempt-qualified context artifact. iOS uses the numeric SemVer core for
`CFBundleShortVersionString`, the allocated Android code for `CFBundleVersion`
and `extra.releaseVersion` for the full in-app alpha label. Standalone iOS builds
require explicit alpha/build inputs. Signing and provider behavior are unchanged.

Whole-workflow concurrency prevents duplicate allocations while a native build
is pending. An already published Android source with no IPA assets can resume
iOS using that same version/build; complete releases skip. Partial published IPA
assets require retrying the original failed publisher with its retained artifact,
not rebuilding different bytes. Reusable outputs retain attempt-qualified
artifact names; publication requires successful allocation/iOS and successful or
intentionally skipped Android. Existing immutable digest/source guards remain.

## Verification

- 24 focused release/config/workflow regressions pass. Full suite: 552 total,
  551 passed, zero failed, one existing isolated-sibling skip. TypeScript and
  scoped ESLint pass with zero errors/warnings. Readonly independent review has
  no remaining actionable findings and independently passes the 24 regressions.
- Actual Expo native introspection with test inputs produces native `1.3.1`,
  build `72`, full label `1.3.1-alpha.1`. These are validation inputs, not a newly
  published release. The production iOS/Hermes export succeeds; live API origin
  and compiled fixture-off runtime verify. Source `app.json` is restored
  byte-for-byte after validation.
- YAML/reusable-input and embedded Python syntax checks pass. Harness,
  whitespace, Graphify and exact-head PR outcomes are recorded in history.
- Both GitHub checks pass for application head `4024c525`: harness/application
  validation run `39147111712` and Service Memo compatibility run `39147111713`.
  Documentation-only closeout follows without changing the tested app/workflows.
- User-authorized PR #20 merges as `ff011146f29440ba14e568d385476a90edd040bb`
  with the exact reviewed tree. Fresh premerge tests pass: 551/552, zero failed,
  one existing skip. A sandbox-only Git-fixture write restriction disappears in
  the authorized unsandboxed rerun; no source/test workaround is added.
- Release workflow `39148140791` succeeds across all five jobs and publishes
  [1.3.1-alpha.1](https://github.com/aymkopi/aleconnect-mobile/releases/tag/v1.3.1-alpha.1).
  The tag and both native metadata sources match the merge; all six downloaded
  asset digests match GitHub. Android manifest version `1.3.1-alpha.1` / code `72`,
  original certificate/package, standalone HTTPS API/fixture-off runtime and all
  54 libraries' ZIP/ELF 16 KB alignment verify independently.
- The published IPA's actual Info.plist reads native `1.3.1` / build `72`.
  Its embedded `EXConstants.bundle/app.config` contains full alpha
  `1.3.1-alpha.1`; the About reader and updated profile flow are in its bundle.
  Physical ARM64 Mach-O, archive integrity, permissions and fixture-off API
  runtime pass. Published IPA bytes match the successful iOS Actions artifact.
- Current APK SHA256:
  `e079cc64042b3d0d8a53476119a80bedc390597ce950c02209f96d5a4b05f9af`.
  Current IPA SHA256:
  `da1e9db1307ac0458314fa713a8f2a29c0c6da311ff3f56ba9475f2c686290c3`.
  The new Desktop copy is
  `C:/Users/Justine/Desktop/AleconnectApps/ipa/Aleconnect-ios-1.3.1-alpha.1-build72.ipa`;
  its hash matches, and all five pre-existing IPA files retain their recorded
  hashes. No generic filename or prior signed/unsigned artifact is overwritten.
- Expo alignment and full unmasked Doctor have a baseline failure: 20/21 Doctor
  checks pass; six existing Expo patch recommendations remain in the unchanged
  dependency files. Do not hide or broaden this release fix to upgrade them.
- Build 25 IPA SHA256:
  `8ad53a068544bb3cefd5dd5b6054edf668e968874a59064528367251bb7120eb`.
  Exact published build 27 IPA SHA256:
  `5ed1e711e4f6be00f87b6e99d9d147b9181d1b8c775140d29c644492e82b352b`.
  Their compiled bundles differ; only 27 contains the new profile-flow markers.
  The verified new copy is
  `C:/Users/Justine/Desktop/AleconnectApps/ipa/Aleconnect-ios-build27-dc6ed48.ipa`.
  Existing IPA copies were preserved.
- External evidence: `ios-version-fix-20261019` and
  `account-link-confirmation-20261018/release/ios-build25-vs27.json` under this
  chat's `C:/Users/Justine/.codex/visualizations/2026/10/06/01a11159-52ae-76a2-8dfa-7672826bbaea`.

## Remaining risks

Old published binaries remain immutable: build 27 keeps its old native label;
use the new alpha for the corrected label. New native compilation, happy-path
combined publication and downloaded-binary versions are verified. Forced failed-job
recovery has unit/source review coverage but was not induced in production.
iPhone installation, Apple signing and provider acceptance remain separate.
Manual work, SideStore, pairing, signing, old binaries and device data are
untouched. Six existing dependency patch recommendations remain separate.

## Next

Requested merge/publication/version verification and Desktop delivery are complete.
Finish docs-only closeout and synchronize clean master without creating another
alpha. No Staff deployment or migration is required. Installed-iPhone acceptance
can use the verified new IPA through the user's existing local signing process;
no device installation or signing is part of this request.
