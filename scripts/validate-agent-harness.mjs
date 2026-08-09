import { execFileSync } from "node:child_process"
import { access, readFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import { pathToFileURL } from "node:url"

const siblingRepository = "staff"
const historyPath = "docs/agent-harness/implementation-history.md"
const requiredDocs = [
  "AGENTS.md",
  "docs/agent-harness/index.md",
  "docs/agent-harness/active-work.md",
  historyPath,
  "docs/agent-harness/cross-project-contracts.md",
]
const expectedSkills = [
  {
    skillPath: ".agents/skills/aleconnect-mobile-workflow/SKILL.md",
    manifestPath: ".agents/skills/aleconnect-mobile-workflow/agents/openai.yaml",
    name: "aleconnect-mobile-workflow",
    description: "Use when changing ALEConnect Mobile Expo screens, consumer API usage, authentication, notifications, offline state, evidence, maps, native configuration, or Android and iOS release behavior.",
    displayName: "ALEConnect Mobile Workflow",
    shortDescription: "Safely change ALEConnect consumer mobile",
    defaultPrompt: "Use $aleconnect-mobile-workflow to implement a scoped Expo, consumer API, offline, notification, or native change safely.",
  },
  {
    skillPath: ".agents/skills/aleconnect-cross-project-change/SKILL.md",
    manifestPath: ".agents/skills/aleconnect-cross-project-change/agents/openai.yaml",
    name: "aleconnect-cross-project-change",
    description: "Use when an ALEConnect request affects both repositories, changes /api/mobile routes, or changes authentication, notifications, advisories, tickets, evidence, avatars, identifiers, or response fields consumed by mobile.",
    displayName: "ALEConnect Cross-Project Change",
    shortDescription: "Coordinate staff and mobile contracts safely",
    defaultPrompt: "Use $aleconnect-cross-project-change to coordinate a compatible staff API and mobile consumer change across both repositories.",
  },
]
const requiredArtifacts = expectedSkills.flatMap(({ skillPath, manifestPath }) => [skillPath, manifestPath])
const readText = (root, relativePath) => readFile(join(root, relativePath), "utf8")
const normalizeText = (text) => text.replace(/\r\n/g, "\n")
const requiredHistoryFields = ["Repositories", "Scope", "Files", "Contracts", "Verification", "Git/Deployment", "Remaining risks", "Next"]
const credentialPatterns = [/mysql:\/\/[^:\s]+:[^@\s]+@/i, /\bsk-[A-Za-z0-9_-]{20,}\b/, /\bBearer\s+[A-Za-z0-9._-]{20,}\b/i]
const unfinishedMarkers = ["TO" + "DO", "TB" + "D", "FIX" + "ME", "<place" + "holder>"]
const machinePathPatterns = [/\b[A-Za-z]:\\Users\\[^\\\s]+\\/i]
const productPrefixes = ["src/", "plugins/", "assets/", "tests/", "app.json", "eas.json", "global.css", "metro.config.js", "package.json", "tsconfig.json"]
const isHarnessPath = (relativePath) => relativePath === "scripts/validate-agent-harness.mjs" || relativePath === "tests/agent-harness.test.mjs" || relativePath.startsWith("docs/agent-harness/")
const sharedContract = /<!-- shared-contract:start -->([\s\S]*?)<!-- shared-contract:end -->/
const crossSkillPaths = [
  ".agents/skills/aleconnect-cross-project-change/SKILL.md",
  ".agents/skills/aleconnect-cross-project-change/agents/openai.yaml",
]

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
const yamlValue = (text, field) => text.match(new RegExp(`^\\s*${field}:\\s*(?:"([^"]*)"|(\\S.*))$`, "m"))?.slice(1).find((value) => value !== undefined)?.trim()
const gitPaths = (root, args) => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: "pipe" }).trim().split(/\r?\n/).filter(Boolean)
const workingTreePaths = (root) => {
  try {
    return [...new Set([
      ...gitPaths(root, ["diff", "--name-only"]),
      ...gitPaths(root, ["diff", "--cached", "--name-only"]),
      ...gitPaths(root, ["ls-files", "--others", "--exclude-standard"]),
    ])]
  } catch {
    return []
  }
}
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
  if (!(await exists(siblingRoot, relativePath))) errors.push(`sibling checkout is missing ${relativePath}`)
  else if (normalizeText(await readText(root, relativePath)) !== normalizeText(await readText(siblingRoot, relativePath))) errors.push(`${relativePath} differs from the ${siblingRepository} sibling`)
}

