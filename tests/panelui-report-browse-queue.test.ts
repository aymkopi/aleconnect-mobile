import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import * as queuePresentation from "../src/features/reports/queue-presentation.ts";
import * as queueAccess from "../src/services/report-queue-access.ts";
import * as reportTransport from "../src/utils/report-transport.ts";
import * as browseFilter from "../src/features/reports/browse-filter.ts";
import {
  filterBrowseReports,
  validDateRange,
  reportBrowseScope,
  calendarDays,
  defaultBrowseFilters,
} from "../src/features/reports/browse-filter.ts";
import {
  presentQueuedReport,
  queueDiagnosticText,
  simulateQueueRetry,
} from "../src/features/reports/queue-presentation.ts";
import type { Report } from "../src/features/reports/data.ts";
import type { ReportQueueItem } from "../src/services/report-queue.ts";

const rows = [
  "under_review",
  "verified",
  "rejected",
  "dispatched",
  "in_progress",
  "resolved",
  "closed",
  null,
].map(
  (status, i) =>
    ({
      id: String(i),
      status,
      typeId: i % 2 ? "meter" : "line",
      serviceAccountId: "account",
      createdAt: "2026-09-30T16:05:00Z",
    }) as Report,
);
const item = {
  id: "saved",
  status: "queued",
  attempts: 0,
  lastError: null,
  lastErrorPhase: null,
  nonRetryable: false,
  diagnosticId: "request-123",
  createdAt: "2026-10-09T01:00:00Z",
  updatedAt: "2026-10-09T01:01:00Z",
  ticketNumber: null,
  idempotencyKey: "private-key",
  userId: "private-user",
  payload: { accountNumber: "private-account" },
  evidence: [{ uri: "private://evidence" }],
} as ReportQueueItem;

test("browse preserves every canonical status and supports unknown status, type and Manila dates", () => {
  for (const row of rows)
    assert.deepEqual(
      filterBrowseReports(rows, {
        ...defaultBrowseFilters,
        status: row.status ?? "pending",
      }),
      [row],
    );
  assert.equal(
    filterBrowseReports(rows, { ...defaultBrowseFilters, type: "meter" })
      .length,
    4,
  );
  assert.equal(
    filterBrowseReports(rows, {
      ...defaultBrowseFilters,
      period: "custom",
      start: "2026-10-01",
      end: "2026-10-01",
    }).length,
    8,
  );
  assert.equal(
    filterBrowseReports(rows, {
      ...defaultBrowseFilters,
      period: "custom",
      start: "2026-09-30",
      end: "2026-09-30",
    }).length,
    0,
  );
  assert.equal(
    filterBrowseReports([{ ...rows[0], createdAt: "2026-02-31T10:00:00Z" }], {
      ...defaultBrowseFilters,
      period: "month",
    }).length,
    0,
  );
});
test("custom date range validates real calendar dates and Monday-first calendar pads correctly", () => {
  assert.equal(validDateRange("2026-02-30", "2026-03-01"), false);
  assert.equal(validDateRange("2026-10-02", "2026-10-01"), false);
  assert.equal(validDateRange("2024-02-29", "2024-02-29"), true);
  assert.deepEqual(calendarDays("2026-10").slice(0, 5), [
    null,
    null,
    null,
    "2026-10-01",
    "2026-10-02",
  ]);
});

