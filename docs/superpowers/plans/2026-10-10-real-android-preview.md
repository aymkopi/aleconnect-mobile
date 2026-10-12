# Real Android preview — 2026-10-10

Use the isolated PanelUI worktree. Preserve primary source, emulator queues, evidence and signing files.

1. Verify com.kapecakes.aleconnectmobile and the original Desktop preview certificate; reuse the matching Android keystore. Compare the existing Firebase Android client file and EAS project ID with the primary Mobile source. Reuse only the named public API environment setting in the build process. Never copy .env.local or embed server credentials.
2. Build a standalone release-runtime local preview with ARM64 phone libraries and x86_64 emulator libraries, existing package/signature and live notification configuration. EXPO_PUBLIC_PANELUI_PREVIEW must be explicitly0 for this artifact, so visual fixtures and paused production behavior are excluded. Keep the labelled emulator fixture build separately.
3. Diagnose current Android 15 ART transition crash on a separate clean Android 16 emulator using the already-installed image; preserve the existing emulator without wiping it. Check unchanged Edit Back, dirty discard and linking Back.
4. Verify signer, APK manifest, bundled ABIs, Firebase sender/app identifiers, Expo project configuration, HTTPS API and absence of preview fixtures. Copy APK to Desktop and verify its hash. Check installation/launch on the clean emulator without registering production push, logging in or replaying the existing queue.
5. Record phone/real-push and undeployed Staff API limits separately. This is local APK delivery; no EAS/store/OTA publication. User subsequently authorized the reviewed API Worker patch; deployment/rollback and live checks are in docs/panelui-api-alignment.md.

Completed: real v33 ARM64/x86_64 APK,54-library16KB alignment, exact signer/config/fresh-bundle/source verification and Desktop hash-copy check. Clean emulator real sign-in/live guest/detail/Back pass. Old emulator preserved. Dirty-discard and password-only linking native rechecks remain incomplete;11 navigation guard regressions pass.
