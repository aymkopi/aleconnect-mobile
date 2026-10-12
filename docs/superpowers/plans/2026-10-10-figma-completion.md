# Figma completion implementation

Approved scope: finish consumer screens and state variants in final file 6uIaVRM63oHA723WKgjo5k/page94:2045; exclude onboarding, archived/superseded frames, component specimens. Existing Reports/Advisories/Profile flows remain. No live writes, release, remote push or physical-device changes.

Design: 16px gutters, default12px cards, matched48px input decorators, Lucide18/20px, Inter body and Plus Jakarta Sans headings. Child headers reuse ReportPage. Preserve floating5-tab pill and4x2 Home shortcuts; scroll indicators hidden. One BottomSheet with internal Back, no nesting. State variants share routes instead of duplicate screen code.

Implementation:
1. Inventory389 phone frames and map screen/state coverage; record excluded frames and authoritative references.
2. Align Expo57 patches; retain RN0.86.3/React19.2.3. Apply compatible Reanimated4.5.5/Worklets0.10.4 maintenance pair, reviewed MapLibre/Uniwind patches. Merge PanelUI source changes without overriding local adaptations; fix generator path metadata.
3. Complete centered glass sign-in (account/email/context variants), recovery help and mandatory password; preserve authentication and routing intent. No onboarding.
4. Build notification inbox, filters/date groups/search/message states with existing scoped API; preserve401/403 and revision boundaries, confirmed read mutations.
5. Complete Explore services/search, Home authorized account selector, full hotline directory, guest gates and public advisory/feed reads. Service/payment/connection previews are informational; no fabricated application/payment API.
6. Replace emergency SlideButton with continuous3-second ProgressButton; release/background/blur/unmount cancels. Keep fixture dial suppression and reduced-motion real-duration behavior.
7. Native MapLibre maps stay native; add GL JS web renderer using existing style/runtime/picker contracts. Motion enabled with platform reduced-motion behavior.
8. Thin Expo routes under src/app, features under src/features, services under src/services; preserve reusable legacy source. Finish aliases/callers/tests/config.
9. Focused behavior/authorization tests, full tests/typecheck/scopedlint, Expo alignment/Doctor, Android signed preview build and iOS/web export. Install in-place on task emulator only, verify signature/data retention and bounded light/dark/large-text journeys.
10. Fresh scoped review, update handoffs/history, refresh Graphify preserving generated evidence, final Git statuses. Report passed/baseline-failing/unverified separately.

Known limits: real email recovery/verification needs configured provider; approved terms/payment/connection content may be unavailable. Source implementation does not imply live backend deployment. Older native SIGSEGVs remain acceptance risks until reproduced/diagnosed.

Sources: https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/ ; https://docs.expo.dev/router/basics/notation/ ; https://panelui.dev/docs/components/progress-button ; https://maplibre.org/maplibre-react-native/docs/setup/getting-started/ ; https://maplibre.org/maplibre-gl-js/docs

## 2026-10-10 execution outcome

Steps 1–10 completed for source and bounded emulator preview review; release acceptance remains OPEN. Final preview 30, Mobile 407/407 and Staff 47/47 tests, aligned dependencies and Android/web/iOS export checks pass. The coverage map identifies 337 source-covered states, 3 capability limits and 49 exclusions. See [acceptance handoff](../../panelui-completion-acceptance.md) for exact evidence and gates; no all-frame pixel certificate or production-ready claim.
