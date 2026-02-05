# THINKT API Module

Type-safe API client and UI components for the THINKT server.

## Overview

This module provides:

1. **Auto-generated TypeScript bindings** from OpenAPI spec
2. **Type-safe HTTP client** with error handling
3. **UI components** for browsing projects and sessions
4. **High-level viewer integration** connecting API to 3D visualization

## Quick Start

### Installation

The API module is included in the main package. Install dependencies:

```bash
npm install
```

### Generate API Bindings

The TypeScript types are auto-generated from the OpenAPI spec:

```bash
# Copy swagger.json from the Go server
# Then regenerate types:
npm run api:generate
```

This will:
1. Convert Swagger 2.0 to OpenAPI 3.0 using `swagger2openapi`
2. Generate TypeScript types using `openapi-typescript`

### Basic Usage

```typescript
import { createClient, type Project } from './api';

const client = createClient({ baseUrl: 'http://localhost:7433' });

// List all projects
const projects = await client.getProjects();

// Get sessions for a project
const sessions = await client.getSessions(projects[0].id);

// Load a session with entries
const session = await client.getSession(sessions[0].full_path);
```

## API Client

### Configuration

```typescript
import { createClient } from './api';

const client = createClient({
  baseUrl: 'http://localhost:7433',  // Default
  apiVersion: '/api/v1',              // Default
  timeout: 30000,                     // Default (ms)
});
```

### Methods

#### `getSources()`
Returns available trace sources (Claude Code, Kimi Code).

```typescript
const sources = await client.getSources();
// [{ name: 'claude', base_path: '...', available: true }, ...]
```

#### `getProjects(source?)`
Returns all projects, optionally filtered by source.

```typescript
const allProjects = await client.getProjects();
const claudeProjects = await client.getProjects('claude');
```

#### `getSessions(projectId)`
Returns all sessions for a project.

```typescript
const sessions = await client.getSessions('project-id');
```

#### `getSession(path, options?)`
Returns session metadata and entries with optional pagination.

```typescript
const session = await client.getSession('/path/to/session.json', {
  limit: 100,   // Max entries to return
  offset: 0,    // Entries to skip
});
```

#### `getAllSessionEntries(path, chunkSize?)`
Loads all entries from a session (handles pagination automatically).

```typescript
const entries = await client.getAllSessionEntries('/path/to/session.json');
```

#### `streamSessionEntries(path, chunkSize?)`
Streams entries as an async generator (memory-efficient for large sessions).

```typescript
for await (const entry of client.streamSessionEntries('/path/to/session.json')) {
  console.log(entry.uuid);
}
```

### Error Handling

```typescript
import { ThinktAPIError, ThinktNetworkError } from './api';

try {
  const projects = await client.getProjects();
} catch (error) {
  if (error instanceof ThinktAPIError) {
    console.error('API error:', error.statusCode, error.message);
  } else if (error instanceof ThinktNetworkError) {
    console.error('Network error:', error.message);
  }
}
```

## UI Components

### ProjectBrowser

A standalone component for browsing projects.

```typescript
import { ProjectBrowser } from './api';

const browser = new ProjectBrowser({
  elements: {
    container: document.getElementById('projects')!,
  },
  onProjectSelect: (project) => {
    console.log('Selected:', project.name);
  },
  onError: (error) => {
    console.error('Error:', error);
  },
});
```

Features:
- Search/filter projects by name/path
- Source filter dropdown
- Keyboard navigation (Arrow keys, Enter)
- Automatic retry on errors
- Responsive design

### SessionList

A standalone component for listing sessions within a project.

```typescript
import { SessionList } from './api';

const list = new SessionList({
  elements: {
    container: document.getElementById('sessions')!,
  },
  projectId: 'project-id',  // Optional: loads immediately
  onSessionSelect: (session) => {
    console.log('Selected:', session.first_prompt);
  },
});

// Or set project later
await list.setProjectId('another-project');
```

Features:
- Search/filter sessions
- Shows session metadata (entries, size, model)
- Sorted by modification date
- Chunked session indicators
- Keyboard navigation

### ApiViewer (High-Level)

Complete integration connecting API to the 3D Viewer.

```typescript
import { ApiViewer } from './api';

const viewer = new ApiViewer({
  elements: {
    container: document.getElementById('app')!,
    projectBrowserContainer: document.getElementById('projects')!,
    sessionListContainer: document.getElementById('sessions')!,
    viewerContainer: document.getElementById('viewer')!,
  },
  onSessionLoaded: (session, entries) => {
    console.log(`Loaded ${entries.length} entries`);
  },
});
```

This creates a complete browsing and visualization experience:
- Left sidebar: Project browser + Session list
- Right side: 3D visualization viewer
- Connection status indicator
- Resizable panels

## Type Conversions

The API uses snake_case (JSON convention), while the THINKT library uses camelCase. The `api-adapters` module handles conversion:

```typescript
import { convertApiToSession, convertApiEntry } from './api';

// Convert API response to THINKT Session
const session = convertApiToSession(apiMeta, apiEntries);

// Convert individual entries
const entry = convertApiEntry(apiEntry);
```

## VSCode Extension Integration

The components are designed to work standalone, making them ideal for VSCode extensions:

```typescript
// In VSCode webview
import { ProjectBrowser, SessionList, createClient } from 'thinking-tracer/api';

const client = createClient({ baseUrl: 'http://localhost:7433' });

const browser = new ProjectBrowser({
  elements: { container: document.getElementById('projects')! },
  client,
  onProjectSelect: (project) => {
    // Send message to VSCode extension
    vscode.postMessage({ type: 'projectSelected', project });
  },
});
```

## API Types

### Generated Types

All types are generated from the OpenAPI spec:

```typescript
import type { components } from './api';

type Project = components['schemas']['thinkt.Project'];
type SessionMeta = components['schemas']['thinkt.SessionMeta'];
type Entry = components['schemas']['thinkt.Entry'];
```

### Client Types

Re-exported for convenience:

```typescript
import type { Project, SessionMeta, Entry, ContentBlock } from './api';
```

## Testing

```bash
# Run API tests
npm test -- src/api

# Run all tests
npm test -- --run
```

## Architecture

```
src/api/
├── swagger.json          # OpenAPI spec (source)
├── openapi.json          # Converted to OpenAPI 3.0
├── generated.ts          # Auto-generated types
├── client.ts             # HTTP client implementation
├── components/           # UI components
│   ├── ProjectBrowser.ts
│   ├── SessionList.ts
│   ├── ApiViewer.ts
│   └── api-adapters.ts
└── __tests__/            # Unit tests
```

## Related

- [go-thinkt](https://github.com/wethinkt/go-thinkt) - Go implementation and API server
- [ts-thinkt](https://github.com/wethinkt/ts-thinkt) - TypeScript library for types and parsers
- [Main Viewer](../../core/Viewer.ts) - 3D visualization engine