test("opening the calendar with partial or malformed date input falls back to a usable current month", async () => {
  const source = await readFile(
    new URL("../src/features/reports/components/report-calendar.tsx", import.meta.url),
    "utf8",
  );
  const parsed = ts.createSourceFile(
    "report-calendar.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const calendar = parsed.statements.find(
    (node) => ts.isFunctionDeclaration(node) && node.name?.text === "ReportCalendar",
  );
  assert.ok(calendar);
  const code = ts.transpileModule(
    calendar.getText(parsed) + "\nexports.Calendar = ReportCalendar;",
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
      },
    },
  ).outputText;
  let month: string | undefined;
  const hooks = {
    useState: (initial: string) => {
      month ??= initial;
      return [
        month,
        (next: string) => {
          month = next;
        },
      ];
    },
  };
  const jsx = {
    jsx: (type: unknown, props: unknown) => ({ type, props }),
    jsxs: (type: unknown, props: unknown) => ({ type, props }),
  };
  const exported: {
    Calendar?: (props: {
      value: string;
      onSelect: (value: string) => void;
    }) => unknown;
  } = {};
  class CalendarClock extends Date {
    constructor(value?: string) {
      super(value ?? "2026-10-09T00:00:00Z");
    }
  }
  new Function(
    "require",
    "exports",
    "useState",
    "useAppColors",
    "manilaDateKey",
    "validDateRange",
    "calendarDays",
    "Date",
    "View",
    "Button",
    "Text",
    "ChevronLeft",
    "ChevronRight",
    code,
  )(
    () => jsx,
    exported,
    hooks.useState,
    () => ["#006bb8", "#161a1d"],
    browseFilter.manilaDateKey,
    browseFilter.validDateRange,
    browseFilter.calendarDays,
    CalendarClock,
    "View",
    "Button",
    "Text",
    "ChevronLeft",
    "ChevronRight",
  );
  const nodes = (value: unknown): Record<string, unknown>[] => {
    if (!value || typeof value !== "object") return [];
    if (Array.isArray(value)) return value.flatMap(nodes);
    const node = value as { props?: Record<string, unknown> };
    return node.props
      ? [node.props, ...Object.values(node.props).flatMap(nodes)]
      : [];
  };
  for (const value of [
    "",
    "2026",
    "2026-XX-09",
    "2026-13-01",
    "2026-02-30",
    "not-a-date",
  ]) {
    month = undefined;
    const selected: string[] = [];
    const render = () =>
      nodes(
        exported.Calendar!({ value, onSelect: (day) => selected.push(day) }),
      );
    const initial = render();
    assert.ok(
      initial.some((p) => p.children === "October 2026"),
      value,
    );
    const firstDay = initial.find((p) => p.accessibilityLabel === "2026-10-01");
    assert.ok(firstDay, value);
    (firstDay.onPress as () => void)();
    assert.deepEqual(selected, ["2026-10-01"], value);
    const previous = initial.find(
      (p) => p.accessibilityLabel === "Previous month",
    );
    assert.ok(previous);
    (previous.onPress as () => void)();
    assert.ok(
      render().some((p) => p.children === "September 2026"),
      value,
    );
  }
  month = undefined;
  assert.ok(
    nodes(exported.Calendar!({ value: "2026-02-28", onSelect: () => {} })).some(
      (p) => p.children === "February 2026",
    ),
  );
});
test("request scope invalidates pages on principal, access revision and every filter", () => {
  const base = reportBrowseScope(
    "owner",
    "identity",
    3,
    "line",
    defaultBrowseFilters,
  );
  for (const f of [
    { status: "closed" },
    { type: "meter" },
    { account: "account" },
    { period: "month" },
    { sort: "oldest" },
    { start: "2026-10-01" },
    { end: "2026-10-09" },
  ]) {
    assert.notEqual(
      reportBrowseScope("owner", "identity", 3, "line", {
        ...defaultBrowseFilters,
        ...f,
      } as typeof defaultBrowseFilters),
      base,
    );
  }
  assert.notEqual(
    reportBrowseScope("other", "identity", 3, "line", defaultBrowseFilters),
    base,
  );
  assert.notEqual(
    reportBrowseScope("owner", "identity", 4, "line", defaultBrowseFilters),
    base,
  );
});
test("durable queue never permits discard during sending or uncertain final submission", () => {
  assert.equal(presentQueuedReport(item, false).canDiscard, true);
  assert.equal(presentQueuedReport(item, true).canDiscard, false);
  assert.equal(
    presentQueuedReport({ ...item, status: "submitting" }, false).canDiscard,
    false,
  );
  const uncertain = presentQueuedReport(
    { ...item, lastError: "No response", lastErrorPhase: "final submit" },
    false,
  );
  assert.equal(uncertain.canDiscard, false);
  assert.equal(uncertain.canRetry, true);
  assert.equal(uncertain.label, "Not confirmed");
  assert.equal(
    presentQueuedReport(
      { ...item, attempts: 2, lastErrorPhase: "metadata" },
      false,
    ).canDiscard,
    false,
  );
  assert.equal(
    presentQueuedReport(
      { ...item, status: "failed", nonRetryable: true },
      false,
    ).canRetry,
    false,
  );
  assert.equal(presentQueuedReport(item, false, false).canRetry, false);
  assert.equal(
    presentQueuedReport(
      { ...item, status: "submitted", ticketNumber: "AL26-081700" },
      false,
    ).canRetry,
    false,
  );
});
test("support text omits account, principal, evidence and submission secrets", () => {
  const text = queueDiagnosticText(item);
  assert.match(text, /request-123/);
  assert.doesNotMatch(text, /private/);
});
test("preview retry simulation preserves original queue and idempotency key", () => {
  const before = JSON.stringify(item);
  const next = simulateQueueRetry(item, "confirmed");
  assert.equal(JSON.stringify(item), before);
  assert.equal(next.status, "submitted");
  assert.equal(next.idempotencyKey, item.idempotencyKey);
  assert.equal(simulateQueueRetry(item, "failed").status, "failed");
});
test("browse and queue routes use their screens and one sheet host each", async () => {
  const read = (p: string) =>
    readFile(new URL("../" + p, import.meta.url), "utf8");
  const [browse, queue, listRoute, queueRoute] = await Promise.all([
    read("src/features/reports/all-reports-screen.tsx"),
    read("src/features/reports/queue-screen.tsx"),
    read("src/app/(private)/reports/list.tsx"),
    read("src/app/(private)/reports/queue.tsx"),
  ]);
  assert.equal((browse.match(/<BottomSheet\s+open=/g) ?? []).length, 1);
  assert.equal((queue.match(/<BottomSheet\s+open=/g) ?? []).length, 1);
  assert.match(browse, /presentation="content"/);
  assert.match(browse, /nextCursor/);
  assert.match(queue, /PANELUI_PREVIEW/);
  assert.match(queue, /isQueuedReportVisible/);
  assert.match(listRoute, /all-reports-screen/);
  assert.match(queueRoute, /queue-screen/);
});

