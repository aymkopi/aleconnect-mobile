# Advisory Card Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign consumer advisory cards to match the compact report-card system and add authoritative audience text to the mobile advisory API.

**Architecture:** Keep advisory eligibility and keyset pagination unchanged. The staff API adds an additive nullable `audience` field by loading target names only after the paginated rows are sliced, so target joins cannot multiply advisory rows. Mobile keeps `audience` optional for old-cache/old-backend compatibility and formats interruption/publication timestamps through the strict `Asia/Manila` utility.

**Tech Stack:** React Native, Expo Router, TypeScript, Uniwind/Gluestack primitives, Node test runner, Vite SSR lifecycle tests, MySQL/Aiven staff API.

## Global Constraints

- Do not change advisory eligibility, targeting, publication, notification, or cursor semantics.
- Do not add a database migration.
- Do not issue per-card detail requests.
- `audience` is additive and optional/nullable on mobile.
- Interruption timing uses only `scheduledStartAt` and `scheduledEndAt`; missing/invalid endpoint means advisory type only.
- Timestamps remain strict explicit-offset/RFC3339 and are formatted against `Asia/Manila`.
- Advisory title/content remain detail-only and are not rendered in list cards.
- Audience is one line with ellipsis.
- Severity is the only card badge.

---

### Task 1: Staff API audience contract

**Files:**
- Modify: `../Aleconnect/api/mobile/advisories.ts`
- Modify: `../Aleconnect/tests/lifecycle/consumer-mobile-hardening.test.mjs`

**Interfaces:**
- Produces: `audience: string | null` in each consumer advisory DTO.
- Produces: `buildConsumerAdvisoryAudience(targetScope, substationNames, feederNames)`.

- [ ] **Step 1: Add failing audience helper/DTO tests**

In `tests/lifecycle/consumer-mobile-hardening.test.mjs`, extend the advisory DTO test fixture with:

```js
target_scope: "selected",
audience: "Daraga Substation, Bitano Feeder 2",
```

and expected DTO with:

```js
audience: "Daraga Substation, Bitano Feeder 2",
```

Add this test:

```js
test("consumer advisory audience labels global and selected targets", async (t) => {
  const { buildConsumerAdvisoryAudience } = await loadModule(t, "/api/mobile/advisories.ts")

  assert.equal(buildConsumerAdvisoryAudience("all", [], []), "All consumers")
  assert.equal(
    buildConsumerAdvisoryAudience(
      "selected",
      ["Daraga Substation", "Daraga Substation"],
      ["Bitano Feeder 2"],
    ),
    "Daraga Substation, Bitano Feeder 2",
  )
  assert.equal(buildConsumerAdvisoryAudience("selected", [], []), null)
})
```

- [ ] **Step 2: Verify failure**

```powershell
node --test tests/lifecycle/consumer-mobile-hardening.test.mjs
```

- [ ] **Step 3: Replace advisory row types in `api/mobile/advisories.ts`**

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
  audience: string | null
}

type AdvisoryRow = RowDataPacket & Omit<AdvisorySource, "audience"> & {
  cursor_effective_at: string
}

type AdvisoryAudienceRow = RowDataPacket & {
  advisory_id: string
  name: string
}
```

- [ ] **Step 4: Add audience builder/loader before `toConsumerAdvisory`**

```ts
export function buildConsumerAdvisoryAudience(
  targetScope: string,
  substationNames: string[],
  feederNames: string[],
) {
  if (targetScope === "all") return "All consumers"

  const names = [...substationNames, ...feederNames]
    .map((value) => value.trim())
    .filter(Boolean)
  const uniqueNames = [...new Set(names)]
  return uniqueNames.length > 0 ? uniqueNames.join(", ") : null
}

