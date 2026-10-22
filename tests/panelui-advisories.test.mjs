import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { advisorySchedule, advisoryCardTitle, updateTopicLabel } from "../src/features/advisories/presentation.ts";
const source = await readFile(
  new URL("../src/features/advisories/publisher-card.tsx", import.meta.url),
  "utf8",
);
const rangeCalls = [],
  jsx = (type, props) => ({ type, props });
const mocks = {
    "./presentation": { advisorySchedule, advisoryCardTitle, updateTopicLabel },
    "@/components/activity-card": { ActivityCard: "ActivityCard" },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react-native": { Pressable: "Pressable", View: "View" },
    "lucide-react-native": {
      ChevronRight: "Chevron",
      Zap: "Zap",
      MapPin: "MapPin",
    },
    "@/components/panelui/text": { Text: "Text" },
    "@/components/panelui/badge": { Badge: "Badge" },
    "@/hooks/use-app-colors": { useAppColors: () => ["blue"] },
    "@/components/soft-radial": { SoftRadial: "Radial" },
    "@/utils/manila-time": {
      formatManilaDateTime: () => "Published date",
      formatManilaAdvisoryInterruptionRange: (start, end) => {
        rangeCalls.push([start, end]);
        return end ? "Start – End" : "Starts at time";
      },
    },
  },
  exports = {};
new Function(
  "require",
  "exports",
  ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText,
)((id) => mocks[id], exports);
function text(node) {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(text).join(" ");
  return node && typeof node === "object" ? text(node.props?.children) : "";
}
test("scheduled publisher cards use source range, including unknown restoration time", () => {
  for (const end of ["2026-10-07T09:00:00Z", null]) {
    const tree = exports.PublisherCard({
      item: {
        kind: "advisory",
        title: "Scheduled interruption",
        type: "scheduled_outage",
        scheduledStartAt: "2026-10-07T00:00:00Z",
        scheduledEndAt: end,
        severity: "high",
        audience: "Rawis",
      },
      onPress() {},
    });
    assert.deepEqual(rangeCalls.at(-1), ["2026-10-07T00:00:00Z", end]);
    assert.match(tree.props.metadata, end ? /Start – End/ : /Starts at time/);
    assert.equal(tree.type, "ActivityCard");
    assert.equal(tree.props.title, "Scheduled interruption - Rawis");
  }
});
test("image-free public posts have readable publisher and summary fallbacks", () => {
  const tree = exports.PublisherCard({
    item: {
      kind: "facebook_post",
      message: "",
      pageName: null,
      photos: [],
      permalink: null,
    },
    onPress() {},
  });
  assert.equal(tree.type, "ActivityCard");
  assert.equal(tree.props.reference, "ALECO");
  assert.equal(tree.props.title, "ALECO update");
  assert.equal(tree.props.metadata, "Published: Published date");
  assert.equal(tree.props.badge, undefined);
});

test("Facebook list and Home cards share layout, publisher, date and navigation", () => {
  let opened = 0;
  const item = { kind: "facebook_post", message: "Service reminder. Full post stays available in the detail.", pageName: "ALECO", topic: "general", publishedAt: "2026-10-22T01:00:00Z" };
  for (const height of [undefined, 112]) {
    const card = exports.PublisherCard({ item, height, onPress() { opened++; } });
    assert.equal(card.type, "ActivityCard");
    assert.equal(card.props.height, height);
    assert.equal(card.props.reference, "ALECO");
    assert.equal(card.props.title, "Service reminder");
    assert.equal(card.props.metadata, "Published: Published date");
    assert.equal(text(card.props.badge), "General");
    card.props.onPress();
  }
  assert.equal(opened, 2);
});

test("fixed-height carousel cards truncate the title while retaining full accessible navigation", () => {
  const title = "Scheduled power outage affecting several barangays in Legazpi City";
  let opened = 0;
  const props = { item: { kind: "advisory", title, severity: "high", audience: "Rawis" }, onPress() { opened++; } };
  const card = exports.PublisherCard({ ...props, height: 112 });
  assert.equal(card.props.height, 112);
  assert.equal(card.props.title, title + " - Rawis");
  card.props.onPress();
  assert.equal(opened, 1);
  const listCard = exports.PublisherCard(props);
  assert.equal(listCard.type, card.type);
  assert.equal(listCard.props.title, card.props.title);
});
