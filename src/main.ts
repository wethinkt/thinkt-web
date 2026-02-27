/**
 * THINKT API Application
 *
 * Standalone webapp for browsing projects and sessions via the THINKT API.
 * Served by `thinkt serve` and connects to the local API server.
 */

/// <reference types="vite/client" />

import { ApiViewer, SearchOverlay, SettingsOverlay, configureDefaultClient, getDefaultClient } from './api';
import { i18n } from '@lingui/core';
import { getApiBaseUrl, getApiToken, getInitialSessionTarget } from './config';
import { initI18n, changeLocale, SUPPORTED_LOCALES, type SupportedLocale } from './i18n';
import { LanguageSelector } from './components/LanguageSelector';
import './styles.css';

// ============================================
// Application State
// ============================================

let apiViewer: ApiViewer | null = null;
let searchOverlay: SearchOverlay | null = null;
let settingsOverlay: SettingsOverlay | null = null;
let connectionIntervalId: ReturnType<typeof setInterval> | null = null;
let languageSelector: LanguageSelector<SupportedLocale> | null = null;
let removeGlobalSidebarButtonListener: (() => void) | null = null;
let removeGlobalSettingsButtonListener: (() => void) | null = null;
let removeGlobalSearchButtonListener: (() => void) | null = null;
let currentSessionTitle: string | null = null;
let currentConnectionStatus: { status: 'connected' | 'error' | 'connecting'; message?: string } = {
  status: 'connecting',
};

// ============================================
// Initialization
// ============================================

