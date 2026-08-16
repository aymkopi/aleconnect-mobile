# Report List Card Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign consumer report list cards to match the approved reference and add an additive staff-owned `displayAddress` field so each card can show the report location without per-row detail requests.

**Architecture:** The staff `/api/mobile/complaints` list query will project one deduplicated barangay/municipality row per ticket and serialize a nullable consumer-facing `displayAddress`. Mobile will treat the field as optional, normalize network and cached rows, add a dedicated Manila-time formatter for the compact card timestamp, and render the shared `ReportListGroup` as separate tappable cards instead of icon-led `ListSectionItem` rows.

**Tech Stack:** TypeScript, React Native 0.83, Expo 55, Expo Router, Gluestack/Uniwind UI primitives, Node test runner, Vite SSR test loading, MySQL.

## Global Constraints

- Staff owns the `/api/mobile/complaints` response contract; mobile must not query MySQL or infer missing address data with extra detail requests.
- `displayAddress` is additive and nullable on the server and optional/nullable on mobile so either side can roll out independently.
- Do not change complaint ownership/authentication, pagination cursor semantics, search/sort/filter behavior, queue behavior, status-push contracts, or report-detail UI.
- Do not add a database migration unless implementation inspection proves existing ticket/location fields are insufficient.
- Keep Manila-time parsing strict: offset-free API timestamps remain invalid.
- Official report cards remove the category-colored file icon and keep the entire card as one accessible press target.
- Missing or blank address text is omitted; never render `Unknown address`.
- The approved visual hierarchy is ticket number, status badge, report title, compact date/time, one-line muted address, trailing chevron.

---

### Task 1: Add the staff-owned `displayAddress` list contract

**Files:**
- Modify: `../Aleconnect/api/mobile/complaints.ts`
- Modify: `../Aleconnect/tests/lifecycle/mobile-complaint-page.test.mjs`

**Interfaces:**
- Consumes: existing ticket fields `purok_or_street`, `barangay_psgc`, `barangay_feeders.barangay_name`, and `municipalities.municipality_name`.
- Produces: `formatConsumerComplaintDisplayAddress(row: JsonRecord): string | null` and `toConsumerComplaintListItem(...).displayAddress: string | null`.

- [ ] **Step 1: Create an isolated staff branch**

```powershell
git -C ..\Aleconnect switch main
git -C ..\Aleconnect pull --ff-only
git -C ..\Aleconnect switch -c agent/report-list-card-redesign
```

Expected: staff work is isolated on `agent/report-list-card-redesign`; do not continue if unrelated worktree changes would be overwritten.

- [ ] **Step 2: Write failing staff serializer tests**

Add this test to `../Aleconnect/tests/lifecycle/mobile-complaint-page.test.mjs`:

```js
test("consumer report list exposes a compact display address", async (t) => {
  const { toConsumerComplaintListItem } = await loadModule(
    t,
    "/api/mobile/complaints.ts",
  )

  const base = {
    id: "ticket-1",
    ticketNumber: "AL26-081701",
    title: "Primary Line",
    description: null,
    status: "verified",
    createdAt: new Date("2026-08-15T01:00:00.000Z"),
    typeId: "type-1",
    typeTitle: "Primary Line",
    categoryId: "category-1",
    categoryTitle: "Service Drop",
  }

  assert.equal(
    toConsumerComplaintListItem({
      ...base,
      purok: "Purok 5",
      barangayName: "28 - Victory Village North",
      municipalityName: "City of Legazpi",
    }).displayAddress,
    "Purok 5, Brgy. 28 - Victory Village North, City of Legazpi",
  )

  assert.equal(
    toConsumerComplaintListItem({
      ...base,
      purok: "",
      barangayName: "Rawis",
      municipalityName: "City of Legazpi",
    }).displayAddress,
    "Brgy. Rawis, City of Legazpi",
  )

  assert.equal(
    toConsumerComplaintListItem({
      ...base,
      purok: "  ",
      barangayName: null,
      municipalityName: null,
    }).displayAddress,
    null,
  )
})
```

