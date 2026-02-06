/**
 * THINKT API Application
 *
 * Standalone webapp for browsing projects and sessions via the THINKT API.
 * Served by `thinkt serve` and connects to the local API server.
 */

/// <reference types="vite/client" />

import { ApiViewer, configureDefaultClient } from './api';
import { getApiBaseUrl } from './config';
import { initI18n, changeLocale, SUPPORTED_LOCALES, type SupportedLocale } from './i18n';
import './styles.css';

// ============================================
// Application State
// ============================================

let apiViewer: ApiViewer | null = null;
let connectionIntervalId: ReturnType<typeof setInterval> | null = null;

// ============================================
// Initialization
// ============================================

async function init(): Promise<void> {
  // Initialize i18n first
  const currentLocale = await initI18n();
  setupLanguageSelector(currentLocale);

  // Configure API client
  const baseUrl = getApiBaseUrl();
  configureDefaultClient({ baseUrl });

  // eslint-disable-next-line no-console
  console.log('[THINKT] API App initializing...');
  // eslint-disable-next-line no-console
  console.log(`[THINKT] API base URL: ${baseUrl}`);
  // eslint-disable-next-line no-console
  console.log(`[THINKT] Language: ${currentLocale}`);

  // Get DOM elements
  const elements = {
    container: document.getElementById('app')!,
    projectBrowserContainer: document.getElementById('project-browser')!,
    sessionListContainer: document.getElementById('session-list')!,
    viewerContainer: document.getElementById('viewer-container')!,
    resizer: document.getElementById('resizer')!,
  };

  // Validate all elements exist
  for (const [name, element] of Object.entries(elements)) {
    if (!element) {
      console.error(`[THINKT] Required element not found: ${name}`);
      return;
    }
  }

  // Create API viewer
  apiViewer = new ApiViewer({
    elements,
    onSessionLoaded: (session, entries) => {
      // eslint-disable-next-line no-console
  console.log(`[THINKT] Loaded session: ${session.id} (${entries.length} entries)`);
      updateWindowTitle(session.first_prompt ?? session.id ?? 'Session');
    },
    onError: (error) => {
      // Error is already logged by the API client
      updateConnectionStatus('error', error.message);
    },
  });

  // Setup keyboard shortcuts
  setupKeyboardShortcuts();

  // Setup connection status monitoring
  setupConnectionMonitoring();

  // Hide loading screen
  hideLoadingScreen();

  // eslint-disable-next-line no-console
  console.log('[THINKT] API App initialized');
}

// ============================================
// Language Selector
// ============================================

function setupLanguageSelector(currentLocale: SupportedLocale): void {
  const langSelect = document.getElementById('lang-select') as HTMLSelectElement | null;
  if (!langSelect) return;

  // Set current value
  langSelect.value = currentLocale;

  // Handle language change
  langSelect.addEventListener('change', async (e) => {
    const newLocale = (e.target as HTMLSelectElement).value as SupportedLocale;
    if (SUPPORTED_LOCALES.includes(newLocale)) {
      await changeLocale(newLocale);
      // eslint-disable-next-line no-console
      console.log(`[THINKT] Language changed to: ${newLocale}`);

      // Reload the page to apply translations to all components
      // This is simpler than trying to update all components dynamically
      window.location.reload();
    }
  });
}

// ============================================
// UI Helpers
// ============================================

function hideLoadingScreen(): void {
  const loading = document.getElementById('loading');
  if (loading) {
    loading.classList.add('hidden');
    // Remove after transition
    setTimeout(() => loading.remove(), 300);
  }
}

function updateWindowTitle(sessionTitle: string): void {
  document.title = `${sessionTitle} - THINKT`;
}

function updateConnectionStatus(status: 'connected' | 'error' | 'connecting', message?: string): void {
  const statusEl = document.getElementById('global-status');
  if (!statusEl) return;

  // Remove old status classes
  statusEl.classList.remove('connected', 'error', 'connecting');
  // Add new status class
  statusEl.classList.add(status);

  const textEl = statusEl.querySelector('.status-text');
  if (textEl) {
    textEl.textContent = message ?? (status === 'connected' ? 'Connected' : 'Disconnected');
  }
}

// ============================================
// Keyboard Shortcuts
// ============================================

function setupKeyboardShortcuts(): void {
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + R - Refresh projects
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
      e.preventDefault();
      const result = apiViewer?.refreshProjects();
      if (result) {
        void result.catch((err: unknown) => {
          void err;
        });
      }
    }

    // Escape - Focus app container for keyboard nav
    if (e.key === 'Escape') {
      document.getElementById('app')?.focus();
    }
  });
}

// ============================================
// Connection Monitoring
// ============================================

function setupConnectionMonitoring(): void {
  // Initial check
  void checkConnection();

  // Periodic check every 30 seconds
  connectionIntervalId = setInterval(() => { void checkConnection(); }, 30000);
}

async function checkConnection(): Promise<void> {
  try {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/v1/sources`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) {
      updateConnectionStatus('connected');
    } else {
      updateConnectionStatus('error', `HTTP ${response.status}`);
    }
  } catch (error) {
    updateConnectionStatus('error', error instanceof Error ? error.message : 'Connection failed');
  }
}

// ============================================
// Cleanup
// ============================================

function dispose(): void {
  if (connectionIntervalId !== null) {
    clearInterval(connectionIntervalId);
    connectionIntervalId = null;
  }
  apiViewer?.dispose();
  apiViewer = null;
}

// ============================================
// Bootstrap
// ============================================

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { void init(); });
} else {
  void init();
}

// Cleanup on page unload
window.addEventListener('beforeunload', dispose);

// Hot Module Replacement
if (import.meta.hot) {
  import.meta.hot.accept();
  import.meta.hot.dispose(() => {
    dispose();
  });
}
