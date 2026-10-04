import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readdirSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"
import { inspectWorktree, supportsAppNode } from "../scripts/check-agent-worktree.mjs"

function fixture(t, name = "aleconnect") {
  const root = mkdtempSync(join(tmpdir(), "aleconnect-worktree-"))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  writeFileSync(join(root, "package.json"), JSON.stringify({ name }))
  writeFileSync(join(root, "package-lock.json"), "{}")
  writeFileSync(join(root, ".node-version"), "22.23.2\n")
  execFileSync("git", ["init"], { cwd: root, stdio: "pipe" })
  execFileSync("git", ["-c", "user.name=Harness test", "-c", "user.email=test@example.invalid", "commit", "--allow-empty", "-m", "fixture"], { cwd: root, stdio: "pipe" })
  return root
}

test("current dependency policy enforces supported LTS minimum patches", () => {
  for (const version of ["22.13.0", "22.23.2", "24.3.0", "24.14.1"]) assert.equal(supportsAppNode(version), true, version)
  for (const version of ["20.19.4", "22.0.0", "22.12.9", "24.0.0", "24.2.9", "25.0.0", "26.0.0", "24.3.0-rc.1", "bad"]) assert.equal(supportsAppNode(version), false, version)
})

test("docs diagnostics require no app dependencies and preserve files", (t) => {
  const root = fixture(t)
  const before = readdirSync(root)
  writeFileSync(join(root, ".env.local"), "unread-secret-fixture")
  const result = inspectWorktree({ root, nodeVersion: "24.0.0" })
  assert.deepEqual(result.errors, [])
  assert.ok(result.warnings.some((message) => message.includes("sibling")))
  assert.deepEqual(readdirSync(root).sort(), [...before, ".env.local"].sort())
  assert.equal(readFileSync(join(root, ".env.local"), "utf8"), "unread-secret-fixture")
  assert.ok(!JSON.stringify(result).includes("unread-secret-fixture"))
})

test("app diagnostics reject incompatible Node and missing local tools", (t) => {
  const root = fixture(t)
  const result = inspectWorktree({ root, app: true, nodeVersion: "24.0.0" })
  assert.ok(result.errors.some((message) => message.includes("Node 22")))
  assert.equal(result.errors.filter((message) => message.includes("Missing local")).length, 2)
})

for (const name of ["aleconnect", "aleconnect-mobile", "aleconnect-lineman"]) {
  test("app diagnostics accept the local toolchain for " + name, (t) => {
    const root = fixture(t, name)
    const tools = name === "aleconnect" ? ["vite/bin/vite.js", "typescript/bin/tsc"] : ["expo/bin/cli", "typescript/bin/tsc"]
    for (const tool of tools) {
      const path = join(root, "node_modules", tool)
      mkdirSync(join(path, ".."), { recursive: true })
      writeFileSync(path, "fixture")
    }
    assert.deepEqual(inspectWorktree({ root, app: true, nodeVersion: "22.23.2" }).errors, [])
    const alternative = inspectWorktree({ root, app: true, nodeVersion: "24.14.1" })
    assert.deepEqual(alternative.errors, [])
    assert.ok(alternative.warnings.some((message) => message.includes("native bundling")))
  })
}

test("an explicit sibling must be the contract owner", (t) => {
  const root = fixture(t, "aleconnect-mobile")
  const sibling = fixture(t, "aleconnect-lineman")
  assert.ok(inspectWorktree({ root, sibling }).errors.some((message) => message.includes("Expected aleconnect sibling")))
  writeFileSync(join(sibling, "package.json"), JSON.stringify({ name: "aleconnect" }))
  mkdirSync(join(sibling, "docs/agent-harness"), { recursive: true })
  writeFileSync(join(sibling, "docs/agent-harness/cross-project-contracts.md"), "contract")
  assert.deepEqual(inspectWorktree({ root, sibling }).errors, [])
})

test("app diagnostics require a valid committed runtime pin", (t) => {
  const root = fixture(t)
  rmSync(join(root, ".node-version"))
  assert.ok(inspectWorktree({ root, app: true, nodeVersion: "24.14.1" }).errors.some((message) => message.includes("Missing .node-version")))
  writeFileSync(join(root, ".node-version"), "22.12.0\n")
  assert.ok(inspectWorktree({ root, app: true, nodeVersion: "22.23.2" }).errors.some((message) => message.includes("Invalid .node-version")))
})

test("committed runtime policy keeps CI, package and lockfile aligned", () => {
  const pin = readFileSync(".node-version", "utf8").trim()
  assert.equal(supportsAppNode(pin), true)
  const pkg = JSON.parse(readFileSync("package.json", "utf8"))
  const lock = JSON.parse(readFileSync("package-lock.json", "utf8"))
  assert.equal(pkg.engines.node, "^22.13.0 || ^24.3.0")
  assert.equal(lock.packages[""].engines.node, pkg.engines.node)
  for (const file of readdirSync(".github/workflows").filter((name) => /\.ya?ml$/.test(name))) {
    const workflow = readFileSync(join(".github/workflows", file), "utf8")
    if (!workflow.includes("actions/setup-node@")) continue
    assert.match(workflow, /node-version-file: ['"]?\.node-version['"]?/, file)
    assert.doesNotMatch(workflow, /node-version:/, file)
  }
})