Also add a source-level regression test proving the list query uses a one-row-per-PSGC derived location join rather than directly joining `barangay_feeders`:

```js
test("consumer report list joins one location row per barangay PSGC", async () => {
  const source = await readFile(
    new URL("../../api/mobile/complaints.ts", import.meta.url),
    "utf8",
  )

  assert.match(source, /GROUP BY bf\.barangay_psgc/)
  assert.match(source, /locations\.barangayName/)
  assert.match(source, /locations\.municipalityName/)
  assert.match(source, /t\.user_id = \?/)
})
```

- [ ] **Step 3: Run the focused staff test and verify RED**

```powershell
npm --prefix ..\Aleconnect exec -- node --test tests/lifecycle/mobile-complaint-page.test.mjs
```

Expected: FAIL because `displayAddress` and the deduplicated list location projection do not exist yet.

- [ ] **Step 4: Implement the address formatter and list projection**

In `../Aleconnect/api/mobile/complaints.ts`, add this pure formatter near the other DTO helpers:

```ts
function consumerBarangayLabel(value: unknown) {
  const name = text(value)
  if (!name) return ""
  return /^(?:brgy\.?|barangay)\b/i.test(name) ? name : `Brgy. ${name}`
}

export function formatConsumerComplaintDisplayAddress(row: JsonRecord) {
  const parts = [
    text(row.purok),
    consumerBarangayLabel(row.barangayName),
    text(row.municipalityName),
  ].filter(Boolean)

  return parts.length ? parts.join(", ") : null
}
```

Extend the `getComplaints` query projection with:

```sql
t.purok_or_street AS purok,
locations.barangayName,
locations.municipalityName,
```

and add this deduplicated join after the ticket category join:

```sql
LEFT JOIN (
  SELECT
    bf.barangay_psgc,
    MIN(NULLIF(TRIM(bf.barangay_name), '')) AS barangayName,
    MIN(NULLIF(TRIM(m.municipality_name), '')) AS municipalityName
  FROM barangay_feeders bf
  LEFT JOIN municipalities m ON m.municipality_id = bf.municipality_id
  GROUP BY bf.barangay_psgc
) locations ON locations.barangay_psgc = t.barangay_psgc
```

Then extend `toConsumerComplaintListItem`:

```ts
displayAddress: formatConsumerComplaintDisplayAddress(row),
```

Do not add address columns to cursor comparison or ordering.

- [ ] **Step 5: Run focused staff tests and verify GREEN**

```powershell
npm --prefix ..\Aleconnect exec -- node --test tests/lifecycle/mobile-complaint-page.test.mjs
```

Expected: PASS, including the existing timestamp, Service Memo, ownership, cursor, and pagination tests.

- [ ] **Step 6: Commit the staff contract change**

```powershell
git -C ..\Aleconnect add api/mobile/complaints.ts tests/lifecycle/mobile-complaint-page.test.mjs
git -C ..\Aleconnect commit -m "feat: expose report display address"
```

---

### Task 2: Normalize `displayAddress` through the mobile report cache boundary

**Files:**
- Modify: `src/features/reports/data.ts`
- Modify: `src/services/reports.ts`
- Create: `tests/report-list-contract.test.mjs`
- Modify: `tests/report-status-cache-sync.test.mjs`

**Interfaces:**
- Consumes: staff `displayAddress?: unknown` from current or cached report-list payloads.
- Produces: `Report.displayAddress?: string | null` and `normalizeReportListItem(report: Report): Report`.

- [ ] **Step 1: Write failing mobile normalization tests**

Create `tests/report-list-contract.test.mjs`:

