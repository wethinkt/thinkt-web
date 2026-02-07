# THINKT API Module

Re-exports the `@wethinkt/ts-thinkt/api` clients and provides UI components for browsing projects and sessions.

## Structure

```
src/api/
├── index.ts              # Re-exports from @wethinkt/ts-thinkt/api + local components
└── components/
    ├── ApiViewer.ts       # Top-level orchestrator (split pane layout)
    ├── ProjectBrowser.ts  # Project list with search/filter/keyboard nav
    ├── SessionList.ts     # Session list within a project
    ├── ConversationView.ts# Text-based conversation viewer with filter toggles
    └── index.ts           # Component exports
```

Two client layers are re-exported from `@wethinkt/ts-thinkt/api`:
- **`ThinktClient`** / `createClient` — high-level client returning camelCase domain types (`Project`, `SessionMeta`, `Entry`, etc.). This is what the UI components use.
- **`ThinktApiClient`** / `createApiClient` — low-level client returning raw OpenAPI snake_case types.

All snake_case ↔ camelCase conversion is handled inside ts-thinkt.

## Usage

```typescript
import { createClient, configureDefaultClient, type Project } from './api';

// Configure the singleton client at startup
configureDefaultClient({ baseUrl: 'http://localhost:8784' });

// Or create a standalone client
const client = createClient({ baseUrl: 'http://localhost:8784' });
const projects = await client.getProjects();
```

For raw OpenAPI access:

```typescript
import { createApiClient } from './api';

const apiClient = createApiClient({ baseUrl: 'http://localhost:8784' });
const response = await apiClient.getProjects(); // returns snake_case types
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
