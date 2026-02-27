# thinkt-web

Web application for browsing THINKT projects and sessions. Connects to the THINKT API server (Go) and is designed to be embedded by `thinkt serve`.

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
| `npm run i18n:extract` | Extract translatable messages |
| `npm run i18n:compile` | Compile locale catalogs |
| `npm run i18n` | Extract + compile |

## Architecture

```
@wethinkt/ts-thinkt (../ts-thinkt)    <- core library (types, parsers, API client)
  \- thinkt-web (this project)        <- web UI that consumes the library

src/
|- main.ts                         # App bootstrap, overlays, keyboard shortcuts
|- config.ts                       # API URL/auth/deep-link target resolution
|- styles.css                      # Global layout/theme styles
|- i18n.ts                         # Locale bootstrap + persistence
|- components/
|  \- LanguageSelector.ts          # Global language picker
\- api/
   |- index.ts                     # Re-exports from ts-thinkt + local UI components
   \- components/
      |- ApiViewer.ts              # Top-level orchestrator
      |- ProjectBrowser.ts         # Project list/search
      |- SessionList.ts            # Session list for selected project
      |- ConversationView.ts       # Session entry viewer
      |- SearchOverlay.ts          # Global search modal (text/semantic)
      |- SettingsOverlay.ts        # Settings/info modal (dashboard/indexer/sources/apps/auth)
      \- *-styles.css              # Overlay/component-scoped styles
```

Types and clients come from `@wethinkt/ts-thinkt/api`:
- `ThinktClient` (high-level, camelCase domain types) is used by the UI.
- `ThinktApiClient` (low-level, snake_case OpenAPI types) is available for advanced/raw access.

## Settings Overlay

The top-bar gear button opens `SettingsOverlay`. Tabs are:
- `Dashboard`: API connection card + server info card (server host/port, fingerprint, version/revision, started time, uptime, pid, auth enabled).
- `Indexer`: split into `Indexer Status` and `Embedding Status`, with separate progress bars.
- `Sources`: source list with per-source badge colors and status.
- `Apps`: open-in app configuration and default terminal.
- `Auth`: current token display (redacted by default), show/hide toggle, save/clear controls.

Behavior details:
- Data refreshes when the overlay opens.
- `Indexer` tab auto-refreshes every 5s.
- Auto-refresh and listeners are cleaned up on close using `AbortController`.
- Close controls use an `x` icon button with tooltip `Close - ESC`.

## URL Query/Hash Scheme

`config.ts` resolves runtime URL parameters with explicit precedence.

### API base URL

Priority order:
1. Query parameter: `?api-url=http://host:port`
2. Global variable: `window.THINKT_API_URL`
3. Meta tag: `<meta name="thinkt-api-url" content="...">`
4. Build-time env: `VITE_API_URL`
5. Same origin (`window.location.origin`)
6. Fallback: `http://localhost:8784`

### Auth token

`token` is read with this precedence:
1. URL fragment (hash): `#token=...`
2. Query parameter fallback: `?token=...`

Hash is preferred because fragments are not sent to the server in HTTP requests.

### Deep-link session target

The app can open a target session at startup. Parameters are read from hash first, then query.

Required:
- `session_path` or alias `path` or `session`

Optional:
- `session_id`
- `project_name` or alias `project`
- `project_id`
- `line_num` or alias `line`

Examples:
- `/#session_path=/abs/path/to/session.jsonl`
- `/#session_path=/abs/path/to/session.jsonl&project_id=abc123&session_id=s1&line_num=42`
- `/?api-url=http://localhost:8784#token=thinkt_20260227_example&session=/abs/path/to/session.jsonl`

## Authentication (Runtime + Auth Tab)

Token sources used by the UI:
1. Explicit client config token
2. URL hash token (`#token`)
3. URL query token (`?token`)

`Auth` tab behavior:
- `Current Token` is redacted by default.
- Redaction format for thinkt tokens: `thinkt_YYYYMMDD_....LAST4`.
- Non-thinkt token redaction: `first4....last4`.
- `Show/Hide` toggles visibility.
- `Save Token` updates the client config token and URL hash.
- `Clear Token` removes token from client config and URL hash.

Dev caveat:
- `npm run dev` injects `THINKT_API_TOKEN` in the Vite proxy process.
- In that mode, the browser app may not have the raw token value to display.
- Auth tab will show `Set (injected)` when server auth is enabled but no browser-visible token exists.

## i18n Workflow

When UI text changes:
1. Use `i18n._(...)` for user-facing strings.
2. Run `npm run i18n` to extract and compile catalogs.
3. Commit updated locale files under `src/locales/`.

## Dependencies

- `@wethinkt/ts-thinkt` (`file:../ts-thinkt`) - API client, types, parsers, analysis utilities
- `vite` - build tooling
- `vitest` - test runner
- `@lingui/*` - i18n extraction/compilation/runtime
