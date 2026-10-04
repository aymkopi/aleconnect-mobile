# GitHub CI and the agent harness

Run `node scripts/run-agent-ci.mjs` to execute the dependency-free harness validator and regression tests. GitHub workflows pass the pull request base SHA or previous push SHA through BASE_SHA; checkout uses full history. An unavailable prior commit is fetched explicitly. If it remains unavailable, CI runs full app checks and validates against an available parent or uses file-only harness validation. Manual runs and first/new-branch pushes also run full checks.

Documentation, project instructions, generated Graphify output and harness-only changes run harness checks without npm ci, app builds or deployment. Mixed product changes, unknown paths, dependency/native configuration and workflow changes retain full app checks. The runner writes app_changed only after validation and tests pass.

Staff has an independent push/PR harness workflow. Its production workflow keeps Push Dispatch -> API -> maintenance Workers -> Pages order and only deploys when app checks are required. Client workflows run npm run test (including consumer TypeScript tests), typecheck and lint when required; they do not publish native apps. Existing feature verification workflows retain their scoped tests.

Workflows read .node-version (validated Node 22.23.2) for app commands and current [checkout](https://github.com/actions/checkout/releases/tag/v7.0.1) / [setup-node](https://github.com/actions/setup-node/releases/tag/v7.0.0) actions. Their internal runtime is separate from the application's Node version.

Local coordinated checks compare available sibling contracts and skill mirrors. Standalone GitHub checkouts warn when siblings are absent; cross-repository contract work still requires its coordinated local checks. Passing CI is source/build evidence, not device or store acceptance.

[Runtime policy and reviewed dependency commits](runtime.md) distinguish supported versions from the validated CI/native default.
