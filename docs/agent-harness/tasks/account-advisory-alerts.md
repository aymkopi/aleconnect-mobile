# Account-location advisory alerts

## Scope and approved behavior

October 21, 2026: user confirmed automatic coverage from every linked ALECO account's selected location, no optional feeder/substation follows, editable notification switches, All-target pushes only when mapping is missing, and browsing of all published advisories when signed in.

Staff owns audience resolution and `/api/mobile/push-notifications`. The new additive settings fields are `coverageMode: "account_locations"` and `accountCoverage: [{ serviceAccountId, barangayPsgc, feeders: [{ id, name }] }]`. Existing preferences and empty legacy selection/catalog arrays remain compatible. Old selection writes cannot grant coverage. Staff push and inbox matching ignore stored manual follows without deleting them.

Mobile removes the area picker and its unused selection helpers, keeps both switches and device registration, displays read-only coverage for every linked account, and links to Advisories. Missing locations/mappings have explanatory copy; older omitted coverage fields offer refresh guidance. The settings cache uses the identity/access-revision scope already owned by ProfileGate, so unlinking or changing access cannot reuse a prior account coverage snapshot.

## Verification

- Complete suite: 569 tests pass with no failures/skips; TypeScript and scoped lint pass. Initial missing map-worker assets were supplied by the existing sync script before the passing full rerun.
- Fixture-only web export and browser checks pass at 402x874, 360x640 and 820x1180: mapped and unmapped account cards, absent manual picker, advisory-switch saving, no horizontal overflow, and the link to Advisories. Light/Dark screenshots are in the primary Staff checkout's existing `.playwright-mcp` evidence directory; every API request was intercepted. Source review has no remaining finding.
- Staff recipient/inbox/legacy-client/rollback, public-reader and snapshot contracts: 27 tests pass, including a regression that fails before manual follows are removed. Staff production build and scoped API lint pass with an isolated locked dependency installation.
- Both explicit-sibling harnesses and whitespace checks pass, with only the optional absent-Lineman warning. Graphify refresh succeeds (Mobile4578 nodes/8622 edges; Staff11737 nodes/22127 edges); generated graph/type output is preserved separately from the scoped diff.

## October 22 integration acceptance

October 22 verification: the standalone fixture-only QA app installs and renders on the connected Redmi Pad 2. Both linked-account cards, mapped/unmapped copy, absent manual picker, both switches off/on with local autosave, and Browse all advisories navigation pass. Browser checks pass at 402x874, 360x640 and 820x1180 with no page errors or outbound writes. No production account or device token is changed. The tablet disconnects after acceptance; final app-specific log read and return to the original Lineman foreground are unverified.

Retain `aleconnect-mobile-advisory-qa-20261022-arm64.apk` in the user's Desktop APK folder (SHA256 `de0293fd4132b391d35f2691e695287f87ed8eaabb12b954a7e07dbc2b54b8b5`), package `com.kapecakes.aleconnectmobile.advisoryqa`. Its original-signer, ZIP alignment and embedded local-only transport checks pass. This separate QA package uses sample data and blocks product writes; it is not a production release. The existing 1.5.1-alpha.1 APK and original tablet package are retained.

Fresh checks on Staff base `9ea1eafa` and Mobile base `84667cfb`: Staff27 focused tests, production build/API lint; Mobile569 tests, TypeScript/scoped lint; both paired harnesses and whitespace checks pass. The newer Staff field Inbox change is retained. Graphify refresh succeeds (Staff11749 nodes/22138 edges; Mobile4578 nodes/8621 edges before the field-only base refresh); all nine generated files are hash-preserved outside the scoped commits. Temporary native QA config/transport is excluded from product source.

The user authorizes scoped commit, push and fast-forward integration into Staff `main` and Mobile `master`, with `[skip ci]` on every new commit. Verify remote refs and zero Actions runs after integration. Preserve recovery stashes, unrelated primary work and both APKs. No deployment, live preference write, mapping mutation or native publication is authorized.

## Rollout, rollback and remaining risks

Source integration only. Physical acceptance above covers the isolated fixture UI; real provider delivery and production behavior remain release gates.

Deploy Staff's compatible API and advisory delivery runtime before releasing Mobile. Existing queued delivery snapshots require inspection before release because their audience was selected under the old policy. Mapping data remains absent; feeder-specific live acceptance needs real mappings. Server-derived account coverage is mandatory while both user notification switches remain respected.

Rollback restores prior source; legacy manual follow rows remain intact. New Mobile safely renders omitted coverage from an older server but depends on Staff's new policy for targeting enforcement.

Next: complete the authorized source integration and record remote commits/Actions evidence; retain the separate deployment/provider gates.
