/**
 * THINKT API Module
 *
 * Re-exports the API client from @wethinkt/ts-thinkt and provides
 * thinkt-web's UI components for browsing projects and sessions.
 *
 * @example
 * ```typescript
 * import { createClient, type Project } from './api';
 *
 * const client = createClient({ baseUrl: 'http://localhost:8784' });
 *
 * // List all projects (returns domain types with camelCase fields)
 * const projects = await client.getProjects();
 *
 * // Get sessions for a project
 * const sessions = await client.getSessions(projects[0].id);
 *
 * // Load a session with entries
 * const { meta, entries, hasMore } = await client.getSession(sessions[0].fullPath!);
 * ```
 */

// High-level client (from ts-thinkt — returns domain types)
export {
  ThinktClient,
  ThinktAPIError,
  ThinktNetworkError,
  createClient,
  getDefaultClient,
  configureDefaultClient,
  resetDefaultClient,
} from '@wethinkt/ts-thinkt/api';

// Low-level client (for raw OpenAPI access)
export {
  ThinktApiClient,
  createApiClient,
} from '@wethinkt/ts-thinkt/api';

// Types
export type {
  ThinktClientConfig,
  SessionResponse,
  APISourceInfo,
  ErrorResponse,
} from '@wethinkt/ts-thinkt/api';

// Generated types (for advanced use cases)
export type { paths, components } from '@wethinkt/ts-thinkt/api';

// Components (thinkt-web UI)
export * from './components';
