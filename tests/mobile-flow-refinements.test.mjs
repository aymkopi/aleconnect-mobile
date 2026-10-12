import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
import { booleanPointInPolygon } from "@turf/boolean-point-in-polygon";
import { initialReportCoordinates, REPORT_MAP_BOUNDS, REPORT_MAP_MIN_ZOOM } from "../src/features/maps/report-location-state.ts";

const source = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");
function evaluate(code, modules = {}, globals = {}) {
  const out = {};
  const compiled = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  new Function("exports", "require", ...Object.keys(globals), compiled)(out, name => {
    assert.ok(name in modules, `Unexpected import ${name}`);
    return modules[name];
  }, ...Object.values(globals));
  return out;
}
async function expression(file, name) {
  const text = await source(file), ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let result;
  const visit = node => {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === name) result = node.initializer.getText(ast);
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) result = node.getText(ast);
    ts.forEachChild(node, visit);
  };
  visit(ast);
  assert.ok(result, `${name} exists`);
  return result;
}

test("category Continue reopens multiple type cards even when a type is retained", async () => {
  const code = await expression("src/features/reports/new-report-screen.tsx", "continueStep");
  for (const count of [0, 1, 3]) {
    const calls = [];
    const { run } = evaluate(`exports.run = ${code}`, {}, {
      setAttempted: () => {}, pickerBusy: false, step: 2, issueView: "category",
      form: { categoryId: "power", typeId: "retained" }, accountReady: true,
      types: Array(count).fill({}), setIssueView: view => calls.push(view),
      stepErrors: [], editingReview: false, setEditingReview() {},
      nextCreationStep: () => 3, setStep: step => calls.push(step),
    });
    run();
    assert.deepEqual(calls, count === 1 ? [3] : ["type"]);
  }
});

test("report map starts at street zoom locally and rejects ocean and neighboring provinces", async () => {
  const geo = JSON.parse(await source("assets/geo/albay_barangays.json"));
  const { findAlbayBarangay } = evaluate(await source("src/features/reports/albay-barangays.ts"), {
    "@turf/boolean-point-in-polygon": { booleanPointInPolygon }, "@/assets/geo/albay_barangays.json": geo,
  });
  assert.ok(findAlbayBarangay(13.1806, 123.7416));
  for (const point of [[13.15, 123.9], [13.52, 123.3], [14.6, 121]]) assert.equal(findAlbayBarangay(...point), null);
  const initial = { latitude: 13.1806, longitude: 123.7416 };
  assert.equal(initialReportCoordinates(initial), initial);
  for (const point of [null, { latitude: 14.6, longitude: 121 }, { latitude: NaN, longitude: 123.7 }]) {
    const fallback = initialReportCoordinates(point);
    assert.ok(findAlbayBarangay(fallback.latitude, fallback.longitude));
  }
  assert.equal(REPORT_MAP_MIN_ZOOM, 10);
  assert.deepEqual(REPORT_MAP_BOUNDS, [123.25, 12.9, 124, 13.55]);
});

test("Android channels are created before permission and Expo token requests", async () => {
  for (const granted of [true, false]) {
    const calls = [];
    const notifications = {
      AndroidImportance: { MAX: 5, DEFAULT: 3, HIGH: 4 },
      addNotificationResponseReceivedListener() {},
      setNotificationChannelAsync: async () => calls.push("channel"),
      getPermissionsAsync: async () => { calls.push("permission"); return { granted: false }; },
      requestPermissionsAsync: async () => { calls.push("request"); return { granted }; },
      getExpoPushTokenAsync: async () => { calls.push("token"); return { data: "ExpoPushToken[fixture]" }; },
    };
    const out = evaluate(await source("src/services/push-notifications.ts"), {
      "@react-native-async-storage/async-storage": {}, "expo-device": { isDevice: true },
      "expo-notifications": notifications, "expo-task-manager": { isTaskDefined: () => true, isTaskRegisteredAsync: async () => true },
      "react-native": { Platform: { OS: "android" } }, "@/constants": { expoPushProjectId: "fixture-project" },
    });
    assert.equal(await out.registerForPushNotificationsAsync(), granted ? "ExpoPushToken[fixture]" : null);
    assert.deepEqual(calls, ["channel", "channel", "channel", "permission", "request", ...(granted ? ["token"] : [])]);
  }
});

