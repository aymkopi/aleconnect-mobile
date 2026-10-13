# Mobile selection and status refinements

Scope: the requested sign-in destination, incident warning, status explanations, reporting calendar, single-choice controls, theme previews, notification tabs and advisory search. Preserve authentication gates, API authority, multi-area selection and private device work.

Plan executed: inspect source and PanelUI documentation → update affected Figma screens → implement existing component patterns → test and inspect Light/Dark rendering → record acceptance and release limits.

| Area | Acceptance and evidence | Status |
| --- | --- | --- |
| Sign-in | Account/email success routes Home. Required password and identity gates remain, with Home after required setup; auth regressions pass. | Passed: source/tests |
| Ticket timeline | Existing server-authorized >=5-ticket memo message appears once under the latest Verified row in a warning card. No synthetic status or membership inference. Figma and Light browser match. | Passed |
| Status guide | All seven canonical statuses have clearer explanations and distinct Lucide icons. Static descriptions no longer look like expandable actions. | Passed |
| Reporting period | PanelUI Calendar range in the attached sheet and All reports filter content; opens at today, selected summary, selectable outside days, locale week start and Jan 1 2026–today bounds. Partial ranges cannot apply. | Passed |
| Single choice | PanelUI RadioGroup for New report account/type, reporting period and notification filters. Shared Select options reuse it while retaining search, grouping, disabled options, back/content navigation and same-value confirmation. | Passed |
| Broadcast areas | Keep Checkbox because recipients are multiple selections. Existing search, selection and single-sheet Back are retained. | Passed: existing behavior retained |
| Appearance | PanelUI ThemeSelector window previews replace rows in the existing attached sheet. Existing appearance context applies the selected theme once. System follows the device. | Passed |
| Notification tabs | Selected surface differs in Light/Dark; foreground text stays unchanged. Exactly one tab announces selected; count badge is vertically centered. | Passed |
| Advisory search | One labelled Clear search action in each advisory search surface; duplicate icon/reset action removed. Clearing preserves the selected tab. | Passed |
| Verification | 449 tests with zero skips; TypeScript, scoped lint, Android/Hermes+web exports, harness/whitespace and independent read-only review. Light/Dark browser and Figma evidence retained. | Passed |

## Verification

- Node24.21.0: 449/449 tests, zero failures/skips/cancellations. The first sandboxed run could not create 16 disposable Git fixtures; the unrestricted rerun passes every test. No product code was changed for that environment restriction.
- TypeScript passes. Changed-source lint has zero errors and six existing warnings in unchanged Select/SearchBar Reanimated, sign-in ref and Account effect logic.
- Fixture-free Android/Hermes and web exports pass using the existing public API configuration. No dependency, API, schema, signing or deployment changes.
- Integrated browser at a standard phone viewport: account selection and same-value closure; explicit report-type Continue; complete/partial calendar ranges, today month and disabled future dates; single-sheet All reports navigation; theme application; Light/Dark All/Unread contrast and radio filters; Verified warning; status guide; labelled advisory clear preserving ALECO feed. Original System appearance and browser sizing are restored.
- Final browser console inspection found an existing SearchBar blur incompatibility: RN-web exposes `currentlyFocusedField` rather than the native `currentlyFocusedInput`. The shared capability fallback is regression-covered; retesting search focus/clear produces no new console errors.
- Independent source review found a same-value Select confirmation regression during implementation. It was fixed in the shared adapter and covered by focused tests; final reviews are clear.
- PanelUI registry components are copied into the existing source foundation, with local adaptations and hashes recorded in the manifest/lock. No package upgrade is needed.

## Design and evidence

The existing file was updated before app implementation: [Figma screens](https://www.figma.com/design/6uIaVRM63oHA723WKgjo5k/Aleconnect-mobile?node-id=94-2045).

Key frames: Ticket details94:4418; status guide540:11888; reporting period579:13095 and range sheet579:13120; theme725:19613 with Light/Dark variants; notifications249:5305; report type94:6047; search547:11066. Choice/card token bindings retain Light/Dark modes, and auth annotations now describe Home after sign-in.

Rendered screenshots, test/export logs and separately preserved Graphify results are in the session evidence folder `mobile-selection-refinements-2026-10-13` under the 2026/10/06 Codex visualization directory. Production exports are in `export-published`; browser content is explicitly labelled sample fixtures and makes no live writes.

## Boundaries and next steps

Baseline: canonical Mobile clean at c4b5c5d on master. Implementation branch: `codex/mobile-selection-refinements`. Staff has unrelated skills/plugin changes and stays untouched; all nine stashes and private device queues/signing/provider state are preserved.

Existing Staff complaint detail already gates `consumerMessage` using current attached membership, at least five tickets, a non-cancelled memo and the original consumer notification. No new schema or API field is needed; publishing this client does not alter Staff operations.

[PR8](https://github.com/aymkopi/aleconnect-mobile/pull/8) merged after both exact-head checks passed at771f6d6. Canonical local/remote master synchronized at017f743. The automatic alpha run38372229138 passed and published [1.0.0-alpha.8/code62](https://github.com/aymkopi/aleconnect-mobile/releases/tag/v1.0.0-alpha.8). Downloaded assets, checksum, original signer/package, non-debuggable runtime, live API, fixture-disabled bytecode and all54-library ZIP/ELF16KB alignments pass. The checked Desktop AleconnectApps copy has SHA-25630170e5a3a2f75353dc81a76f07726397c8509ec12b907a408ef03aeb851db7c. Earlier alphas remain available; no native/device acceptance is inferred from the build.

Remaining risks: physical-device login, GPS/push/provider permissions, private authenticated API acceptance and native iOS are unverified. RN-web does not implement the native pull-to-refresh gesture. The earlier sign-in development SVG warning and six source lint warnings remain baseline.
