# Figma completion acceptance — 2026-10-10

Worktree: C:/Users/Justine/VSCodeProjects/aleconnect-panelui, branch codex/panelui-five-main, base bf7b2a0. Staff companion: C:/Users/Justine/.codex/worktrees/profile-update-auth/aleconnect, branch codex/profile-update-auth. Local, uncommitted app implementation. The separately approved API Worker patch is deployed from current remote main7c67df1 plus the reviewed patch in C:/Users/Justine/.codex/worktrees/mobile-api-release/aleconnect; no production data mutation or app-store release.

## Scope and design authority

The current Figma file 6uIaVRM63oHA723WKgjo5k, page 94:2045, remains authoritative. The 389-frame inventory maps **337 to source-covered screens/states, 3 to capability limitations and 49 to excluded onboarding/archive/foundation specimens**. No source-partial frame remains in this bounded audit. Shared states can use a single route: these are not 337 separate routes or an exhaustive pixel-parity certificate. Login, session recovery and mandatory security setup are included; onboarding is excluded.

Completed Explore and the nine-service catalog, selected-account Home context, scoped global search, hotline directory and ALECO contact sheet, public guest reads and protected continuation, notification inbox/detail/filter/resilience states, alerts recipient search, sign-in/context/help/session-resume/linking reset/password success, and native/web full-map reporting. Existing Reports, Advisories and Profile child flows remain integrated. Reference coverage, owning source paths and exclusions are recorded in the external coverage map.

PanelUI is the active primitive library; platform APIs, Lucide icons and MapLibre compose inside it. Reusable former presentation sources remain under legacy/presentation. Thin Expo Router files remain under src/app; features own screens/presentation, services own API calls, and src/components/panelui owns copied primitives. The PanelUI provider retains gesture, portal, toast and keyboard ownership without duplicating consumer/session/queue providers.

Foundations: 16px sides, default 12px card radius, consistent 12px section gaps, Inter body/controls and Plus Jakarta Sans headings, matched 48px input decorator slots, compact Lucide icons, the floating five-tab pill, unchanged 4x2 Home shortcuts and hidden page scrollbars. Sheets use one host with content Back navigation and shared separator/footer spacing. They now close on route blur, preventing a portal from covering a newly opened page. ALECO sheet height is explicitly 72% of the current viewport. Standard Home fits without scrolling on the task emulator; shorter/enlarged-text screens scroll and reserve navigation clearance.

## Dependencies and maps

Expo 57.0.27 / React Native 0.86.3 / React 19.2.3. Copied PanelUI base 0.107.1 with reviewed ProgressButton 0.108.0 adaptations and recorded provenance. Reanimated 4.5.5, Worklets 0.10.4 and keyboard-controller 1.22.6 are explicit compatibility maintenance exceptions; no incompatible forced major upgrade was applied. Expo alignment passes and Expo Doctor reports 21/21.

MapLibre React Native remains the native renderer. Lazy MapLibre GL JS 6.13 is web-only, with CSS and versioned same-origin worker/shared module/license copied by sync:web-map and postinstall. Generated public worker assets are ignored. Native full-screen mapping, zoom and fixture confirmation were exercised; device GPS, geocoding/provider failures and every live pin case remain separate acceptance work.

Dependency audit records 41 transitive advisories: 11 moderate, 30 high, 0 critical. Compatible non-force updates removed the prior critical advisory. Store/native release must address or explicitly assess remaining vulnerable dependency paths; this preview is not a security release sign-off.

## API and identity contracts

Staff owns new /api/mobile/public/advisories and /api/mobile/public/updates list/detail handlers, registered in Vite and the Worker. Public readers expose only currently eligible All-target advisories and eligible standalone published posts. Null/unknown/selected scope, draft/future/expired/inactive advisories and private/mirrored/deleted/pending posts are excluded. Authenticated routes and caches retain consumer scope; cached data never grants access.

Recently updated reports add sort=updated, optional updatedAt and exact microsecond timestamp/id keyset pagination. Old sorts/cursors/payloads remain compatible. Profile PATCH verifies the selected service account password, locks current ownership/access revision and active-report eligibility, validates supported fields and commits atomically. Unknown report status blocks editing. Unified identity email cannot silently become service-account data. No schema migration was applied.

Token writes are serialized and revision-guarded. Stale 401 responses, late login/session reads, rejected staff credentials and unmounted submissions cannot replace or remove a newer consumer token. Login uses authToken:null. Required-password completion waits for an explicitly refreshed same-principal session; uncertain results retry the session read instead of repeating a mutation. Linking continuation signs out of the temporary target account before email sign-in. Guest continuation uses allowlisted destinations only; no promise to retain unsaved report form state.

Billing reminders open Advisory detail through the existing notification destination. Informational connection/service/payment guides use official ALECO content and channels; they do not fabricate payment or application transactions. Report KPIs explicitly count loaded records, not complete server totals. Compatible Staff contracts are now deployed at Worker a2e1d186-ef42-43d9-b2b2-036cf096b7ca, verified100% after56 focused contracts/build/lint/harness and25 read-only production assertions. Live schema/EXPLAIN and all21 Mobile service routes are verified. Real authenticated mutations remain unverified.

## Verified checks

