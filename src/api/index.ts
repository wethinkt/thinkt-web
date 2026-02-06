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
 * // List all projects
 * const projects = await client.getProjects();
 *
 * // Get sessions for a project
 * const sessions = await client.getSessions(projects[0].id);
 *
 * // Load a session with entries
 * const session = await client.getSession(sessions[0].full_path);
 * ```
 */

// Client and configuration (from ts-thinkt)
export {
  ThinktClient,
  ThinktAPIError,
  ThinktNetworkError,
  createClient,
  getDefaultClient,
  configureDefaultClient,
  resetDefaultClient,
} from '@wethinkt/ts-thinkt/api';

// Types (from ts-thinkt)
export type {
  ThinktClientConfig,
  SessionResponse,
  Project,
  SessionMeta,
  Entry,
  ContentBlock,
  TokenUsage,
  Role,
  Source,
  APISourceInfo,
  ErrorResponse,
  APIPaths,
  APIComponents,
} from '@wethinkt/ts-thinkt/api';

// Generated types (from ts-thinkt, for advanced use cases)
export type { paths, components } from '@wethinkt/ts-thinkt/api';

// Components (thinkt-web UI)
export * from './components';