export const validateHarness = async ({ root = process.cwd(), baseRef, siblingRoot = resolve(root, "..", "aleconnect") } = {}) => {
  const errors = []
  const warnings = []
  const presentDocs = []

  for (const relativePath of requiredDocs) {
    if (await exists(root, relativePath)) presentDocs.push(relativePath)
    else errors.push(`missing required document: ${relativePath}`)
  }

  const presentArtifacts = []
  for (const relativePath of requiredArtifacts) {
    if (await exists(root, relativePath)) presentArtifacts.push(relativePath)
    else errors.push(`missing required skill artifact: ${relativePath}`)
  }

  const documents = await Promise.all(presentDocs.map(async (relativePath) => [relativePath, await readText(root, relativePath)]))
  const artifacts = await Promise.all(presentArtifacts.map(async (relativePath) => [relativePath, await readText(root, relativePath)]))
  for (const [relativePath, text] of [...documents, ...artifacts]) {
    if (credentialPatterns.some((pattern) => pattern.test(text))) errors.push(`credential-shaped content found in ${relativePath}`)
    if (unfinishedMarkers.some((marker) => text.includes(marker))) errors.push(`unfinished marker found in ${relativePath}`)
    if (machinePathPatterns.some((pattern) => pattern.test(text))) errors.push(`machine-specific path found in ${relativePath}`)
  }

  for (const expected of expectedSkills) {
    const skill = artifacts.find(([relativePath]) => relativePath === expected.skillPath)?.[1]
    if (skill) {
      const frontmatter = skill.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1]
      if (!frontmatter) errors.push(`${expected.skillPath} requires YAML frontmatter`)
      else {
        if (yamlValue(frontmatter, "name") !== expected.name) errors.push(`${expected.skillPath} has an invalid frontmatter name`)
        if (yamlValue(frontmatter, "description") !== expected.description) errors.push(`${expected.skillPath} has an invalid frontmatter description`)
      }
    }
    const manifest = artifacts.find(([relativePath]) => relativePath === expected.manifestPath)?.[1]
    if (manifest) {
      if (!/^interface:[ \t]*$/m.test(manifest)) errors.push(`${expected.manifestPath} requires an interface mapping`)
      for (const [field, value] of [["display_name", expected.displayName], ["short_description", expected.shortDescription], ["default_prompt", expected.defaultPrompt]]) {
        if (yamlValue(manifest, field) !== value) errors.push(`${expected.manifestPath} has an invalid ${field}`)
      }
    }
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
    const headings = [...history.matchAll(/^## (.*)$/gm)]
    const entries = []
    for (let index = 0; index < headings.length; index += 1) {
      const heading = headings[index]
      if (!/^\d{4}-\d{2}-\d{2}/.test(heading[1])) continue
      const parsed = heading[1].match(/^(\d{4}-\d{2}-\d{2}) (?:—|-) (\S.*)$/)
      if (!parsed || !isValidDate(parsed[1])) errors.push(`${historyPath} has malformed dated heading: ${heading[0]}`)
      else entries.push(history.slice(heading.index + heading[0].length, headings[index + 1]?.index ?? history.length))
    }
    if (entries.length === 0) errors.push(`${historyPath} has no dated entries`)
    for (const entry of entries) {
      for (const field of requiredHistoryFields) {
        if (!new RegExp(`^- ${field}:[ \\t]*\\S`, "m").test(entry)) errors.push(`${historyPath} entry is missing or blank: ${field}`)
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

  if (baseRef || workingTreePaths(root).length) {
    try {
      const changedPaths = baseRef ? gitPaths(root, ["diff", "--name-only", `${baseRef}...HEAD`]) : workingTreePaths(root)
      const changedProduct = changedPaths.some((relativePath) => productPrefixes.some((prefix) => relativePath === prefix || relativePath.startsWith(prefix)) && !isHarnessPath(relativePath))
      if (changedProduct && !changedPaths.includes(historyPath)) errors.push(`${historyPath} must change when product files change${baseRef ? ` from ${baseRef}` : " in the working tree"}`)
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
      else if (normalizeText(mobileSharedContract) !== normalizeText(staffSharedContract)) errors.push("shared contract block differs from the staff sibling")
    }

    for (const relativePath of crossSkillPaths) await compareRequiredSiblingFile(root, siblingRoot, relativePath, errors)
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
