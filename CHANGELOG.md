# Changelog

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