async function init(): Promise<void> {
  // Initialize i18n first
  const currentLocale = await initI18n();
  document.documentElement.lang = currentLocale;
  setupLanguageSelector(currentLocale);
  setupGlobalSidebarButton();
  setupGlobalSettingsButton();
  setupGlobalSearchButton();
  updateConnectionStatus('connecting');

  // Configure API client
  const baseUrl = getApiBaseUrl();
  const token = getApiToken();
  configureDefaultClient({ baseUrl, ...(token ? { token } : {}) });
  // eslint-disable-next-line no-console
  console.log(`[THINKT] Initializing (API: ${baseUrl}, auth: ${token ? 'token' : 'none'}, lang: ${currentLocale})`);

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
      currentSessionTitle = session.firstPrompt ?? session.id ?? 'Session';
      updateWindowTitle(currentSessionTitle);
    },
    onError: (error) => {
      // Error is already logged by the API client
      updateConnectionStatus('error', error.message);
    },
  });

  // Setup keyboard shortcuts
  setupKeyboardShortcuts();

  const initialSessionTarget = getInitialSessionTarget();
  if (initialSessionTarget) {
    await apiViewer.whenReady();
    void loadSessionFromSearch(
      {
        path: initialSessionTarget.sessionPath,
        session_path: initialSessionTarget.sessionPath,
        session_id: initialSessionTarget.sessionId,
        project_name: initialSessionTarget.projectName,
        project_id: initialSessionTarget.projectId,
      },
      initialSessionTarget.lineNum,
    );
  }

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
  const container = document.getElementById('lang-select-container');
  if (!(container instanceof HTMLElement)) return;

  languageSelector?.dispose();
  languageSelector = new LanguageSelector<SupportedLocale>({
    container,
    locales: SUPPORTED_LOCALES,
    currentLocale,
    onChange: async (newLocale) => {
      await changeLocale(newLocale);
      document.documentElement.lang = newLocale;
      languageSelector?.setCurrentLocale(newLocale);
      refreshLocalizedTopBarText();
      // eslint-disable-next-line no-console
      console.log(`[THINKT] Language changed to: ${newLocale}`);
      window.dispatchEvent(new CustomEvent('thinkt:locale-changed', { detail: { locale: newLocale } }));
    },
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
  document.title = i18n._('{sessionTitle} - THINKT', { sessionTitle });
}

function getSearchShortcutLabel(): string {
  const platform = navigator.platform.toLowerCase();
  const isApplePlatform = platform.includes('mac') || platform.includes('iphone') || platform.includes('ipad');
  return isApplePlatform ? 'Cmd+K' : 'Ctrl+K';
}

function updateSearchButtonTooltip(): void {
  const button = document.getElementById('global-search-button');
  if (!(button instanceof HTMLButtonElement)) return;

  const shortcut = getSearchShortcutLabel();
  const tooltip = i18n._('Open search dialog ({shortcut})', { shortcut });
  button.title = tooltip;
  button.setAttribute('aria-label', tooltip);
}

function updateSidebarButtonTooltip(): void {
  const button = document.getElementById('global-sidebar-button');
  if (!(button instanceof HTMLButtonElement)) return;

  const tooltip = i18n._('Toggle sidebar panel');
  button.title = tooltip;
  button.setAttribute('aria-label', tooltip);
}

function updateSettingsButtonTooltip(): void {
  const button = document.getElementById('global-settings-button');
  if (!(button instanceof HTMLButtonElement)) return;

  const tooltip = i18n._('Open settings and info');
  button.title = tooltip;
  button.setAttribute('aria-label', tooltip);
}

function setupGlobalSidebarButton(): void {
  removeGlobalSidebarButtonListener?.();
  removeGlobalSidebarButtonListener = null;

  const button = document.getElementById('global-sidebar-button');
  if (!(button instanceof HTMLButtonElement)) return;

  const handleClick = (): void => {
    apiViewer?.toggleSidebar();
  };
  const handleSidebarStateChange = (): void => {
    updateSidebarButtonTooltip();
  };

  button.addEventListener('click', handleClick);
  window.addEventListener('thinkt:sidebar-collapsed-change', handleSidebarStateChange as EventListener);
  removeGlobalSidebarButtonListener = () => {
    button.removeEventListener('click', handleClick);
    window.removeEventListener('thinkt:sidebar-collapsed-change', handleSidebarStateChange as EventListener);
  };

  updateSidebarButtonTooltip();
}

function setupGlobalSettingsButton(): void {
  removeGlobalSettingsButtonListener?.();
  removeGlobalSettingsButtonListener = null;

  const button = document.getElementById('global-settings-button');
  if (!(button instanceof HTMLButtonElement)) return;

  const handleClick = (): void => {
    openSettingsOverlay();
  };

  button.addEventListener('click', handleClick);
  removeGlobalSettingsButtonListener = () => {
    button.removeEventListener('click', handleClick);
  };

  updateSettingsButtonTooltip();
}

function setupGlobalSearchButton(): void {
  removeGlobalSearchButtonListener?.();
  removeGlobalSearchButtonListener = null;

  const button = document.getElementById('global-search-button');
  if (!(button instanceof HTMLButtonElement)) return;

  const handleClick = (): void => {
    openSearchOverlay();
  };

  button.addEventListener('click', handleClick);
  removeGlobalSearchButtonListener = () => {
    button.removeEventListener('click', handleClick);
  };

  updateSearchButtonTooltip();
}

function updateConnectionStatus(status: 'connected' | 'error' | 'connecting', message?: string): void {
  currentConnectionStatus = { status, message };

  const statusEl = document.getElementById('global-status');
  if (!statusEl) return;

  // Remove old status classes
  statusEl.classList.remove('connected', 'error', 'connecting');
  // Add new status class
  statusEl.classList.add(status);

  const textEl = statusEl.querySelector('.status-text');
  if (textEl) {
    textEl.textContent = message ??
      (status === 'connected'
        ? i18n._('Connected')
        : status === 'connecting'
          ? i18n._('Connecting...')
          : i18n._('Disconnected'));
  }
}

// ============================================
// Keyboard Shortcuts
// ============================================

function isInputElement(element: EventTarget | null): boolean {
  if (!(element instanceof HTMLElement)) return false;
  return element.tagName === 'INPUT' ||
    element.tagName === 'TEXTAREA' ||
    element.isContentEditable;
}

function setupKeyboardShortcuts(): void {
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + R - Refresh projects
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
      e.preventDefault();
      const result = apiViewer?.refreshProjects();
      if (result) {
        void result.catch((err: unknown) => {
          console.warn('[THINKT] Failed to refresh projects:', err);
        });
      }
      return;
    }

    // Ctrl/Cmd + K - Open global search overlay
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      openSearchOverlay();
      return;
    }

    // Escape - Focus app container for keyboard nav (if search is not open)
    if (e.key === 'Escape') {
      if (searchOverlay?.isOpened() || settingsOverlay?.isOpened()) {
        // Overlay components handle their own escape
        return;
      }
      document.getElementById('app')?.focus();
      return;
    }

    // / - Focus search box
    if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // Don't intercept if user is typing in an input
      if (isInputElement(e.target)) {
        return;
      }

      e.preventDefault();

      // Focus session search if a project is selected, otherwise focus project search
      const currentProject = apiViewer?.getCurrentProject();
      if (currentProject) {
        apiViewer?.focusSessionSearch();
      } else {
        apiViewer?.focusProjectSearch();
      }
    }
  });
}

function openSearchOverlay(): void {
  if (searchOverlay?.isOpened()) {
    return;
  }

  settingsOverlay?.close();

  searchOverlay = new SearchOverlay({
    elements: {
      container: document.body,
    },
    onSessionSelect: (result, lineNum) => {
      void loadSessionFromSearch(result, lineNum);
    },
    onClose: () => {
      searchOverlay = null;
    },
    onError: (error) => {
      console.error('[THINKT] Search error:', error);
    },
  });

  searchOverlay.open();
}

function openSettingsOverlay(): void {
  if (settingsOverlay?.isOpened()) {
    return;
  }

  searchOverlay?.close();

  settingsOverlay = new SettingsOverlay({
    elements: {
      container: document.body,
    },
    onClose: () => {
      settingsOverlay = null;
    },
    onError: (error) => {
      console.error('[THINKT] Settings overlay error:', error);
    },
  });

  settingsOverlay.open();
}

