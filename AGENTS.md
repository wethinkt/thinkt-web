# AGENTS.md

Instructions for AI agents working on this codebase.

## Project Overview

This is a Vite + TypeScript web app (no framework — vanilla TS with DOM APIs). It provides a browser UI for the THINKT API server. The app is designed to be embedded by `thinkt serve` (a Go binary).

## Key Constraints

- **No framework.** All UI components are vanilla TypeScript that create/manage DOM elements directly. Do not introduce React, Vue, Svelte, etc.
- **`@wethinkt/ts-thinkt`** is a sibling package at `../ts-thinkt`. It provides shared types (`Session`, `Entry`, `ContentBlock`, `Source`, `Role`). Do not duplicate these types.
- **API types are generated.** `src/api/generated.ts` is auto-generated from `src/api/openapi.json` — never edit it by hand. Run `npm run api:generate` after changing the swagger spec.
- **Snake_case vs camelCase.** The API uses snake_case. Internal THINKT types use camelCase. Conversion happens in `src/api/components/api-adapters.ts`. Keep this boundary clean.

## Commands

```bash
npm run dev          # Dev server (port 7434, proxies /api → localhost:7433)
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
- `src/config.ts` — runtime API URL resolution
- `src/styles.css` — global styles and CSS variables
- `src/i18n.ts` — locale stub
- `src/api/client.ts` — `ThinktClient` class with all API methods
- `src/api/components/` — UI components (all vanilla DOM)
- `src/api/components/api-adapters.ts` — type conversion layer

## Testing

Tests use vitest with jsdom. Run `npm run test:run` to verify changes. The test files are:
- `src/api/__tests__/client.test.ts` — API client unit tests
- `src/api/__tests__/api-adapters.test.ts` — adapter conversion tests

## Build Output

Production build outputs to `dist/`. The Go server embeds this directory to serve the web UI.
