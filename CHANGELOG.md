# Changelog

## Unreleased

### Security

- Add current email-password confirmation before unlinking; share the existing linking verification gate while keeping purpose-specific server proofs. Preserve the service-account password, owned replacement-default selection and last-account safeguard. Protect newer sessions from delayed unlink cleanup and show committed link success even after local verification expiry.

- Add current sign-in password verification before linking another ALECO account, with server-enforced cooldown and five-minute expiry. Keep target service-account credentials and Staff review separate, clear secrets on leave, and preserve account number/name when verification expires. Requires the paired Staff endpoint/guard before release; no dependency, native or signing change.

## 1.2.0-alpha.1 - 2026-10-17

### Changed

- Move Reports account and period controls into one Filters sheet with staged Apply/Reset, content replacement and Back; retain bounded custom ranges, loaded-data KPI scope and existing report actions.
- Align unread ticket cards with notifications using one tint and unread dot, without a separate banner. Show the current status's latest history date; label old-payload fallbacks honestly.
- Replace repetitive contact-type text with accessible Lucide prefixes while retaining carrier/department labels and Call/Copy/website actions.
- Put Account's profile entry in a distinct card with raw account number/email. Remove its redundant service-account feature card and simplify Account information while preserving secure edits, photo and default-account actions.
- Simplify area summaries, Alerts and Advisories/detail using existing PanelUI, theme surfaces and accessible touch targets.

### Fixed

- Clear cached status dates on accepted push updates, including same-status cycles, so a later return to a status cannot display an older transition date.

### Compatibility

- Requires backward-compatible Staff PR50 for exact status-history dates. No database migration, new dependency, credential or signing change; older responses/caches remain supported.

### Verification and release

- PR14 merges asf4130b9a after Staff1.1.1-alpha.1 deployment/source/asset/access verification. Android workflow39029160520 publishes1.2.0-alpha.1/code68; tag/source and all three downloaded asset digests match.
- Retained signer/package, non-debuggable live-API/fixture-off Hermes runtime and all54-library ZIP/ELF16KB checks pass. APK SHA256:30431a735f39ff15d51f5d3d2160e05e1542ee10da7e6b6f9abba2045cf3fefc. Desktop copy matches.
- Exact APK updates tablet25040RP0AG in place, retains its first-install date and guest state, and passes three cold launches plus Home/Reports gate/Hotlines/category sheet/Account/Advisories/detail rendering. No app crash or React runtime error appears during the bounded checks.
- Source:503 tests pass/0 fail/1 expected sibling skip; TypeScript, scoped lint and harness pass. Browser covers Light/Dark phone/tablet layouts and staged filter flow. Doctor20/21 flags six available Expo patches in the unchanged lockfile; private mutations, push/provider, large-text/TalkBack and iOS acceptance remain separate.


## 1.1.0-alpha.1 - 2026-10-16

### Added

- Hotlines and Notifications pull-to-refresh with shared per-resource/consumer manual refresh budgets, minimum intervals and in-flight protection.
- PanelUI FileUpload photo grids for report evidence and camera-badge profile controls, retaining existing compression, account scoping, explicit Save and durable submission paths.
- Draggable active navbar pill and relative swipe selection with interruption, cancellation, guest gates and reduced-motion handling.

### Changed

- Use copied PanelUI0.112.0 source with provenance records; requested0.122.0 is unavailable. Display historical account approvals separately from current linked-account access.

### Verification

- PR13/source0639fa8 passes merged CI; workflow38892362976 publishes code67. Exact asset/source/tag, retained signer/package/manifest/Hermes/fixture-off and54-library ZIP/ELF16KB checks pass.
- October17 phone25069PTEBG retains its session, passes three cold launches and renders all five main pages. Navbar drag works in both directions. Desktop APK hash matches the published artifact; device data/queues are retained.
- Camera/library/crop, private provider uploads, refresh edge cases, accessibility and iOS remain separate acceptance.

## 1.0.1-alpha.1 - 2026-10-16

