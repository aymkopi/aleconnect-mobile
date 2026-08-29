import assert from "node:assert/strict"
import test from "node:test"

test("consumer report status accepts only the seven public ticket states", async () => {
  const reports = await import("../src/features/reports/data.ts")

  assert.equal(typeof reports.parseConsumerTicketStatus, "function")
  for (const status of [
    "under_review",
    "verified",
    "rejected",
    "dispatched",
    "in_progress",
    "resolved",
    "closed",
  ]) {
    assert.equal(reports.parseConsumerTicketStatus(status), status)
  }
  for (const internal of ["open", "planned", "en_route", "paused", "completed", "cancelled"]) {
    assert.equal(reports.parseConsumerTicketStatus(internal), null)
  }
})

test("unknown consumer status uses safe copy instead of exposing the raw value", async () => {
  const reports = await import("../src/features/reports/data.ts")

  assert.equal(typeof reports.consumerTicketStatusLabel, "function")
  assert.equal(reports.consumerTicketStatusLabel("verified"), "Verified")
  assert.equal(reports.consumerTicketStatusLabel("provider_receipt_error"), "Status update pending")
  assert.equal(reports.formatStatus("provider_receipt_error"), "Status update pending")
  assert.equal(reports.consumerTicketStatusTone("provider_receipt_error"), "neutral")
})

test("report readers normalize unknown status without storing or displaying the raw value", async () => {
  const reports = await import("../src/features/reports/data.ts")
  const normalized = reports.normalizeReportListItem({
    id: "ticket-1",
    title: "Report",
    categoryId: "category-1",
    categoryTitle: "Category",
    typeId: "type-1",
    typeTitle: "Type",
    createdAt: "2026-08-28T00:00:00.000Z",
    status: "paused",
    ticketNumber: "ALC-001",
  })
  assert.equal(normalized.status, null)

  const detail = reports.parseReportDetailResponse({
    report: {
      ...normalized,
      status: "dispatch_provider_error",
      history: [
        { id: "valid", fromStatus: "verified", toStatus: "dispatched", note: null, changedAt: "2026-08-28T00:00:00.000Z" },
        { id: "internal", fromStatus: "dispatched", toStatus: "arrived", note: "private", changedAt: "2026-08-28T01:00:00.000Z" },
      ],
      publicUpdates: [],
    },
  })
  assert.equal(detail.status, null)
  assert.deepEqual(detail.history.map((item) => item.id), ["valid"])
})

test("authoritative lists preserve the last valid public status when a row is unsupported", async () => {
  const reports = await import("../src/features/reports/data.ts")
  const previous = reports.normalizeReportListItem({
    id: "ticket-1",
    title: "Report",
    categoryId: "category-1",
    categoryTitle: "Category",
    typeId: "type-1",
    typeTitle: "Type",
    createdAt: "2026-08-28T00:00:00.000Z",
    status: "verified",
    ticketNumber: "ALC-001",
  })
  const unsupported = reports.normalizeReportListItem({ ...previous, status: "provider_error" })

  assert.deepEqual(
    reports.preserveKnownConsumerReportStatuses([unsupported], [previous]),
    { reports: [{ ...unsupported, status: "verified" }], hasUnsupportedStatus: true },
  )
})

test("report detail refresh preserves the last valid status and marks revalidation", async () => {
  const reports = await import("../src/features/reports/data.ts")
  const previous = { id: "ticket-1", status: "verified" }
  const unsupported = { id: "ticket-1", status: null }

  assert.deepEqual(
    reports.preserveKnownConsumerReportDetailStatus(unsupported, previous),
    { report: { id: "ticket-1", status: "verified" }, hasUnsupportedStatus: true },
  )
})

test("future response status models fail closed even when their status spelling is recognizable", async () => {
  const reports = await import("../src/features/reports/data.ts")
  const base = {
    id: "ticket-1",
    title: "Report",
    categoryId: "category-1",
    categoryTitle: "Category",
    typeId: "type-1",
    typeTitle: "Type",
    createdAt: "2026-08-28T00:00:00.000Z",
    status: "verified",
    ticketNumber: "ALC-001",
    history: [],
    publicUpdates: [],
  }

  assert.equal(reports.isSupportedConsumerStatusModelVersion(undefined), true)
  assert.equal(reports.isSupportedConsumerStatusModelVersion(1), true)
  assert.equal(reports.isSupportedConsumerStatusModelVersion(2), false)
  assert.equal(reports.parseReportDetailResponse({ statusModelVersion: 2, report: base }).status, null)
})
