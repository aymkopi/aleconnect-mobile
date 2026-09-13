import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8")

test("Public Updates uses the additive endpoint and private cache", async () => {
  const service = await read("src/services/public-updates.ts")
  assert.match(service, /\/api\/mobile\/public-updates/)
  assert.match(service, /public_updates_cache_v1/)
  assert.match(service, /5 \* 60 \* 1000/)
  assert.match(service, /24 \* 60 \* 60 \* 1000/)
  assert.match(service, /ApiRequestError/)
  assert.match(service, /fetchActiveAdvisories/)
})

test("the feed renders advisory and Facebook cards without a new tab", async () => {
  const [feed, card, tabs] = await Promise.all([
    read("src/app/advisories.tsx"),
    read("src/features/advisories/public-update-list-item.tsx"),
    read("src/app/(tabs)/_layout.tsx"),
  ])
  assert.match(feed, /Public Updates/)
  assert.match(card, /item\.kind === "advisory"/)
  assert.match(card, /View on Facebook/)
  assert.match(card, /Linking\.openURL/)
  assert.doesNotMatch(tabs, /public-updates|facebook/)
})

test("unified list keys include the item kind", async () => {
  const feed = await read("src/app/advisories.tsx")
  assert.match(feed, /`\$\{item\.kind\}:\$\{item\.id\}`/)
})
