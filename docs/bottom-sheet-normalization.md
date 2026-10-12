# BottomSheet surface normalization

Reviewed: 2026-10-13. Scope: consumer presentation and the latest manual edits; no API, database, dependency, signing or private-device changes.

## Surface standard

| Surface | Light | Dark |
| --- | --- | --- |
| Sheet | #EFF2F6 | #1A1F27 |
| Contact card | #FFFFFF | #141A22 |
| Dark page anchor | — | #00060F |

The shared PanelUI BottomSheet uses `bg-sheet-surface`; native sheets receive the same resolved token by default. All six theme families follow the standard. Select and small-screen Popover inherit it. Keep zero decorative border/shadow, attached sheets, keyboard handling, body/footer spacing, sizing and content/back navigation. Two optional Light theme families need slightly darker muted text to meet 4.5:1 contrast on the gray surface.

Coverage: 16 sheet-content call sites in 14 files, including guest access, phase boundaries, reports/archive/queue/new report, advisories, Account, notifications, alert recipients, profile photo, hotline contacts/customization, Select and Popover. No feature caller overrides the standard background.

## Figma first

In [the Figma file](https://www.figma.com/design/6uIaVRM63oHA723WKgjo5k/Aleconnect-mobile?node-id=94-2045), shared variable `848:20903` is #EFF2F6 in Light and #1A1F27 in Dark. Its 42 active sheet surfaces are bound consistently. Four recovery-action fills (`928:24556`, `928:24586`, `928:24616`, `928:24646`) are bound to the card token rather than the sheet token. Representative contact-sheet and report-filter screenshots were inspected before applying the app palette.

## Manual edits retained

Back up all eight currently edited canonical files before copying into the isolated branch: Advisories, Home layout/screen, Hotlines, Reports main/card/detail/status badge. Include edits made during this pass as well as the initial snapshot. The added Home vertical padding is moved into the existing layout helper to avoid counting it twice; rendered section gaps and quick-action label spacing are included in the fit calculation. Keep the one-third header, 48px icon tiles, 112px publisher card and 64px report CTA. Rows adapt to the roomier grid and retain Explore services.

Reports retains PanelUI Kpi, white values/labels on the dark feature card, compact status badges and the user's 12px list spacing; View all uses semibold text. The count helper still describes loaded records, not complete server period totals. Hotlines and report-detail formatting/import sorting preserve existing behavior.

## Verification

- Fresh source suite: 437 tests pass, zero skips, using the current Staff checkout for shared contract fixtures. TypeScript passes; lint has zero errors and 181 existing warnings. Harness and whitespace checks pass.
- Semantic theme tests cover surface separation, 4.5:1 foreground/muted contrast and readable primary call controls in all six themes. Existing controlled/uncontrolled route-blur tests cover the native sheet default. Home fit tests cover normal heights, fixture labels and accessibility fallback.
- Integrated-browser fixture checks: Light/Dark contact sheets, report filters, Appearance and Home. Computed contact-card/sheet colors match the table; borders and shadows are zero. Fixture phone actions remain disabled. Fixture-free web export succeeds with the configured live public API.
- Independent read-only reviews found no actionable source issues, including the three newer manual files. Graphify was refreshed; generated analysis is retained outside the source change.

Evidence is stored in the task's external `sheet-normalization-2026-10-13` directory: manual patches/hashes, Figma screenshots/token record, Light/Dark app screenshots, check logs and generated-analysis recovery. No credential/configuration file is copied into the worktree.

## Release and limits

Publish through a scoped PR after exact-head CI; the existing default-branch pipeline builds a new alpha APK after merge. Record actual PR/merge/release results here before claiming publication. Existing alpha.1 predates this change.

Real-device/native-iOS rendering, native keyboard behavior, authenticated/private mutations and provider delivery are unverified in this pass. UI normalization does not replace those acceptance gates. Keep private configuration, signing keys, all saved stashes and unrelated Staff edits intact.