| Check | Result |
| --- | --- |
| Complete Mobile tests |418/418 pass, zero skip/failure on final application source; version33 packaging changes only |
| Mobile TypeScript |Pass; copied-source scoped lint0 errors/14 documented warnings |
| Current Staff API contracts |56/56 pass, zero skip/failure, including current advisory topics and selected-service ownership |
| Current Staff TypeScript/Vite, scoped lint |Pass / zero lint diagnostics using current-main locked dependencies |
| Route/harness/whitespace |21 matching service paths; both task harnesses and whitespace checks pass |
| Expo alignment / Doctor |Pass /21 of21 |
| Real Android preview |ARM64+x86_64, embedded fresh Hermes, original local signer; all54 native libraries and ZIP alignment pass16KB |
| Web / iOS Hermes export |Bounded --max-workers2 retry passes after preserved Windows Hermes failure; native iOS not built |
| Source identity |All239 application fingerprints match real v33;150 Staff release inputs unchanged at deployment |
| API production |Worker339/a2e1d186 at100%;25 read-only HTTP assertions pass, all bindings retained |
| Primary preservation |Six pre-existing Mobile task-document hashes retained; primary Staff/Mobile/Lineman not updated |
| Graphify |Mobile4300/8020, current-release Staff11030/20593 nodes/edges; generated churn kept separate |

## Real installed device preview — v33

APK: C:/Users/Justine/Desktop/AleconnectApps/aleconnect-panelui-device-preview-v33.apk. Version33,103,951,961 bytes, ARM64+x86_64, Android7/API24+. SHA25623390500E0C6E694C5A3D134F56CBE5B946CF7656026EE6EF5D02301481F26DB. Same package/local-preview certificate as the original Desktop APK. Play Store signer and32-bit ARM support are not claimed.

Existing Firebase client/Expo project, notification manifest/services and HTTPS API origin are verified. EXPO_PUBLIC_PANELUI_PREVIEW=0; first cached v33 bundle was rejected, then the bundle task was forced fresh before assembly. The installed app has real sign-in and no fixture launcher. See [device handoff](panelui-device-preview.md).

AleconnectPanelUIClean is Android16/API36.1,4KB x86_64,1080x2400/density420. It runs live guest Home, Advisories and advisory detail with hardware Back; PID8797 remains and the crash buffer is empty. No authentication, push send, production mutation or replay was attempted. The older Android15/16KB task emulator is stopped without data clear, preserving its saved queue/evidence. Its ART ScreenStack transition SIGSEGV remains unresolved; a successful clean-emulator unchanged-edit Back check is bounded evidence, not a native crash fix.

## Historical labelled-fixture acceptance — v30

APK: C:/Users/Justine/Desktop/AleconnectApps/aleconnect-panelui-completion-v30.apk

- Version code: 30; 68,740,561 bytes; x86_64.
- SHA-256: a97d1874d2b25bf9591f2c9ed80b167c4f5c5fdf3de70054a971a1707a6787b0.
- Package: com.kapecakes.aleconnectmobile.
- Certificate SHA-256: fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c.
- Task AVD: AleconnectPanelUIPreview, Android 15/API 35, 16KB x86_64, 1080x2400 at density 420.
- In-place install preserved firstInstallTime 2026-10-09 03:36:24. No uninstall, data clear, downgrade bypass or phone interaction.

Native inspection exercised sign-in, five main pages, Reports updated-sort filtering, notification inbox/filters, alerts recipient search with hidden selections retained, ALECO contact search/no-match/reset, full-screen map load/zoom/return, shared-sheet route dismissal, standard Home no-scroll fit and dark 130% readable scrolling. A 500ms emergency hold cancelled; a 3200ms hold completed with dialling explicitly blocked by labelled fixtures. Web keyboard confirmation completed with the same fixture guard. No real emergency call was made.

Read-only retained-data checks preserve storageDigest ddda1e068222e377df3de9401a6ed7b6, queueCount 1, and the existing 68-byte evidence digest d8bb5d59888d24b6e13af6a76b0bb7a5. Preview pauses queue replay/background writes/push registration; no retained queue action or live report submission was performed. Versions 26–29 are superseded diagnostics; version30 was the dated fixture review artifact; it is superseded by v32 fixtures and the real v33 device APK. Light/font scale 1.0 restored after inspection.

Evidence root: C:/Users/Justine/.codex/visualizations/2026/10/06/01a11159-52ae-76a2-8dfa-7672826bbaea/outputs/redesign-04/native-implementation/figma-completion. It contains frame inventory/coverage, tests/build/type/lint/Doctor/audit logs, source fingerprints, signer/APK metadata, retention results, native screenshots/journal and graph checkpoints. Native screenshots establish bounded rendered evidence; browser screenshot capture was unavailable, so browser claims use UI/DOM/worker observations only. The billing fixture still opens a generic advisory; it does not prove final billing-message content.

## Remaining release gates

1. Diagnose the older Android15/16KB ART transition SIGSEGV; complete physical/native-iOS/background/retained-data acceptance. No crash fix is claimed from clean Android16 success.
2. Configure real email ownership verification/recovery and approved ALEConnect-specific terms. Capability-unavailable UI remains intentional; existing mock settings do not prove ownership.
3. Perform disposable authenticated report/profile/password/link/unlink and selected-account acceptance. API release and read-only schema/HTTP checks are complete; they do not prove live mutation journeys.
4. Exercise real push, camera/GPS/provider errors, uploads/replay/signed-URL renewal and spoken accessibility. Eligible public Facebook post detail has no current live sample. Every Figma state is not rendered/certified.
5. Resolve or assess41 transitive dependency advisories and complete store signing/supported-device acceptance. The device preview excludes32-bit ARM.

The approved API Worker deployment is complete. No commit/push/merge, Pages/other Worker/OTA/EAS/store release or production data mutation was performed. The real APK is ready for device preview, not final production release sign-off.
