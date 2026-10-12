# Mobile navigation and interaction fixes — 2026-10-11

Scope: existing PanelUI worktree, earlier v32 fixture preview for baseline; preserve original app, queue, signing and API contracts. Native execution is already authorized by the current request and earlier autoapproval. No API release.

1. Reproduce the Notifications → settings → Back → Account detour. Route shared settings through the root Expo Router screen; main-tab selection emits tabPress and targets each root; focus/reselect returns all five scroll surfaces to top. Audit child Back paths against their actual caller.
2. Reuse existing authenticated caches and refresh events. Reports uses the existing cached first page (25) and submission/status revalidation; account uses cached profile reads. Keep scope invalidation, stale fallbacks and auth boundaries.
3. Tighten list card spacing to a single 8px separator; ALECO card drops redundant CTA; hotline sheets auto-size; emergency hold 2000ms, visible label Hold to call 911; toast default top.
4. Report fields stay mounted while accounts load. Single-type category skips selection; multiple types auto-open one owned sheet, selection advances. Preserve destructive issue-change confirmation and edit-review behavior. Map address stays visible while geocoding; confirmation remains gated.
5. Home carousel uses equal-height, truncated compact cards; 24px inter-card gap, 16px resting sides with unclipped screen-edge sliding; 3000ms autoplay using existing lifecycle/focus/reduced-motion rules and dots only.

Checks: focused RED→GREEN behavioral regressions, full tests, TypeScript, changed-file lint, Graphify/harness/whitespace checks. Build signed fixture preview with fresh JS; inspect baseline/fixed journeys on emulator, never dial 911 or send live reports. Preserve v32/v33 APKs.

Review focus: tab reselect and nested stack roots; header/hardware Back/discard returns caller; cached result cannot cross identities; successful submission refreshes mounted main list; category with 0/1/multiple types; account field remains mounted; map label is stable while confirmation waits; carousel spacing at two screen sizes and enlarged fonts.
