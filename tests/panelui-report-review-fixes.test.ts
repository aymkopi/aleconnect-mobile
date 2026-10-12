import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import {
  presentQueuedReport,
  fixtureSavedReport,
} from "../src/features/reports/queue-presentation.ts";
import {
  readReportCoordinates,
  resolveHomeReportLocation,
} from "../src/features/reports/address.ts";
import { preserveKnownConsumerReportDetailStatus } from "../src/features/reports/data.ts";
import { reportAccessUnavailable } from "../src/features/reports/detail-presentation.ts";
import type { ReportQueueItem } from "../src/services/report-queue.ts";

async function parse(file: string) {
  return ts.createSourceFile(
    file,
    await readFile(new URL("../" + file, import.meta.url), "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
}
function evaluate(code: string, deps: Record<string, unknown>) {
  const out: Record<string, (...args: any[]) => any> = {};
  const compiled = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  new Function("exports", ...Object.keys(deps), compiled)(
    out,
    ...Object.values(deps),
  );
  return out.run;
}
test("server receipt followed by local cache failure keeps the queue copy protected", async () => {
  const source = await parse("src/services/report-queue.ts");
  const fn = source.statements.find(
    (node) =>
      ts.isFunctionDeclaration(node) &&
      node.name?.text === "submitQueuedReport",
  );
  assert.ok(fn);
  let submissions = 0;
  const run = evaluate(
    fn.getText(source) + "\nexports.run = submitQueuedReport;",
    {
      ApiRequestError: class extends Error {},
      replaceQueueItem: async () => {},
      readConsistentConsumerAccountSnapshot: async () => ({
        identityUserId: "fixture-owner",
        authorizedServiceAccountIds: ["fixture-home"],
        accessRevision: 1,
      }),
      evaluateQueuedReportAccess: () => ({
        allowed: true,
        legacyUpgraded: false,
      }),
      createEvidenceUploads: async () => ({ draftId: "draft", uploads: [] }),
      mapWithConcurrency: async () => {},
      submitComplaint: async () => {
        submissions++;
        return { ticketId: "received", ticketNumber: "TK-RECEIVED" };
      },
      clearReportListCache: async () => {
        throw new Error("AsyncStorage getAllKeys failed");
      },
      requestReportRevalidation: () => {},
      runQueueMutation: async (_key: string, fn: () => unknown) => fn(),
      readQueue: async () => [],
      writeQueue: async () => {},
      deleteReportEvidence: () => {},
      queueStorageKey: "queue",
    },
  );
  const result: ReportQueueItem = await run(
    { ...fixtureSavedReport, attempts: 0 },
    "token",
  );
  assert.equal(submissions, 1);
  assert.equal(result.status, "queued");
  assert.equal(result.attempts, 1);
  assert.equal(result.lastErrorPhase, null);
  const state = presentQueuedReport(result, false);
  assert.equal(state.unconfirmed, true);
  assert.equal(state.canDiscard, false);
  assert.equal(state.canRetry, true);
  assert.doesNotMatch(
    state.description,
    /No ALECO reference has been assigned/,
  );
});

test("restoring Home Address keeps the coordinate-derived canonical barangay", async () => {
  const source = await parse("src/features/reports/new-report-screen.tsx");
  let action: ts.Expression | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isJsxOpeningElement(node)) {
      const attrs = node.attributes.properties;
      if (
        attrs.some(
          (attr) =>
            ts.isJsxAttribute(attr) &&
            attr.name.getText(source) === "accessibilityState" &&
            attr.getText(source).includes("form.useHomeAddress"),
        )
      ) {
        const attr = attrs.find(
          (attr) =>
            ts.isJsxAttribute(attr) && attr.name.getText(source) === "onPress",
        );
        if (
          attr &&
          ts.isJsxAttribute(attr) &&
          attr.initializer &&
          ts.isJsxExpression(attr.initializer)
        )
          action = attr.initializer.expression;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.ok(action);
  const meta = {
    municipalities: [{ code: "0505060000", name: "Legazpi" }],
    barangays: [
      {
        code: "0505060010",
        name: "Bigaa",
        municipalityCode: "0505060000",
        municipalityName: "Legazpi",
      },
    ],
  };
  const profile = {
    homeCoordinates: { lat: 13.18, lng: 123.7 },
    barangayPsgc: "retired-code",
  };
  const expected = resolveHomeReportLocation(meta, profile, "0505060010");
  assert.equal(expected.locationVerified, true);
  const form = { useHomeAddress: false };
  let restored: Record<string, unknown> | undefined;
  const run = evaluate("exports.run = " + action.getText(source) + ";", {
    form,
    manualLocation: { current: null },
    fixtures: false,
    creationFixtureLocation: {},
    meta,
    profile,
    readReportCoordinates,
    resolveHomeReportLocation,
    findAlbayBarangay: () => ({ barangayPsgc: "0505060010" }),
    setForm: (update: (value: typeof form) => Record<string, unknown>) => {
      restored = update(form);
    },
  });
  run();
  assert.deepEqual(restored, { ...expected, useHomeAddress: true });
});

test("Android address search obtains permission and offers manual recovery when denied", async () => {
  const source = await parse("src/features/maps/report-location-picker.tsx");
  let expression: ts.Expression | undefined;
  const visit = (node: ts.Node) => {
    if (
      ts.isVariableDeclaration(node) &&
      node.name.getText(source) === "search"
    )
      expression = node.initializer;
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.ok(expression);
  for (const [platform, granted] of [
    ["android", true],
    ["android", false],
    ["ios", true],
  ] as const) {
    const calls: string[] = [];
    const errors: (string | null)[] = [];
    const run = evaluate("exports.run = " + expression.getText(source) + ";", {
      searching: false,
      fixture: false,
      query: "Bigaa",
      meta: { barangays: [], municipalities: [] },
      barangay: "",
      municipality: "",
      setSearching: () => {},
      setError: (message: string | null) => errors.push(message),
      setSearchView: () => {},
      openRef: { current: true },
      Platform: { OS: platform },
      Location: {
        requestForegroundPermissionsAsync: async () => {
          calls.push("permission");
          return { granted };
        },
        geocodeAsync: async () => {
          calls.push("geocode");
          return [{ latitude: 13.18, longitude: 123.7 }];
        },
      },
      withTimeout: (promise: Promise<unknown>) => promise,
      isWithinAlbay: () => true,
      findAlbayBarangay: () => ({ barangayPsgc: "Bigaa" }),
      moveTo: () => calls.push("move"),
    });
    await run();
    if (platform === "android" && !granted) {
      assert.deepEqual(calls, ["permission"]);
      assert.match(errors.filter(Boolean).join(" "), /denied.*manually/i);
    } else
      assert.deepEqual(
        calls,
        platform === "android"
          ? ["permission", "geocode", "move"]
          : ["geocode", "move"],
      );
  }
});

test("late detail reads cannot overwrite or clear the accepted known-status baseline", async () => {
  const source = await parse("src/features/reports/report-detail-screen.tsx");
  let reader: ts.Expression | undefined;
  let baseline: ts.Expression | undefined;
  const visit = (node: ts.Node) => {
    if (
      ts.isVariableDeclaration(node) &&
      node.name.getText(source) === "read" &&
      node.initializer &&
      ts.isCallExpression(node.initializer)
    )
      reader = node.initializer.arguments[1];
    if (
      ts.isCallExpression(node) &&
      node.expression.getText(source) === "useLayoutEffect" &&
      node.arguments[0]?.getText(source).includes("previous.current")
    )
      baseline = node.arguments[0];
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.ok(reader);
  for (const lateFailure of [false, true]) {
    const previous = { current: null as unknown };
    const requests: {
      resolve: (value: unknown) => void;
      reject: (error: unknown) => void;
    }[] = [];
    const scope = "owner:report";
    const run = evaluate("exports.run = " + reader.getText(source) + ";", {
      fixtures: false,
      params: {},
      id: "r1",
      serviceAccountId: "home",
      accountContext: { accessRevision: 1 },
      scope,
      scopeRef: { current: scope },
      previous,
      preserveKnownConsumerReportDetailStatus,
      reportAccessUnavailable,
      fetchComplaintReportDetail: () =>
        new Promise((resolve, reject) => requests.push({ resolve, reject })),
    });
    const old = run(false),
      fresh = run(true);
    requests[1].resolve({ id: "r1", status: "resolved" });
    const accepted = await fresh;
    if (baseline)
      evaluate("exports.run = " + baseline.getText(source) + ";", {
        previous,
        scope,
        data: accepted,
        read: { data: accepted },
      })();
    if (lateFailure) requests[0].reject({ status: 403 });
    else requests[0].resolve({ id: "r1", status: "verified" });
    await old;
    const refresh = run(true);
    requests[2].resolve({ id: "r1", status: null });
    const latest = await refresh;
    assert.equal(
      latest.report.status,
      "resolved",
      lateFailure ? "late access failure" : "late old status",
    );
    assert.equal(latest.isStale, true);
  }
});

test("a signed-out creation entry does not request authenticated report metadata", async () => {
  const source = await parse("src/features/reports/new-report-screen.tsx");
  let effect: ts.Expression | undefined;
  const visit = (node: ts.Node) => {
    if (
      ts.isCallExpression(node) &&
      node.expression.getText(source) === "useEffect" &&
      node.arguments[0]?.getText(source).includes("fetchComplaintMeta")
    )
      effect = node.arguments[0];
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.ok(effect);
  let requests = 0;
  evaluate("exports.run = " + effect.getText(source) + ";", {
    fixtures: false,
    session: null,
    setMetaLoading: () => {},
    setMetaError: () => {},
    setMeta: () => {},
    fetchComplaintMeta: async () => {
      requests++;
      return {};
    },
    hasCurrentReportContract: () => true,
  })();
  await Promise.resolve();
  assert.equal(requests, 0);
});
