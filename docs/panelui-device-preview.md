# Real Android preview — v53

[Install APK](C:/Users/Justine/Desktop/AleconnectApps/aleconnect-panelui-device-preview-v53.apk)

Standalone live-API embedded-Hermes preview: Android 7/API24+, ARM64 phones and x86_64 emulators; package com.kapecakes.aleconnectmobile, version1.0.0/code53, 104174877 bytes. Metro is not required. APK SHA256 6b43037b61d5ef0c44f421e47e0557e3c2a6b289b5dbbe47c014dc1082ff88fb. Retains local preview certificate SHA256 fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c. Android target36.32-bit ARM and Play Store signing remain unverified.

The fresh standalone bundle uses https://api.aleconnect.app with EXPO_NO_DOTENV=1 and EXPO_PUBLIC_PANELUI_PREVIEW=0. Hermes bytecode confirms fixtures/test-only UI are disabled. Firebase Android client values and Expo project ID match the previous Mobile app. POST_NOTIFICATIONS, Internet access, Expo notification services and all54 packaged ARM64/x86_64 native libraries pass validation, including16KB ELF load alignment. Expo alignment passes with the existing three deliberate exclusions; Doctor21/21, TypeScript and487/487 tests pass.25 read-only API boundary assertions and MapLibre style200 pass. No authentication, mutation, report submission, upload, emergency call or push send was attempted.

The matching-signer Desktop copy was SHA-256 verified. No physical Android phone was available. ADB enumeration briefly listed the Android emulator, but subsequent read-only device commands could not start the ADB server; v53 was not installed. Earlier QA/device state and v52 remain preserved. No .env.local, server secret or signing key was copied; no Git/store/EAS/OTA release.

Staff PR40 remains open. Its profile-edit, unread-report and Facebook-topic behavior still requires Staff integration/deployment before those new API-dependent behaviors are live. Evidence: C:/Users/Justine/.codex/visualizations/2026/10/06/01a11159-52ae-76a2-8dfa-7672826bbaea/outputs/redesign-04/native-implementation/device-preview-v53.

---

# Real Android preview — v52

[Install APK](C:/Users/Justine/Desktop/AleconnectApps/aleconnect-panelui-device-preview-v52.apk)

Standalone embedded-Hermes preview for ARM64 Android phones and x86_64 emulators, Android 7/API24 or later. Package com.kapecakes.aleconnectmobile, version 1.0.0/code52, 104,045,773 bytes. No Metro server is required. The original local preview signer is retained, allowing an in-place update of installations signed with the same certificate; Play Store signing identity remains unverified. 32-bit ARM is not included.

- APK SHA256: 0a17f8ca1a8442294c04ffec8056094ee6a13c839d99c92aa791306873586c0d
- Certificate SHA256: fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c
- All 54 ARM64/x86_64 native libraries and APK ZIP layout pass 16KB alignment checks. Minimum SDK24/target36, original package and notification services verified.

Built from the current PanelUI worktree on Node24.21.0/JDK21 with EXPO_NO_DOTENV=1, EXPO_PUBLIC_PANELUI_PREVIEW=0 and EXPO_PUBLIC_ALECONNECT_API_URL=https://api.aleconnect.app. Forced fresh createBundlePreviewJsAndAssets took 4m20s; assemblePreview took 3m36s. The embedded bundle has SHA256 031a75534f503793bc6748caab4055adc5e192a9196b65c6a2824e44154740de. All 417 recorded source/test/config fingerprints remain unchanged; Desktop/source APK hashes match. Only app.json and generated Android versionCode changed from51 to52 for this build; dependencies, backend, signing material and provider configuration were not changed.

This supersedes v51 for the latest inline report-type cards, explicit-only Reports refresh spinner, required Purok/Street/photo recovery, draft-preserving Terms/Privacy navigation, bounded PanelUI reporting-date range, theme-safe instant routing, plain ticket summary, readable toast text and regular-phone3x4 responsive Home. The one-third header and fixed publisher/CTA sizes can require a short Home scroll on regular phones; the native lower CTA is reachable and tapping Home restores the top.

## Fresh verification

477/477 Mobile tests and TypeScript pass against the merged Staff companion. Expo dependency alignment and Doctor21/21 pass with existing documented exclusions.25 read-only live API assertions pass for public guest feed/detail/cursor validation, anonymous session, hotlines and10 private401 boundaries. Map style returns200/version8 with sprite/glyph/source configuration. No authenticated mutation, upload, login, emergency call or push send was performed. Staff compatibility is already merged through PR37; no additional deployment or migration was needed.

Firebase Android client configuration matches the original Mobile configuration semantically; Expo/EAS project identity and preview-key file match. INTERNET/POST_NOTIFICATIONS and Expo/FCM services are packaged. No .env.local was copied and no signing material or server credential was changed.

