import assert from "node:assert/strict";
import test from "node:test";

test("ticket push data resolves a report ID only for ticket context", async () => {
  const { ticketIdFromPushData, notificationDestinationFromNotification } = await import("../src/services/notification-navigation.ts");

  assert.equal(ticketIdFromPushData({ context: "ticket", ticketId: "ticket-1" }), "ticket-1");
  assert.equal(ticketIdFromPushData({ context: "ticket", entityId: "ticket-2" }), "ticket-2");
  assert.equal(ticketIdFromPushData({ context: "advisory", entityId: "ticket-3" }), null);
  assert.deepEqual(
    notificationDestinationFromNotification({ ticketId: "ticket-1", entityType: "ticket", entityId: "internal" }),
    { pathname: "/report/[id]", params: { id: "ticket-1", focus: "notification" } },
  );
  assert.deepEqual(
    notificationDestinationFromNotification({ ticketId: null, entityType: "advisory", entityId: "advisory-1" }),
    { pathname: "/advisory/[id]", params: { id: "advisory-1", focus: "notification" } },
  );
  assert.equal(
    notificationDestinationFromNotification({ ticketId: null, entityType: "system", entityId: null }),
    null,
  );
});

test("ticket status push parser accepts only valid v1 events", async () => {
  const { ticketStatusChangedEventFromPushData } = await import(
    "../src/services/notification-navigation.ts"
  );

  assert.deepEqual(
    ticketStatusChangedEventFromPushData({
      context: "ticket",
      event: "ticket.status_changed",
      version: 1,
      ticketId: "ticket-1",
      ticketNumber: "ALECO-260815-00001",
      status: "verified",
      changedAt: "2026-08-15T03:30:45.123Z",
    }),
    {
      context: "ticket",
      event: "ticket.status_changed",
      version: 1,
      ticketId: "ticket-1",
      ticketNumber: "ALECO-260815-00001",
      status: "verified",
      changedAt: "2026-08-15T03:30:45.123Z",
    },
  );

  assert.equal(
    ticketStatusChangedEventFromPushData({
      context: "ticket",
      event: "ticket.status_changed",
      version: 2,
      ticketId: "ticket-1",
      status: "verified",
      changedAt: "2026-08-15T03:30:45.123Z",
    }),
    null,
  );

  assert.equal(
    ticketStatusChangedEventFromPushData({
      context: "ticket",
      event: "ticket.status_changed",
      version: 1,
      statusModelVersion: 1,
      ticketId: "ticket-1",
      status: "arrived",
      changedAt: "2026-08-15T03:30:45.123Z",
    }),
    null,
  );

  assert.equal(
    ticketStatusChangedEventFromPushData({
      context: "ticket",
      event: "ticket.status_changed",
      version: 1,
      ticketId: "ticket-1",
      status: "verified",
      changedAt: "bad-date",
    }),
    null,
  );

  assert.deepEqual(
    ticketStatusChangedEventFromPushData({
      context: "ticket",
      event: "ticket.status_changed",
      version: 1,
      ticketId: "ticket-1",
      status: "resolved",
      changedAt: "2026-08-15T03:31:00Z",
      revision: 7,
    }),
    {
      context: "ticket",
      event: "ticket.status_changed",
      version: 1,
      ticketId: "ticket-1",
      status: "resolved",
      changedAt: "2026-08-15T03:31:00.000Z",
      revision: 7,
    },
  );
});

test("ticket status push classifier separates unsupported ticket events from unrelated pushes", async () => {
  const { classifyTicketStatusChangedPushData } = await import(
    "../src/services/notification-navigation.ts"
  );

  assert.deepEqual(
    classifyTicketStatusChangedPushData({
      context: "ticket",
      event: "ticket.status_changed",
      version: 2,
      ticketId: "ticket-1",
      status: "verified",
      changedAt: "2026-08-15T03:30:45.123Z",
    }),
    { kind: "unsupported", ticketId: "ticket-1" },
  );
  assert.deepEqual(
    classifyTicketStatusChangedPushData({
      context: "ticket",
      event: "ticket.status_changed",
      version: 1,
      statusModelVersion: 2,
      ticketId: "ticket-1",
      status: "verified",
      changedAt: "2026-08-15T03:30:45.123Z",
    }),
    { kind: "unsupported", ticketId: "ticket-1" },
  );
  assert.deepEqual(
    classifyTicketStatusChangedPushData({
      context: "ticket",
      event: "ticket.status_changed",
      version: 1,
      statusModelVersion: 1,
      ticketId: "ticket-1",
      status: "arrived",
      changedAt: "2026-08-15T03:30:45.123Z",
    }),
    { kind: "unsupported", ticketId: "ticket-1" },
  );
  assert.deepEqual(
    classifyTicketStatusChangedPushData({ context: "advisory", event: "published" }),
    { kind: "unrelated" },
  );
});
