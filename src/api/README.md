# THINKT API Module

Re-exports the `@wethinkt/ts-thinkt/api` client and provides UI components for browsing projects and sessions.

## Structure

```
src/api/
├── index.ts              # Re-exports from @wethinkt/ts-thinkt/api + local components
└── components/
    ├── ApiViewer.ts       # Top-level orchestrator (split pane layout)
    ├── ProjectBrowser.ts  # Project list with search/filter/keyboard nav
    ├── SessionList.ts     # Session list within a project
    ├── ConversationView.ts# Text-based conversation viewer with filter toggles
    ├── api-adapters.ts    # Converts API snake_case <-> ts-thinkt camelCase
    └── index.ts           # Component exports
```

The API client (`ThinktClient`), types (`Project`, `SessionMeta`, `Entry`, `ContentBlock`, etc.), and error classes all come from `@wethinkt/ts-thinkt/api`. This module re-exports them so the rest of the app can `import { ... } from './api'`.

## Usage

```typescript
import { createClient, configureDefaultClient, type Project } from './api';

// Configure the singleton client at startup
configureDefaultClient({ baseUrl: 'http://localhost:8784' });

// Or create a standalone client
const client = createClient({ baseUrl: 'http://localhost:8784' });
const projects = await client.getProjects();
```

## UI Components

### ProjectBrowser

```typescript
import { ProjectBrowser } from './api';

const browser = new ProjectBrowser({
  elements: { container: document.getElementById('projects')! },
  onProjectSelect: (project) => { /* ... */ },
});
```

### SessionList

```typescript
import { SessionList } from './api';

const list = new SessionList({
  elements: { container: document.getElementById('sessions')! },
  onSessionSelect: (session) => { /* ... */ },
});
await list.setProjectId('project-id');
```

### ApiViewer

Orchestrator that wires ProjectBrowser, SessionList, and ConversationView together.

```typescript
import { ApiViewer } from './api';

const viewer = new ApiViewer({
  elements: {
    container: document.getElementById('app')!,
    projectBrowserContainer: document.getElementById('projects')!,
    sessionListContainer: document.getElementById('sessions')!,
    viewerContainer: document.getElementById('viewer')!,
  },
  onSessionLoaded: (session, entries) => { /* ... */ },
});
```

## Type Conversions

The API wire format uses snake_case; ts-thinkt uses camelCase. The adapter layer handles conversion:

```typescript
import { convertApiToSession, convertApiEntry } from './api';

const session = convertApiToSession(apiMeta, apiEntries);
const entry = convertApiEntry(apiEntry);
```
