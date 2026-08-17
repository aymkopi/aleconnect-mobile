# Advisory Card Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign consumer advisory cards to match the compact report-card system and add authoritative audience text to the mobile advisory API.

**Architecture:** Keep advisory targeting and keyset pagination unchanged. The staff API adds an additive nullable `audience` field assembled after the paginated advisory rows are selected, using batched feeder/substation lookups so target joins cannot multiply list rows. Mobile keeps the field optional for cache/backend compatibility and formats publication/interruption timestamps through the existing strict `Asia/Manila` utility.

**Tech Stack:** React Native + Expo Router + TypeScript + Uniwind/Gluestack UI primitives; Node test runner; Vite SSR lifecycle tests; MySQL/Aiven staff API.

## Global Constraints

- Do not change advisory eligibility, targeting, publication, notification, or cursor semantics.
- Do not add a database migration.
- Do not issue per-card advisory detail requests.
- `audience` is additive and optional/nullable on mobile.
- Interruption timing uses only `scheduledStartAt` + `scheduledEndAt`; if either is missing/invalid, show advisory type only.
- All timestamps are interpreted/formatted with strict offset-aware parsing and `Asia/Manila`.
- Advisory title/content stay available in details but are not shown in the list card.
- Audience is one line and ellipsized.
- Severity is the only badge.

---

### Task 1: Extend the staff mobile advisory contract with audience

**Files:**
- Modify: `../Aleconnect/api/mobile/advisories.ts`
- Modify: `../Aleconnect/tests/lifecycle/consumer-mobile-hardening.test.mjs`
- Modify: `../Aleconnect/docs/agent-harness/implementation-history.md`

**Interfaces:**
- Produces: `MobileAdvisory.audience` JSON property as `string | null`.
- Preserves: existing `GET /api/mobile/advisories` list/detail filtering and cursor order.

- [ ] **Step 1: Extend the DTO regression first**

Add `target_scope: "all"` and `audience: "All consumers"` to the advisory input fixture and expect `audience: "All consumers"` from `toConsumerAdvisory`.

- [ ] **Step 2: Run the focused lifecycle test and confirm it fails**

Run:

```powershell
node --test tests/lifecycle/consumer-mobile-hardening.test.mjs
```

Expected: DTO assertion fails because `audience` is not yet serialized.

- [ ] **Step 3: Add audience to `AdvisorySource` and `toConsumerAdvisory`**

Use:

```ts
type AdvisorySource = {
  advisory_id: string
  control_number: string | null
  advisory_type: string
  target_scope: "all" | "selected"
  title: string
  content: string
  severity: string
  effective_at: string
  expires_at: string | null
  scheduled_start_at: string | null
  scheduled_end_at: string | null
  published_at: string
  cursor_effective_at: string
  audience: string | null
}
```

and add:

```ts
audience: row.audience,
```

to `toConsumerAdvisory`.

- [ ] **Step 4: Keep the page query cardinality unchanged and batch-load audience names after pagination**

Project `a.target_scope` in the existing SELECT. After `visibleRows` is calculated, derive IDs for only selected-scope rows and query feeder/substation names with `IN (...)` lists. Build a `Map<string, string>` from ordered, deduplicated names. Global advisories map to `All consumers`; selected advisories with no resolvable target names map to `null`.

The returned mapper should pass each row to `toConsumerAdvisory` with an `audience` property rather than joining target tables into the paginated SELECT.

- [ ] **Step 5: Add a source regression proving target lookup cannot multiply the paginated query**

In the lifecycle test, read `api/mobile/advisories.ts` and assert the main query still orders/limits directly from `advisories a`, while audience target tables are queried separately after `visibleRows`.

- [ ] **Step 6: Run staff verification**

```powershell
node --test tests/lifecycle/consumer-mobile-hardening.test.mjs
npm run build
npm run lint
npm run harness:check
git diff --check
```

- [ ] **Step 7: Commit staff changes**

```powershell
git add api/mobile/advisories.ts tests/lifecycle/consumer-mobile-hardening.test.mjs docs/agent-harness/implementation-history.md
git commit -m "feat: expose advisory audience"
```

---

### Task 2: Add Manila advisory card time formatting

**Files:**
- Modify: `src/utils/manila-time.ts`
- Modify: `tests/manila-time.test.mjs`

**Interfaces:**
- Produces: `formatManilaAdvisoryInterruptionRange(start: string | null, end: string | null, reference?: Date): string | null`.
- Reuses: `formatManilaReportListDateTime(value: string): string` for publication timestamps.

- [ ] **Step 1: Add failing formatter tests**

Test same-day Today, non-today date, cross-day range, missing endpoint, and offset-free endpoint rejection.

- [ ] **Step 2: Run focused test and confirm failure**

```powershell
node --test tests/manila-time.test.mjs
```

- [ ] **Step 3: Implement the formatter**

