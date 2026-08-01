import { execFileSync } from "node:child_process"
import { access, readFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import { pathToFileURL } from "node:url"

const repository = "mobile"
const historyPath = "docs/agent-harness/implementation-history.md"
const requiredDocs = [
  "AGENTS.md",
  "docs/agent-harness/index.md",
  "docs/agent-harness/active-work.md",
  historyPath,
  "docs/agent-harness/cross-project-contracts.md",
]
const readText = (root, relativePath) => readFile(join(root, relativePath), "utf8")
const extractHistoryEntries = (text) => text.split(/^## (?=\d{4}-\d{2}-\d{2} — )/m).slice(1)
const requiredHistoryFields = ["Repositories", "Scope", "Files", "Contracts", "Verification", "Git/Deployment", "Remaining risks", "Next"]
const credentialPatterns = [/mysql:\/\/[^:\s]+:[^@\s]+@/i, /\bsk-[A-Za-z0-9_-]{20,}\b/, /\bBearer\s+[A-Za-z0-9._-]{20,}\b/i]
const unfinishedMarkers = ["TO" + "DO", "TB" + "D", "FIX" + "ME", "<place" + "holder>"]
const productPrefixes = ["src/", "plugins/", "assets/", "tests/", "app.json", "eas.json", "global.css", "metro.config.js", "package.json", "tsconfig.json"]
const isHarnessPath = (relativePath) => relativePath === "scripts/validate-agent-harness.mjs" || relativePath === "tests/agent-harness.test.mjs" || relativePath.startsWith("docs/agent-harness/")
const sharedContract = /<!-- shared-contract:start -->([\s\S]*?)<!-- shared-contract:end -->/
const crossSkillPath = ".agents/skills/aleconnect-cross-project-change/SKILL.md"
const crossSkillManifestPath = ".agents/skills/aleconnect-cross-project-change/agents/openai.yaml"

const exists = async (root, relativePath) => {
  try {
    await access(join(root, relativePath))
    return true
  } catch {
    return false
  }
}

const isValidDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

const localAgentLinks = (text) => [...text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)].map((match) => match[1].trim().replace(/^<|>$/g, ""))
const canFallbackForFirstCommit = (root) => {
  try {
    const options = { cwd: root, encoding: "utf8", stdio: "pipe" }
    const shallow = execFileSync("git", ["rev-parse", "--is-shallow-repository"], options).trim()
    const head = execFileSync("git", ["rev-parse", "HEAD"], options).trim()
    const rootCommit = execFileSync("git", ["rev-list", "--max-parents=0", "HEAD"], options).trim()
    return shallow === "false" && head === rootCommit
  } catch {
    return false
  }
}

const compareRequiredSiblingFile = async (root, siblingRoot, relativePath, errors) => {
  const localExists = await exists(root, relativePath)
  const siblingExists = await exists(siblingRoot, relativePath)
  if (!localExists || !siblingExists) errors.push(`${relativePath} must be present in both repositories`)
  else if (await readText(root, relativePath) !== await readText(siblingRoot, relativePath)) errors.push(`${relativePath} differs from the staff sibling`)
}

export const validateHarness = async ({ root = process.cwd(), baseRef, siblingRoot = resolve(root, "..", "aleconnect") } = {}) => {
  const errors = []
  const warnings = []
  const presentDocs = []

  for (const relativePath of requiredDocs) {
    if (await exists(root, relativePath)) presentDocs.push(relativePath)
    else errors.push(`missing required document: ${relativePath}`)
  }

  const documents = await Promise.all(presentDocs.map(async (relativePath) => [relativePath, await readText(root, relativePath)]))
  for (const [relativePath, text] of documents) {
    if (credentialPatterns.some((pattern) => pattern.test(text))) errors.push(`credential-shaped content found in ${relativePath}`)
    if (unfinishedMarkers.some((marker) => text.includes(marker))) errors.push(`unfinished marker found in ${relativePath}`)
  }

  const agents = documents.find(([relativePath]) => relativePath === "AGENTS.md")?.[1]
  if (agents) {
    for (const href of localAgentLinks(agents)) {
      const localPath = href.split("#", 1)[0]
      if (!localPath || /^(https?):/i.test(localPath)) continue
      if (!(await exists(root, localPath))) errors.push(`broken link in AGENTS.md: ${href}`)
    }
  }

  const history = documents.find(([relativePath]) => relativePath === historyPath)?.[1]
  if (history) {
    const entries = extractHistoryEntries(history)
    if (entries.length === 0) errors.push(`${historyPath} has no dated entries`)
    for (const entry of entries) {
      for (const field of requiredHistoryFields) {
        if (!new RegExp(`^- ${field}:`, "m").test(entry)) errors.push(`${historyPath} entry is missing ${field}`)
      }
    }
  }

  const activeWork = documents.find(([relativePath]) => relativePath === "docs/agent-harness/active-work.md")?.[1]
  if (activeWork) {
    const reviewed = activeWork.match(/^Last reviewed: (.+)$/m)?.[1].trim()
    if (!reviewed || !isValidDate(reviewed)) errors.push("active-work.md requires Last reviewed: YYYY-MM-DD")
    for (const field of ["Current branch", "Active plan", "Next task", "Known blockers", "Last verified"]) {
      if (!new RegExp(`^${field}:\\s*\\S`, "m").test(activeWork)) errors.push(`active-work.md requires ${field}:`)
    }
  }

  if (baseRef) {
    try {
      const changedPaths = execFileSync("git", ["diff", "--name-only", `${baseRef}...HEAD`], { cwd: root, encoding: "utf8", stdio: "pipe" }).trim().split(/\r?\n/).filter(Boolean)
      const changedProduct = changedPaths.some((relativePath) => productPrefixes.some((prefix) => relativePath === prefix || relativePath.startsWith(prefix)) && !isHarnessPath(relativePath))
      if (changedProduct && !changedPaths.includes(historyPath)) errors.push(`${historyPath} must change when product files change from ${baseRef}`)
    } catch (error) {
      const message = `could not compare Git base ${baseRef}: ${error.message}`
      if (baseRef === "HEAD~1" && canFallbackForFirstCommit(root)) warnings.push(`${message}; used file-only validation`)
      else errors.push(message)
    }
  }

  if (!(await exists(siblingRoot, "."))) warnings.push(`sibling checkout is absent: ${siblingRoot}`)
  else {
    const mobileContracts = documents.find(([relativePath]) => relativePath === "docs/agent-harness/cross-project-contracts.md")?.[1]
    const siblingContractsPath = "docs/agent-harness/cross-project-contracts.md"
    if (!(await exists(siblingRoot, siblingContractsPath))) errors.push(`sibling checkout is missing ${siblingContractsPath}`)
    else if (mobileContracts) {
      const staffContracts = await readText(siblingRoot, "docs/agent-harness/cross-project-contracts.md")
      const mobileSharedContract = mobileContracts.match(sharedContract)?.[1]
      const staffSharedContract = staffContracts.match(sharedContract)?.[1]
      if (!mobileSharedContract || !staffSharedContract) errors.push("shared contract markers are required in both repositories")
      else if (mobileSharedContract !== staffSharedContract) errors.push("shared contract block differs from the staff sibling")
    }

    const crossSkillExists = (await exists(root, crossSkillPath)) || (await exists(siblingRoot, crossSkillPath)) || (await exists(root, crossSkillManifestPath)) || (await exists(siblingRoot, crossSkillManifestPath))
    if (!crossSkillExists) warnings.push(`cross-project skill is not present in both repositories (${repository})`)
    else {
      await compareRequiredSiblingFile(root, siblingRoot, crossSkillPath, errors)
      await compareRequiredSiblingFile(root, siblingRoot, crossSkillManifestPath, errors)
    }
  }

  return { errors, warnings }
}

export const formatHarnessResult = ({ errors, warnings }) => [
  ...errors.map((message) => `ERROR: ${message}`),
  ...warnings.map((message) => `WARNING: ${message}`),
].join("\n")

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2)
  const options = {}
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--base") options.baseRef = args[++index]
    if (args[index] === "--sibling") options.siblingRoot = args[++index]
  }
  const result = await validateHarness(options)
  const output = formatHarnessResult(result)
  if (output) console.log(output)
  if (result.errors.length) process.exitCode = 1
}
