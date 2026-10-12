# Border-free Mobile Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline; one independent review at completion. No implementation subagents.

**Goal:** Replace decorative outlines with coherent Light/Dark surface fills, publish a reviewable Mobile PR, and release the already merged 2.0.0 Android preview.

**Architecture:** Keep copied PanelUI compound components, existing routes, data contracts and layouts. Normalize shared fills, then remove decorative outlines in active callers. Figma Current remains authoritative.

**Tech Stack:** Expo 57, React Native 0.86, PanelUI 0.109, Uniwind, Figma.

**Spec:** User request on 2026-10-12; https://www.figma.com/design/6uIaVRM63oHA723WKgjo5k/Aleconnect-mobile

## Global constraints

- Preserve recent VS Code Home edits, existing signer, caches/queues, private files, and primary checkout.
- Dark background remains #00060F. Text and icons retain at least 4.5:1 and 3:1 contrast respectively where required.
- Remove decorative component strokes; preserve Lucide/illustration/map strokes, spinner arcs and visible keyboard focus.
- No dependency, route, schema, business authorization or layout redesign.
- GitHub preview APK comes from merged c94da9e (2.0.0/code54); the border-free change remains a separate open PR.

## Review focus

- Nested cards/fields/sheets must remain distinguishable without outlines.
- Unchecked, selected, invalid, disabled and keyboard-focused controls retain visible states.
- Glass sign-in controls need readable values and focus above the image background.
- Unread reports retain their notification indicator without a border.
- Android platform controls and spinners must retain functionality.

## Tasks

- [x] Capture live Staff rollback metadata, merge PR40, verify deployed commit/bindings and read-only API boundaries.
- [x] Build fixture-free signed APK; verify package/code/signature/alignment/API, publish GitHub prerelease with checksums.
- [x] Inspect Graphify/source leads; save Figma stroke/token recovery evidence; update active frames and component library before code.
- [x] Modify theme.css, global.css, copied PanelUI decorative styles, active feature classes and native style outlines; retain geometry, radii and accessible state indicators.
- [x] Extend tests/ui-theme-contract.test.mjs for surface hierarchy and contrasting text/selection/focus; run all tests, types, lint/harness, web export and rendered Light/Dark main/form/sheet checks.
- [x] Refresh Graphify with generated output preserved separately; independent review; detailed commit, push, create and attach Mobile PR.
- [x] Update scoped handoff/history/changelog and finish with repository status and release limits.

## Ledger

- PR40 merged d6d329ffb01e0b092e5fa5d96e67af8b406b9bfb; 39 targeted authorization/metadata/intake/account checks passed. Deployment run 38235668155 succeeded; 17 live verification assertions passed.
- Isolated branch codex/mobile-borderless-ui at c94da9e; Figma and source edits complete. Initial baseline required existing sync:web-map; final sibling-aware baseline 431/431 passes.
- Ruling: static outlines are removed while functional spinner/vector strokes and keyboard focus remain. They convey state and accessibility rather than container decoration.

- GitHub preview v2.0.0-preview.1 published from c94da9e; signed/code54/fixture-free/16KB and uploaded checksum verified.
- Independent review passed after Input fixes; [scope and evidence](../../borderless-ui-review.md). Final tests433/433, types, lint0 errors/181 retained warnings, harness/whitespace and fixture-free web export pass. The independent reviewer approves the scoped source; PR publication is the final handoff.

- Integration: user-authorized PR #4 merge 27cfc2f; fresh merged-canonical 433/433 tests/types/harness/whitespace and merged CI pass. Task worktree/local/remote branch and empty former folder are removed; protected state and nine stashes are unchanged. Local/remote default master match. No updated border-free APK is implied.