async function queueScreenHarness({
  fixtures,
  preview,
  sourceItem = queuePresentation.fixtureSavedReport,
  retryReceipts,
}: {
  fixtures: boolean;
  preview: boolean;
  sourceItem?: ReportQueueItem;
  retryReceipts?: ReportQueueItem[];
}) {
  const source = await readFile(
    new URL("../src/features/reports/queue-screen.tsx", import.meta.url),
    "utf8",
  );
  const state: unknown[] = [],
    refs: { current: unknown }[] = [];
  let stateIndex = 0,
    refIndex = 0;
  const params = { id: sourceItem.id };
  const calls: string[] = [];
  const queue = {
    items: [sourceItem],
    isSyncing: false,
    retry: async () => {
      calls.push("retry");
      if (retryReceipts) return retryReceipts;
      queue.items = queue.items.map((r) => ({
        ...r,
        lastError: "Metadata request failed",
        lastErrorPhase: "metadata" as const,
      }));
    },
    remove: async () => {
      calls.push("remove");
    },
    refresh: async () => {
      calls.push("refresh");
    },
  };
  const react = {
    useLayoutEffect: (effect: () => void) => effect(),
    useState: (initial: unknown) => {
      const index = stateIndex++;
      if (!(index in state)) state[index] = initial;
      return [
        state[index],
        (value: unknown) => {
          state[index] =
            typeof value === "function" ? value(state[index]) : value;
        },
      ];
    },
    useRef: (initial: unknown) => {
      const index = refIndex++;
      return refs[index] ?? (refs[index] = { current: initial });
    },
  };
  const mocks: Record<string, unknown> = {
    react,
    "react/jsx-runtime": {
      jsx: (type: unknown, props: unknown) => ({ type, props }),
      jsxs: (type: unknown, props: unknown) => ({ type, props }),
      Fragment: "Fragment",
    },
    "react-native": {
      View: "View",
      Pressable: "Pressable",
    },
    "expo-asset": {
      Asset: { fromModule: () => ({ uri: "asset://fixture-photo" }) },
    },
    "expo-router": {
      useLocalSearchParams: () => params,
      useRouter: () => ({
        setParams: (p: typeof params) => Object.assign(params, p),
        push: () => {},
        canGoBack: () => false,
        replace: (target?: {params?: {id?: string}} | string) => { if (typeof target === 'object') calls.push('open:' + target.params?.id); },
      }),
    },
    "@react-native-community/netinfo": {
      default: {
        fetch: async () => {
          calls.push("network-check");
          return { isConnected: true };
        },
      },
    },
    "expo-clipboard": {
      setStringAsync: async () => {
        calls.push("clipboard");
      },
    },
    "lucide-react-native": new Proxy({}, { get: (_t, key) => String(key) }),
    "./components/report-page": { ReportPage: "ReportPage" },
    "./components/evidence-photo-viewer": {
      EvidencePhotoViewer: "EvidencePhotoViewer",
    },
    "@/hooks/use-app-colors": { useAppColors: () => ["#006bb8"] },
    "@/hooks/use-auth-session": {
      useAuthSession: () => ({ session: { user: { id: "fixture-owner" } } }),
    },
    "@/hooks/use-consumer-account": {
      useConsumerAccount: () => ({
        accountContext: {
          identityUserId: "fixture-owner",
          authorizedServiceAccountIds: ["fixture-home"],
          accessRevision: 1,
          accounts: [],
        },
        refreshConsumerAccount: async () => {},
      }),
    },
    "@/hooks/use-scoped-read": { useScopedRead: () => ({ data: null }) },
    "@/context/visual-preview-context": {
      useVisualPreview: () => ({ fixtures }),
    },
    "@/context/report-queue-context": { useReportQueue: () => queue },
    "@/constants/panelui-preview": { PANELUI_PREVIEW: preview },
    "@/services/report-queue-access": queueAccess,
    "@/services/reports": {
      fetchComplaintMeta: async () => ({ barangays: [] }),
    },
    "@/utils/manila-time": { formatManilaDateTime: (v: string) => v },
    "@/utils/report-transport": reportTransport,
    "./queue-presentation": queuePresentation,
  };
  for (const [file, name] of [
    ["button", "Button"],
    ["text", "Text"],
    ["badge", "Badge"],
    ["select", "Select"],
    ["bottom-sheet", "BottomSheet"],
    ["spinner", "Spinner"],
  ]) {
    const component = Object.assign(() => {}, {
      Item: "Select.Item",
      Content: "BottomSheet.Content",
      Header: "BottomSheet.Header",
      Body: "BottomSheet.Body",
      Footer: "BottomSheet.Footer",
    });
    mocks["@/components/panelui/" + file] = { [name]: component };
  }
  const exported: { default?: () => unknown } = {};
  const js = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  new Function("require", "exports", "setTimeout", js)(
    (id: string) => {
      if (id.endsWith(".png")) return "fixture-asset";
      assert.ok(mocks[id], id);
      return mocks[id];
    },
    exported,
    (fn: () => void) => {
      fn();
      return 0;
    },
  );
  const render = () => {
    stateIndex = 0;
    refIndex = 0;
    return exported.default!();
  };
  const nodes = (
    root: unknown,
  ): { type?: unknown; props?: Record<string, unknown> }[] => {
    if (!root || typeof root !== "object") return [];
    if (Array.isArray(root)) return root.flatMap(nodes);
    const object = root as { type?: unknown; props?: Record<string, unknown> };
    return [object, ...Object.values(object.props || {}).flatMap(nodes)];
  };
  const find = (predicate: (props: Record<string, unknown>) => boolean) =>
    nodes(render()).find((node) => node.props && predicate(node.props))?.props;
  const flush = () => new Promise<void>((resolve) => setImmediate(resolve));
  return { queue, calls, render, find, flush };
}
test("fixture screen retry and discard simulate locally without provider mutations", async () => {
  const h = await queueScreenHarness({ fixtures: true, preview: true });
  const before = JSON.stringify(h.queue.items);
  const retry = h.find((p) => p.children === "Try again");
  assert.ok(retry);
  (retry.onPress as () => void)();
  await h.flush();
  assert.ok(h.find((p) => p.children === "Received by ALECO"));
  assert.deepEqual(h.calls, []);
  assert.equal(JSON.stringify(h.queue.items), before);
  const discardHarness = await queueScreenHarness({
    fixtures: true,
    preview: true,
  });
  const ask = discardHarness.find(
    (p) => p.variant === "outline" && p.children === "Discard saved report",
  );
  assert.ok(ask);
  (ask.onPress as () => void)();
  const discard = discardHarness.find(
    (p) => p.variant === "destructive" && p.children === "Discard saved report",
  );
  assert.ok(discard);
  (discard.onPress as () => void)();
  await discardHarness.flush();
  assert.deepEqual(discardHarness.calls, []);
  assert.equal(discardHarness.queue.items.length, 1);
  assert.ok(discardHarness.find((p) => p.children === "No saved reports"));
});
test("paused durable preview and uncertain submission reject destructive callbacks", async () => {
  for (const [preview, sourceItem] of [
    [true, queuePresentation.fixtureSavedReport],
    [
      false,
      {
        ...queuePresentation.fixtureSavedReport,
        lastErrorPhase: "final submit",
        attempts: 1,
      },
    ],
  ] as const) {
    const h = await queueScreenHarness({
      fixtures: false,
      preview,
      sourceItem: sourceItem as ReportQueueItem,
    });
    const ask = h.find(
      (p) => p.variant === "outline" && p.children === "Discard saved report",
    );
    assert.ok(ask);
    assert.equal(ask.disabled, true);
    (ask.onPress as () => void)();
    const discard = h.find(
      (p) =>
        p.variant === "destructive" && p.children === "Discard saved report",
    );
    assert.ok(discard);
    assert.equal(discard.disabled, true);
    (discard.onPress as () => void)();
    await h.flush();
    assert.deepEqual(h.calls, []);
    if (preview) {
      const retry = h.find((p) => p.children === "Try again");
      assert.ok(retry);
      assert.equal(retry.disabled, true);
      (retry.onPress as () => void)();
      await h.flush();
      assert.deepEqual(h.calls, []);
    }
  }
});
test("a failed receipt-confirmation retry does not enable discard when its latest phase changes", async () => {
  const h = await queueScreenHarness({
    fixtures: false,
    preview: false,
    sourceItem: {
      ...queuePresentation.fixtureSavedReport,
      lastErrorPhase: "final submit",
      attempts: 1,
    },
  });
  const retry = h.find((p) => p.children === "Try again");
  assert.ok(retry);
  (retry.onPress as () => void)();
  await h.flush();
  assert.deepEqual(h.calls, ["retry", "refresh"]);
  const discard = h.find(
    (p) => p.variant === "outline" && p.children === "Discard saved report",
  );
  assert.ok(discard);
  assert.equal(discard.disabled, true);
});

test('a retry opens the received report only when its matching receipt is complete',async()=>{
 for(const complete of [true,false]){
  const row={...queuePresentation.fixtureSavedReport,status:'submitted' as const,ticketId:'received',ticketNumber:complete?'TK-RECEIVED':null};
  const h=await queueScreenHarness({fixtures:false,preview:false,retryReceipts:[row]});
  const button=h.find(p=>p.children==='Try again');assert.ok(button);(button.onPress as()=>void)();await h.flush();
  assert.deepEqual(h.calls,complete?['retry','refresh','open:received']:['retry','refresh']);
 }
});