async function loadSessionFromSearch(
  result: { path?: string; session_path?: string; session_id?: string; project_name?: string; project_id?: string },
  lineNum?: number
): Promise<void> {
  const viewer = apiViewer;
  if (!viewer) return;
  await viewer.whenReady();

  const path = result.path ?? result.session_path;
  if (!path) {
    console.error('[THINKT] Search result has no path');
    return;
  }

  try {
    const resolvedTarget = await resolveSessionTarget(path);
    const targetProjectId = result.project_id ?? resolvedTarget?.project_id;
    const targetProjectName = result.project_name ?? resolvedTarget?.project_name;
    const targetPath = resolvedTarget?.session_path ?? path;
    const targetSessionId = result.session_id ?? resolvedTarget?.session_id;

    // Step 1: Find and select the project
    if (targetProjectId) {
      await viewer.selectProject(targetProjectId);
    } else if (targetProjectName) {
      await viewer.selectProjectByName(targetProjectName);
    }

    // Step 2: Load the session (this loads entries and updates conversation view)
    await viewer.loadSession(targetPath);

    // Step 3: Select the session in the session list UI
    const loadedSessionId = viewer.getCurrentSession()?.meta.id;
    const selectedSessionId = targetSessionId ?? loadedSessionId;
    if (selectedSessionId) {
      viewer.selectSessionById(selectedSessionId);
    } else {
      console.warn('[THINKT] Unable to resolve target session id for sidebar selection');
    }

    // Step 4: Scroll to the matching entry if line number is available
    if (lineNum !== undefined && lineNum > 0) {
      // Small delay to ensure DOM is updated
      await new Promise(resolve => setTimeout(resolve, 100));
      const approxEntryIndex = Math.max(0, lineNum - 1);
      viewer.scrollToEntry(approxEntryIndex);
    }
  } catch (error) {
    console.error('[THINKT] Failed to load session from search:', error);
  }
}

type SessionResolveTarget = {
  project_id?: string;
  project_name?: string;
  project_source?: string;
  session_id?: string;
  session_path?: string;
  workspace_id?: string;
};

type SessionResolverClient = {
  resolveSession?: (path: string, signal?: AbortSignal) => Promise<SessionResolveTarget>;
};

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}

function normalizeApiVersion(apiVersion: string): string {
  return apiVersion.startsWith('/') ? apiVersion : `/${apiVersion}`;
}

async function resolveSessionTarget(sessionPath: string): Promise<SessionResolveTarget | null> {
  const client = getDefaultClient();
  const maybeResolveSession = (client as SessionResolverClient).resolveSession;

  // Prefer native client method when available (newer ts-thinkt builds).
  if (typeof maybeResolveSession === 'function') {
    try {
      return await maybeResolveSession.call(client, sessionPath);
    } catch {
      return null;
    }
  }

  try {
    // Compatibility path for older ts-thinkt dist builds: call /sessions/resolve directly.
    const config = client.getConfig();
    const baseUrl = normalizeBaseUrl(config.baseUrl);
    const apiVersion = normalizeApiVersion(config.apiVersion);
    const url = new URL(`${baseUrl}${apiVersion}/sessions/resolve`);
    url.searchParams.set('path', sessionPath);

    const headers = new Headers({ Accept: 'application/json' });
    if (config.token && config.token.trim().length > 0) {
      headers.set('Authorization', `Bearer ${config.token}`);
    }

    const response = await (config.fetch ?? fetch)(url.toString(), {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as SessionResolveTarget | null;
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
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
    await getDefaultClient().getSources();
    updateConnectionStatus('connected');
  } catch (error) {
    updateConnectionStatus('error', error instanceof Error ? error.message : i18n._('Connection failed'));
  }
}

function refreshLocalizedTopBarText(): void {
  if (currentSessionTitle) {
    updateWindowTitle(currentSessionTitle);
  }
  updateSidebarButtonTooltip();
  updateSettingsButtonTooltip();
  updateSearchButtonTooltip();
  updateConnectionStatus(currentConnectionStatus.status, currentConnectionStatus.message);
}

// ============================================
// Cleanup
// ============================================

function dispose(): void {
  if (connectionIntervalId !== null) {
    clearInterval(connectionIntervalId);
    connectionIntervalId = null;
  }
  languageSelector?.dispose();
  languageSelector = null;
  removeGlobalSidebarButtonListener?.();
  removeGlobalSidebarButtonListener = null;
  removeGlobalSettingsButtonListener?.();
  removeGlobalSettingsButtonListener = null;
  removeGlobalSearchButtonListener?.();
  removeGlobalSearchButtonListener = null;
  apiViewer?.dispose();
  apiViewer = null;
  searchOverlay?.dispose();
  searchOverlay = null;
  settingsOverlay?.dispose();
  settingsOverlay = null;
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
