# AGENTS.md

Instructions for AI agents working on this codebase.

## Project Overview

This is a Vite + TypeScript web app (no framework - vanilla TS with DOM APIs). It provides a browser UI for the THINKT API server and is designed to be embedded by `thinkt serve`.

## Architecture

```
@wethinkt/ts-thinkt (../ts-thinkt)    <- core library (types, parsers, API client)
  \- thinkt-web (this project)        <- web UI that consumes the library
```

- `@wethinkt/ts-thinkt` is a sibling package at `../ts-thinkt` linked via `file:../ts-thinkt` in `package.json`.
- API clients and types come from `@wethinkt/ts-thinkt/api`:
  - `ThinktClient` (high-level): camelCase domain types, used by UI components.
  - `ThinktApiClient` (low-level): raw snake_case OpenAPI types.
- `src/api/index.ts` re-exports ts-thinkt API + local UI components.

## Key Constraints

- No framework. Use vanilla TypeScript + DOM APIs.
- Types come from ts-thinkt. Do not recreate domain/client types locally.
- Respect snake_case vs camelCase boundaries:
  - API payloads are snake_case.
  - UI-level `ThinktClient` objects are camelCase.
- Keep promises handled (`@typescript-eslint/no-floating-promises`).
- Keep i18n complete:
  - Wrap user-facing strings with `i18n._(...)`.
  - Run `npm run i18n` when changing strings.

## Commands

```bash
npm run dev          # Dev server (port 7434, proxies /api -> localhost:8784)
npm run build:fast   # Quick build (typecheck + vite, no lint)
npm run test:run     # Run all tests once
npm run typecheck    # TypeScript only
npm run lint         # ESLint only
npm run i18n         # Extract + compile translations
```

## File Layout

- `src/main.ts`
  - Bootstraps app + i18n
  - Configures API client from runtime config
  - Wires global search and settings overlays
  - Supports startup deep-link session loading (`getInitialSessionTarget`)
- `src/config.ts`
  - API base URL resolution (`api-url` query, globals/meta/env fallback)
  - Auth token resolution (`#token` preferred, `?token` fallback)
  - Session deep-link param parsing (hash preferred over query)
- `src/styles.css` - global styles and CSS variables
- `src/i18n.ts` - locale setup
- `src/api/components/`
  - `ApiViewer.ts` - orchestrator that wires project/session/conversation panels
  - `ProjectBrowser.ts` - project list UI
  - `SessionList.ts` - session list UI
  - `ConversationView.ts` - conversation/entry UI
  - `SearchOverlay.ts` - global search modal (text + semantic)
  - `SettingsOverlay.ts` - settings/info modal (Dashboard, Indexer, Sources, Apps, Auth)
  - `search-overlay-styles.css`, `settings-overlay-styles.css` - overlay styles

## URL Parameter Scheme

`config.ts` currently implements:

- API base URL:
  - Query: `?api-url=http://host:port`
  - Must parse as absolute URL (`new URL(...)`), invalid values are ignored
  - Then global/meta/env/same-origin fallback
- Auth token:
  - Hash first: `#token=...`
  - Query fallback: `?token=...`
- Initial session target (hash preferred over query):
  - Required: `session_path` (aliases: `path`, `session`)
  - Optional: `session_id`, `project_name` (`project`), `project_id`, `line_num` (`line`)
  - Values are trimmed; `line_num` must be a positive integer

Session-target load behavior in `main.ts`:
- Prefer `project_id` selection over `project_name` when both exist.
- Refresh projects once and retry project selection if not immediately found.
- Load session by `session_path`, then optionally select `session_id`.
- If `line_num` exists, scroll approximately to entry index `line - 1`.

If you add URL parameters, update both `README.md` and this file.

## AUTH Behavior

- In-browser token may come from:
  - Client config token
  - URL hash token
  - URL query token
- `SettingsOverlay` Auth tab:
  - Shows `Current Token`, redacted by default, with show/hide toggle.
  - Thinkt token redaction format: `thinkt_YYYYMMDD_....LAST4`.
  - Save/Clear actions update both client config and URL hash.
- Dev mode note:
  - `npm run dev` injects `THINKT_API_TOKEN` in Vite proxy process.
  - Browser code cannot necessarily read that injected token value.
  - UI may show `Set (injected)` when auth is enabled server-side but token is not browser-visible.

## Settings Overlay Notes

- Tabs: `Dashboard`, `Indexer`, `Sources`, `Apps`, `Auth`.
- Dashboard server data includes `/info` fields (fingerprint, version/revision, started_at, uptime, pid, authenticated).
- Indexer tab has separate `Indexer Status` and `Embedding Status` sections.
- Indexer tab auto-refreshes every 5 seconds.
- Overlay lifecycle cleanup must abort listeners/refresh via `AbortController`.

## Testing

Tests use vitest with jsdom. Run `npm run test:run` to verify changes.

## Build Output

Production build outputs to `dist/`. The Go server embeds this directory to serve the web UI.
