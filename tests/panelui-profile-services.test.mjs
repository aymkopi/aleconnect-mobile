import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";
async function load(path, modules, extras = {}) {
  const source = await readFile(new URL("../" + path, import.meta.url), "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(output, {
    exports,
    require: (id) => {
      if (!(id in modules)) throw new Error("Unexpected dependency " + id);
      return modules[id];
    },
    URLSearchParams,
    Date,
    JSON,
    ...extras,
  });
  return exports;
}
const profile = {
  id: "service-b",
  name: "Consumer",
  email: "account@example.com",
  profileEditing: { version: 1, activeReportCount: 0 },
};
test("verified details keep all reviewed fields, exact password and selected revision in one request", async () => {
  const calls = [];
  const api = await load("src/services/profile.ts", {
    "@/services/api": {
      apiRequest: async (...args) => {
        calls.push(args);
        return { updated: true, profile };
      },
    },
    "@/models/consumer-profile-view": { toConsumerProfileView: (r) => r },
  });
  const address = {
    municipalityCode: "m",
    barangayPsgc: "b",
    purokOrStreet: "Purok 1",
    landmark: "",
    latitude: 13.14,
    longitude: 123.73,
  };
  const result = await api.updateVerifiedConsumerDetails(
    { phone: "09171234567", address },
    " exact service secret ",
    { serviceAccountId: "service-b", accessRevision: 7 },
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "/api/mobile/profile?serviceAccountId=service-b");
  assert.deepEqual(JSON.parse(calls[0][1].body), {
    field: "details",
    value: { phone: "09171234567", address },
    currentAccountPassword: " exact service secret ",
    serviceAccountId: "service-b",
    accessRevision: 7,
  });
  assert.deepEqual(result.profile_editing, { version: 1, activeReportCount: 0 });
});
test("photo upload and completion both retain the selected nondefault account", async () => {
  const calls = [];
  const api = await load(
    "src/services/profile.ts",
    {
      "@/services/api": {
        apiRequest: async (...args) => {
          calls.push(args);
          return calls.length === 1
            ? { uploadUrl: "https://upload.example/photo", key: "avatar/key" }
            : { avatarUrl: "https://assets.example/avatar" };
        },
      },
      "@/models/consumer-profile-view": { toConsumerProfileView: (r) => r },
    },
    { fetch: async () => ({ ok: true }) },
  );
  assert.equal(
    await api.uploadCurrentUserAvatar(
      { imageBytes: new ArrayBuffer(2), contentType: "image/webp" },
      { serviceAccountId: "service-b", accessRevision: 7 },
    ),
    "https://assets.example/avatar",
  );
  assert.match(calls[0][0], /serviceAccountId=service-b/);
  for (const [, options] of calls) {
    const body = JSON.parse(options.body);
    assert.equal(body.serviceAccountId, "service-b");
    assert.equal(body.accessRevision, 7);
  }
});
class ApiRequestError extends Error {
  constructor(status) {
    super("request failed");
    this.status = status;
  }
}
async function notificationApi(status) {
  const cache = new Map([
    [
      "notification_settings_cache_v1:principal",
      JSON.stringify({
        value: {
          preferences: { receivePushNotifications: true, receiveAdvisories: true },
          selectedSubstationIds: [],
          selectedFeederIds: [],
          substations: [],
        },
      }),
    ],
  ]);
  let writes = 0;
  const api = await load("src/services/notification-settings.ts", {
    "@react-native-async-storage/async-storage": {
      __esModule: true,
      default: {
        getItem: async (k) => cache.get(k),
        setItem: async (k, v) => {
          writes++;
          cache.set(k, v);
        },
      },
    },
    "expo-device": {},
    "react-native": { Platform: { OS: "android" } },
    "@/services/api": {
      ApiRequestError,
      apiRequest: async () => {
        if (status) throw new ApiRequestError(status);
        return {
          preferences: { receivePushNotifications: false, receiveAdvisories: true },
          selectedSubstationIds: [],
          selectedFeederIds: [],
          substations: [],
        };
      },
    },
  });
  return { api, writes: () => writes };
}
test("401 and 403 cannot expose a cached private notification view", async () => {
  for (const status of [401, 403]) {
    const { api, writes } = await notificationApi(status);
    await assert.rejects(
      () => api.fetchNotificationSettings("principal"),
      (e) => e.status === status,
    );
    assert.equal(writes(), 0);
  }
});
test("network failure may show a stale view, but a failed save never overwrites cache", async () => {
  const { api, writes } = await notificationApi(503);
  assert.equal((await api.fetchNotificationSettings("principal")).isStale, true);
  await assert.rejects(() =>
    api.saveNotificationSettings("principal", {
      receivePushNotifications: false,
      receiveAdvisories: false,
      selectedSubstationIds: [],
      selectedFeederIds: [],
    }),
  );
  assert.equal(writes(), 0);
});
test("successful preference save caches the confirmed response", async () => {
  const { api, writes } = await notificationApi();
  const result = await api.saveNotificationSettings("principal", {
    receivePushNotifications: true,
    receiveAdvisories: true,
    selectedSubstationIds: [],
    selectedFeederIds: [],
  });
  assert.equal(result.preferences.receivePushNotifications, false);
  assert.equal(writes(), 1);
});

test("late email setup responses never replace a newer or logged-out session", async () => {
  for (const reason of ["token", "scope", "ok"]) {
    let token = "legacy-token",
      active = true,
      resolve;
    const writes = [],
      calls = [];
    const response = new Promise((r) => {
      resolve = r;
    });
    const api = await load("src/services/consumer-identity.ts", {
      "@react-native-async-storage/async-storage": { __esModule: true, default: {} },
      "@/features/accounts/contract": {},
      "@/services/linked-accounts": {},
      "@/services/api": {
        getAuthToken: async () => token,
        setAuthToken: async (t) => {
          writes.push(t);
          token = t;
        },
        apiRequest: async (...args) => {
          calls.push(args);
          return response;
        },
      },
    });
    const pending = api.setupConsumerIdentity(
      {
        email: " USER@example.com ",
        password: " exact secret ",
        verification: "mock",
        idempotencyKey: "attempt",
      },
      () => active,
    );
    await new Promise((r) => setImmediate(r));
    assert.equal(calls[0][2].authToken, "legacy-token");
    if (reason === "token") token = "newer-token";
    if (reason === "scope") active = false;
    resolve({ token: "identity-token" });
    if (reason === "ok") {
      await pending;
      assert.deepEqual(writes, ["identity-token"]);
    } else {
      await assert.rejects(pending, /Account access changed/);
      assert.deepEqual(writes, []);
    }
  }
});

test("Profile children do not require the retired profile-context provider", async () => {
  for (const name of ["details", "accounts", "photo"]) {
    const screen = await readFile(
      new URL("../src/features/profile/" + name + "-screen.tsx", import.meta.url),
      "utf8",
    );
    assert.doesNotMatch(screen, /useConsumerProfileContext/);
  }
  const account = await readFile(
    new URL("../src/features/profile/account-screen.tsx", import.meta.url),
    "utf8",
  );
  assert.match(account, /useMainPageScroll[\s\S]*reload\(\{\s*forceNetwork:\s*true/);
});