Use existing `parseApiInstant`, `manilaCalendarParts`, and `manilaReportListTimeFormatter`. Add fixed month abbreviations `Jan.` through `Dec.` so output matches the approved `Aug. 18` copy exactly. Return `null` if either endpoint is absent/invalid.

- [ ] **Step 4: Run the formatter tests**

```powershell
node --test tests/manila-time.test.mjs
```

Expected: all pass.

---

### Task 3: Extend the mobile advisory model safely

**Files:**
- Modify: `src/services/advisories.ts`
- Modify: `tests/advisory-feed.test.mjs`

**Interfaces:**
- Produces: `readonly audience?: string | null` on `MobileAdvisory`.

- [ ] **Step 1: Add source-contract assertion for optional audience**

Assert service source contains `readonly audience?: string | null`.

- [ ] **Step 2: Add the property to `MobileAdvisory`**

```ts
readonly audience?: string | null;
```

Do not change the cache key/version; older cached rows without this optional field remain valid.

- [ ] **Step 3: Run advisory feed test**

```powershell
node --test tests/advisory-feed.test.mjs
```

---

### Task 4: Replace the legacy advisory list item with the compact card

**Files:**
- Modify: `src/features/advisories/advisory-list-item.tsx`
- Modify: `tests/advisory-feed.test.mjs`

**Interfaces:**
- Consumes: `MobileAdvisory`, `formatManilaAdvisoryInterruptionRange`, `formatManilaReportListDateTime`.
- Produces: `AdvisoryListItem({ advisory, onPress })` standalone bordered card.

- [ ] **Step 1: Add failing UI source assertions**

Assert the shared card uses `Pressable`, `ChevronRight`, the two Manila formatters, `controlNumber`, `type`, `severity`, and one-line `audience`; assert it no longer imports `Megaphone` or `ListSectionItem` and no longer renders `advisory.title` / `advisory.content`.

- [ ] **Step 2: Replace the component**

Use report-card-compatible classes: `rounded-lg border border-border bg-card px-4 py-3 active:bg-secondary`, top metadata row, `text-base font-semibold` primary line, `text-xs` metadata, compact severity badge, one-line audience, 18px chevron.

- [ ] **Step 3: Run the advisory source test**

```powershell
node --test tests/advisory-feed.test.mjs
```

---

### Task 5: Integrate standalone cards into Advisories and Home

**Files:**
- Modify: `src/app/advisories.tsx`
- Modify: `src/app/(tabs)/home.tsx`
- Modify: `tests/advisory-feed.test.mjs`

**Interfaces:**
- Preserves: `/advisory/[id]` navigation, pagination, refresh, stale notice, empty state.

- [ ] **Step 1: Update source assertions**

Assert both routes render `AdvisoryListItem`; assert the dedicated feed no longer wraps each card in `ListSection`; assert both continue routing to `/advisory/[id]`.

- [ ] **Step 2: Update `/advisories`**

Remove `ListSection` import and wrapper. Render `AdvisoryListItem` directly. Change separator to `h-2`. Replace generic skeleton with a compact bordered card skeleton matching the new hierarchy.

- [ ] **Step 3: Update Home Active advisories only**

Keep Quick actions unchanged. Replace the advisory `ListSection` container with a simple `View className="gap-2"` containing the existing heading/action row and a nested `View className="gap-2"` for advisory cards. Keep the existing empty-state list item inside its own `ListSection` so unrelated empty-state styling does not need a redesign.

- [ ] **Step 4: Run focused tests**

```powershell
node --test tests/advisory-feed.test.mjs tests/manila-time.test.mjs
```

---

### Task 6: Harness history and final verification

**Files:**
- Modify: `docs/agent-harness/implementation-history.md`
- Modify: `../Aleconnect/docs/agent-harness/implementation-history.md`

- [ ] **Step 1: Add newest implementation-history entries in both repos**

Document additive audience contract, compact card UI, Manila formatting, verification commands, no migration, and backend-first rollout.

- [ ] **Step 2: Run complete mobile gates**

```powershell
node --test tests/advisory-feed.test.mjs tests/manila-time.test.mjs
npx tsc --noEmit
npm run lint
npm run harness:check
git diff --check
git status --short
```

- [ ] **Step 3: Run complete staff gates**

```powershell
Push-Location ..\aleconnect
node --test tests/lifecycle/consumer-mobile-hardening.test.mjs
npm run build
npm run lint
npm run harness:check
git diff --check
git status --short
Pop-Location
```

- [ ] **Step 4: Commit mobile changes**

```powershell
git add src/services/advisories.ts src/utils/manila-time.ts src/features/advisories/advisory-list-item.tsx "src/app/(tabs)/home.tsx" src/app/advisories.tsx tests/advisory-feed.test.mjs tests/manila-time.test.mjs docs/agent-harness/implementation-history.md
git commit -m "feat: redesign advisory cards"
```

- [ ] **Step 5: Release order**

Deploy the additive staff API first, then ship the compatible mobile build. Do not apply a database migration.