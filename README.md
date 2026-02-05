# thinkt-web

Web application for browsing THINKT projects and sessions. Connects to the THINKT API server (Go) and provides a dark-themed UI for navigating traces, sessions, and conversation entries.

Designed to be embedded by `thinkt serve`.

## Quick Start

```bash
npm install
npm run dev        # starts on http://localhost:7434, proxies /api to :7433
```

The dev server expects the Go API server (`thinkt serve`) running on port 7433.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server with HMR (port 7434) |
| `npm run build` | Lint + typecheck + production build |
| `npm run build:fast` | Typecheck + production build (skip lint) |
| `npm run preview` | Preview production build (port 7435) |
| `npm run test` | Run tests in watch mode |
| `npm run test:run` | Run tests once |
| `npm run typecheck` | TypeScript type checking |
| `npm run lint` | ESLint |
| `npm run api:generate` | Regenerate TypeScript types from swagger.json |

## Architecture

```
src/
├── main.ts              # App bootstrap, keyboard shortcuts, connection monitoring
├── config.ts            # Runtime API URL configuration (query param, env, meta tag, etc.)
├── styles.css           # Global dark theme, layout, CSS variables
├── i18n.ts              # Locale stub (localStorage persistence)
└── api/
    ├── client.ts        # Type-safe HTTP client (ThinktClient)
    ├── generated.ts     # Auto-generated types from OpenAPI spec
    ├── openapi.json     # OpenAPI 3.0 spec
    ├── swagger.json     # Source Swagger 2.0 spec
    └── components/
        ├── ApiViewer.ts       # Top-level orchestrator (split pane layout)
        ├── ProjectBrowser.ts  # Project list with search/filter/keyboard nav
        ├── SessionList.ts     # Session list within a project
        ├── ConversationView.ts# Text-based conversation viewer
        ├── ProjectToolbar.ts  # Project metadata and actions
        └── api-adapters.ts    # Converts API snake_case ↔ THINKT camelCase
```

## API URL Configuration

The app resolves its API base URL with this priority:

1. Query parameter: `?api-url=http://host:port`
2. Global variable: `window.THINKT_API_URL`
3. Meta tag: `<meta name="thinkt-api-url" content="...">`
4. Env variable: `VITE_API_URL` (build time)
5. Same origin (production)
6. Default: `http://localhost:7433`

## Dependencies

- **`@wethinkt/ts-thinkt`** — shared types and interfaces (`file:../ts-thinkt`)
- **vite** — build tooling
- **vitest** — test runner
- **openapi-typescript** / **swagger2openapi** — API type generation

## Regenerating API Types

When the Go server's API changes:

1. Copy the updated `swagger.json` into `src/api/swagger.json`
2. Run `npm run api:generate`
3. This converts to OpenAPI 3.0 and generates `src/api/generated.ts`
