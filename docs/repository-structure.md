# Repository structure

| Directory | Responsibility |
| --- | --- |
| `src/app/` | Expo Router routes and layouts only |
| `src/features/` | Consumer feature components and domain helpers |
| `src/components/` | Shared UI and application chrome |
| `src/context/`, `src/hooks/` | Providers and reusable React hooks |
| `src/services/`, `src/models/` | API/storage services and typed data |
| `src/constants/`, `src/utils/`, `src/lib/` | Shared configuration and helpers |
| `assets/` | Native icons, fonts, notification sounds, geography |
| `plugins/`, `scripts/`, `tests/`, `docs/` | Native plugins, tooling, tests, documentation |

Keep `index.ts`, `app.json`, `eas.json`, Metro/TypeScript/ESLint configuration,
global styles, and package files at the root. The entry point initializes
notifications before loading Expo Router. The `@/` alias points to `src/`,
with `@/assets/` pointing to root assets.

Keep platform-specific filenames such as `index.web.tsx` alongside native
implementations; the bundler selects them through unsuffixed imports.

Native build output, installed dependencies, and Graphify caches are generated.
Use `npm ci`, `npm test`, `npm run typecheck`, `npm run lint`, and
`npm run harness:check` for local source verification. Starter reset commands
do not belong in this established application.

This follows [Expo's supported src layout](https://docs.expo.dev/router/reference/src-directory/).

Retain reusable UI library folders even when individual components currently
have no application consumers. Remove unused application code only after
checking imports, framework entry points and tests.