```js
import assert from "node:assert/strict"
import test from "node:test"

import {
  normalizeReportDisplayAddress,
  normalizeReportListItem,
} from "../src/features/reports/data.ts"

const report = {
  id: "ticket-1",
  title: "Primary Line",
  categoryId: "category-1",
  categoryTitle: "Service Drop",
  typeId: "type-1",
  typeTitle: "Primary Line",
  createdAt: "2026-08-15T01:00:00.000Z",
  status: "verified",
  ticketNumber: "AL26-081701",
}

test("normalizes optional report display addresses", () => {
  assert.equal(
    normalizeReportDisplayAddress(
      "  Purok 5, Brgy. 28 - Victory Village North, City of Legazpi  ",
    ),
    "Purok 5, Brgy. 28 - Victory Village North, City of Legazpi",
  )
  assert.equal(normalizeReportDisplayAddress("   "), null)
  assert.equal(normalizeReportDisplayAddress(undefined), null)
  assert.equal(normalizeReportDisplayAddress({}), null)
})

test("normalizes report-list rows without rejecting older payloads", () => {
  assert.deepEqual(normalizeReportListItem(report), {
    ...report,
    displayAddress: null,
  })

  assert.deepEqual(
    normalizeReportListItem({
      ...report,
      displayAddress: " Brgy. Rawis, City of Legazpi ",
    }),
    {
      ...report,
      displayAddress: "Brgy. Rawis, City of Legazpi",
    },
  )
})
```

Append this regression assertion to `tests/report-status-cache-sync.test.mjs`:

```js
assert.match(source, /return \{ \.\.\.report, status: projection\.status \}/)
```

This guards that push-status projection preserves `displayAddress` and every other row field.

- [ ] **Step 2: Run focused mobile tests and verify RED**

```powershell
node --test tests/report-list-contract.test.mjs tests/report-status-cache-sync.test.mjs
```

Expected: FAIL because the `Report` field and normalization helpers do not exist.

- [ ] **Step 3: Add the mobile field and pure normalizers**

In `src/features/reports/data.ts`, extend `Report`:

```ts
displayAddress?: string | null;
```

Add:

```ts
export function normalizeReportDisplayAddress(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function normalizeReportListItem(report: Report): Report {
  return {
    ...report,
    displayAddress: normalizeReportDisplayAddress(report.displayAddress),
  };
}
```

- [ ] **Step 4: Normalize both network and persisted list pages**

Import `normalizeReportListItem` in `src/services/reports.ts`.

Replace `normalizeStoredComplaintReportPage` with:

```ts
function normalizeStoredComplaintReportPage(
  value: Report[] | ComplaintReportPage,
): ComplaintReportPage {
  const page = Array.isArray(value) ? { reports: value, nextCursor: null } : value;
  return {
    ...page,
    reports: page.reports.map(normalizeReportListItem),
  };
}
```

Inside the network `.then(async (response) => { ... })`, create the normalized page before cache writes:

```ts
const normalizedResponse: ComplaintReportPage = {
  ...response,
  reports: response.reports.map(normalizeReportListItem),
};
```

Use `normalizedResponse` for `complaintReportsMemoryCache.value`, AsyncStorage persistence, and the final successful return. Preserve the existing stale-generation path by returning the normalized page with `isStale: true`.

- [ ] **Step 5: Run focused mobile tests and verify GREEN**