test("device setup reports ready only after permission, token and server registration succeed", async () => {
  const code = await expression("src/features/profile/alerts-screen.tsx", "setup");
  for (const result of [null, { ok: false }, { ok: true }]) {
    const changes = [], calls = [];
    const { run } = evaluate(`${code}\nexports.run = setup;`, {}, {
      deviceBusy: false, setDeviceBusy: busy => changes.push(["busy", busy]), setDeviceError: error => changes.push(["error", error]),
      identity: { fixture: false }, PANELUI_PREVIEW: false, current: () => true, setPermission() {},
      requestPushNotificationPermissionAsync: async () => { calls.push("permission"); return { granted: true }; },
      registerForPushNotificationsAsync: async () => { calls.push("token"); return "ExpoPushToken[fixture]"; },
      registerDevicePushToken: async () => { calls.push("register"); return result; },
      setDeviceRegistered: value => changes.push(["registered", value]),
    });
    await run();
    assert.deepEqual(calls, ["permission", "token", "register"]);
    assert.equal(changes.some(([key]) => key === "registered"), result?.ok === true);
    assert.deepEqual(changes.at(-1), ["busy", false]);
    if (!result?.ok) assert.match(changes.find(([key, value]) => key === "error" && value)[1], /not be registered/);
  }
});

test("native search and cancellation seed the map from the selected or panned location", async () => {
  const move = await expression("src/features/maps/report-location-picker.tsx", "moveTo");
  const open = await expression("src/features/maps/report-location-picker.tsx", "openSearch");
  const point = { latitude: 13.18, longitude: 123.74 };
  for (const mounted of [false, true]) {
    const calls = [];
    const { run } = evaluate(`exports.run = ${move};`, {}, {
      useCallback: fn => fn, setCoordinates: next => calls.push(["pin", next]), setError() {},
      Platform: { OS: "android" }, camera: { current: mounted ? { flyTo: value => calls.push(["fly", value]) } : null },
      webCamera: { current: null }, zoom: { current: 17 }, setInitialCamera: value => calls.push(["initial", value]),
    });
    run(point);
    assert.deepEqual(calls[1], [mounted ? "fly" : "initial", mounted ? { center: [123.74, 13.18], zoom: 17, duration: 500 } : { center: [123.74, 13.18], zoom: 17 }]);
  }
  const calls = [];
  evaluate(`exports.run = ${open};`, {}, { coordinates: point, zoom: { current: 17 }, setInitialCamera: value => calls.push(value), setSearchView: value => calls.push(value) }).run();
  assert.deepEqual(calls, [{ center: [123.74, 13.18], zoom: 17 }, true]);
});

test("copy-ticket feedback distinguishes clipboard success, refusal and rejection", async () => {
  const file = "src/features/reports/report-detail-screen.tsx", text = await source(file);
  const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let handler;
  const visit = node => {
    if (ts.isJsxOpeningElement(node) && node.attributes.properties.some(attr => ts.isJsxAttribute(attr) && attr.name.getText(ast) === "accessibilityLabel" && attr.initializer?.getText(ast) === '"Copy ticket number"')) {
      handler = node.attributes.properties.find(attr => attr.name?.getText(ast) === "onPress").initializer.expression.getText(ast);
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
  assert.ok(handler);
  for (const result of [true, false, new Error("Clipboard unavailable")]) {
    const messages = [];
    const { run } = evaluate(`exports.run = ${handler};`, {}, {
      report: { ticketNumber: "TK-123" }, toast: { show: message => messages.push(message) },
      Clipboard: { setStringAsync: async value => { assert.equal(value, "TK-123"); if (result instanceof Error) throw result; return result; } },
    });
    run();
    await new Promise(setImmediate);
    assert.equal(messages.length, 1);
    assert.equal(messages[0].label, result === true ? "Ticket number copied" : "Could not copy the ticket number");
  }
});
