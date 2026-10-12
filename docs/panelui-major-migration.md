# PanelUI 2.0.0 repository integration

Requested: integrate the rebuilt app into local/remote aleconnect-mobile through a PR, preserve recent VS Code changes, remove deprecated presentation and replace the old local checkout with the modernized project at its canonical path.

## Tracker

| Gate | Status | Evidence |
|---|---|---|
| Source/Git recovery | Passed | Both source trees, patches, ignored-file inventories and all Git refs backed up; Git bundle verified before changes. |
| Recent VS Code edits | Passed | home-layout.ts and home-screen.tsx are the only source changes since the v53 build. Both are included without reverting the edits; exact hashes are checked before and after cutover. |
| Original local documentation | Passed | Original history additions retained; updated rebuild handoff supersedes the original planning-only task. Original copies remain recoverable. |
| Deprecated UI cleanup | Passed | Gluestack runtime/provider/primitives and temporary archived presentation removed. Old fonts removed only after checking active imports. Reusable PanelUI source retained. |
| Active tests | Passed | 431/431 current tests, zero skips, against canonical Staff source; mixed service guards and active flow tests retained. |
| Source/config/export verification | Passed | TypeScript/harness/whitespace pass; lint 0 errors/181 warnings; Expo alignment and Doctor 21/21 pass. Fixture-free Android/iOS Hermes and web exports pass. Graphify refreshed3853 nodes/7013 edges/291 communities; generated files are separately preserved. Both exact-head GitHub checks passed after a clean CI install. |
| Final review | Passed after fix | Read-only review verified identities, Home hashes, recovery and deprecated import removal. Missing upstream PanelUI MIT notice added and referenced. No remaining blocking source finding; native/private acceptance remains separate. |
| PR/remote master | Passed | [PR #3](https://github.com/aymkopi/aleconnect-mobile/pull/3) merged normally at ae90471440269f35b18a9261693822eb01ac8e8c after both exact-head checks passed at bc4464a. Detailed major-update commit 04854b1 remains in ancestry. |
| Local master/folder promotion | Passed | Canonical aleconnect-mobile now contains the modernized physical tree and full common .git on merged master. Recent Home hashes, all refs and nine stashes verified; old private/generated state preserved externally. Windows retains only the empty former aleconnect-panelui container. |

## Boundaries

Mobile remains a consumer of Staff-owned APIs. No Staff product change, database migration, live write, EAS/OTA/store publication, emulator reset or device-data deletion is part of this source integration.

The shared contract marker block is synchronized with the local authoritative Staff source. The additional reviewed companion contract is retained separately in the same document, with its pending release status explicit. Staff PR40 (fb25c8ca8a011c0dd4be1576cc60945b8c3e13f8) is still a separate server dependency for removing active-report profile edit locks, linked-account contact details and unread report IDs. Mobile retains optional-field/legacy compatibility and server capability guards. Existing reviewed API read-only evidence is historical; this migration does not claim new private API acceptance.

## Retired-test coverage

Archived Gluestack UI assertions are replaced by current PanelUI tests: auth-completion/auth-resume/auth-token-race; guest-access/guest-account-layout; panelui-scoped-read; navigation-interactions/navigation-report-flow; notifications-completion; panelui-advisory-children; panelui-hotlines/hotline-sheet; panelui-profile-children/panelui-profile-services; panelui-report-creation/panelui-report-location/panelui-report-browse-queue/panelui-report-detail/panelui-review-regressions. Existing executable tests of consumer parsing, offline caches, conditional report validation, status projection, upload concurrency, queue ownership and authentication remain.

Mixed source assertions now target the active Home/feed/detail/map/notification/report readers. Upload diagnostics and queue cache-before-removal guards are retained independently of the old UI. The removed assertion names and original test files are in the private local recovery snapshot.

## Folder cutover and recovery

The original aleconnect-mobile owned the common Git directory and the rebuilt aleconnect-panelui was linked to it. The full common repository was promoted before obsolete checkout contents were removed. The modernized physical tree is now the canonical `C:\Users\Justine\VSCodeProjects\aleconnect-mobile` repository on master; only one worktree remains registered. Windows directory locks required moving contents around the open container; the empty former aleconnect-panelui directory contains no source, Git metadata, dependencies or private state and can be removed after the holding application releases it. No environment file was copied into the new app or committed.

Recovery: `C:\Users\Justine\.codex\visualizations\2026\10\06\01a11159-52ae-76a2-8dfa-7672826bbaea\mobile-major-integration`. Git bundle/source ZIPs are verified. Old private environment/settings/native configuration are preserved locally during cutover, separately from committed source. Existing saved APKs and device work remain unchanged.

Normal merge preserves the major-update commit and detailed changelog. Before cleanup, verify the PR merge commit is on both local/remote master. Roll back product behavior through a reviewed revert; recover local files/history from the verified snapshots. A repository rollback does not automatically downgrade an installed app or migrate device data.

## Verification and acceptance

Integration verification is recorded below. Prior v53 native build/signature/provider configuration checks remain in the [preview handoff](panelui-device-preview.md). v53 is not a 2.0.0 binary and does not contain the latest Home edits. A physical phone, native iOS, provider delivery and authenticated profile/submission/unread round trips remain unverified for this integration.

Fresh verification on Node 24.21.0:431 tests passed with no skipped cases;56 deprecated archived UI assertions were retired or superseded by active-reader coverage. Source exports used EXPO_NO_DOTENV=1, EXPO_PUBLIC_PANELUI_PREVIEW=0 and the explicit live HTTPS API origin. Lint warnings remain visible; no unrelated compiler/provider rewrite was introduced. Both VS Code Home source hashes exactly match the pre-integration recovery snapshot.

Initial PR CI stopped on six Windows-only APK Markdown links in historical harness handoffs. Artifact paths are retained as local text references so Linux validation remains meaningful; no harness bypass was added.

Review correction: include upstream PanelUI MIT copyright/permission notice at src/components/panelui/LICENSE and reference its source/provenance. Refreshed Graphify files were ZIP/hash verified, then restored to the tracked baseline for a clean canonical source checkout; current generated analysis remains in external recovery.

## 2026-10-12 integration closeout

- PR #3 merged at ae90471440269f35b18a9261693822eb01ac8e8c. Required checks at bc4464a: [agent harness](https://github.com/aymkopi/aleconnect-mobile/actions/runs/38231185140) and [consumer Service Memo contracts](https://github.com/aymkopi/aleconnect-mobile/actions/runs/38231185047), both passed. Read-only final review approved source integration.
- Local master was fast-forwarded before promotion. Before/after Git ref and stash inventories match; both recent VS Code Home file hashes match the pre-integration snapshot byte for byte. Source recovery ZIPs and Git bundles, including every saved stash commit, remain external.
- Expo prebuild reused the retained Android project without cleaning or installing dependencies. Generated Android config is 2.0.0/code 54 with the same package, preview keystore hash, Google services and Expo project identity; package.json was unchanged. Source remained clean after prebuild.
- Old local environment, native/build, device/checkpoint and generated acceptance state were moved to original-local-state in the private recovery directory. Saved APKs, device data and unrelated Staff edits were not changed. The obsolete project contents are removed; only the empty former project directory is held by Windows.
- This is a source integration. No new 2.0.0 APK, install, provider delivery or private mutation acceptance is claimed; v53 remains the earlier artifact. Staff PR40 is a separate pending server release.

Canonical-path closeout recheck: 431/431 tests passed with zero skips; TypeScript, harness and whitespace passed after promotion and prebuild. The existing QA web preview was restored from canonical source at localhost:8096 (HTTP 200), with fixtures enabled and queue replay paused. This verifies server availability, not new visual/device acceptance.
