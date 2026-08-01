import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { pathToFileURL } from "node:url"
import test from "node:test"

import { validateHarness } from "../scripts/validate-agent-harness.mjs"

const history = `## 2026-08-02 — Harness foundation

- Repositories: mobile
- Scope: agent harness validation
- Files: harness files
- Contracts: none
- Verification: node --test passes
- Git/Deployment: not run
- Remaining risks: none known
- Next: enforce the harness
`

const activeWork = `# Active work

Last reviewed: 2026-08-02
Current branch: test
Active plan: test plan
Next task: test validator
Known blockers: none
Last verified: not run
`

const write = async (root, relativePath, text) => {
  const target = join(root, relativePath)
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, text)
}

const createFixture = async ({ incompleteHistory, brokenAgentLink, credential } = {}) => {
  const root = await mkdtemp(join(tmpdir(), "agent-harness-"))
  await write(root, "AGENTS.md", `# Agents\n\n[Harness](docs/agent-harness/index.md)${brokenAgentLink ? "\n\n[Broken](missing.md)" : ""}\n`)
  await write(root, "docs/agent-harness/index.md", "# Harness\n")
  await write(root, "docs/agent-harness/active-work.md", activeWork)
  await write(root, "docs/agent-harness/implementation-history.md", incompleteHistory ? history.replace("- Verification: node --test passes\n", "") : history)
  await write(root, "docs/agent-harness/cross-project-contracts.md", `# Contracts\n\n<!-- shared-contract:start -->\nshared\n<!-- shared-contract:end -->\n${credential ?? ""}`)
  return root
}

const createFirstCommitFixture = async () => {
  const root = await createFixture()
  for (const args of [["init"], ["config", "user.email", "test@example.invalid"], ["config", "user.name", "Test"], ["add", "."], ["commit", "-m", "initial"]]) {
    execFileSync("git", args, { cwd: root, stdio: "pipe" })
  }
  return root
}

const createGitFixture = async ({ productChange, updateHistory }) => {
  const root = await createFirstCommitFixture()
  await write(root, productChange, "export const changed = true\n")
  if (updateHistory) await write(root, "docs/agent-harness/implementation-history.md", `${history}\n## 2026-08-02 — Product change\n\n- Repositories: mobile\n- Scope: changed product\n- Files: ${productChange}\n- Contracts: none\n- Verification: not run\n- Git/Deployment: not run\n- Remaining risks: none known\n- Next: none\n`)
  execFileSync("git", ["add", "."], { cwd: root, stdio: "pipe" })
  execFileSync("git", ["commit", "-m", "change"], { cwd: root, stdio: "pipe" })
  return root
}

const cleanup = (t, root) => t.after(() => rm(root, { recursive: true, force: true }))

test("accepts a complete mobile harness", async (t) => {
  const root = await createFixture()
  cleanup(t, root)
  const result = await validateHarness({ root, siblingRoot: root })
  assert.equal(result.errors.length, 0)
  assert.ok(result.warnings.some((message) => message.includes("cross-project skill")))
})

test("rejects a missing required document", async (t) => {
  const root = await createFixture()
  cleanup(t, root)
  await rm(join(root, "docs/agent-harness/active-work.md"))
  const result = await validateHarness({ root })
  assert.ok(result.errors.some((message) => message.includes("active-work.md")))
})

test("rejects incomplete implementation history entries", async (t) => {
  const root = await createFixture({ incompleteHistory: true })
  cleanup(t, root)
  const result = await validateHarness({ root })
  assert.ok(result.errors.some((message) => message.includes("Verification")))
})

test("rejects broken local links from AGENTS.md", async (t) => {
  const root = await createFixture({ brokenAgentLink: true })
  cleanup(t, root)
  const result = await validateHarness({ root })
  assert.ok(result.errors.some((message) => message.includes("broken link")))
})

test("rejects credential-shaped content", async (t) => {
  const root = await createFixture({ credential: "mysql://user:password@example.invalid/db" })
  cleanup(t, root)
  const result = await validateHarness({ root })
  assert.ok(result.errors.some((message) => message.includes("credential")))
})

test("requires history when a product file changed from base", async (t) => {
  const root = await createGitFixture({ productChange: "src/app/index.tsx", updateHistory: false })
  cleanup(t, root)
  const result = await validateHarness({ root, baseRef: "HEAD~1" })
  assert.ok(result.errors.some((message) => message.includes("implementation-history.md")))
})

test("allows isolated harness test changes without history", async (t) => {
  const root = await createGitFixture({ productChange: "tests/agent-harness.test.mjs", updateHistory: false })
  cleanup(t, root)
  const result = await validateHarness({ root, baseRef: "HEAD~1", siblingRoot: root })
  assert.equal(result.errors.length, 0)
})

test("warns when the sibling checkout is absent", async (t) => {
  const root = await createFixture()
  cleanup(t, root)
  const result = await validateHarness({ root, siblingRoot: join(root, "missing-staff") })
  assert.equal(result.errors.length, 0)
  assert.ok(result.warnings.some((message) => message.includes("sibling")))
})

