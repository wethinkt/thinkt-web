/**
 * THINKT API App Configuration
 *
 * Runtime configuration for the API client.
 *
 * API base URL priority (highest to lowest):
 * 1. Query parameter: ?api-url=http://localhost:8784
 * 2. Global variable: window.THINKT_API_URL
 * 3. Meta tag: <meta name="thinkt-api-url" content="...">
 * 4. Environment variable: VITE_API_URL (build time)
 * 5. Same origin (default)
 *
 * Auth token:
 * - Read from #token= URL fragment (set by `thinkt web`), with ?token= query param fallback
 * - Fragments are preferred because they are never sent to the server in HTTP requests
 * - In dev mode, the vite proxy injects the token server-side
 */

/**
 * Get the API base URL from various configuration sources.
 */
export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // 1. Query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const apiUrlParam = urlParams.get('api-url');
    if (apiUrlParam) {
      try {
        new URL(apiUrlParam);
        return apiUrlParam;
      } catch {
        console.error('[THINKT] Invalid API URL in query parameter:', apiUrlParam);
      }
    }

    // 2. Global variable
    const globalUrl = (window as unknown as Record<string, string>).THINKT_API_URL;
    if (globalUrl) return globalUrl;
  }

  // 3. Meta tag
  if (typeof document !== 'undefined') {
    const metaUrl = document.querySelector('meta[name="thinkt-api-url"]')?.getAttribute('content');
    if (metaUrl) return metaUrl;
  }

  // 4. Build-time environment variable
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // 5. Same origin (works in both production and dev with vite proxy)
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  return 'http://localhost:8784';
}

/**
 * Get the API auth token from the URL fragment (#token=) or query parameter (?token=).
 * Fragment is preferred (never sent to server); query param kept as fallback.
 * Set by `thinkt web` when opening the browser.
 */
export function getApiToken(): string | null {
  if (typeof window === 'undefined') return null;
  // Prefer fragment (#token=...) — not sent to server in HTTP requests
  const hash = window.location.hash.replace(/^#/, '');
  const fragmentToken = new URLSearchParams(hash).get('token');
  if (fragmentToken) return fragmentToken;
  // Fallback to query param for backwards compatibility
  return new URLSearchParams(window.location.search).get('token');
}

export interface InitialSessionTarget {
  sessionPath: string;
  sessionId?: string;
  projectName?: string;
  projectId?: string;
  lineNum?: number;
}

function getParamFromHashOrQuery(...keys: string[]): string | null {
  if (typeof window === 'undefined') return null;

  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  for (const key of keys) {
    const value = hashParams.get(key);
    if (value && value.trim().length > 0) return value.trim();
  }

  const queryParams = new URLSearchParams(window.location.search);
  for (const key of keys) {
    const value = queryParams.get(key);
    if (value && value.trim().length > 0) return value.trim();
  }

  return null;
}

function parsePositiveInt(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
}

/**
 * Optional deep-link target for opening a specific session in the web UI.
 * Supported params (hash preferred over query):
 * - session_path | path | session
 * - session_id
 * - project_name | project
 * - project_id
 * - line_num | line
 */
export function getInitialSessionTarget(): InitialSessionTarget | null {
  const sessionPath = getParamFromHashOrQuery('session_path', 'path', 'session');
  if (!sessionPath) return null;

  return {
    sessionPath,
    sessionId: getParamFromHashOrQuery('session_id') ?? undefined,
    projectName: getParamFromHashOrQuery('project_name', 'project') ?? undefined,
    projectId: getParamFromHashOrQuery('project_id') ?? undefined,
    lineNum: parsePositiveInt(getParamFromHashOrQuery('line_num', 'line')),
  };
}