### Changed

- Select alpha release versions from Conventional Commit patch/minor/major impact with manual overrides. Advance Android codes independently from published metadata and synchronize manifest root versions during builds.
- Continue from published alpha.10/code 64; retain package/signing/provider identities and the verified standalone APK pipeline.

### Fixed

- Remove workflow-run numbering, so documentation/review runs no longer consume release versions. Skip duplicate/stale sources and verify every uploaded artifact digest before publication.
- Retry a newly-created draft briefly missing from GitHub's release listing, retaining source, digest and immutable-release guards.

### Validation and release

- PRs #11/#12 and exact-head checks pass. Workflow 38783769904 publishes source f4af0a20 as Android code 65. All three downloaded asset digests and tag/source checks pass, as do the retained signer, fixture-disabled standalone HTTPS runtime and all 54 native-library ZIP/ELF 16 KB checks.
- This exact APK updates in place and passes three cold launches on 25069PTEBG with the consumer session retained and Home rendered. Hash-verified Desktop copy is available. Private mutations, provider/push/background and native-iOS/store acceptance remain separate.
- No API or database migration; application behavior and dependency resolutions are unchanged by this release.

## 1.0.0-alpha.10 — 2026-10-14

### Added

- Numeric unread badges on main-page notification buttons, with 99+ display and full accessible counts.
- Security settings and a two-step password flow with live validation, show/hide controls, cooldown/expiry/network recovery, guarded cancellation, and a completion screen.

### Changed

- Move one continuous navigation pill with Reanimated springs, subtle stretch/contract, interrupted-switch support, reduced motion, and icon/label transitions. Page routing remains instant and tab geometry stays the same.
- State that Reports KPI counts describe fetched reports for the selected period/filters. Replace dotted metadata concatenation with labels, separate text levels, and ordinary address/date punctuation.
- Include the current manual Home, notifications, Account, Alerts, report-list/status, radial-gradient, and map edits. Preserve minimum map zoom 9, the visible address during resolution, a separate theme heading, and 48px adaptive Home icons.
- Align Light/Dark Figma password flows, bell badges, and KPI scope with the app; retain #00060F as the Dark page background.

### Updated

- Align five direct Expo 57 patches: Expo 57.0.28, Dev Client 57.0.20, Location 57.0.21, Router 57.0.26, and Splash Screen 57.0.10, with their resolved dependencies. Retain native animation/keyboard pins.

### Fixed

- Stage Windows native CMake builds under a shorter path through the existing Expo plugin flow.

### Security

- Keep password values and flow identifiers in memory. Five-minute session-bound verification, failure limits, authorization rechecks, and other-session revocation are enforced by the paired Staff API.
- Serialize unread-count invalidations and isolate cached counts by consumer/session/access scope.

### Validation and release

