# Mobile API Refresh Matrix

API target: `https://api.aleconnect.app`
Branch: `codex/mobile-api-refresh`
Android device: `25040RP0AG` via wireless ADB `192.168.1.31:41667`

| Route group | Methods | Staff handler | Mobile reader | State owner | Screen/journey | Automated result | Device result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/api/auth/*` | POST/GET | `api/auth/[...all].ts` | `src/services/auth.ts`, `src/services/api.ts` | SecureStore session | Sign in/out/session | Task 2 pass: 37/37 focused | Account-number sign-in, safe invalid account/email states, sign-out, and restart-to-guest pass against live API |
| `/api/mobile/auth/change-password` | POST | `api/mobile/auth/change-password.ts` | `src/services/auth.ts` | session | Required-password screen | Task 2 pass: 37/37 focused | Blocked: disposable credentials unavailable |
| `/api/mobile/consumer-identity` | GET/POST | `api/mobile/consumer-identity.ts` | `src/services/consumer-identity.ts` | identity/access snapshot | Email setup and app bootstrap | Task 2 pass: 37/37 focused | Authenticated bootstrap reaches optional email setup; skipping returns Home; unauthenticated boundary returns 401 |
| `/api/mobile/linked-accounts` | GET/PATCH | `api/mobile/linked-accounts.ts` | `src/services/linked-accounts.ts` | identity/account/revision | Profile accounts | Task 2 pass: 37/37 focused | One linked account and default state load; default mutation not applicable because only one account exists |
| `/api/mobile/account-link-requests` | GET/POST | `api/mobile/account-link-requests.ts` | `src/services/account-link-requests.ts` | identity/access revision | Link-account request | Task 2 pass: 37/37 focused | Empty history loads; new link is correctly gated on email setup, so no request was submitted |
| `/api/mobile/profile` | GET/PATCH | `api/mobile/profile/index.ts` | `src/services/profile.ts` | selected account/revision | Profile details/address | Task 2 pass: 37/37 focused | Profile reads pass; phone update passes and the original value is restored with DB equality proof; guest boundary passes |
| `/api/mobile/profile/avatar-*` | POST/PUT/POST | `api/mobile/profile/avatar-upload.ts`, `avatar-complete.ts` | `src/services/profile.ts` | selected account/revision | Profile avatar | Task 2 pass: 37/37 focused | Blocked: neutral reversible upload image unavailable |
| `/api/mobile/complaints/meta` | GET | `api/mobile/complaints.ts` | `src/services/reports.ts` | bounded metadata cache | New report form | Task 3 pass: 72/72 focused | Live metadata drove the non-emergency Line Clearing form, saved-home location, required evidence, and Review state |
| `/api/mobile/complaints` | GET/POST | `api/mobile/complaints.ts` | `src/services/reports.ts`, `report-queue.ts` | identity/account/revision caches | Recent, Archive, submit | Mobile contracts pass 72/72; Staff regression passes 41/41 | Recent/Archive reads and safe queue/retry pass. Final POST is blocked by the live Staff SQL placeholder defect fixed but not deployed on `codex/mobile-api-refresh-server` commit `37768d9` |
| `/api/mobile/complaints/:id` | GET | `api/mobile/complaints.ts` | `src/services/reports.ts` | scoped detail cache | Report detail/history/map | Task 3 pass: 72/72 focused | Existing report detail loads status, map/location, and two signed evidence controls without JS/native errors |
| `/api/mobile/complaints/evidence-upload` | POST/PUT | `api/mobile/complaints.ts` | `src/services/reports.ts` | protected local evidence | Evidence picker/upload | Task 3 pass: 72/72 focused | Gallery selection and neutral image preparation pass; Worker tail proves evidence-upload setup succeeds before the final POST rolls back |
| `/api/mobile/advisories` | GET | `api/mobile/advisories.ts` | `src/services/advisories.ts` | identity/revision cache | Home/feed/detail | Task 4 pass: 36/36 focused | Home preview, three-item active feed, detail, published/schedule copy, and background/resume refresh pass; one transient live 500 rendered safe error copy before recovery |
| `/api/mobile/notifications` | GET/POST | `api/mobile/notifications.ts` | `src/services/notifications.ts` | identity/revision/filter cache | Feed/read/navigation | Task 4 pass: 36/36 focused | Paginated feed, unread count, Unread and Report/Advisory filters, one read/open action, badge, and Report detail navigation pass |
| `/api/mobile/push-notifications` | GET/POST | `api/mobile/push-notifications.ts` | `src/services/notification-settings.ts` | user settings cache | Push settings/token | Task 4 pass: 36/36 focused | Android permission is allowed; token/settings load; Power Advisories autosave toggled off/on and a fresh server read proved the original enabled state restored |
| `/api/mobile/hotlines` | GET | `api/mobile/hotlines.ts` | `src/services/hotlines.ts` | public bounded cache | Search/category/contact | Task 4 pass: 36/36 focused | Live directory, stale-cache banner during timeout, recovered refresh, Electricity search, categories/All sheet, and call/copy controls pass; no action URL was launched |

## Baseline notes

- Staff `main` has protected unrelated UI and Graphify changes; this refresh does not touch them.
- `25040RP0AG` is the device with ALEConnect foreground. `25069PTEBG` is connected separately and was not selected.
- Canonical Metro remains on reverse port 8081; worktree runtime uses port 8082.
- Mobile route contracts pass 31/31; Staff route/runtime registration passes 19/19 from the Staff repository root.
- Full mobile baseline passes 197/197 JavaScript tests and 11/11 TypeScript tests.
- `npx tsc --noEmit` and `npm run harness:check` pass.
- `npm run lint` passes with zero errors and four existing warnings: three unused-value warnings and one map-picker hook dependency warning.
- Task 2 fixed the shared development fallback from the Expo host on port 5173 to `https://api.aleconnect.app`; the production build remains fail-closed without explicit HTTPS configuration.
- Task 2 used a read-only production credential lookup and local hash verification; no username, password, phone number, or session token is stored in repository evidence.
- Task 3 forced the Android proxy to `127.0.0.1:9`, proved the protected queued report remained visible, and restored the original direct-network state to `:0` in `finally`.
- The single approved non-operational report remains queued with its original idempotency key. Worker tail proved the live API returns MySQL `ER_PARSE_ERROR` because its 19-column ticket insert has 20 values; failed transactions inserted no ticket. The one-placeholder fix is verified on isolated Staff commit `37768d9` but intentionally not deployed.
- Task 4 changed one notification preference only for reversible verification, restored it immediately, and re-read the enabled value from the server. Opening one current-account Report notification exercised the existing read action and routed to the matching Report detail.
- Live provider push receipt and iOS behavior remain unverified; no synthetic provider event, call, website, EAS, OTA, release, or store action was performed.