async function loadConsumerAdvisoryAudiences(
  connection: PoolConnection,
  rows: AdvisoryRow[],
) {
  const audiences = new Map<string, string | null>()
  const selectedIds: string[] = []

  for (const row of rows) {
    if (row.target_scope === "all") audiences.set(row.advisory_id, "All consumers")
    else selectedIds.push(row.advisory_id)
  }

  if (selectedIds.length === 0) return audiences

  const placeholders = selectedIds.map(() => "?").join(",")
  const [substationRows, feederRows] = await Promise.all([
    connection.query<AdvisoryAudienceRow[]>(`
      SELECT DISTINCT ads.advisory_id, s.substation_name AS name
      FROM advisory_substations ads
      JOIN substations s ON s.substation_id = ads.substation_id
      WHERE ads.advisory_id IN (${placeholders})
      ORDER BY s.substation_name
    `, selectedIds),
    connection.query<AdvisoryAudienceRow[]>(`
      SELECT DISTINCT af.advisory_id, f.feeder_name AS name
      FROM advisory_feeders af
      JOIN feeders f ON f.feeder_id = af.feeder_id
      WHERE af.advisory_id IN (${placeholders})
      ORDER BY f.feeder_name
    `, selectedIds),
  ])

  const substationsByAdvisory = new Map<string, string[]>()
  const feedersByAdvisory = new Map<string, string[]>()

  for (const row of substationRows[0]) {
    const values = substationsByAdvisory.get(row.advisory_id) ?? []
    values.push(String(row.name ?? ""))
    substationsByAdvisory.set(row.advisory_id, values)
  }
  for (const row of feederRows[0]) {
    const values = feedersByAdvisory.get(row.advisory_id) ?? []
    values.push(String(row.name ?? ""))
    feedersByAdvisory.set(row.advisory_id, values)
  }

  for (const advisoryId of selectedIds) {
    audiences.set(
      advisoryId,
      buildConsumerAdvisoryAudience(
        "selected",
        substationsByAdvisory.get(advisoryId) ?? [],
        feedersByAdvisory.get(advisoryId) ?? [],
      ),
    )
  }

  return audiences
}
```

- [ ] **Step 5: Extend serializer and SELECT**

Add to `toConsumerAdvisory`:

```ts
audience: row.audience,
```

Add directly after `a.advisory_type,` in the paginated SELECT:

```sql
a.target_scope,
```

- [ ] **Step 6: Load audience after page slicing and serialize it**

Replace:

```ts
const visibleRows = rows.slice(0, page.limit)
const last = visibleRows.at(-1)
return {
  advisories: visibleRows.map(toConsumerAdvisory),
```

with:

```ts
const visibleRows = rows.slice(0, page.limit)
const audiences = await loadConsumerAdvisoryAudiences(connection, visibleRows)
const last = visibleRows.at(-1)
return {
  advisories: visibleRows.map((row) => toConsumerAdvisory({
    ...row,
    audience: audiences.get(row.advisory_id) ?? null,
  })),
```

Do not join `advisory_feeders` or `advisory_substations` into the main paginated SELECT.

- [ ] **Step 7: Verify staff**

```powershell
node --test tests/lifecycle/consumer-mobile-hardening.test.mjs
npm run build
npm run lint
npm run harness:check
git diff --check
```

---

### Task 2: Manila interruption formatter

**Files:**
- Modify: `src/utils/manila-time.ts`
- Modify: `tests/manila-time.test.mjs`

**Interfaces:**
- Produces: `formatManilaAdvisoryInterruptionRange(start, end, reference?)`.

- [ ] **Step 1: Add import and failing test**

Add `formatManilaAdvisoryInterruptionRange` to the existing import list in `tests/manila-time.test.mjs`, then append:

```js
test("formats advisory interruption ranges against the Manila calendar", () => {
  const reference = new Date("2026-08-17T04:00:00.000Z")

  assert.equal(
    formatManilaAdvisoryInterruptionRange(
      "2026-08-17T06:00:00.000Z",
      "2026-08-17T09:00:00.000Z",
      reference,
    ),
    "2:00 PM, Today – 5:00 PM, Today",
  )
  assert.equal(
    formatManilaAdvisoryInterruptionRange(
      "2026-08-18T06:00:00.000Z",
      "2026-08-18T09:00:00.000Z",
      reference,
    ),
    "2:00 PM, Aug. 18 – 5:00 PM, Aug. 18",
  )
  assert.equal(
    formatManilaAdvisoryInterruptionRange(
      "2026-08-18T14:00:00.000Z",
      "2026-08-18T20:00:00.000Z",
      reference,
    ),
    "10:00 PM, Aug. 18 – 4:00 AM, Aug. 19",
  )
  assert.equal(
    formatManilaAdvisoryInterruptionRange(null, "2026-08-17T09:00:00.000Z", reference),
    null,
  )
  assert.equal(
    formatManilaAdvisoryInterruptionRange(
      "2026-08-17T14:00:00",
      "2026-08-17T17:00:00",
      reference,
    ),
    null,
  )
})
```

- [ ] **Step 2: Add month labels in `src/utils/manila-time.ts` after formatter declarations**

```ts
const manilaCompactMonthLabels = [
  "Jan.",
  "Feb.",
  "Mar.",
  "Apr.",
  "May",
  "Jun.",
  "Jul.",
  "Aug.",
  "Sep.",
  "Oct.",
  "Nov.",
  "Dec.",
] as const;
```

- [ ] **Step 3: Add formatter after `formatManilaReportListDateTime`**

```ts
function formatManilaAdvisoryInterruptionEndpoint(
  value: string,
  reference: Date,
) {
  const date = parseApiInstant(value);
  const target = date ? manilaCalendarParts(date) : null;
  const current = manilaCalendarParts(reference);

  if (!date || !target || !current) return null;

  const dateLabel =
    calendarKey(target) === calendarKey(current)
      ? "Today"
      : `${manilaCompactMonthLabels[target.month - 1]} ${target.day}`;

  return `${manilaReportListTimeFormatter.format(date)}, ${dateLabel}`;
}

export function formatManilaAdvisoryInterruptionRange(
  start: string | null,
  end: string | null,
  reference = new Date(),
) {
  if (!start || !end || Number.isNaN(reference.getTime())) return null;

  const startLabel = formatManilaAdvisoryInterruptionEndpoint(start, reference);
  const endLabel = formatManilaAdvisoryInterruptionEndpoint(end, reference);
  return startLabel && endLabel ? `${startLabel} – ${endLabel}` : null;
}
```

- [ ] **Step 4: Verify**

```powershell
node --test tests/manila-time.test.mjs
```

---

### Task 3: Mobile model and compact shared card

**Files:**
- Modify: `src/services/advisories.ts`
- Replace: `src/features/advisories/advisory-list-item.tsx`
- Modify: `tests/advisory-feed.test.mjs`

- [ ] **Step 1: Add optional field to `MobileAdvisory` after `severity`**

```ts
readonly audience?: string | null;
```

Do not change `active_advisories_cache_v1`.

- [ ] **Step 2: Replace the entire shared card file**

```tsx
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { useAppColors } from "@/hooks/use-app-colors";
import type { MobileAdvisory } from "@/services/advisories";
import {
  formatManilaAdvisoryInterruptionRange,
  formatManilaReportListDateTime,
} from "@/utils/manila-time";
import { ChevronRight } from "lucide-react-native";
import { View } from "react-native";

function formatAdvisoryLabel(value: string | null | undefined, fallback: string) {
  const normalized = value?.trim();
  if (!normalized) return fallback;

  return normalized
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function AdvisorySeverityBadge({ severity }: { severity: string }) {
  const normalized = severity.trim().toLowerCase().replace(/[\s-]+/g, "_");
  const tone =
    normalized === "critical" || normalized === "high"
      ? "bg-danger text-danger-foreground"
      : normalized === "medium"
        ? "bg-warning text-warning-foreground"
        : normalized === "low"
          ? "bg-secondary text-secondary-foreground"
          : normalized === "info"
            ? "bg-accent/10 text-accent"
            : "bg-secondary text-secondary-foreground";
  const [backgroundClass, textClass] = tone.split(" ");

  return (
    <View className={`shrink-0 rounded-md px-2 py-1 ${backgroundClass}`}>
      <Text className={`text-[11px] font-semibold leading-4 ${textClass}`}>
        {formatAdvisoryLabel(severity, "Info")}
      </Text>
    </View>
  );
}

export function AdvisoryListItem({
  advisory,
  onPress,
}: {
  readonly advisory: MobileAdvisory;
  readonly onPress: () => void;
}) {
  const [mutedForegroundColor] = useAppColors(["muted-foreground"]);
  const controlNumber = advisory.controlNumber?.trim() || null;
  const typeLabel = formatAdvisoryLabel(advisory.type, "Advisory");
  const interruptionRange = formatManilaAdvisoryInterruptionRange(
    advisory.scheduledStartAt,
    advisory.scheduledEndAt,
  );
  const audience = advisory.audience?.trim() || null;
  const primaryText = interruptionRange
    ? `${typeLabel} · ${interruptionRange}`
    : typeLabel;

  return (
    <Pressable
      accessibilityLabel={`Open advisory ${controlNumber ?? typeLabel}`}
      accessibilityRole="button"
      className="rounded-lg border border-border bg-card px-4 py-3 active:bg-secondary"
      onPress={onPress}
    >
      <View className="gap-2">
        <View className="flex-row items-center justify-between gap-3">
          {controlNumber ? (
            <Text
              className="min-w-0 flex-1 text-xs font-medium text-muted-foreground"
              numberOfLines={1}
            >
              {controlNumber}
            </Text>
          ) : (
            <View className="flex-1" />
          )}

          <AdvisorySeverityBadge severity={advisory.severity || "info"} />
        </View>

        <Text
          className="text-base font-semibold leading-5 text-foreground"
          numberOfLines={2}
        >
          {primaryText}
        </Text>

        <View className="flex-row items-center gap-2">
          <View className="min-w-0 flex-1 gap-0.5">
            <Text className="text-xs leading-4 text-foreground" numberOfLines={1}>
              Published {formatManilaReportListDateTime(advisory.publishedAt)}
            </Text>

            {audience ? (
              <Text
                className="text-xs leading-4 text-muted-foreground"
                numberOfLines={1}
              >
                {audience}
              </Text>
            ) : null}
          </View>

          <ChevronRight
            size={18}
            color={mutedForegroundColor}
            strokeWidth={2}
          />
        </View>
      </View>
    </Pressable>
  );
}
```

- [ ] **Step 3: Replace `tests/advisory-feed.test.mjs` with the exact source-contract test from the implementation handoff**

The test must assert `audience?: string | null`, direct `Pressable` card usage, Manila formatters, control/type/severity/audience fields, one-line audience, no `Megaphone`, no `ListSectionItem`, no rendered `advisory.title`/`advisory.content`, and preserved `/advisory/[id]` navigation in both routes.

---

### Task 4: Route integration

**Files:**
- Modify: `src/app/advisories.tsx`
- Modify: `src/app/(tabs)/home.tsx`

- [ ] **Step 1: Dedicated advisories route**

Delete:

```ts
import { ListSection } from "@/components/ui/list-section";
```

Replace the loading skeleton block with compact bordered card skeletons:

```tsx
<View className="gap-2 px-5 pt-2">
  {Array.from({ length: 4 }).map((_, index) => (
    <View
      key={index}
      className="rounded-lg border border-border bg-card px-4 py-3"
    >
      <View className="gap-2">
        <View className="flex-row items-center justify-between gap-3">
          <Skeleton className="h-3 w-24 rounded-sm" />
          <Skeleton className="h-6 w-16 rounded-md" />
        </View>
        <Skeleton className="h-5 w-4/5 rounded-sm" />
        <View className="gap-1">
          <Skeleton className="h-3 w-36 rounded-sm" />
          <Skeleton className="h-3 w-4/5 rounded-sm" />
        </View>
      </View>
    </View>
  ))}
</View>
```

Replace `renderItem` with:

```tsx
renderItem={({ item }) => (
  <AdvisoryListItem
    advisory={item}
    onPress={() =>
      router.push({
        pathname: "/advisory/[id]",
        params: { id: item.id },
      })
    }
  />
)}
```

Replace separator:

```tsx
ItemSeparatorComponent={() => <View className="h-2" />}
```

- [ ] **Step 2: Home Active advisories block only**

Replace the existing `{session ? (<ListSection ...>...</ListSection>) : null}` Active advisories block with:

```tsx
{session ? (
  <View className="gap-2">
    <View className="flex-row items-center justify-between px-1">
      <Heading size="sm">Active advisories</Heading>
      <Button
        size="sm"
        variant="ghost"
        accessibilityLabel="View all advisories"
        onPress={() => router.push("/advisories")}
      >
        <ButtonText>View all</ButtonText>
        <ButtonIcon as={ChevronRight} height={18} width={18} />
      </Button>
    </View>

    {visibleAdvisories.length > 0 ? (
      <View className="gap-2">
        {visibleAdvisories.map((advisory) => (
          <AdvisoryListItem
            key={advisory.id}
            advisory={advisory}
            onPress={() =>
              router.push({
                pathname: "/advisory/[id]",
                params: { id: advisory.id },
              })
            }
          />
        ))}
      </View>
    ) : (
      <ListSection>
        <ListSectionItem
          description="New service notices for your area will appear here."
          showDivider={false}
          title="No active advisories"
        />
      </ListSection>
    )}
  </View>
) : null}
```

Keep `ListSection` imports because Quick actions and the advisory empty state still use it.

---

### Task 5: Documentation and verification

**Files:**
- Modify: `docs/agent-harness/implementation-history.md`
- Modify: `../Aleconnect/docs/agent-harness/implementation-history.md`

- [ ] **Step 1: Add a newest 2026-08-17 entry in each history**

Mobile entry must name the compact advisory card, optional audience contract, Manila formatters, no per-row detail request, focused/full verification, backend-first rollout, and no Expo/EAS publication.

Staff entry must name the additive `audience` field, post-pagination target-name lookup, unchanged eligibility/cursor behavior, no migration, and backend deployment before mobile.

- [ ] **Step 2: Verify mobile**

```powershell
node --test tests/advisory-feed.test.mjs tests/manila-time.test.mjs
npx tsc --noEmit
npm run lint
npm run harness:check
git diff --check
git status --short
```

- [ ] **Step 3: Verify staff**

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

- [ ] **Step 4: Commit separately**

Staff:

```powershell
git add api/mobile/advisories.ts tests/lifecycle/consumer-mobile-hardening.test.mjs docs/agent-harness/implementation-history.md
git commit -m "feat: expose advisory audience"
```

Mobile:

```powershell
git add src/services/advisories.ts src/utils/manila-time.ts src/features/advisories/advisory-list-item.tsx "src/app/(tabs)/home.tsx" src/app/advisories.tsx tests/advisory-feed.test.mjs tests/manila-time.test.mjs docs/agent-harness/implementation-history.md
git commit -m "feat: redesign advisory cards"
```

- [ ] **Step 5: Rollout**

Deploy the additive staff API first, then ship the compatible mobile build. Do not apply a database migration.