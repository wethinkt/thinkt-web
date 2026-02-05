/**
 * THINKT API App Configuration
 *
 * Provides flexible runtime configuration for the API base URL.
 * Configuration priority (highest to lowest):
 * 1. Query parameter: ?api-url=http://localhost:7433
 * 2. Global variable: window.THINKT_API_URL
 * 3. Meta tag: <meta name="thinkt-api-url" content="http://localhost:7433">
 * 4. Environment variable: VITE_API_URL (build time)
 * 5. Same origin: window.location.origin (production)
 * 6. Default: http://localhost:7433
 */

/**
 * Get the API base URL from various configuration sources
 */
export function getApiBaseUrl(): string {
  // 1. Check query parameter
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const apiUrlParam = urlParams.get('api-url');
    if (apiUrlParam) {
      // Validate URL format
      try {
        new URL(apiUrlParam);
        // eslint-disable-next-line no-console
        console.log('[THINKT] Using API URL from query parameter:', apiUrlParam);
        return apiUrlParam;
      } catch {
        console.error('[THINKT] Invalid API URL in query parameter:', apiUrlParam);
      }
    }
  }

  // 2. Check global variable
  if (typeof window !== 'undefined' && (window as unknown as Record<string, string>).THINKT_API_URL) {
    const globalUrl = (window as unknown as Record<string, string>).THINKT_API_URL;
    // eslint-disable-next-line no-console
    console.log('[THINKT] Using API URL from global variable:', globalUrl);
    return globalUrl;
  }

  // 3. Check meta tag
  if (typeof document !== 'undefined') {
    const metaTag = document.querySelector('meta[name="thinkt-api-url"]');
    if (metaTag?.getAttribute('content')) {
      const metaUrl = metaTag.getAttribute('content')!;
      // eslint-disable-next-line no-console
      console.log('[THINKT] Using API URL from meta tag:', metaUrl);
      return metaUrl;
    }
  }

  // 4. Check environment variable (development only)
  if (import.meta.env.VITE_API_URL) {
    // eslint-disable-next-line no-console
    console.log('[THINKT] Using API URL from environment:', import.meta.env.VITE_API_URL);
    return import.meta.env.VITE_API_URL;
  }

  // 5. In production, use same origin
  if (import.meta.env.PROD && typeof window !== 'undefined') {
    // eslint-disable-next-line no-console
    console.log('[THINKT] Using API URL from same origin:', window.location.origin);
    return window.location.origin;
  }

  // 6. Default fallback
  // eslint-disable-next-line no-console
  console.log('[THINKT] Using default API URL: http://localhost:7433');
  return 'http://localhost:7433';
}

/**
 * Configuration options for the API app
 */
export interface ApiAppConfig {
  /** Base URL of the THINKT API server */
  apiBaseUrl: string;
  /** API version path */
  apiVersion: string;
  /** Request timeout in milliseconds */
  timeout: number;
}

/**
 * Get full configuration with defaults
 */
export function getConfig(): ApiAppConfig {
  return {
    apiBaseUrl: getApiBaseUrl(),
    apiVersion: '/api/v1',
    timeout: 30000,
  };
}

/**
 * Set the API URL at runtime via global variable
 * Call this before initializing the API app
 */
export function setApiUrl(url: string): void {
  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, string>).THINKT_API_URL = url;
  }
}
