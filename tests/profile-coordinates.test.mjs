import assert from "node:assert/strict";
import test from "node:test";

import { parseConsumerCoordinates } from "../src/models/consumer-profile-view.ts";

test("consumer profile coordinates accept database and JSON formats", () => {
  assert.deepEqual(parseConsumerCoordinates("13.160000, 123.620000"), {
    latitude: 13.16,
    longitude: 123.62,
  });
  assert.deepEqual(
    parseConsumerCoordinates('{"latitude":13.16,"longitude":123.62}'),
    { latitude: 13.16, longitude: 123.62 },
  );
  assert.equal(parseConsumerCoordinates("invalid"), null);
  assert.equal(parseConsumerCoordinates("91, 123.62"), null);
});
