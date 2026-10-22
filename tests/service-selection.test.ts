import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveSelectedServiceAccount } from "../src/features/accounts/selection.ts";
import { searchServices, services } from "../src/features/services/catalog.ts";
test("view selection cannot choose an unlinked or revoked account", () => {
  const context = {
    authorizedServiceAccountIds: ["home", "family"],
    accounts: [{ id: "home" }, { id: "family" }, { id: "revoked" }],
    defaultServiceAccountId: "home",
  } as any;
  assert.equal(resolveSelectedServiceAccount(context, "family"), "family");
  assert.equal(resolveSelectedServiceAccount(context, "revoked"), "home");
  assert.equal(resolveSelectedServiceAccount(null, "home"), null);
  assert.equal(
    resolveSelectedServiceAccount(
      { ...context, authorizedServiceAccountIds: [] },
      "home",
    ),
    null,
  );
});
test("catalog retains nine available services with searchable descriptions", () => {
  assert.equal(services.length, 9);
  assert.equal(searchServices("").length, 21);
  assert.equal(searchServices("Link requests")[0].id, "link-requests");
  assert.equal(searchServices("PAY").length, 0);
  assert.equal(searchServices("billing")[0].id, "billing");
  assert.equal(searchServices("billing")[0].route, "https://web.alecoinc.com.ph/billing-inquiry.html");
  assert.equal(services.find(service => service.id === "connection")?.route, "https://web.alecoinc.com.ph/newconnection.html");
  assert.equal(searchServices("meter")[0].id, "report");
  assert.equal(searchServices("no such service").length, 0);
});
