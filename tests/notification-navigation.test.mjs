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
