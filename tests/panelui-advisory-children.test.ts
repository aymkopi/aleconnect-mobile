import test from "node:test";
import assert from "node:assert/strict";
import {
  advisorySchedule,
  advisoryTypeLabel,
  matchesUpdate,
  readUpdate,
  findPublicPost,
  safePublicUrl,
} from "../src/features/advisories/presentation.ts";
const advisory = {
  kind: "advisory" as const,
  id: "a",
  type: "scheduled_outage",
  title: "Power interruption",
  content: "Maintenance in Rawis",
  controlNumber: "SO-1920",
  severity: "high",
  audience: "Rawis",
  publishedAt: "2026-10-01T00:00:00Z",
  effectiveAt: null,
  expiresAt: null,
  scheduledStartAt: "2026-10-07T00:00:00Z",
  scheduledEndAt: "2026-10-07T09:00:00Z",
};
test("canonical schedules do not infer restoration from a past end or general-information dates", () => {
  assert.equal(advisoryTypeLabel("restoration"), "Power restored");
  assert.equal(advisorySchedule(advisory)?.label, "Interruption schedule");
  assert.equal(advisorySchedule({ ...advisory, type: "general" }), null);
  assert.equal(
    advisorySchedule({ ...advisory, type: "weather_advisory" }),
    null,
  );
  assert.deepEqual(advisorySchedule({ ...advisory, type: "restoration" }), {
    label: "Restored at",
    start: advisory.scheduledEndAt,
    end: null,
  });
  assert.equal(
    advisorySchedule({
      ...advisory,
      type: "restoration",
      scheduledEndAt: null,
    }),
    null,
  );
  assert.equal(
    advisorySchedule({
      ...advisory,
      scheduledStartAt: "invalid",
      scheduledEndAt: null,
    }),
    null,
  );
  assert.equal(advisoryTypeLabel("future_type"), "Advisory");
});
test("search includes reference, audience and message while respecting kind", () => {
  assert.equal(matchesUpdate(advisory, "  so-1920  ", "all"), true);
  assert.equal(matchesUpdate(advisory, "rawis", "advisories"), true);
  assert.equal(matchesUpdate(advisory, "rawis", "feed"), false);
  assert.equal(matchesUpdate(advisory, "missing", "all"), false);
});
test("post lookup walks older pages, excludes advisory IDs and terminates repeated cursors", async () => {
  const post = {
    kind: "facebook_post" as const,
    id: "a",
    message: "Story",
    photos: [],
    publishedAt: "",
    permalink: null,
    pageName: null,
  };
  const cursors: (string | null)[] = [];
  assert.equal(
    await findPublicPost("a", async (cursor) => {
      cursors.push(cursor);
      return cursor
        ? { items: [post], nextCursor: null }
        : { items: [advisory], nextCursor: "older" };
    }),
    post,
  );
  assert.deepEqual(cursors, [null, "older"]);
  assert.equal(
    await findPublicPost("missing", async () => ({
      items: [],
      nextCursor: null,
    })),
    null,
  );
  await assert.rejects(
    findPublicPost("a", async () => ({ items: [], nextCursor: "repeat" })),
    /refresh/i,
  );
  await assert.rejects(
    findPublicPost("a", async () => {
      throw new Error("network");
    }),
    /network/,
  );
});
test("access failure replaces visible data, ordinary network failures stay retryable", async () => {
  for (const status of [401, 403, 404])
    assert.deepEqual(
      await readUpdate(async () => {
        throw { status };
      }),
      { item: null, unavailable: status !== 401, signIn: status === 401 },
    );
  assert.deepEqual(await readUpdate(async () => null), {
    item: null,
    unavailable: true,
    signIn: false,
  });
  await assert.rejects(
    readUpdate(async () => {
      throw new Error("offline");
    }),
    /offline/,
  );
});
test("remote media and external links accept HTTPS only", () => {
  assert.equal(safePublicUrl("https://example.com/photo.jpg"), true);
  for (const url of [
    "http://example.com",
    "javascript:alert(1)",
    "file:///secret",
    "content://secret",
    "bad",
  ])
    assert.equal(safePublicUrl(url), false);
});
