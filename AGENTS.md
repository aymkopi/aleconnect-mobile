# ALEConnect Mobile Agent Guide

## Start Here

Read [PRODUCT.md](PRODUCT.md), [the harness map](docs/agent-harness/index.md), [active work](docs/agent-harness/active-work.md), and [implementation history](docs/agent-harness/implementation-history.md). Current source and device evidence outrank older docs.

## Authority Map

This repository owns consumer Expo UI, native configuration, device storage, and release behavior. The staff sibling at `../aleconnect` owns `/api/*`, `/api/mobile/*`, MySQL, R2 signing, and deployment order. [Cross-project contracts](docs/agent-harness/cross-project-contracts.md) are authoritative.

## Repository Boundaries

Use the staff-owned `/api/mobile/*` contract; never connect mobile directly to MySQL or put server secrets in the app. Inspect the staff sibling before changing shared API contracts, consumer auth, notifications, media, or coordinated releases.

## Work Rules

Read only task-relevant documents, preserve unrelated working-tree changes, and use focused tests without new dependencies unless required. Verify on a real device only when native or runtime behavior changes. Track release hardening in [the active release tracker](docs/mobile-release-hardening-tracker.md).

## Finish Gate

Run `git status`, relevant focused tests, and `npm run harness:check`; run `npx tsc --noEmit` and `npm run lint` after TypeScript changes. Update [implementation history](docs/agent-harness/implementation-history.md) and [active work](docs/agent-harness/active-work.md) with verified evidence without overwriting unrelated handoff state.

## Graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, invoke the `skill` tool with `skill: "graphify"` before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