test("rejects an existing sibling without cross-project contracts", async (t) => {
  const root = await createFixture()
  const siblingRoot = await createFixture()
  cleanup(t, root)
  cleanup(t, siblingRoot)
  await rm(join(siblingRoot, "docs/agent-harness/cross-project-contracts.md"))
  const result = await validateHarness({ root, siblingRoot })
  assert.ok(result.errors.some((message) => message.includes("cross-project-contracts.md")))
})

test("rejects sibling contracts without shared markers", async (t) => {
  const root = await createFixture()
  const siblingRoot = await createFixture()
  cleanup(t, root)
  cleanup(t, siblingRoot)
  await write(siblingRoot, "docs/agent-harness/cross-project-contracts.md", "# Contracts\n")
  const result = await validateHarness({ root, siblingRoot })
  assert.ok(result.errors.some((message) => message.includes("shared contract markers")))
})

test("rejects a divergent sibling shared contract", async (t) => {
  const root = await createFixture()
  const siblingRoot = await createFixture()
  cleanup(t, root)
  cleanup(t, siblingRoot)
  await write(siblingRoot, "docs/agent-harness/cross-project-contracts.md", "# Contracts\n\n<!-- shared-contract:start -->\ndifferent\n<!-- shared-contract:end -->\n")
  const result = await validateHarness({ root, siblingRoot })
  assert.ok(result.errors.some((message) => message.includes("differs from the staff sibling")))
})

test("rejects a one-sided cross-project skill manifest", async (t) => {
  const root = await createFixture()
  const siblingRoot = await createFixture()
  cleanup(t, root)
  cleanup(t, siblingRoot)
  await write(root, ".agents/skills/aleconnect-cross-project-change/SKILL.md", "# Cross-project change\n")
  await write(siblingRoot, ".agents/skills/aleconnect-cross-project-change/SKILL.md", "# Cross-project change\n")
  await write(root, ".agents/skills/aleconnect-cross-project-change/agents/openai.yaml", "name: cross-project-change\n")
  const result = await validateHarness({ root, siblingRoot })
  assert.ok(result.errors.some((message) => message.includes("agents/openai.yaml")))
})

test("falls back to file-only validation when the base is unavailable", async (t) => {
  const root = await createFirstCommitFixture()
  cleanup(t, root)
  const result = await validateHarness({ root, baseRef: "HEAD~1" })
  assert.equal(result.errors.length, 0)
  assert.ok(result.warnings.some((message) => message.includes("could not compare Git base")))
})

test("rejects an invalid base reference", async (t) => {
  const root = await createFirstCommitFixture()
  cleanup(t, root)
  const result = await validateHarness({ root, baseRef: "missing-base" })
  assert.ok(result.errors.some((message) => message.includes("could not compare Git base")))
})

test("rejects HEAD~1 fallback in a shallow clone", async (t) => {
  const source = await createGitFixture({ productChange: "src/app/index.tsx", updateHistory: false })
  const parent = await mkdtemp(join(tmpdir(), "agent-harness-shallow-"))
  const root = join(parent, "clone")
  cleanup(t, source)
  cleanup(t, parent)
  execFileSync("git", ["clone", "--depth", "1", pathToFileURL(source).href, root], { stdio: "pipe" })
  const result = await validateHarness({ root, baseRef: "HEAD~1" })
  assert.ok(result.errors.some((message) => message.includes("could not compare Git base")))
})

test("mobile shared contract matches the authoritative staff block", async () => {
  const marker = /<!-- shared-contract:start -->([\s\S]*?)<!-- shared-contract:end -->/
  const mobile = await readFile(new URL("../docs/agent-harness/cross-project-contracts.md", import.meta.url), "utf8")
  const staff = await readFile(new URL("../../aleconnect/docs/agent-harness/cross-project-contracts.md", import.meta.url), "utf8")
  assert.equal(mobile.match(marker)?.[1], staff.match(marker)?.[1])
})

test("mobile instructions and CI route validation without publishing", async () => {
  const agents = await readFile(new URL("../AGENTS.md", import.meta.url), "utf8")
  const workflow = await readFile(new URL("../.github/workflows/agent-harness.yml", import.meta.url), "utf8")

  for (const target of [
    "PRODUCT.md",
    "docs/agent-harness/index.md",
    "docs/mobile-release-hardening-tracker.md",
    "docs/agent-harness/cross-project-contracts.md",
    "docs/agent-harness/implementation-history.md",
    "../aleconnect",
  ]) {
    assert.match(agents, new RegExp(target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
  }

  for (const command of [
    "npm ci",
    "npm run harness:check -- --base HEAD~1",
    "node --test tests/*.test.mjs",
    "npx tsc --noEmit",
    "npm run lint",
  ]) {
    assert.match(workflow, new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
  }

  assert.match(workflow, /fetch-depth: 2/)
  assert.match(workflow, /node-version: 22/)
  assert.doesNotMatch(workflow, /\beas\s+(?:build|submit)\b/i)
  assert.doesNotMatch(workflow, /\b(?:wrangler\s+(?:pages\s+)?deploy|npm\s+run\s+(?:deploy|publish)|eas\s+update)\b/i)
})
