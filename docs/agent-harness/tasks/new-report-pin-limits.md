# New report field limits and pin alignment

2026-10-23: implementation complete in `.cache/new-report-pin-limits`, branch `codex/new-report-pin-limits`; integration and release remain separate.

- Purok/street and landmark accept 20 characters; category/type descriptions and action desired accept 100. Inputs, counters, form validation and location-step errors share the limits. Autofilled over-limit text remains visible for correction rather than being silently truncated.
- Choosing location and static report maps share the filled Lucide pin, offset so its pointed edge indicates the map center. The shared picker also serves profile editing, and the static map also serves report details.
- Passed: 572 tests, TypeScript, scoped ESLint, harness validation, whitespace checks and browser fixtures at 402x874. Browser input tests confirm 25 characters stop at 20 and 105 stop at 100; both map-pin tips measure 0.125 CSS pixels below their map centers, with matching fill/stroke.
- Browser evidence: `.cache/verification/new-report-picker-pin.png`; test logs and the separate generated Graphify patch are in the same ignored directory. Graphify refresh completed; generated changes are preserved separately from source.
- Existing browser development warning: React Native Web forwards `accessibilityElementsHidden` to the DOM; its empty development toast intercepts pointer clicks. Browser verification used keyboard navigation and dispatched fixture clicks. No real report was submitted.
- Unverified: Android/iOS rendering, real GPS, provider behavior, release builds and publication. Next: integrate this branch when requested, then check the pin on a native build before release. Primary checkout documentation/security work and device state are preserved.
