# ALEConnect typography · Inter and Plus Jakarta Sans

The current Figma direction and active PanelUI app use Inter for everyday UI and Plus Jakarta Sans for prominent headings. The family migration preserved the initial metrics. The compact-heading refinement below now reduces selected title sizes and leading while retaining control geometry and text scaling.

| Role | Family and weight | Current app size / line height |
| --- | --- | --- |
| Main page title | Plus Jakarta Sans 700 | 24 / 32 |
| Home greeting | Plus Jakarta Sans 600 | 25 / 31 |
| KPI figures | Plus Jakarta Sans 700 | 32 / 40 |
| Section heading | Inter 600 | 16 / 22 |
| Report card title | Inter 700 | 16 / 22 |
| Featured advisory title | Inter 700 | 18 / 25 |
| Standard advisory title | Inter 700 | 15 / 20 |
| Field labels, buttons, selected controls | Inter 500–600 | Existing compact control variants |
| Body, inputs and supporting information | Inter 400 | Existing 12–16px scale; explicit role line heights retained |

Do not increase tracking globally. Keep inherited tracking for body/control text and the existing heading tracking. Existing numbers use their present glyph features; tabular figures should be reserved for genuinely aligned numeric columns rather than every label. Retain native text scaling and the existing measured Home overflow behavior. Do not shrink type to force larger accessibility text into fixed containers.

## Figma

Target file: https://www.figma.com/design/6uIaVRM63oHA723WKgjo5k/Untitled?node-id=94-2045

Only the current design page was migrated. All SF Pro ranges became Inter at the nearest weight: Regular400, Medium500, Semibold600, Bold700. Prominent existing SF headings at 24px or larger became Jakarta600/700, including Home greeting variants. Seven local SF text styles were migrated and renamed Cross-platform while retaining their IDs and metrics. Instances remain editable and linked; no external PanelUI library or historical concept page was modified.

The initial family migration retained the Figma greeting25/29 and page titles28/36, with the app greeting25/31 and titles26/34. The compact-heading pass below now brings main title nodes and app titles to24/32 while preserving each artifact’s hero metrics. Text that sizes to its content may change by a few pixels with the new glyph metrics. The two existing Cousine ticket identifiers remain intentional monospace exceptions; the requested SF replacement does not remove them. Native operating-system chrome keeps platform-owned typography.

## App implementation

Six font faces and their license files were already bundled in assets/fonts and loaded before UI in src/app/_layout.tsx. No dependency or font download is added. global.css maps font-normal, font-medium, font-semibold and font-bold directly to Inter400/500/600/700. This follows PanelUI's native font-token convention and avoids applying synthetic numeric font weights to a named static face. Explicit Jakarta styles continue to override the UI default.

The shared Text wrapper now preserves writing direction and caller style without parsing class strings or imposing a second inline default. Input uses its existing font-normal utility instead of another forced inline face. Prefix/suffix geometry, input borders, labels, scroll behavior and interactive hit areas are unaffected.

## References

Inter's official documentation describes its UI legibility and OpenType features: https://rsms.me/inter/ . The project uses the already installed face assets, not a newly downloaded variable-font build. Plus Jakarta Sans is the established display face in this design; its upstream source is https://github.com/tokotype/PlusJakartaSans .

## Verification

Focused regressions verify actual Tailwind compiler output for all four native Inter weights, plus RTL and caller-style preservation. TypeScript, scoped lint, Figma font/missing-font checks and native preview acceptance are recorded in panelui-emulator-acceptance.md. Build/signature verification is separate from rendered/device acceptance. Native iOS and physical-device typography still require their own acceptance.

## 2026-10-09 — Compact heading refinement

Source assessment and standard-size emulator screenshots identified oversized heading roles. Main titles24/32, child app bars18/26, creation-step headings22/30, sections16/22, report-card titles16/22, detail/status titles18/26, featured publisher/profile titles18/25, sign-in28/36. Everyday body/input text remains16; supporting information12–14; labels14; normal button labels16. These are role choices, not automatic screen-width scaling.

Home greeting25/31, KPI figures32/40, emergency number and avatars retain emphasis. Font families/weights, PanelUI primitive defaults, touch targets, padding/gaps, footer measurement, validation and native text scaling are preserved. Smaller phones/enlarged text keep existing scrolling/adaptation.

Current Figma page94:2045 has646 targeted text overrides:314 child headers and332 main/form/content/section/welcome titles. Headers18/26, main24/32, form22/30 and sections16/22 match the app hierarchy. Historical pages/component definitions/library/chrome were excluded. Body/field/button text, Home greeting/metrics were not reduced. Existing artifact differences in hero/metric metrics remain; this is not a whole-file pixel-parity claim. Zero missing fonts. Representative issue-form and Reports viewport screenshots show readable text without new clipping.

Source checks:320 tests passed/0 failed/1 existing skip; TypeScript passed; scoped lint0 errors/2 existing Hotlines warnings. Android21 build/render checks are recorded in the task handoff. Prior renderer SIGSEGVs remain an open release gate; typography changes do not claim a crash fix. Native iOS, physical device and live authenticated acceptance remain unverified.


Closeout2026-10-10: preview21 signed build/install and iOS Hermes export passed. Standard light sign-in/five main pages/New Report account/detail/status and dark130% account/issue/period/Reports/filter-sheet renders were inspected. Enlarged forms wrap supporting text and keep footer actions visible; the issue list scrolls. Body/input/touch geometry was retained. Home fixture service-help card still needs a short scroll above floating navigation; this existing fit concern is separate from the heading changes. Android system-theme recreation resets in-memory fixtures; they were reopened for checks.

Installed package/certificate/first-install time and exact synthetic queue/receipt/evidence digests are preserved. Final16 build-source/protected9/primary6 checks match. APK21 and rendered evidence are retained under native-implementation/typography-density. No new21 app crash in the captured log does not resolve the prior native renderer release blocker. Native iOS/physical/TalkBack/authenticated acceptance remain open.
