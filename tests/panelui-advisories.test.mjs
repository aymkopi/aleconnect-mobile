import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { advisorySchedule, advisoryCardTitle, updateTopicLabel } from "../src/features/advisories/presentation.ts";
import { parseApiInstant } from "../src/utils/manila-time.ts";
import { consumerTicketStatusLabel, reportCardDate } from "../src/features/reports/data.ts";
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
      parseApiInstant,
      formatManilaDateTime: () => "Published date",
      formatManilaAdvisoryInterruptionRange: (start, end) => {
        rangeCalls.push([start, end]);
        return end ? "Start – End" : "Starts at time";
      },
    },
  };
function evaluateComponent(code, dependencies = mocks) {
  const exports = {};
  new Function(
  "require",
  "exports",
  ts.transpileModule(code, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText,
  )((id) => dependencies[id], exports);
  return exports;
}
const exports = evaluateComponent(source);
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
    assert.equal(tree.props.title, "Scheduled interruption");
    assert.equal(tree.props.footer, "Rawis");
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
  assert.equal(tree.props.metadata, "Facebook post");
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
  assert.equal(card.props.title, title);
  assert.equal(card.props.footer, "Rawis");
  card.props.onPress();
  assert.equal(opened, 1);
  const listCard = exports.PublisherCard(props);
  assert.equal(listCard.type, card.type);
  assert.equal(listCard.props.title, card.props.title);
});

test("advisory titles keep the type or custom title while feeders stay in the footer", () => {
  for (const [type, title, expected] of [["scheduled_outage", "Outage", "Scheduled interruption"], ["general", "Billing reminder", "Billing reminder"]]) {
    const card = exports.PublisherCard({ item: { kind: "advisory", type, title, severity: "normal", audience: "F1, F2, F3" }, onPress() {} });
    assert.equal(card.props.title, expected);
    assert.equal(card.props.footer, "F1, F2, F3");
  }
});

test("shared cards put optional location or feeders after the update date", async () => {
  const code = await readFile(new URL("../src/components/activity-card.tsx", import.meta.url), "utf8");
  const { ActivityCard } = evaluateComponent(code);
  const badge = { type: "Badge", props: { children: "Verified" } };
  for (const footer of [undefined, "Rawis, Legazpi City", "F1, F2, F3"]) {
    let opened = 0;
    const card = ActivityCard({ reference: "TK-001", title: "Primary Line", metadata: "Latest update: Today", footer, badge, onPress() { opened++; } });
    const [header, title, date, lastRow] = card.props.children;
    assert.equal(text(header), "TK-001 Verified ");
    assert.equal(text(title), "Primary Line");
    assert.equal(title.props.numberOfLines, 2);
    assert.equal(text(date), footer ? "Latest update: Today" : "");
    assert.equal(text(lastRow).trim(), footer || "Latest update: Today");
    if (footer) assert.ok(card.props.accessibilityLabel.includes(footer));
    card.props.onPress();
    assert.equal(opened, 1);
  }
  const homeCard = ActivityCard({ reference: "SO-001", title: "Scheduled interruption", metadata: "Tomorrow", footer: "F1, F2, F3", height: 112, onPress() {} });
  assert.equal(homeCard.props.children[1].props.numberOfLines, 1);
});

test("report cards restore the location and retain the legacy category fallback", async () => {
  const code = await readFile(new URL("../src/features/reports/report-card.tsx", import.meta.url), "utf8");
  const { ReportCard } = evaluateComponent(code, { ...mocks, "./data": { consumerTicketStatusLabel, reportCardDate }, "./report-status-badge": { ReportStatusBadge: "ReportStatusBadge" } });
  for (const displayAddress of ["Rawis, Legazpi City", null]) {
    const card = ReportCard({ report: { ticketNumber: "TK-001", typeTitle: "Primary Line", status: "verified", createdAt: "2026-10-22T01:00:00Z", categoryTitle: "Service concerns", displayAddress }, onPress() {} });
    assert.equal(card.props.footer, displayAddress ?? "Service concerns");
    assert.ok(card.props.accessibilityLabel.includes(card.props.footer));
  }
});
