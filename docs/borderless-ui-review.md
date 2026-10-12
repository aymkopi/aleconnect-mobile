# Border-free UI and release closeout — 2026-10-12

Scope: remove decorative outlines from shared copied PanelUI components and active consumer screens. Preserve existing routes, validation, state indicators, geometry, fonts, API contracts and recent VS Code Home changes. Figma Current/new direction was updated before app source; archived concepts remain unchanged.

## Surface hierarchy

| Role | Light | Dark |
| --- | --- | --- |
| Page | #EFF2F6 | #00060F |
| Card | #FFFFFF | #141A22 |
| Sheet/popover | #FFFFFF | #1A1F27 |
| Input/secondary control | #E7ECF2 | #242931 |
| Selection/accent | #DFEEFA | #20364A |
| Unchecked control | #7D8996 | #656B73 |

Filled cards separate from the page; fields separate from cards; nested menus and sheets use dedicated surfaces. Existing gradients, radii, shadows and typography remain scoped to their existing roles. Static decorative borders are zero. Content separators, chart/timeline rules, Lucide/map/QR/vector strokes and spinner arcs remain functional. Input focus uses a 2px absolute underline; glass fields use white. Class/variant fills and caller inline fills retain precedence.

## Figma and component audit

Active Entry, Home/services, Reports, report creation, Advisories, Hotlines, Notifications, Account, service accounts, preferences, shared patterns and library families received stroke/fill updates. All 13 affected semantic variables were updated; active decorative-outline scan returned zero. Focused Input/Select variants 647:16722 and 647:16718 include functional underline nodes 1107:24617 and 1107:24618. Device rims/battery and illustrations are unchanged. Before-values and screenshots are retained outside Git.

Shared Card, Surface, Button, Badge, Input, Select, Checkbox, Switch, Tabs, Calendar, BottomSheet, Dialog, Popover, Toast and loading/data states use the palette. Feature-level outline classes and explicit native border widths are removed. Legacy `outline`/`bordered` prop names remain compatible; they render filled surfaces. Selected account/type dots use primary-foreground; unread reports retain BellDot/text/accent fill. Invalid inputs retain error text and destructive fill.

Independent source review found and resolved publisher padding concatenation, invisible selected dots, resting Input fill precedence and native focus visibility. A behavioral regression exercises variant/class/inline fills and focus/blur without changing geometry. The reviewer found no remaining runtime source issue; unchanged UTF-8 comments were restored after its final reread.

## Release evidence

- Staff [PR40](https://github.com/aymkopi/Aleconnect/pull/40) merged d6d329ffb01e0b092e5fa5d96e67af8b406b9bfb; [deployment 38235668155](https://github.com/aymkopi/Aleconnect/actions/runs/38235668155) succeeded. API version 16ffe0ab-49b5-40c0-88e4-7d09f3b3b313 is active at 100%; bindings/runtime are unchanged. Pages 645a52a4-8a55-4de5-8b2b-c671fed46632 matches the merge. 39 focused tests and 17 read-only live boundary/assets checks pass. No schema migration or private mutation.
- [Mobile 2.0.0 preview release](https://github.com/aymkopi/aleconnect-mobile/releases/tag/v2.0.0-preview.1) publishes merged c94da9e as code54. This border-free PR is separate and not included in that APK.
- APK SHA-256: `b6fd04f1fd691a975fd1e942e0b545ac785040611a6b14da816b0690d44bef44`; GitHub asset digest and Desktop copy match. Package/signature retained, fixtures compiled off, live HTTPS API, non-debuggable, ARM64/x86_64, all54 native libraries and ZIP16KB aligned.

## Acceptance limits

Browser acceptance uses explicitly labelled fixtures with mutation/provider delivery disabled. Real authenticated API mutations, physical-device installation, Expo/FCM delivery and native iOS are not reaccepted by this task. The new APK retains the original preview/debug certificate; it is not a production store-signing release. 32-bit-only Android devices are outside the validated artifact. Preserve queues, private signing/provider configuration, old APKs and unrelated Staff/generated state.

## Final verification

- 433/433 tests pass with zero skips, including sibling Staff contract coverage; the final additional focused Input assertion passes 21/21.
- TypeScript, harness and whitespace pass. Lint has 0 errors/181 existing warnings. The isolated harness warns about its absent adjacent sibling; test coverage uses the configured canonical Staff path and has no skips.
- Fixture-free web export passes with EXPO_NO_DOTENV=1 and the explicit live HTTPS API origin. Native dependencies/version are unchanged.
- Graphify refresh completed with 3870 nodes/7336 edges; generated output is saved separately from the scoped PR.
- Integrated-browser fixtures at 393×852 cover Home, Reports, Advisories, Hotlines and Account in Light/Dark; attached appearance/filter sheets, gallery/loading surfaces, selected report account and glass sign-in focus were inspected. Screenshot evidence remains local. Older web-only accessibility warnings outside this scope are not native crash evidence.
- Functional focus and readable field text/hints pass semantic contrast tests. Browser fields use one underline; native-supported aria-hidden preserves decorator semantics. No real login, report submission or dialer/provider action was used for visual acceptance.

[UI PR #4](https://github.com/aymkopi/aleconnect-mobile/pull/4) is merged. The published v54 APK comes from the earlier merged source and does not include this PR. Physical/private/provider/iOS acceptance remains unverified.


## Merge and cleanup — 2026-10-12

PR #4 merged as 27cfc2f9864d4e250edec4029ce52ac29bedf817. Both exact-head checks passed at d06bcb9; the merged tree is byte-identical to that verified head. Canonical local master fast-forwarded to remote master with zero divergence. Fresh pre-merge and merged-canonical suites both pass 433/433 with zero skips; merged TypeScript, harness and whitespace pass. [Merged-master CI](https://github.com/aymkopi/aleconnect-mobile/actions/runs/38249243713) passed.

Non-force cleanup removed the clean mobile-borderless-ui worktree, its local/remote feature branch, and the empty task container. The empty former aleconnect-panelui folder is removed. The node_modules junction was unlinked without following its canonical target; canonical dependencies remain. All nine saved stashes and four protected provider/signing/configuration hashes are unchanged. The removed worktree had only generated caches and an empty saved-device list. Broad archive copying was rejected by automatic approval review; metadata inspection established a safe generated-only cleanup without copying secrets. Previous recovery, APK, screenshot and Graphify evidence remains outside the removed checkout. Unrelated Staff state/worktrees and device data are untouched.

The GitHub v54 APK remains built from c94da9e; merging this UI does not update the published binary. A newly signed border-free APK and physical/private/provider/iOS acceptance remain future gates. No EAS/OTA/store publication or Staff deployment occurred in this integration step.