Installed -r on preserved AleconnectPanelUIClean Android16/4KB control, without uninstalling or clearing data. Version52 and firstInstallTime2026-10-10 14:45:42 verified. Cold standalone launch, live Guest Home with12 shortcuts, public Hotlines/Advisories, attached Reports login gate, Keep browsing dismissal, real Sign In with no fixture launcher and return to Guest Home pass. Home lower CTA can scroll above the floating navigation. Final process12184 alive; crash buffer remains empty. Exact private-storage/queue digests were not reread from the normal APK. The original Android15 AVD/data, older versioned APKs and original Mobile documents remain preserved.

Remaining risks: no physical phone connected. Physical ARM/native runtime, real authentication/session renewal, report submission/evidence/offline replay, profile/linking writes, GPS/geocoder/camera, push delivery, native iOS and spoken accessibility remain unverified. The older Android15/16KB ART fault remains unresolved; alignment/control-emulator success does not establish a permanent crash fix. Approved production Terms/email ownership acceptance remains open. No store/EAS/OTA or Git publication.

Evidence: C:/Users/Justine/.codex/visualizations/2026/10/06/01a11159-52ae-76a2-8dfa-7672826bbaea/outputs/redesign-04/native-implementation/device-preview-v52.

## Preserved previous previews

# Real Android preview — v51

[Install APK](C:/Users/Justine/Desktop/AleconnectApps/aleconnect-panelui-device-preview-v51.apk)

Standalone embedded-Hermes preview for ARM64 Android phones and x86_64 emulators, Android7/API24 or later. 32-bit ARM is not included. No Metro server is required. Package com.kapecakes.aleconnectmobile, version1.0.0/code51, 104,006,797 bytes. The original local preview signer is retained; this can update an existing installation signed with that same certificate. Play Store signing identity is unverified.

- APK SHA256: e240345591ca41ab0e17d460645b255d4e54210a2a7e51e0916bc6aaf60225be
- Preview certificate SHA256: fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c
- Native architectures: arm64-v8a and x86_64; all54 native libraries and ZIP layout pass16KB alignment.

Built on selected Node24.21.0/JDK21 with EXPO_PUBLIC_PANELUI_PREVIEW=0, EXPO_PUBLIC_ALECONNECT_API_URL=https://api.aleconnect.app and EXPO_NO_DOTENV=1. The first assembly reused Gradle's old bundle and was rejected. Explicit createBundlePreviewJsAndAssets --rerun-tasks then assemblePreview produced the accepted final APK. Fresh bundle3m4s, final assemble1m20s. All376 source/test/config fingerprints remain unchanged; Desktop/source APK hashes match. Fixture launchers are absent from the rendered real app. Versioned v33–v50 artifacts remain preserved.

Inherited Firebase Android client configuration matches the primary Mobile file semantically; EAS project identity matches. Network and notification permissions plus Expo/FCM services are packaged. No .env.local was copied, no server secret or service-account credential was embedded, and no signing material was changed. Physical push delivery remains unverified.

## API compatibility and source checks

Mobile473/473 tests pass against the newly reconciled Staff companion; TypeScript passes. Expo dependency alignment and Doctor21/21 pass with existing documented exclusions. Existing shared PanelUI defaults remain detached=false. No screen/component/API-reader dependency change was required for this build.

Safe live checks initially found404 on guest feeds. The previously approved additive guest/report-sort/password-verified-profile patch was reapplied cleanly onto current remote main6fb7d0c990b06215f640f375f9b4e44a5081213b in the attached panelui-device-api worktree, retaining new Staff/Facebook/advisory-topic behavior. Staff79 focused tests, TypeScript/Vite build, scoped lint, Worker/Vite route audit21 paths, read-only production schema/index inspection, harness and independent review pass. No migration or configuration/secret/binding change.

API Worker 739692f3-129c-4859-b319-53e040e9c401 (number342), deployment 3499cfcc-395d-44ea-807f-152ef9a6cb73, verified100%. All21 bindings match the rollback baseline a71b12d8-3dc4-430f-b303-2297262f7843. Post-release25 read-only assertions pass for guest lists/detail/cursor/validation, anonymous session, public hotlines and10 private401 boundaries. MapLibre style endpoint200 with version8, sprite and glyph configuration. No authenticated mutation or push send was performed. Source remains uncommitted/unmerged; the next Staff release must integrate this reviewed patch to retain these routes. [API task](C:/Users/Justine/.codex/worktrees/panelui-device-api/aleconnect/docs/agent-harness/tasks/consumer-mobile-preview-api-v51.md).

## Installed acceptance and limits

Installed -r on preserved AleconnectPanelUIClean Android16/4KB control. Cold launch succeeds; version51 and firstInstallTime2026-10-10 14:45:42 retained. Live Guest Home/Hotlines/Advisories/advisory detail and real Sign In render; Reports opens the attached Log in to use this feature sheet and Keep browsing dismisses it. No fixture launcher/label, no new crash entry, process10086 alive at final capture. Before installation, read-only retention digest2bc3e460444cb3cd069fb15fbd993d6a, queueCount0 and evidence[] observed. Normal APK does not expose the fixture-only retention tool; post-install exact private-storage digest was not read. No uninstall/data clear/seed/call/report submission/login was performed. Primary Mobile documents and Staff/Lineman source are preserved; original Android15 AVD stays stopped with its data.

