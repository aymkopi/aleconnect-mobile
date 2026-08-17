import assert from "node:assert/strict";
import test from "node:test";

import {
  MANILA_LOCALE,
  formatManilaAdvisoryInterruptionRange,
  formatManilaDateTime,
  formatManilaRelativeTime,
  formatManilaReportListDateTime,
  formatManilaWeekRange,
  isApiInstantExpired,
  isInManilaMonth,
  manilaNotificationGroupTitle,
  manilaWeekStartKey,
  parseApiInstant,
} from "../src/utils/manila-time.ts";

test("uses the en-PH locale contract for Manila formatting", () => {
  assert.equal(MANILA_LOCALE, "en-PH");
});

test("formats API instants with the Manila clock around a UTC day boundary", () => {
  assert.equal(
    formatManilaDateTime("2026-08-12T16:30:00.000Z"),
    "Aug 13, 12:30 AM",
  );
  assert.equal(
    formatManilaDateTime("2026-08-13T08:30:00+08:00"),
    "Aug 13, 08:30 AM",
  );
});

test("uses Manila calendar days for report month membership and notification labels", () => {
  const manilaAugust = new Date("2026-08-13T00:30:00.000Z");

  assert.equal(isInManilaMonth("2026-07-31T16:01:00.000Z", manilaAugust), true);
  assert.equal(
    isInManilaMonth("2026-08-31T16:00:00.000Z", manilaAugust),
    false,
  );
  assert.equal(
    manilaNotificationGroupTitle("2026-08-12T16:01:00.000Z", manilaAugust),
    "Today",
  );
  assert.equal(
    manilaNotificationGroupTitle("2026-08-12T15:59:00.000Z", manilaAugust),
    "Yesterday",
  );
});

test("groups Sunday-start report weeks from Manila calendar dates", () => {
  const weekKey = manilaWeekStartKey("2026-08-08T16:30:00.000Z");

  assert.equal(weekKey, "2026-08-09");
  assert.equal(formatManilaWeekRange(weekKey), "Aug 9 - Aug 15");
  assert.equal(
    manilaNotificationGroupTitle(
      "2026-08-08T15:59:00.000Z",
      new Date("2026-08-14T00:30:00.000Z"),
    ),
    "Last weekend",
  );
});

test("rejects offset-free API timestamps and returns safe UI fallbacks", () => {
  for (const value of ["2026-08-13", "2026-08-13T08:30:00"]) {
    assert.equal(parseApiInstant(value), null);
    assert.equal(formatManilaDateTime(value), "Date unavailable");
    assert.equal(manilaWeekStartKey(value), null);
    assert.equal(
      isInManilaMonth(value, new Date("2026-08-13T00:30:00.000Z")),
      false,
    );
    assert.equal(
      manilaNotificationGroupTitle(value, new Date("2026-08-13T00:30:00.000Z")),
      "Older",
    );
  }
});

test("keeps invalid report-detail timestamps out of relative-time formatting", () => {
  const reference = new Date("2026-08-13T00:00:00.000Z");

  assert.equal(
    formatManilaRelativeTime("2026-08-13T00:30:00.000Z", reference),
    "in 30 minutes",
  );
  assert.equal(
    formatManilaRelativeTime("2026-08-13T08:30:00", reference),
    "Date unavailable",
  );
});

test("does not expire evidence from an ambiguous API timestamp", () => {
  const reference = new Date("2026-08-13T00:00:00.000Z");

  assert.equal(
    isApiInstantExpired("2026-08-12T23:59:00.000Z", reference),
    true,
  );
  assert.equal(isApiInstantExpired("2026-08-12T23:59:00", reference), false);
});

test("rejects malformed RFC3339 calendar and numeric-offset boundaries", () => {
  for (const value of [
    "2026-02-29T00:00:00Z",
    "2026-04-31T00:00:00Z",
    "2026-13-01T00:00:00Z",
    "2026-01-01T24:00:00Z",
    "2026-01-01T00:00:00+24:00",
    "2026-01-01T00:00:00+08:60",
  ]) {
    assert.equal(parseApiInstant(value), null);
  }
  assert.ok(parseApiInstant("2024-02-29T23:59:59+14:00"));
});
test("formats report list timestamps like the report card", () => {
  assert.equal(
    formatManilaReportListDateTime("2026-08-15T01:00:00.000Z"),
    "9:00 AM, August 15",
  );

  assert.equal(
    formatManilaReportListDateTime("2026-08-15T09:05:00+08:00"),
    "9:05 AM, August 15",
  );

  assert.equal(
    formatManilaReportListDateTime("2026-08-15T09:05:00"),
    "Date unavailable",
  );
});
test("formats advisory interruption ranges against the Manila calendar", () => {
  const reference = new Date("2026-08-17T04:00:00.000Z");

  assert.equal(
    formatManilaAdvisoryInterruptionRange(
      "2026-08-17T06:00:00.000Z",
      "2026-08-17T09:00:00.000Z",
      reference,
    ),
    "2:00 PM, Today – 5:00 PM, Today",
  );

  assert.equal(
    formatManilaAdvisoryInterruptionRange(
      "2026-08-18T06:00:00.000Z",
      "2026-08-18T09:00:00.000Z",
      reference,
    ),
    "2:00 PM, Aug. 18 – 5:00 PM, Aug. 18",
  );

  assert.equal(
    formatManilaAdvisoryInterruptionRange(
      "2026-08-18T14:00:00.000Z",
      "2026-08-18T20:00:00.000Z",
      reference,
    ),
    "10:00 PM, Aug. 18 – 4:00 AM, Aug. 19",
  );

  assert.equal(
    formatManilaAdvisoryInterruptionRange(
      null,
      "2026-08-17T09:00:00.000Z",
      reference,
    ),
    null,
  );

  assert.equal(
    formatManilaAdvisoryInterruptionRange(
      "2026-08-17T14:00:00",
      "2026-08-17T17:00:00",
      reference,
    ),
    null,
  );
});
