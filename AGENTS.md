# AGENTS.md

Instructions for AI agents working on this codebase.

## Project Overview

This is a Vite + TypeScript web app (no framework — vanilla TS with DOM APIs). It provides a browser UI for the THINKT API server. The app is designed to be embedded by `thinkt serve` (a Go binary).

## Architecture

```
@wethinkt/ts-thinkt (../ts-thinkt)    ← core library (types, parsers, API client)
  └── thinkt-web (this project)        ← web UI that consumes the library
```

- **`@wethinkt/ts-thinkt`** is a sibling package at `../ts-thinkt` linked via `file:../ts-thinkt` in package.json.
- **API clients and types** come from `@wethinkt/ts-thinkt/api`. Two layers are available:
  - `ThinktClient` (high-level) — returns camelCase domain types. This is what UI components use.
  - `ThinktApiClient` (low-level) — returns raw OpenAPI snake_case types for advanced use.
- **UI components** (`ProjectBrowser`, `SessionList`, `ConversationView`, `ApiViewer`) are vanilla TypeScript DOM components unique to this project, in `src/api/components/`.
- **`src/api/index.ts`** re-exports from `@wethinkt/ts-thinkt/api` plus the local components, so the rest of the app can `import { ... } from './api'`.

## Key Constraints

- **No framework.** All UI components are vanilla TypeScript that create/manage DOM elements directly. Do not introduce React, Vue, Svelte, etc.
- **Types come from ts-thinkt.** Do not create local copies of `ThinktClient`, `Entry`, `Session`, `ContentBlock`, etc.
- **Snake_case vs camelCase.** The API uses snake_case. The high-level `ThinktClient` (from ts-thinkt) handles all conversion — components receive camelCase domain types directly.

## Commands

```bash
npm run dev          # Dev server (port 7434, proxies /api → localhost:8784)
npm run build:fast   # Quick build (typecheck + vite, no lint)
npm run test:run     # Run all tests once
npm run typecheck    # TypeScript only
npm run lint         # ESLint only
```

## Code Conventions

- Strict TypeScript (`strict: true`, `noUnusedLocals`, `noUnusedParameters`)
- ESLint with `@typescript-eslint/no-floating-promises` — all promises must be handled
- `no-console` is a warning — use `// eslint-disable-next-line no-console` when intentional
- Path alias: `@/` maps to `src/`
- Tests live in `__tests__/` directories next to the code they test, using vitest

## File Layout

- `src/main.ts` — app entry point (bootstrap, keyboard shortcuts, connection monitoring)
- `src/config.ts` — runtime API URL resolution (query param → global var → meta tag → env → same origin → default)
- `src/styles.css` — global styles and CSS variables
- `src/i18n.ts` — locale stub
- `src/api/index.ts` — re-exports `@wethinkt/ts-thinkt/api` client + local UI components
- `src/api/components/` — UI components (all vanilla DOM):
  - `ProjectBrowser.ts` — project list with search/filter
  - `SessionList.ts` — session list within a project
  - `ConversationView.ts` — conversation entry viewer with filter toggles
  - `ApiViewer.ts` — orchestrator that wires the above together

## Testing

Tests use vitest with jsdom. Run `npm run test:run` to verify changes.

## Build Output

Production build outputs to `dist/`. The Go server embeds this directory to serve the web UI.
