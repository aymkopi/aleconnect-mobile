# Mobile API Refresh Matrix

API target: `https://api.aleconnect.app`
Branch: `codex/mobile-api-refresh`
Android device: `25040RP0AG` via wireless ADB `192.168.1.31:41667`

| Route group | Methods | Staff handler | Mobile reader | State owner | Screen/journey | Automated result | Device result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/api/auth/*` | POST/GET | `api/auth/[...all].ts` | `src/services/auth.ts`, `src/services/api.ts` | SecureStore session | Sign in/out/session | Baseline pass | Task 2 journey |
| `/api/mobile/auth/change-password` | POST | `api/mobile/auth/change-password.ts` | `src/services/auth.ts` | session | Required-password screen | Task 2 focused gate | Restricted: disposable credentials required |
| `/api/mobile/consumer-identity` | GET/POST | `api/mobile/consumer-identity.ts` | `src/services/consumer-identity.ts` | identity/access snapshot | Email setup and app bootstrap | Task 2 focused gate | Task 2 journey |
| `/api/mobile/linked-accounts` | GET/PATCH | `api/mobile/linked-accounts.ts` | `src/services/linked-accounts.ts` | identity/account/revision | Profile accounts | Task 2 focused gate | Task 2 journey |
| `/api/mobile/account-link-requests` | GET/POST | `api/mobile/account-link-requests.ts` | `src/services/account-link-requests.ts` | identity/access revision | Link-account request | Task 2 focused gate | Valid supplied credentials required |
| `/api/mobile/profile` | GET/PATCH | `api/mobile/profile/index.ts` | `src/services/profile.ts` | selected account/revision | Profile details/address | Task 2 focused gate | Task 2 journey |
| `/api/mobile/profile/avatar-*` | POST/PUT/POST | `api/mobile/profile/avatar-upload.ts`, `avatar-complete.ts` | `src/services/profile.ts` | selected account/revision | Profile avatar | Task 2 focused gate | Task 2 journey |
| `/api/mobile/complaints/meta` | GET | `api/mobile/complaints.ts` | `src/services/reports.ts` | bounded metadata cache | New report form | Task 3 focused gate | Task 3 journey |
| `/api/mobile/complaints` | GET/POST | `api/mobile/complaints.ts` | `src/services/reports.ts`, `report-queue.ts` | identity/account/revision caches | Recent, Archive, submit | Task 3 focused gate | Task 3 journey |
| `/api/mobile/complaints/:id` | GET | `api/mobile/complaints.ts` | `src/services/reports.ts` | scoped detail cache | Report detail/history/map | Task 3 focused gate | Task 3 journey |
| `/api/mobile/complaints/evidence-upload` | POST/PUT | `api/mobile/complaints.ts` | `src/services/reports.ts` | protected local evidence | Evidence picker/upload | Task 3 focused gate | Task 3 journey |
| `/api/mobile/advisories` | GET | `api/mobile/advisories.ts` | `src/services/advisories.ts` | identity/revision cache | Home/feed/detail | Task 4 focused gate | Task 4 journey |
| `/api/mobile/notifications` | GET/POST | `api/mobile/notifications.ts` | `src/services/notifications.ts` | identity/revision/filter cache | Feed/read/navigation | Task 4 focused gate | Task 4 journey |
| `/api/mobile/push-notifications` | GET/POST | `api/mobile/push-notifications.ts` | `src/services/notification-settings.ts` | user settings cache | Push settings/token | Task 4 focused gate | Task 4 journey |
| `/api/mobile/hotlines` | GET | `api/mobile/hotlines.ts` | `src/services/hotlines.ts` | public bounded cache | Search/category/contact | Task 4 focused gate | Task 4 journey |

## Baseline notes

- Staff `main` has protected unrelated UI and Graphify changes; this refresh does not touch them.
- `25040RP0AG` is the device with ALEConnect foreground. `25069PTEBG` is connected separately and was not selected.
- Canonical Metro remains on reverse port 8081; worktree runtime uses port 8082.
- Mobile route contracts pass 31/31; Staff route/runtime registration passes 19/19 from the Staff repository root.
- Full mobile baseline passes 197/197 JavaScript tests and 11/11 TypeScript tests.
- `npx tsc --noEmit` and `npm run harness:check` pass.
- `npm run lint` passes with zero errors and four existing warnings: three unused-value warnings and one map-picker hook dependency warning.
