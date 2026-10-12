# Single-sheet navigation
Date: 2026-10-09. Isolated branch: codex/panelui-five-main.

## Behavior
A sheet owns one surface and one backdrop. Opening an option picker replaces its header/body; it does not mount another sheet or expand a second bordered panel. Back returns to the parent without dismissing it. Selection returns to the parent.

Reports uses a local draft: Category and Sort changes are applied only by Apply filters. Visible Back and Android Back return to filters. Closing, tapping the backdrop or dragging dismisses the entire sheet; reopening initializes drafts from applied criteria. Failed fetches retain the existing rows and applied criteria.

Appearance opens Color theme directly. Device settings, Light and Dark use Lucide prefixes and short descriptions. Selection applies the existing Uniwind setting immediately and closes the sheet. Visible Back returns to Account without changing the setting; Android Back, Close and backdrop also dismiss. Guest access still requires sign-in.

## Reusable PanelUI changes
- Select presentation="content": search/options only; no trigger, portal, native picker or BottomSheet. Existing option, selected and disabled-item behavior is reused.
- BottomSheet.Content onBack: optional Android Back navigation within the sheet. Close, backdrop and drag retain normal dismissal.
- New callers should own the current content view and pass content presentation for embedded Select options. Standalone Select sheets remain available outside a sheet.

## Figma
Existing report filter variants and account/sort/status/type picker states now show a single sheet over Reports. Theme states reuse Account and the existing Select instances. Picker Back uses prototype Back to preserve the origin. Selection uses Navigate, never Overlay.
- Report filters: https://www.figma.com/design/6uIaVRM63oHA723WKgjo5k/Untitled?node-id=94-3231
- Service account picker: https://www.figma.com/design/6uIaVRM63oHA723WKgjo5k/Untitled?node-id=638-16663
- Appearance content flow: https://www.figma.com/design/6uIaVRM63oHA723WKgjo5k/Untitled?node-id=725-19612

Figma preserves planned service-account/status/type filters beyond the current five-page app phase. App implements Category and Sort; child report/status workflows remain phase boundaries.

## Verification
Focused regression tests cover draft preservation, dismissal/reopen/apply, theme Back and selection, and the actual Select content branch without a modal/trigger/native picker. Full suite before the last additional Select regression: 273 passed, 1 existing skip, 0 failed. Final focused suite: 7 passed. TypeScript passed. Scoped ESLint: 0 errors, 13 existing warnings. Gradle signed/bundled preview build passed.

Version 8 updates the authorized task emulator in place. Package and preview certificate are unchanged, first-install time unchanged, and synthetic queue/receipt/evidence digests match before/after. Native checks passed for visible/Android Back, staged category/sort selection, Apply, close/reopen discard, backdrop dismissal and Appearance theme selection. Light/dark surfaces were visually inspected. The original System theme was restored and the emulator left on Home. Version8 and exact synthetic retention survived reopening after an accidental emulator close. Details/screenshots are recorded in the acceptance report; drag dismissal was not repeated in this pass.

## Remaining risks
Native iOS, physical hardware and spoken screen-reader acceptance remain unverified. The preview pauses replay/writes and is not a production release. Previously recorded category-choice persistence and shared ALECO category gaps remain outside this bounded sheet-navigation change.

## Footer spacing (2026-10-09)
Body → 12px gap → 1px semantic border separator → 12px gap → footer action. BottomSheet.Footer owns both gaps; callers must not add another separator or parent gap. Keep existing spacing between multiple footer actions, sheet padding and safe-area padding. Content-only picker/contact sheets without a footer remain unchanged.

The non-native shared footer uses mt-3 and pt-3. The optional native root no longer adds gap-2 between header/body/footer; header spacing remains owned by BottomSheet.Header. This avoids a duplicated outer gap. Figma23 action-sheet variants mirror the12px separator gaps, using the existing light/dark border token and preserving footer action IDs/prototypes and bottom anchors.

## Home publisher carousel (2026-10-09)
Home uses PanelUI Carousel.Content, Carousel.Item and Carousel.Dots. Full-width slides are measured from the root inside16px screen gutters; there is no hardcoded326px card width or neighboring-card peek. Dots are the only carousel controls, and swipe plus card tap remains available. No automatic advance. The root sits inside a padded parent because its default w-full would overflow if combined with outer margins. A drag freezes its start position and cancels any previous spring before applying cumulative movement; one swipe advances at most one slide. The longest current card determines measured content height; removed cards do not reserve old space, and width/font changes remeasure wrapped text. Existing Home overflow handling reveals the CTA on short/enlarged-text screens.

Figma11 populated Home variants use full content-width publisher instances and centered dot navigation;2 empty/error variants are full-width availability states with no pagination. Existing publisher-card destinations are preserved, and dot prototype actions scroll to their slides. The static canvas shows the initial selected dot; the app updates selection during swipe/tap. Standard Figma viewport heights are retained with a small hero-height adjustment where dots require it; smaller Home still scrolls.

## Reference 45 defaults (2026-10-11)

The shared styled BottomSheet now floats within 16px side margins, with 24px corners and 16px content padding. A 48px header row reserves room for the 48px Close target; header-to-body spacing is 12px. The grabber is off by default. Explicit docked/grabber options and the optional native implementation remain supported. Footer separator spacing stays 12px above and below the existing 0.75px semantic border. Auto-height and scrollable body behavior, safe-area clearance, Android Back and route-blur dismissal are retained.

Select.Item accepts a decorative startContent icon and description while retaining selected/disabled semantics. Rich and disabled options stay in the styled picker because the optional native picker cannot represent them. Embedded content presentation continues to avoid another portal or sheet.

Figma section 45 now contains only the System, Light and Dark direct theme states. The old Appearance intermediary and two duplicate single-sheet Appearance states were removed; incoming links were repaired and no removed-frame destinations remain. See [the current acceptance handoff](panelui-direct-appearance.md).
