# Sign-in refinement — 2026-10-11

## Scope

Figma was updated before the app. Removed the appbar from all 19 current Sign In frames, including photo, Dark/fallback, guest and session-recovery variants. Onboarding and separate sign-in-help/password-setup screens were not changed.

The user requested a centered composition. After the follow-up review, **Forgot password?** is centered directly below Password in all ten photo sign-in variants and the app. It retains a 44px minimum touch target and its existing recovery route.

Photo sign-in keeps the Mayon poster and existing dark overlay. No new video, blur dependency, authentication service or endpoint was introduced. The form uses 16px side padding, a 440px maximum content width, 24px between major groups, 12px between fields/actions and 6px from label to input. Inter remains the form font; Jakarta remains the display face.

Fields keep the balanced PanelUI 48px prefix/suffix slots and 18px Lucide icons. Glass outlines are softened to white at 24% opacity and 0.75px width; field radius is 12px and action radius is 16px. Credential and alternate buttons retain 48px minimum height. Keyboard/short/enlarged layouts scroll without indicators.

Session-ended/resume screens use the semantic Light/Dark palette and centered content without an appbar. Only one recovery-help action is shown. Visible Back to browsing / Use another sign-in method actions call the existing guarded leave behavior. Principal checks, confirmed-session redirects, mode switching, credential clearing, guest access and queue ownership remain unchanged.

## Figma references

File: [Aleconnect-mobile](https://www.figma.com/design/6uIaVRM63oHA723WKgjo5k/Aleconnect-mobile?node-id=443-5328).

- Photo variants: 443:5328, 443:5378, 443:5428, 490:6109, 490:6211, 490:6313, 490:6415, 493:12484, 555:12987 and 581:13549.
- Neutral/auth-recovery variants: 179:3071, 179:3189, 540:9342, 540:9392, 540:9547, 540:9590, 540:9626, 540:9664 and 540:9699.
- Final Figma query found no appbar in these frames. Each photo recovery action is centered in its 370px parent: 180px button at x95.
- Final normal-photo and report-resume renders were inspected. Library masters and onboarding were preserved.

## Verification

- Full Mobile suite: 469/469 passed against the reviewed Staff companion before the final alignment-only correction.
- Final focused auth/completion/status-bar suite: 25/25 passed, including centered recovery-action, header removal, method changes, principal/race behavior and field decoration.
- Final TypeScript passed. Scoped lint: zero errors, one pre-existing principal-ref-during-render warning.
- Independent read-only review found no introduced auth/navigation regressions; native inspection remained the main outstanding acceptance at review time.
- Final Hermes bundle and signed Gradle preview assembly: passed for the final x86_64 preview. The initial all-ABI attempt hit a Windows reanimated Ninja manifest error; the emulator-only retry passed without removing caches. ARM assembly remains unverified.
- Graphify refresh passed (4,440 nodes / 8,331 edges / 381 communities); final alignment change did not alter graph topology. Generated outputs saved separately.
- Harness/whitespace: Final results recorded in the task/history closeout after validating this handoff..

Native Android15/API35 checks covered settled Account/email sign-in, centered recovery action, balanced icons, Forgot password -> Sign-in help -> Back, cleared sample input after changing methods, keyboard access and lower-action scrolling, Dark mode at 130% text, session-recovery method choice/form/back navigation, and guest navigation to public Home. No authentication or business submission was sent. The final recovery button center is x540 on a 1080px screen; the empty final screen has no Back appbar.

Light OS appearance, font scale1.0 and the original keyboard setting were restored; the empty normal sign-in screen is left open. Public Home still returned its existing updates-reader failure/retry state, which remains part of the backend reconciliation gate. An initial automation launch landed at the launcher; the bounded crash log did not identify an ALEConnect failure, and direct verified aleconnectmobile deep links rendered correctly. These checks do not resolve the prior native stability gate.

## Preview and preservation

Final artifact: Desktop/AleconnectApps/aleconnect-panelui-sign-in-fixture-v46.apk.

- Version code46; 68,782,713 bytes; labelled x86_64 emulator fixture preview.
- SHA256: c2475a3415a653c73e8aa6c3635388cc213db7d132a1c9a9c765ae950f774a57.
- Original package com.kapecakes.aleconnectmobile, Expo identity, HTTPS API origin and embedded bundle verified.
- Matching original preview certificate SHA256: fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c.
- Installed -r without uninstall/data clear; first-install timestamp 2026-10-09 03:36:24 retained. Previous APKs remain available.

Read-only before/after aggregate queue/completion and evidence digests match exactly: one queued item and its 68-byte evidence file remain. All four built source/test/config hashes match, and the original Mobile checkout's six task-document hashes remain unchanged. Staff/Lineman primary checkouts are untouched. Unrelated dirty migration work and generated graph evidence were preserved.

Evidence is in outputs/redesign-04/native-implementation/sign-in-refinement in this chat's visualization workspace. Logs include final focused checks, TypeScript/lint, Figma changes, build, screenshots, aggregate retention and source hashes.

## Remaining risks and next steps

This is an emulator UI preview, not production acceptance. Current Staff/shared-contract/public-reader reconciliation and the previously recorded native stability issue remain open release gates. Live authenticated sign-in/provider/upload/push/replay, physical Android/ARM, native iOS and spoken accessibility were not verified by this presentation change. Preview background/replay/push writes remain paused.

Review the signed preview and use the existing backend/native release handoffs for broader acceptance. No dependency/API change, live business write, queue action, call, uninstall/data clear, commit, push, deployment or publication occurred. Onboarding remains excluded.
