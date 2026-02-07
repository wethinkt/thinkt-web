# thinkt-web

Web application for browsing THINKT projects and sessions. Connects to the THINKT API server (Go) and provides a dark-themed UI for navigating traces, sessions, and conversation entries.

Designed to be embedded by `thinkt serve`.

## Quick Start

```bash
npm install
npm run dev        # starts on http://localhost:7434, proxies /api to :8784
```

The dev server expects the Go API server (`thinkt serve`) running on port 8784.

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

## Architecture

```
@wethinkt/ts-thinkt (../ts-thinkt)    <- core library (types, parsers, API client)
  └── thinkt-web (this project)        <- web UI that consumes the library

src/
├── main.ts              # App bootstrap, keyboard shortcuts, connection monitoring
├── config.ts            # Runtime API URL configuration (query param, env, meta tag, etc.)
├── styles.css           # Global dark theme, layout, CSS variables
├── i18n.ts              # Locale stub (localStorage persistence)
└── api/
    ├── index.ts         # Re-exports from @wethinkt/ts-thinkt/api + local components
    └── components/
        ├── ApiViewer.ts       # Top-level orchestrator (split pane layout)
        ├── ProjectBrowser.ts  # Project list with search/filter/keyboard nav
        ├── SessionList.ts     # Session list within a project
        └── ConversationView.ts# Text-based conversation viewer with filter toggles
```

Types and clients come from `@wethinkt/ts-thinkt/api`. Two client layers are available:
- **`ThinktClient`** (high-level, default) — returns camelCase domain types (`Project`, `SessionMeta`, `Entry`, etc.). This is what the UI components use.
- **`ThinktApiClient`** (low-level) — returns raw OpenAPI snake_case types for advanced use cases.

All snake_case ↔ camelCase conversion is handled inside ts-thinkt. This project is purely the web UI layer.

## API URL Configuration

The app resolves its API base URL with this priority:

1. Query parameter: `?api-url=http://host:port`
2. Global variable: `window.THINKT_API_URL`
3. Meta tag: `<meta name="thinkt-api-url" content="...">`
4. Env variable: `VITE_API_URL` (build time)
5. Same origin (production)
6. Default: `http://localhost:8784`

## Dependencies

- **`@wethinkt/ts-thinkt`** (`file:../ts-thinkt`) — API client, types, parsers, and analysis utilities
- **vite** — build tooling
- **vitest** — test runner
