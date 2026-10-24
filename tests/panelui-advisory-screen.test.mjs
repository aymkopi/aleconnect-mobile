import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { manualRefreshHarness } from "./manual-refresh-harness.mjs";
import * as presentation from "../src/features/advisories/presentation.ts";
const source = await readFile(
  new URL(
    "../src/features/advisories/update-detail-screen.tsx",
    import.meta.url,
  ),
  "utf8",
);
function harness() {
  const state = {
    session: { user: { id: "user-1" } },
    accountContext: { identityUserId: "identity-1", accessRevision: 1 },
    fixtures: false,
    params: { id: "notice", preview: "billing" },
    result: undefined,
    busy: false,
    error: null,
    calls: [],
    scope: null,
    reader: null,
    canGoBack: false,
  };
  const slot = (name) =>
    Object.assign(
      name === "Card" ||
        name === "EmptyState" ||
        name === "BottomSheet" ||
        name === "Field"
        ? (props) => ({ type: name, props })
        : {},
      Object.fromEntries(
        [
          "Content",
          "Header",
          "Body",
          "Footer",
          "Label",
          "Description",
          "Title",
        ].map((s) => [s, name + "." + s]),
      ),
    );
  const jsx = (type, props) =>
    typeof type === "function" ? type(props) : { type, props };
  const modules = {
    "@/components/data-state": { DataState: "DataState", DataNotice: "DataNotice" },
    react: { useEffect: () => {}, useState: (v) => [v, () => {}], useMemo: (f) => f() },
    "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "Fragment" },
    "react-native": {
      View: "View",
      Pressable: "Pressable",
      Linking: { openURL: async () => {} },
    },
    "expo-router": {
      useLocalSearchParams: () => state.params,
      useRouter: () => ({
        canGoBack: () => state.canGoBack,
        back: () => state.calls.push("back"),
        replace: (p) => state.calls.push(p),
        push: (p) => state.calls.push(p),
        setParams: (p) => state.calls.push(p),
      }),
    },
    "lucide-react-native": Object.fromEntries(
      [
        "CalendarClock",
        "ChevronRight",
        "MapPin",
        "Phone",
        "RefreshCw",
        "ShieldCheck",
      ].map((s) => [s, s]),
    ),
    "@/features/reports/components/report-page": { ReportPage: "ReportPage" },
    "@/components/search-field": { SearchField: "SearchField" },
    "@/hooks/use-auth-session": {
      useAuthSession: () => ({ session: state.session, isLoading: false }),
    },
    "@/hooks/use-consumer-account": {
      useConsumerAccount: () => ({ accountContext: state.accountContext }),
    },
    "@/hooks/use-scoped-read": {
      useScopedRead: (scope, reader) => {
        state.scope = scope;
        state.reader = reader;
        return {
          data: scope ? state.result : undefined,
          busy: state.busy,
          error: state.error,
          reload: async () => {
            state.result = await reader(true);
          },
        };
      },
    },
    "@/hooks/use-app-colors": { useAppColors: () => ["black", "blue"] },
    "@/context/guest-access-context": { useGuestAccess: () => ({ guest: !state.session, requestSignIn: () => {} }) },
    "@/context/visual-preview-context": {
      useVisualPreview: () => ({ fixtures: state.fixtures, publicFixtures: state.fixtures }),
    },
    "@/services/advisories": {
      fetchActiveAdvisory: async (id, scope) => {
        state.calls.push({ id, scope });
        if (state.failure) throw state.failure;
        return {
          id,
          title: "Official title",
          content: "Official message",
          type: "general",
          severity: "normal",
          publishedAt: "2026-10-01T00:00:00Z",
          controlNumber: null,
          audience: null,
        };
      },
    },
    "@/services/public-updates": {
      fetchPublicUpdates: async (options) => {
        state.calls.push(options);
        return {
          items: options.cursor
            ? [
                {
                  kind: "facebook_post",
                  id: "notice",
                  message: "Official post",
                  publishedAt: "2026-10-01T00:00:00Z",
                  photos: [],
                  permalink: null,
                  pageName: "ALECO",
                },
              ]
            : [],
          nextCursor: options.cursor ? null : "older",
        };
      },
    },
    "@/utils/manila-time": {
      formatManilaDateTime: (v) => v,
      formatManilaAdvisoryInterruptionRange: () => null,
    },
    "./presentation": presentation,
    "./detail-fixtures": {
      detailFixture: () => {
        state.calls.push("fixture");
        return null;
      },
    },
    "./public-update-photos": { PublicUpdatePhotos: "PublicUpdatePhotos" },
    "./advisory-reminder-section": { AdvisoryReminderSection: "AdvisoryReminderSection" },
  };
  for (const name of [
    "Text",
    "Card",
    "Badge",
    "Button",
    "BottomSheet",
    "Field",
    "Spinner",
    "EmptyState",
  ])
    modules[
      "@/components/panelui/" +
        name.replace(/[A-Z]/g, (c, i) => (i ? "-" : "") + c.toLowerCase())
    ] = {
      [name]: ["Card", "BottomSheet", "Field", "EmptyState"].includes(name)
        ? slot(name)
        : name,
    };
  modules["@/components/panelui/toast"] = { toast: { show: () => {} } };
  modules["@/hooks/use-manual-refresh"] = manualRefreshHarness(modules.react);
  const exports = {};
  new Function(
    "require",
    "exports",
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
  )((name) => {
    assert.ok(name in modules, "Unmocked " + name);
    return modules[name];
  }, exports);
  return {
    state,
    render: () => exports.default(),
    renderPost: () => exports.PostDetailScreen(),
  };
}
function words(tree) {
  if (typeof tree === "string") return tree;
  if (Array.isArray(tree)) return tree.map(words).join(" ");
  return tree && typeof tree === "object" ? words(tree.props?.children) : "";
}
test("guest detail ignores preview route flags and reads only the public scope", async () => {
  const h = harness();
  h.state.session = null;
  const tree = h.render();
  assert.equal(JSON.parse(h.state.scope)[0], "public");
  assert.doesNotMatch(words(tree), /Sign in to see your updates/);
  h.state.result = await h.state.reader(false);
  assert.equal(h.state.calls[0].scope.publicOnly, true);
  assert.equal(h.state.calls[0].scope.userId, "guest");
  assert.ok(!h.state.calls.includes("fixture"));
  assert.match(words(h.render()), /Official title/);
});
test("detail scope includes identity, access revision and ID; live params cannot select fixture data", async () => {
  const h = harness();
  h.render();
  assert.deepEqual(JSON.parse(h.state.scope), [
    "private",
    "user-1",
    "identity-1",
    1,
    "advisory",
    "notice",
  ]);
  h.state.result = await h.state.reader(false);
  const tree = h.render();
  assert.match(words(tree), /Official title/);
  assert.doesNotMatch(words(tree), /collection|fixture/i);
  assert.equal(h.state.calls.length, 1);
  h.state.accountContext.accessRevision = 2;
  h.render();
  assert.equal(JSON.parse(h.state.scope)[3], 2);
});
test("revoked access replaces old content with unavailable state; cold detail Back returns to advisories", async () => {
  const h = harness();
  h.render();
  h.state.result = await h.state.reader(false);
  assert.match(words(h.render()), /Official message/);
  h.state.failure = { status: 403 };
  h.state.result = await h.state.reader(true);
  const tree = h.render();
  assert.match(words(tree), /This update is unavailable/);
  assert.doesNotMatch(words(tree), /Official message/);
  tree.props.onBack();
  assert.equal(h.state.calls.at(-1), "/advisories");
});

test("post lookup matches the20-item feed cache cursor on first and older pages", async () => {
  const h = harness();
  h.renderPost();
  await h.state.reader(false);
  assert.deepEqual(
    h.state.calls.map((options) => [options.limit, options.cursor]),
    [
      [20, null],
      [20, "older"],
    ],
  );
});