No physical phone was connected. Physical ARM/native runtime, real sign-in/session renewal, report submission/evidence upload/offline replay, profile/linking writes, GPS/geocoder/camera, push delivery and native iOS remain unverified. Existing Android15/16KB ART crash remains unresolved; alignment and bounded control-emulator success are not a permanent crash fix. Production Terms/email ownership acceptance remain their existing gates. No store/EAS/OTA or Git publication.

External evidence: C:/Users/Justine/.codex/visualizations/2026/10/06/01a11159-52ae-76a2-8dfa-7672826bbaea/outputs/redesign-04/native-implementation/device-preview-v51.

## Preserved earlier device preview

# Real Android device preview — v33

[Download APK](C:/Users/Justine/Desktop/AleconnectApps/aleconnect-panelui-device-preview-v33.apk)

Standalone embedded-Hermes preview for ARM64 Android phones and x86_64 emulators, Android 7/API24 or newer. 32-bit ARM is not included. No Metro server is required. Package com.kapecakes.aleconnectmobile, version1.0.0/code33, 103,951,961 bytes. This uses the original local preview signing certificate, allowing a normal in-place update of that matching app. Play Store signing identity has not been established.

SHA256: 23390500E0C6E694C5A3D134F56CBE5B946CF7656026EE6EF5D02301481F26DB

Certificate SHA256: fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c

The build consumes the existing public HTTPS origin https://api.aleconnect.app, Firebase Android client configuration and Expo project identity. Notification permission and FCM services/receiver are packaged. No database, R2 signing, server credentials, Expo access token or service-account secret is embedded. Real phone push delivery still requires acceptance.

EXPO_PUBLIC_PANELUI_PREVIEW=0 excludes fixtures and production-write pauses. The first cached v33 assembly was rejected because it reused the labelled fixture bundle. A forced fresh createBundlePreviewJsAndAssets run followed by assemblePreview produced this accepted hash. Installation on AleconnectPanelUIClean Android16/API36.1 showed real sign-in and no fixture launcher. All239 application fingerprints match the built source. All54 native libraries and APK ZIP entries pass16KB alignment checks.

The prior labelled x86-only fixture artifact v32 remains separate for synthetic review. The older Android15/16KB emulator retains its saved queue/evidence and is stopped without wiping. An ART screen-transition SIGSEGV was reproduced there; a clean Android16 unchanged-edit Back check passed, but that does not establish a native crash fix. Physical Android/native iOS, real login/profile writes, queue replay/uploads and push delivery remain unverified.

API rollout and exact version evidence: [API alignment](panelui-api-alignment.md). Source remains in the approved local worktrees; no store/EAS/OTA release or Git publication was performed.

## 2026-10-11 — Staff compatibility merged and production verified

Staff PR37 is merged as04dceb8b0b50be303dc87595d138100a9fcc7488; [production pipeline](https://github.com/aymkopi/Aleconnect/actions/runs/38152350835) and all exact-head checks pass. API Workerab3eea9f-0447-474c-8d4d-d5fe2b23dd33 (345) is verified at100%; all21 binding definitions and runtime settings match the compatible342 checkpoint. Pagesaced1a0a reports main source04dceb8. No migration, secret/configuration change or production mutation was needed.

Fresh checks: Mobile473/473 against this Staff companion;113 focused API/deployment tests,7 typed auth behaviors, Staff build/lint/harness,21 reader routes, schema/index/EXPLAIN and independent review pass.35 post-release read-only checks cover Mobile guest/detail/cursor/private boundaries plus Staff HTML/entry asset, anonymous sessions and protected Staff/field APIs. The broader Staff suite has1,435 passes,7 unrelated assertions reproduced on untouched remote main and2 existing skips. Backend-main integration is complete; earlier uncommitted/unmerged warnings in this document are superseded by this release record.

The existing fixture-free v51 APK already uses https://api.aleconnect.app; no Mobile source/native rebuild, data clear, login, report/profile mutation, provider upload or push send occurred in this integration. Physical/authenticated/provider/native acceptance remains the device handoff's separate gate. [Authoritative Staff task](https://github.com/aymkopi/Aleconnect/blob/main/docs/agent-harness/tasks/consumer-mobile-preview-api-v51.md) retains rollback and release evidence.

Final live checkpoint after documentation closeout cc3cf66: Cloudflare's Git integration publishes the same application code as API Worker09b5513b-fe97-47b2-a39e-377a78658936 (346), deployment101d9ef7-038b-4ea9-b24f-8e2f71cad8ac at100%.21 binding definitions/runtime settings still match the342 rollback checkpoint; all35 read-only Staff/field/Mobile probes pass again. All closeout checks pass; production Staff entry assets8/8 match immutable Pagesaced1a0a. Earlier345 identifiers above describe the successful product CI deployment checkpoint. External final verification is retained with the release evidence. Mobile harness passes with the explicit deployed Staff sibling; its default primary-Staff mismatch remains because unrelated unpublished primary main was intentionally preserved.