- [PR #9](https://github.com/aymkopi/aleconnect-mobile/pull/9), source fc43da8, published as Android code 64 through [workflow 38541261800](https://github.com/aymkopi/aleconnect-mobile/actions/runs/38541261800). [Release and APK](https://github.com/aymkopi/aleconnect-mobile/releases/tag/v1.0.0-alpha.10).
- 456 tests, TypeScript, lint with zero errors/181 existing warnings, Expo Doctor 21/21, and fixture-free Android/Hermes and web exports pass.
- All three downloaded asset digests, the original signer/package, non-debuggable fixture-free HTTPS runtime, and all 54-library ZIP/ELF 16 KB alignment checks pass.
- Bounded phone-emulator and Redmi Pad 2 fixture checks cover layout, forms, completion, #00060F pixels, and recorded pill motion. The tablet disconnected before installation of this exact release APK; private-password/provider/push/native-iOS and store-production signing acceptance remain separate.

### Migration and compatibility

- Staff PR #41 deployed the compatible password-change API before this release. No database migration is required; legacy required-password requests remain supported.
- Retain the original package/certificate, increasing Android version code, prior releases, recovery stashes, and saved device queues.

## 1.0.0-alpha.8 — 2026-10-13

- Publish PR8 from merged source017f743 as Android code62. Original signer/package, live API, fixture-disabled non-debuggable runtime, GitHub/downloaded digests and all54-library ZIP/ELF16KB alignment are verified; prior alphas remain available. [Release](https://github.com/aymkopi/aleconnect-mobile/releases/tag/v1.0.0-alpha.8).

- Route successful account/email sign-in to Home while preserving required password and identity checks. Update resume explanations to describe the new destination.
- Use PanelUI RadioGroup cards for account/type/period/notification choices and shared Select options; keep searchable/grouped/disabled selections and same-value confirmation. Broadcast Areas remains multi-select Checkbox.
- Replace the appearance rows with PanelUI ThemeSelector window previews. Strengthen All/Unread selected surfaces in Light/Dark without changing label color; announce the selected tab and center the unread count.
- Use PanelUI Calendar range selection in reporting-period sheets and All reports filters, opening at today with locale week start, selectable adjacent-month days and January 1 2026–today bounds. Show the selected range and prevent partial/out-of-range application.
- Clarify all canonical report-status descriptions and use distinct Lucide icons. Show the existing server-authorized similar-incident message once under Verified in a warning card; preserve the >=5 current memo-member and recipient gates.
- Fix shared SearchBar blur handling for the native and RN-web focused-input APIs, preventing a timer error when leaving a search.
- Remove duplicate advisory search reset/clear controls. Keep one labelled Clear search action that preserves the current tab. Update Figma first; record component provenance and auth/selection/calendar/recovery regression evidence.

## 1.0.0-alpha.6 — 2026-10-13

- Publish the prior PR7 flow refinements from87daab0 as Android code60; retained as release history.

- Rename the ticket appbar to “Ticket details”; place the reference, a reliable copy action and compact status together in the body. Keep pull-to-refresh for current details and evidence; remove the separate evidence refresh button and raw coordinate row while retaining the map.
- Require Continue to revisit report-type confirmation for multi-type categories, including retained selections. Appbar Back asks to exit the report module; the footer Back keeps step navigation and queued submissions remain protected. Move location actions below the map/details into one row and clarify description/action placeholders.
- Start the location map at the initial local point with street-level zoom; constrain both native/web cameras to the existing Albay service bounds and reject water/outside pins using bundled barangay polygons. Preserve the selected/panned point when finding, cancelling or retrying a location. Show a permission-gated user puck without following the camera; place address-resolution work at the card’s top right.
- Replace advisory/post “Refresh latest update” with pull-to-refresh. Normalize Broadcast Areas substation and feeder cards to shared Light/Dark surfaces, and replace the area count with saving/synced/pending feedback.
- Correct Android notification-channel creation before permission/token requests; show setup success only after server registration, and hide it if device permission is revoked. Figma is updated first; add regression coverage for retained selections, land/water, map remounts, permission/token/server outcomes, readiness and clipboard failures.

## 1.0.0-alpha.4 — 2026-10-13

- Normalize every custom and native BottomSheet to one semantic surface: #EFF2F6 in Light and #1A1F27 in Dark. Keep contact cards white/darker than the sheet, without decorative borders or shadows. Select and small-screen Popover sheets inherit the standard.
- Match the Figma sheet token before app changes; preserve attached, keyboard-aware sheets and single-sheet content/back navigation.
- Publish the combined change as [alpha.4/code58](https://github.com/aymkopi/aleconnect-mobile/releases/tag/v1.0.0-alpha.4) from merged PR6 source b481117. Original signer/package, fixture-free live-API configuration, asset digests and 16KB alignment are verified. Docs-only CI runs consume ordinals without publishing binaries; version codes remain increasing.
- Include the latest manual Home, Reports, Advisories, Hotlines and report-detail edits: roomier Home spacing/padding, clearer white KPI text on its feature surface, compact status badges, 12px list spacing and formatting refinements. Home accounts for actual rendered gaps so the larger padding fits ordinary phone heights; the existing small-screen/large-font fallback remains.

## 1.0.0-alpha.1 — 2026-10-12

- Restart display/release versioning as alpha; Android version codes continue above54 for safe in-place updates. Keep the earlier2.0.0/code54 release as history.
- Add a default-branch CI pipeline that reuses existing validation, builds a fixture-free signed ARM64/x86_64 APK for app changes, checks actual native/bundle/signature proof and publishes a GitHub prerelease with checksum/build metadata. Docs-only changes skip compilation; manual rebuilds are supported.
- Publish [1.0.0-alpha.1/code55](https://github.com/aymkopi/aleconnect-mobile/releases/tag/v1.0.0-alpha.1) from merged source 2d39979. Original preview certificate/package, live API and 16KB alignment are verified; downloaded and Desktop copies match GitHub's digest.

## Border-free changes included in alpha

- Remove decorative outlines from Light/Dark components and screens; distinguish cards, fields, menus and sheets through semantic fills. Keep #00060F as the Dark page anchor.
- Preserve readable selection/unchecked/error/disabled states and a visible functional input-focus underline; retain variant/class/inline field fills and balanced prefix/suffix spacing.
- Retain the signed 2.0.0/code54 release as history; the alpha.1/code55 release includes the border-free UI.

## 2.0.0 — 2026-10-12

Major consumer-app presentation update. The Figma-based PanelUI rebuild replaces the previous Gluestack interface while retaining Staff-owned authorization, consumer identity, report/evidence contracts, private storage and notification delivery.

### Foundations and navigation

- Adopt copied-source PanelUI 0.109, Uniwind/Tailwind 4 and Lucide. Keep source provenance in `panelui-lock.json` and `docs/panelui-source-manifest.json`; components remain locally editable.
- Normalize light/dark surfaces, subtle card gradients, lighter 0.75px outlines, attached keyboard-aware bottom sheets, field adornments, 16px page padding and rounded interactive controls. Dark background is #00060F.
- Replace Satoshi/SF-style app typography with Inter for controls/body and Plus Jakarta Sans for headings. Include the font licenses and upstream PanelUI MIT notice.
- Use Expo Router for five main tabs: Home, Reports, Advisories, Hotlines and Account. Reset focused main pages to the top; preserve the caller when returning from notifications/settings. Keep page switching immediate and theme-aware.
- Use one sheet with content/back navigation instead of nested sheets. Theme selection opens directly from Appearance. Remove scrollbars while retaining scrolling on child pages.
- Add page-specific empty/error/offline/retry states and content-sized skeletons. Blocking mutations use a spinner; determinate progress is reserved for steps or known-duration actions.

### Home and public services

- Retain the rounded Mayon photo header and bottom-anchored search, with header height fixed to one-third of the window.
- Use 48px icon tiles in adaptive two/three-row, four-column quick actions; retain Explore services for additional actions. Preserve the user's latest VS Code edits to Home spacing and Quick Actions heading.
- Remove Home account selection. Keep advisory carousel/report CTA sizes stable and use normal fixed layouts with the existing tiny-screen/large-font scrolling fallback.
- Show equal-height publisher cards, full-width carousel pages, 24px spacing and three-second auto-advance; remove dot controls on Home.
- Add service previews, request-connection guidance and payment-channel information. Payments remain external channels; this app does not collect payments.

### Reports

- Use PanelUI Kpi for report summary metrics, explicit period/account filtering, centered count badges and compact report cards. Loaded-record counts are not advertised as complete server totals.
- Add archive/search/filter/sort, reporting period, status guide, detail/timeline, receipt and protected device-queue screens.
- Require explicit Continue after category/type selection. Multiple types use descriptive cards; Back moves to the previous step before leaving the flow.
- Require Purok/Street and evidence; show actionable validation and a terms/privacy submission notice. Retain canonical backend text/photo limits, conditional descriptions and account-owned evidence uploads.
- Add the full MapLibre location picker, map preview tap-through, Albay location checks and structured address handling. Custom date ranges are bounded from January 1, 2026 through Manila today.
- Refresh lists silently on focus; show the pull indicator only for explicit pull-to-refresh. Detail supports pull refresh; remove Refresh status and Copy reference actions.
- Distinguish Under review (yellow), Verified (blue), Dispatched (violet), In progress (orange), Resolved/Closed (green) and Rejected (red).
- Show only Staff-published incident notes; never infer incident grouping. Support optional unread-report metadata and mark visible report updates through the existing authorized notification endpoint.
- Retain consumer-scoped durable drafts, idempotency keys, bounded upload concurrency, replay authorization and cache invalidation. Notify the correct owner if a persisted submission completes after leaving the screen.

### Advisories, hotlines and account

- Add the Advisories tab with compact filters, scheduled interruptions, ALECO Feed topics, community/post summaries, detail, search, evidence viewer and server-targeted public/private feeds.
- Make advisory focus refresh silent and use explicit pull refresh. Fix publisher-card radial gradient bounds.
- Reuse compact agency/contact cards with avatar, address/description, optional website and call/copy controls. Use a two-second Hold to call 911 button. Remove redundant ALECO contacts action and duplicate emergency-sheet confirmation.
- Add account/profile details, linked accounts and requests, photo, password, alerts/recipient preferences, help/about and legal routes.
- Use shared compact PanelUI FlipCard/QRCode service-account cards with masked/revealed account numbers, default indication and edit/default/unlink actions. QR contains the account identifier, not passwords or private authentication tokens.
- Keep selected-account password, ownership/revision and capability checks for profile edits. Removing active-report blockers requires the separate Staff PR40 server release; identity-email re-verification is not simulated.

### Authentication, guest access and notifications

- Add centered photo-backed account-number/email sign-in, contextual new/current/returning-device wording, required password update, recovery/help and guarded email setup. Onboarding is intentionally excluded.
- Guest mode uses the normal Account layout with restrictions and a Log in to use this feature sheet. Guests can browse public All-target updates and hotlines; reports and private profile operations remain protected.
- Add grouped/searchable/paginated notification inbox/detail, read actions, notification preferences and proper destinations for report/advisory/account-link messages.
- Place readable in-app toast notifications at the top so they do not cover bottom navigation.

### Dependencies and removed presentation

- Align Expo 57, React Native 0.86.3, React 19.2.3, Expo Router, Reanimated/worklets and native map/keyboard dependencies. Retain the validated Node 24.21.0 runtime policy and reviewed Expo exclusions.
- Remove the deprecated Gluestack provider/primitives/dependencies, previous child-app-bar/profile/map/list presentation, unused Satoshi files and temporary `legacy/presentation` archive. Keep reusable PanelUI components and established consumer services.
- Retire obsolete source-text assertions against archived screens; migrate mixed live-service assertions to active readers. Retain executable validation/auth/cache/status/queue tests and the current PanelUI flow tests.
- Ignore local `.cache` and `.superpowers` evidence. Keep generated Graphify analysis out of the scoped product commit and recover it locally.
- Set package/app version 2.0.0 and reserve Android versionCode54. Preserve package/bundle identifier `com.kapecakes.aleconnectmobile`, URL scheme, EAS/Firebase identity, notification sounds and existing signing material.

### Compatibility and release limits

- This PR merges Mobile source; it does not deploy Staff, migrate production data or publish to EAS/OTA/stores.
- Staff PR40 remains separate for unlocked active-report profile edits, linked-account details and unread report IDs. Optional response fields and older caches are supported. Approved legal text, production email re-verification, authenticated/provider/device acceptance and native iOS remain separate gates.
- The prior signed v53 Android APK remains available with its recorded hash. It predates the latest VS Code Home edits and 2.0.0 metadata; merging this source does not turn that APK into a 2.0.0 build.
- Verification and repository/folder cutover evidence are recorded in `docs/panelui-major-migration.md`.
