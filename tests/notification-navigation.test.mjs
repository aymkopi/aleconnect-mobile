import assert from "node:assert/strict";
import test from "node:test";

test("ticket push data resolves a report ID only for ticket context", async () => {
  const { ticketIdFromPushData } = await import("../src/services/notification-navigation.ts");

  assert.equal(ticketIdFromPushData({ context: "ticket", ticketId: "ticket-1" }), "ticket-1");
  assert.equal(ticketIdFromPushData({ context: "ticket", entityId: "ticket-2" }), "ticket-2");
  assert.equal(ticketIdFromPushData({ context: "advisory", entityId: "ticket-3" }), null);
});
