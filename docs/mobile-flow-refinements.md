# Mobile flow refinements

Scope: requested ticket, report creation, advisory, map and notification-settings changes. Preserve manual edits, API contracts, signing configuration and device queues. Figma is updated before implementation.

| Area | Acceptance | Status |
| --- | --- | --- |
| Ticket details | Balanced “Ticket details” header; body reference with copy; aligned status; pull refresh; no evidence refresh button or raw coordinates | Implemented; source and browser verified |
| Issue selection | Continue always confirms the type cards again for multi-type categories | Implemented; bug reproduced before fix; tests/browser pass |
| Report navigation | Appbar Back asks to leave; footer Back retains previous-step behavior | Implemented; browser confirmation verified; queued-work guard retained |
| Report location | Map/detail first, two actions in one row; useful detail placeholders | Implemented; Figma/browser verified |
| Map | Initial location at street zoom; bounded camera; reject pins outside Albay land polygons and water; user puck without automatic camera follow; spinner top right | Implemented on native/web; tests/browser water rejection and native/Hermes compilation pass; GPS acceptance remains separate |
| Advisory details | Pull-to-refresh replaces the redundant refresh button | Implemented; source/browser controls verified; native gesture acceptance separate |
| Notification settings | Broadcast saving/sync status replaces selection count; verify device setup permission/token/server flow | Implemented; denied/granted/token/server tests and fixture button pass |
| Broadcast sheet | Token-based card separation in Light and Dark; one attached keyboard-aware sheet | Implemented; rendered fills verified in both themes, zero borders/shadows |
| Verification | Focused regressions, full tests/types/lint, browser Light/Dark flows, Figma screenshots, review | 444/444 tests, zero skips; types/scoped lint/harness; fixture-free Android/Hermes + web export; read-only review clear |

Plan: inspect and reproduce → update affected Figma frames → implement shared fixes → verify and review → document evidence and remaining native/provider limits.

Baseline: Mobile master `00bd66e`, clean. Staff has unrelated edits in skills/plugin configuration; untouched. Integrated browser uses labelled fixtures, not private live data.

Figma: active file `6uIaVRM63oHA723WKgjo5k`, page94:2045. Canonical ticket94:4418, location94:6111, details94:4864, map403:4807/403:4847 and Alerts/Broadcast variants updated before the corresponding implementation. Existing advisory detail already has no manual latest-refresh control. The shared sheet token remains #EFF2F6 Light / #1A1F27 Dark, with white/#141A22 cards.

Evidence: external task evidence directory `mobile-flow-refinements-2026-10-13` contains rendered Figma/browser screenshots, full-test/export logs and separately refreshed final Graphify analysis (3925 nodes,7355 edges,289 communities). Generated analysis is kept outside the source commit. Review fixes cover native search/cancel/retry recentering, revoked notification permissions, false clipboard success and activating the puck after Android search permission.

Limits: physical GPS/puck/camera gestures/geocoding, remote push delivery/private authenticated API and native iOS are unverified. The installed React Native Web RefreshControl is a placeholder; browser checks prove controls/layout and native callback wiring, not a browser refresh gesture. Polygon validation uses the existing bundled administrative land geometry and retains the Staff/API coordinate range (longitude123.25–124); this pass does not change server geography, schema or credentials. Expo’s [setup guidance](https://docs.expo.dev/push-notifications/push-notifications-setup/) confirms channels precede permission/token requests on Android.

Integration: [PR7](https://github.com/aymkopi/aleconnect-mobile/pull/7) merged after both exact-head checks passed for source `9dbce76`; merge `87daab0` is fast-forwarded into canonical local master and matches remote master. Existing Android alpha workflow [run38293403614](https://github.com/aymkopi/aleconnect-mobile/actions/runs/38293403614) is building the merged source. This is source/JS/Hermes acceptance, not a claim that the new APK is already published or accepted on a real device. The completed feature branch can be removed by verified ancestry; all nine stashes and protected configs/queues are retained.