```powershell
node --test tests/report-list-contract.test.mjs tests/report-status-cache-sync.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit mobile contract normalization**

```powershell
git add src/features/reports/data.ts src/services/reports.ts tests/report-list-contract.test.mjs tests/report-status-cache-sync.test.mjs
git commit -m "feat: consume report display address"
```

---

### Task 3: Add the compact Manila report-card timestamp formatter

**Files:**
- Modify: `src/utils/manila-time.ts`
- Modify: `tests/manila-time.test.mjs`

**Interfaces:**
- Consumes: RFC3339/offset-bearing report `createdAt` strings.
- Produces: `formatManilaReportListDateTime(value: string): string` with output such as `9:00 AM, August 15`.

- [ ] **Step 1: Write failing formatter tests**

Update the import list in `tests/manila-time.test.mjs` to include `formatManilaReportListDateTime`, then add:

```js
test("formats report cards as time then long Manila date", () => {
  assert.equal(
    formatManilaReportListDateTime("2026-08-15T01:00:00.000Z"),
    "9:00 AM, August 15",
  )
  assert.equal(
    formatManilaReportListDateTime("2026-08-15T09:05:00+08:00"),
    "9:05 AM, August 15",
  )
  assert.equal(
    formatManilaReportListDateTime("2026-08-15T09:05:00"),
    "Date unavailable",
  )
})
```

- [ ] **Step 2: Run the formatter test and verify RED**

```powershell
node --test tests/manila-time.test.mjs
```

Expected: FAIL because `formatManilaReportListDateTime` is not exported.

- [ ] **Step 3: Implement the compact formatter using the existing strict parser**

In `src/utils/manila-time.ts`, add two formatters:

```ts
const manilaReportListTimeFormatter = new Intl.DateTimeFormat(MANILA_LOCALE, {
  timeZone: MANILA_TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const manilaReportListDateFormatter = new Intl.DateTimeFormat(MANILA_LOCALE, {
  timeZone: MANILA_TIME_ZONE,
  month: "long",
  day: "numeric",
});
```

Add:

```ts
export function formatManilaReportListDateTime(value: string) {
  const date = parseApiInstant(value);
  if (!date) return "Date unavailable";
  return `${manilaReportListTimeFormatter.format(date)}, ${manilaReportListDateFormatter.format(date)}`;
}
```

Do not alter `formatManilaDateTime`; detail/history consumers keep their current output.

- [ ] **Step 4: Run the formatter test and verify GREEN**

```powershell
node --test tests/manila-time.test.mjs
```

Expected: PASS, including existing UTC-boundary and invalid-offset tests.

- [ ] **Step 5: Commit the formatter**

```powershell
git add src/utils/manila-time.ts tests/manila-time.test.mjs
git commit -m "feat: add report card date format"
```

---

### Task 4: Redesign the shared official report card

**Files:**
- Modify: `src/features/reports/report-list.tsx`
- Modify: `src/app/(tabs)/reports/index.tsx`
- Modify: `src/app/(tabs)/reports/list.tsx`
- Create: `tests/report-list-ui.test.mjs`

**Interfaces:**
- Consumes: `Report.ticketNumber`, `status`, `title`, `createdAt`, and optional `displayAddress`.
- Produces: `ReportListGroup({ reports, onPress })` with no `getColor` prop.

- [ ] **Step 1: Write a failing source-level UI contract test**

Create `tests/report-list-ui.test.mjs`:

```js
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const read = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8")

test("official report cards match the compact consumer hierarchy", async () => {
  const [list, home, archive] = await Promise.all([
    read("src/features/reports/report-list.tsx"),
    read("src/app/(tabs)/reports/index.tsx"),
    read("src/app/(tabs)/reports/list.tsx"),
  ])

  assert.match(list, /formatManilaReportListDateTime/)
  assert.match(list, /report\.ticketNumber/)
  assert.match(list, /report\.title/)
  assert.match(list, /report\.displayAddress/)
  assert.match(list, /numberOfLines=\{1\}/)
  assert.match(list, /ChevronRight/)
  assert.match(list, /rounded-xl border border-border bg-card/)
  assert.doesNotMatch(list, /FileText/)
  assert.doesNotMatch(list, /getColor/)
  assert.doesNotMatch(home, /getColor=/)
  assert.doesNotMatch(archive, /getColor=/)
})

test("verified report status uses the accent badge treatment", async () => {
  const list = await read("src/features/reports/report-list.tsx")
  assert.match(list, /normalized === "verified"/)
  assert.match(list, /bg-accent\/10/)
  assert.match(list, /rounded-md/)
})
```

- [ ] **Step 2: Run the UI contract test and verify RED**

```powershell
node --test tests/report-list-ui.test.mjs
```

Expected: FAIL because the old component still renders `FileText`, `ListSectionItem`, and `getColor`.

- [ ] **Step 3: Replace `ReportListGroup` with separate tappable cards**

Refactor `src/features/reports/report-list.tsx` imports to use:

```ts
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import {
  formatStatus,
  normalizeReportDisplayAddress,
  type Report,
} from "@/features/reports/data";
import { useAppColors } from "@/hooks/use-app-colors";
import { formatManilaReportListDateTime } from "@/utils/manila-time";
import { ChevronRight } from "lucide-react-native";
import { View } from "react-native";
```

Update the verified badge branch to:

```ts
: normalized === "verified"
  ? "bg-accent/10 text-accent"
```

and render badges with:

```tsx
<View className={`rounded-md px-3 py-2 ${tone.split(" ")[0]}`}>
  <Text className={`text-sm font-medium ${tone.split(" ")[1]}`}>
    {formatStatus(status)}
  </Text>
</View>
```

Replace `ReportListGroup` with this structure:

```tsx
export function ReportListGroup({
  reports,
  onPress,
}: {
  reports: Report[];
  onPress: (report: Report) => void;
}) {
  const [mutedForegroundColor] = useAppColors(["muted-foreground"]);

  return (
    <View className="gap-3">
      {reports.map((report) => {
        const displayAddress = normalizeReportDisplayAddress(
          report.displayAddress,
        );

        return (
          <Pressable
            key={report.id}
            accessibilityLabel={`Open report ${report.ticketNumber}`}
            accessibilityRole="button"
            className="rounded-xl border border-border bg-card px-5 py-4"
            onPress={() => onPress(report)}
          >
            <View className="gap-2.5">
              <View className="flex-row items-start justify-between gap-3">
                <Text className="flex-1 text-base font-medium text-foreground">
                  {report.ticketNumber}
                </Text>
                <ReportStatusBadge status={report.status} />
              </View>

              <Text
                className="text-xl font-bold text-foreground"
                numberOfLines={2}
              >
                {report.title}
              </Text>

              <Text className="text-base text-foreground">
                {formatManilaReportListDateTime(report.createdAt)}
              </Text>

              <View className="flex-row items-center gap-3">
                {displayAddress ? (
                  <Text
                    className="flex-1 text-base text-muted-foreground"
                    numberOfLines={1}
                  >
                    {displayAddress}
                  </Text>
                ) : (
                  <View className="flex-1" />
                )}
                <ChevronRight size={24} color={mutedForegroundColor} />
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
```

This keeps one accessible press target and positions the chevron with the lower line as in the approved reference.

- [ ] **Step 4: Remove obsolete category-color plumbing from both routes**

In `src/app/(tabs)/reports/index.tsx`, remove the `getColor` prop from the `ReportListGroup` call:

```tsx
<ReportListGroup
  reports={monthReports.slice(0, 5)}
  onPress={openReport}
/>
```

In `src/app/(tabs)/reports/list.tsx`, replace the archive call with:

```tsx
<ReportListGroup
  reports={[item.report]}
  onPress={(report) =>
    router.push({
      pathname: "/report/[id]",
      params: { id: report.id },
    })
  }
/>
```

Remove any now-unused `getColor`-only imports/state reads. Keep metadata loading because category filters still depend on `meta.categories` in the archive.

- [ ] **Step 5: Align official-report loading skeletons with the new card shape**

In the recent-reports `ReportsSkeleton`, replace the icon-led inner row with:

```tsx
<View className="gap-3 rounded-xl border border-border bg-card p-4">
  <View className="flex-row items-center justify-between gap-3">
    <Skeleton className="h-4 w-28 rounded-full" />
    <Skeleton className="h-10 w-20 rounded-md" />
  </View>
  <Skeleton className="h-6 w-1/2 rounded-full" />
  <Skeleton className="h-4 w-36 rounded-full" />
  <Skeleton className="h-4 w-4/5 rounded-full" />
</View>
```

Apply the same hierarchy to `ArchiveSkeleton` in `src/app/(tabs)/reports/list.tsx`. Do not change the queued-draft `ListSectionItem` design.

- [ ] **Step 6: Run focused UI and route tests**

```powershell
node --test tests/report-list-ui.test.mjs tests/report-mobile-contract.test.mjs tests/report-status-sync-ui.test.mjs tests/report-detail-navigation.test.mjs
npx tsc --noEmit
```

Expected: all focused tests and TypeScript PASS.

- [ ] **Step 7: Commit the shared card redesign**

```powershell
git add src/features/reports/report-list.tsx "src/app/(tabs)/reports/index.tsx" "src/app/(tabs)/reports/list.tsx" tests/report-list-ui.test.mjs
git commit -m "feat: redesign report list cards"
```

---

### Task 5: Document the cross-repo product change and run final gates

**Files:**
- Modify: `docs/agent-harness/implementation-history.md`
- Modify: `../Aleconnect/docs/agent-harness/implementation-history.md`

**Interfaces:**
- Consumes: completed staff contract and mobile UI changes from Tasks 1–4.
- Produces: harness-compliant implementation history in both repositories and release-order evidence.

- [ ] **Step 1: Add a dated implementation-history entry in both repositories**

Add `## 2026-08-17 - Consumer report list card redesign` near the top of each history file with all required fields: `Repositories`, `Scope`, `Files`, `Contracts`, `Verification`, `Git/Deployment`, `Remaining risks`, and `Next`.

Use these contract facts verbatim in both entries:

```text
Contracts: staff adds nullable displayAddress to /api/mobile/complaints list rows; mobile treats the field as optional/nullable, normalizes blank values to null, and never performs a detail request solely to populate a list card. Existing complaint ownership, pagination cursors, status-push events, and report-detail contracts are unchanged.
```

Set `Verification` initially to the commands about to be run; after they pass, replace prospective wording with the actual passing results before the docs commit.

- [ ] **Step 2: Run the staff focused and regression gates**

```powershell
npm --prefix ..\Aleconnect exec -- node --test tests/lifecycle/mobile-complaint-page.test.mjs tests/lifecycle/mobile-complaint-intake-contract.test.mjs
npm --prefix ..\Aleconnect run lint
npm --prefix ..\Aleconnect run build
npm --prefix ..\Aleconnect run harness:check
git -C ..\Aleconnect diff --check
```

Expected: all commands PASS. If a pre-existing warning is emitted, record it precisely instead of describing the run as warning-free.

- [ ] **Step 3: Run the full mobile gates**

```powershell
node --test tests/*.test.mjs
npx tsc --noEmit
npm run lint
npm run harness:check
npx expo-doctor
git diff --check
```

Expected: all commands PASS. Do not claim device verification unless the redesigned cards are actually inspected on a running Android/iOS build.

- [ ] **Step 4: Perform the manual mobile acceptance check**

On a running mobile build, verify:

```text
Recent reports:
- each official report is a separate rounded card
- ticket number is top-left
- status badge is top-right
- title is visually strongest
- date reads like "9:00 AM, August 15"
- address is one muted truncated line when present
- chevron remains visible
- tapping anywhere on the card opens the existing detail route

Report archive:
- week grouping remains intact
- search/sort/category filtering still work
- cards use the same layout as Recent reports
- long lists paginate and scroll normally

Compatibility:
- a row with no displayAddress renders without placeholder copy
- a status push changes the badge without removing the existing address
```

- [ ] **Step 5: Update verification text with actual results and commit histories**

```powershell
git add docs/agent-harness/implementation-history.md
git commit -m "docs: record report card redesign"

git -C ..\Aleconnect add docs/agent-harness/implementation-history.md
git -C ..\Aleconnect commit -m "docs: record report card contract"
```

- [ ] **Step 6: Review final cross-repo diffs and rollout order**

```powershell
git diff master...HEAD --stat
git -C ..\Aleconnect diff main...HEAD --stat
git status --short
git -C ..\Aleconnect status --short
```

Expected: only scoped source, tests, design/plan/history documents are present. Release staff/API support before the mobile build when possible; mobile remains safe against an older server because `displayAddress` is optional.
