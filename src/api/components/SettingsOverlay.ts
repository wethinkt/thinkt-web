/**
 * SettingsOverlay Component
 *
 * A modal overlay for app settings/info panels:
 * - Dashboard (connection, stats, indexer status)
 * - Sources
 * - Apps
 */

import type {
  IndexerStatusProgressInfo,
} from '@wethinkt/ts-thinkt/api';
import { type ThinktClient, getDefaultClient } from '@wethinkt/ts-thinkt/api';
import { i18n } from '@lingui/core';
import { injectStyleSheet } from './style-manager';
import OVERLAY_STYLES from './settings-overlay-styles.css?inline';

const CLOSE_ANIMATION_MS = 150;
const INDEXER_REFRESH_INTERVAL_MS = 5000;

type OverlayTab = 'dashboard' | 'indexer' | 'sources' | 'apps' | 'auth';
type SourcesResponse = Awaited<ReturnType<ThinktClient['getSources']>>;
type SourceItem = SourcesResponse[number];
type LanguagesPayload = Awaited<ReturnType<ThinktClient['getLanguages']>>;
type AppsResponse = Awaited<ReturnType<ThinktClient['getOpenInApps']>>;
type AppItem = NonNullable<AppsResponse['apps']>[number];
type StatsPayload = Awaited<ReturnType<ThinktClient['getStats']>>;
type IndexerPayload = Awaited<ReturnType<ThinktClient['getIndexerStatus']>>;
interface ServerInfoPayload {
  authenticated?: boolean;
  fingerprint?: string;
  pid?: number;
  revision?: string;
  started_at?: string;
  uptime_seconds?: number;
  version?: string;
}
interface ProgressRenderOptions {
  includeProjects?: boolean;
  includeSessions?: boolean;
  includeChunks?: boolean;
}

export interface SettingsOverlayElements {
  container: HTMLElement;
}

export interface SettingsOverlayOptions {
  elements: SettingsOverlayElements;
  client?: ThinktClient;
  onClose?: () => void;
  onError?: (error: Error) => void;
}

export class SettingsOverlay {
  private elements: SettingsOverlayElements;
  private options: SettingsOverlayOptions;
  private client: ThinktClient;
  private overlay: HTMLElement | null = null;
  private abortController = new AbortController();
  private isOpen = false;
  private activeTab: OverlayTab = 'dashboard';
  private refreshToken = 0;
  private indexerRefreshIntervalId: ReturnType<typeof setInterval> | null = null;
  private showAuthToken = false;
  private serverAuthEnabled: boolean | null = null;

  constructor(options: SettingsOverlayOptions) {
    this.elements = options.elements;
    this.options = options;
    this.client = options.client ?? getDefaultClient();
    injectStyleSheet('thinkt-settings-overlay-styles', OVERLAY_STYLES);
  }

  open(): void {
    if (this.isOpen) return;
    this.isOpen = true;
    this.showAuthToken = false;
    this.createOverlay();
    this.attachListeners();
    this.setActiveTab('dashboard');
    this.refreshData();
  }

  close(): void {
    if (!this.isOpen || !this.overlay) return;
    this.isOpen = false;
    this.overlay.classList.add('closing');
    setTimeout(() => {
      this.cleanup();
      this.options.onClose?.();
    }, CLOSE_ANIMATION_MS);
  }

  dispose(): void {
    this.cleanup();
    this.isOpen = false;
  }

  isOpened(): boolean {
    return this.isOpen;
  }

  private cleanup(): void {
    this.stopIndexerAutoRefresh();
    this.abortController.abort();
    this.abortController = new AbortController();
    this.refreshToken += 1;
    this.serverAuthEnabled = null;
    this.overlay?.remove();
    this.overlay = null;
  }

  private createOverlay(): void {
    this.overlay = document.createElement('div');
    this.overlay.className = 'thinkt-settings-overlay';
    this.overlay.innerHTML = `
      <div class="thinkt-settings-modal" role="dialog" aria-modal="true" aria-label="${i18n._('Settings and Info')}">
        <div class="thinkt-settings-header">
          <div class="thinkt-settings-title-wrap">
            <div class="thinkt-settings-tabs" role="tablist" aria-label="${i18n._('Info Panels')}">
              <button class="thinkt-settings-tab active" data-tab="dashboard" role="tab">${i18n._('Dashboard')}</button>
              <button class="thinkt-settings-tab" data-tab="indexer" role="tab">${i18n._('Indexer')}</button>
              <button class="thinkt-settings-tab" data-tab="sources" role="tab">${i18n._('Sources')}</button>
              <button class="thinkt-settings-tab" data-tab="apps" role="tab">${i18n._('Apps')}</button>
              <button class="thinkt-settings-tab" data-tab="auth" role="tab">${i18n._('Auth')}</button>
            </div>
          </div>
          <div class="thinkt-settings-actions">
            <button id="settings-close-btn" type="button" class="thinkt-settings-close-btn" aria-label="${i18n._('Close')}" title="${i18n._('Close')} - ESC">
              &times;
            </button>
          </div>
        </div>
        <div class="thinkt-settings-body">
          <div class="thinkt-settings-panel active" data-panel="dashboard" aria-hidden="false">
            <section class="thinkt-settings-section">
              <h3>${i18n._('System Status')}</h3>
              <div id="settings-connection" class="thinkt-settings-loading">${i18n._('Checking connection...')}</div>
            </section>
            <section class="thinkt-settings-section">
              <h3>${i18n._('Usage Statistics')}</h3>
              <div id="settings-stats" class="thinkt-settings-loading">${i18n._('Loading stats...')}</div>
            </section>
          </div>

          <div class="thinkt-settings-panel" data-panel="indexer" aria-hidden="true">
            <section class="thinkt-settings-section">
              <h3>${i18n._('Indexer Status')}</h3>
              <div id="settings-indexer" class="thinkt-settings-loading">${i18n._('Loading indexer status...')}</div>
            </section>
            <section class="thinkt-settings-section">
              <h3>${i18n._('Embedding Status')}</h3>
              <div id="settings-embedding" class="thinkt-settings-loading">${i18n._('Loading embedding status...')}</div>
            </section>
          </div>

          <div class="thinkt-settings-panel" data-panel="sources" aria-hidden="true">
            <section class="thinkt-settings-section">
              <h3>${i18n._('Sources')}</h3>
              <div id="settings-sources" class="thinkt-settings-loading">${i18n._('Loading sources...')}</div>
            </section>
          </div>

          <div class="thinkt-settings-panel" data-panel="apps" aria-hidden="true">
            <section class="thinkt-settings-section">
              <h3>${i18n._('Apps')}</h3>
              <div id="settings-apps" class="thinkt-settings-loading">${i18n._('Loading apps...')}</div>
            </section>
          </div>

          <div class="thinkt-settings-panel" data-panel="auth" aria-hidden="true">
            <section class="thinkt-settings-section">
              <h3>${i18n._('API Authentication')}</h3>
              <div class="thinkt-settings-auth">
                <div class="thinkt-settings-auth-current">
                  <span class="thinkt-settings-system-key">${i18n._('Current Token')}:</span>
                  <span id="settings-auth-current" class="thinkt-settings-auth-token">${i18n._('Not set')}</span>
                  <button
                    id="settings-auth-toggle-btn"
                    type="button"
                    class="thinkt-settings-auth-toggle"
                    aria-label="${i18n._('Show token')}"
                    title="${i18n._('Show token')}"
                  >
                    ${i18n._('Show')}
                  </button>
                </div>
                <label class="thinkt-settings-auth-label" for="settings-auth-input">${i18n._('Token')}</label>
                <input
                  id="settings-auth-input"
                  class="thinkt-settings-auth-input"
                  type="password"
                  placeholder="${i18n._('Paste bearer token')}"
                  autocomplete="off"
                  spellcheck="false"
                />
                <div class="thinkt-settings-auth-actions">
                  <button id="settings-auth-save-btn" type="button" class="thinkt-settings-auth-btn">${i18n._('Save Token')}</button>
                  <button id="settings-auth-clear-btn" type="button" class="thinkt-settings-auth-btn thinkt-settings-auth-btn--danger">${i18n._('Clear Token')}</button>
                </div>
                <div id="settings-auth-status" class="thinkt-settings-muted"></div>
              </div>
            </section>
          </div>
        </div>
      </div>
    `;

    this.elements.container.appendChild(this.overlay);
    this.syncClientTokenFromUrlIfNeeded();
    this.renderAuthState();
  }

  private attachListeners(): void {
    if (!this.overlay) return;
    this.abortController.signal.addEventListener('abort', () => {
      this.stopIndexerAutoRefresh();
    }, { once: true });

    this.overlay.addEventListener('click', (e: MouseEvent) => {
      if (e.target === this.overlay) this.close();
    }, { signal: this.abortController.signal });

    const closeBtn = this.overlay.querySelector<HTMLButtonElement>('#settings-close-btn');
    closeBtn?.addEventListener('click', () => this.close(), { signal: this.abortController.signal });

    const saveTokenBtn = this.overlay.querySelector<HTMLButtonElement>('#settings-auth-save-btn');
    saveTokenBtn?.addEventListener('click', () => {
      void this.handleSaveToken();
    }, { signal: this.abortController.signal });

    const clearTokenBtn = this.overlay.querySelector<HTMLButtonElement>('#settings-auth-clear-btn');
    clearTokenBtn?.addEventListener('click', () => this.handleClearToken(), { signal: this.abortController.signal });

    const toggleTokenBtn = this.overlay.querySelector<HTMLButtonElement>('#settings-auth-toggle-btn');
    toggleTokenBtn?.addEventListener('click', () => {
      this.showAuthToken = !this.showAuthToken;
      this.renderAuthState();
    }, { signal: this.abortController.signal });

    const tabs = this.overlay.querySelectorAll<HTMLButtonElement>('.thinkt-settings-tab');
    tabs.forEach((tabBtn) => {
      tabBtn.addEventListener('click', () => {
        const tab = tabBtn.dataset.tab as OverlayTab | undefined;
        if (!tab) return;
        this.setActiveTab(tab);
      }, { signal: this.abortController.signal });
    });

    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
      }
    }, { signal: this.abortController.signal });
  }

  private setActiveTab(tab: OverlayTab): void {
    if (!this.overlay) return;
    this.activeTab = tab;

    this.overlay.querySelectorAll<HTMLElement>('.thinkt-settings-panel').forEach((panel) => {
      const isActive = panel.dataset.panel === this.activeTab;
      panel.classList.toggle('active', isActive);
      panel.setAttribute('aria-hidden', isActive ? 'false' : 'true');
    });

    this.overlay.querySelectorAll<HTMLElement>('.thinkt-settings-tab').forEach((tabBtn) => {
      const isActive = tabBtn.dataset.tab === this.activeTab;
      tabBtn.classList.toggle('active', isActive);
      tabBtn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    if (this.activeTab === 'indexer') {
      this.refreshIndexerPanel();
      this.startIndexerAutoRefresh();
    } else {
      this.stopIndexerAutoRefresh();
    }
  }

  private refreshData(): void {
    if (!this.overlay || !this.isOpen) return;

    const token = ++this.refreshToken;
    this.setLoadingStates();
    this.renderAuthState();

    const signal = this.abortController.signal;
    const sourcesPromise = this.client.getSources();
    const languagesPromise = this.client.getLanguages();
    const infoPromise = this.fetchServerInfo(signal);
    const statsPromise = this.client.getStats();
    const indexerPromise = this.client.getIndexerStatus();
    const appsPromise = this.client.getOpenInApps();

    void Promise.allSettled([
      this.renderDashboard(token, sourcesPromise, languagesPromise, infoPromise, statsPromise),
      this.renderIndexer(token, indexerPromise),
      this.renderSources(token, sourcesPromise),
      this.renderApps(token, appsPromise),
    ]);
  }

  private setLoadingStates(): void {
    this.setContent('settings-connection', `<div class="thinkt-settings-loading">${i18n._('Checking connection...')}</div>`);
    this.setContent('settings-stats', `<div class="thinkt-settings-loading">${i18n._('Loading stats...')}</div>`);
    this.setContent('settings-indexer', `<div class="thinkt-settings-loading">${i18n._('Loading indexer status...')}</div>`);
    this.setContent('settings-embedding', `<div class="thinkt-settings-loading">${i18n._('Loading embedding status...')}</div>`);
    this.setContent('settings-sources', `<div class="thinkt-settings-loading">${i18n._('Loading sources...')}</div>`);
    this.setContent('settings-apps', `<div class="thinkt-settings-loading">${i18n._('Loading apps...')}</div>`);
  }

  private async renderDashboard(
    token: number,
    sourcesPromise: Promise<SourcesResponse>,
    languagesPromise: Promise<LanguagesPayload>,
    infoPromise: Promise<ServerInfoPayload>,
    statsPromise: Promise<StatsPayload>,
  ): Promise<void> {
    const [connResult, languagesResult, infoResult, statsResult] = await Promise.allSettled([
      sourcesPromise,
      languagesPromise,
      infoPromise,
      statsPromise,
    ]);

    if (this.isStale(token)) return;

    const serverHostPort = this.getServerHostPort();
    const info = infoResult.status === 'fulfilled' ? infoResult.value : undefined;
    this.serverAuthEnabled = info?.authenticated ?? null;
    this.renderAuthState();
    const fingerprintValue = info?.fingerprint ?? i18n._('Unavailable');
    const versionValue = info?.version ?? i18n._('Unavailable');
    const revisionValue = this.formatRevision(info?.revision);
    const languageValue = languagesResult.status === 'fulfilled'
      ? this.formatLanguage(languagesResult.value)
      : i18n._('Unavailable');
    const startedAtValue = this.formatDateTime(info?.started_at);
    const uptimeValue = this.formatUptime(info?.uptime_seconds);
    const pidValue = info?.pid !== undefined ? this.formatNumber(info.pid) : i18n._('Unavailable');
    const authValue = info?.authenticated === undefined
      ? i18n._('Unavailable')
      : (info.authenticated ? i18n._('Enabled') : i18n._('Disabled'));
    const infoErrorMessage = infoResult.status === 'rejected'
      ? this.escapeHtml(this.toError(infoResult.reason).message)
      : null;
    const infoErrorHtml = infoErrorMessage
      ? `
        <div class="thinkt-settings-system-detail">
          <span class="thinkt-settings-system-key">${i18n._('Server Info')}:</span>
          <span>${i18n._('Unavailable')} (${infoErrorMessage})</span>
        </div>
      `
      : '';
    const connectionMeta = connResult.status === 'fulfilled'
      ? i18n._('Sources endpoint reachable')
      : this.escapeHtml(this.toError(connResult.reason).message);
    const connectionStatusClass = connResult.status === 'fulfilled'
      ? 'thinkt-settings-status--online'
      : 'thinkt-settings-status--offline';
    const connectionStatusLabel = connResult.status === 'fulfilled'
      ? i18n._('Online')
      : i18n._('Offline');
    const connectionDetailsHtml = `
      <div class="thinkt-settings-system-detail">
        <span class="thinkt-settings-system-key">${i18n._('Server')}:</span>
        <span>${this.escapeHtml(serverHostPort)}</span>
      </div>
    `;
    const thinktInfoDetailsHtml = `
      <div class="thinkt-settings-system-detail">
        <span class="thinkt-settings-system-key">${i18n._('Version')}:</span>
        <span>${this.escapeHtml(versionValue)}</span>
      </div>
      <div class="thinkt-settings-system-detail">
        <span class="thinkt-settings-system-key">${i18n._('Revision')}:</span>
        <span>${this.escapeHtml(revisionValue)}</span>
      </div>
      <div class="thinkt-settings-system-detail">
        <span class="thinkt-settings-system-key">${i18n._('Language')}:</span>
        <span>${this.escapeHtml(languageValue)}</span>
      </div>
      <div class="thinkt-settings-system-detail">
        <span class="thinkt-settings-system-key">${i18n._('Fingerprint')}:</span>
        <span>${this.escapeHtml(fingerprintValue)}</span>
      </div>
    `;
    const infoDetailsHtml = `
      <div class="thinkt-settings-system-detail">
        <span class="thinkt-settings-system-key">${i18n._('Started At')}:</span>
        <span>${this.escapeHtml(startedAtValue)}</span>
      </div>
      <div class="thinkt-settings-system-detail">
        <span class="thinkt-settings-system-key">${i18n._('Server Uptime')}:</span>
        <span>${this.escapeHtml(uptimeValue)}</span>
      </div>
      <div class="thinkt-settings-system-detail">
        <span class="thinkt-settings-system-key">${i18n._('PID')}:</span>
        <span>${this.escapeHtml(pidValue)}</span>
      </div>
      <div class="thinkt-settings-system-detail">
        <span class="thinkt-settings-system-key">${i18n._('Auth')}:</span>
        <span>${this.escapeHtml(authValue)}</span>
      </div>
      ${infoErrorHtml}
    `;

    if (connResult.status === 'fulfilled') {
      this.setContent('settings-connection', `
        <div class="thinkt-settings-system-grid">
          <div class="thinkt-settings-list-item">
            <div class="thinkt-settings-list-content">
              <div class="thinkt-settings-list-title">${i18n._('thinkt Info')}</div>
              ${thinktInfoDetailsHtml}
            </div>
          </div>
          <div class="thinkt-settings-list-item">
            <div class="thinkt-settings-list-content">
              <div class="thinkt-settings-list-title">${i18n._('API Connection')}</div>
              <div class="thinkt-settings-list-meta">${connectionMeta}</div>
              ${connectionDetailsHtml}
            </div>
            <div class="thinkt-settings-status ${connectionStatusClass}">${connectionStatusLabel}</div>
          </div>
          <div class="thinkt-settings-list-item">
            <div class="thinkt-settings-list-content">
              <div class="thinkt-settings-list-title">${i18n._('Server Info')}</div>
              ${infoDetailsHtml}
            </div>
          </div>
        </div>
      `);
    } else {
      const error = this.toError(connResult.reason);
      this.setContent('settings-connection', `
        <div class="thinkt-settings-system-grid">
          <div class="thinkt-settings-list-item">
            <div class="thinkt-settings-list-content">
              <div class="thinkt-settings-list-title">${i18n._('thinkt Info')}</div>
              ${thinktInfoDetailsHtml}
            </div>
          </div>
          <div class="thinkt-settings-list-item">
            <div class="thinkt-settings-list-content">
              <div class="thinkt-settings-list-title">${i18n._('API Connection')}</div>
              <div class="thinkt-settings-list-meta">${connectionMeta}</div>
              ${connectionDetailsHtml}
            </div>
            <div class="thinkt-settings-status ${connectionStatusClass}">${connectionStatusLabel}</div>
          </div>
          <div class="thinkt-settings-list-item">
            <div class="thinkt-settings-list-content">
              <div class="thinkt-settings-list-title">${i18n._('Server Info')}</div>
              ${infoDetailsHtml}
            </div>
          </div>
        </div>
      `);
      this.options.onError?.(error);
    }

    if (infoResult.status === 'rejected') {
      this.options.onError?.(this.toError(infoResult.reason));
    }
    if (languagesResult.status === 'rejected') {
      this.options.onError?.(this.toError(languagesResult.reason));
    }

    if (statsResult.status === 'fulfilled') {
      this.setContent('settings-stats', this.renderStats(statsResult.value));
    } else {
      const error = this.toError(statsResult.reason);
      this.setContent('settings-stats', `<div class="thinkt-settings-error">${i18n._('Failed to load stats: {message}', { message: this.escapeHtml(error.message) })}</div>`);
      this.options.onError?.(error);
    }

  }

  private async renderIndexer(token: number, indexerPromise: Promise<IndexerPayload>): Promise<void> {
    const [indexerResult] = await Promise.allSettled([indexerPromise]);
    if (this.isStale(token)) return;

    if (indexerResult.status === 'fulfilled') {
      this.setContent('settings-indexer', this.renderIndexerStatus(indexerResult.value));
      this.setContent('settings-embedding', this.renderEmbeddingStatus(indexerResult.value));
      return;
    }

    const error = this.toError(indexerResult.reason);
    this.setContent('settings-indexer', `<div class="thinkt-settings-muted">${i18n._('Indexer status unavailable: {message}', { message: this.escapeHtml(error.message) })}</div>`);
    this.setContent('settings-embedding', `<div class="thinkt-settings-muted">${i18n._('Embedding status unavailable: {message}', { message: this.escapeHtml(error.message) })}</div>`);
    this.options.onError?.(error);
  }

  private refreshIndexerPanel(): void {
    if (!this.isOpen || !this.overlay) return;
    const token = this.refreshToken;
    const indexerPromise = this.client.getIndexerStatus();
    void this.renderIndexer(token, indexerPromise);
  }

  private startIndexerAutoRefresh(): void {
    if (this.indexerRefreshIntervalId !== null) return;
    this.indexerRefreshIntervalId = setInterval(() => {
      this.refreshIndexerPanel();
    }, INDEXER_REFRESH_INTERVAL_MS);
  }

  private stopIndexerAutoRefresh(): void {
    if (this.indexerRefreshIntervalId === null) return;
    clearInterval(this.indexerRefreshIntervalId);
    this.indexerRefreshIntervalId = null;
  }

  private async renderSources(token: number, sourcesPromise: Promise<SourcesResponse>): Promise<void> {
    const result = await Promise.allSettled([sourcesPromise]);
    if (this.isStale(token)) return;

    const sourcesResult = result[0];
    if (sourcesResult.status === 'rejected') {
      const error = this.toError(sourcesResult.reason);
      this.setContent('settings-sources', `<div class="thinkt-settings-error">${i18n._('Failed to load sources: {message}', { message: this.escapeHtml(error.message) })}</div>`);
      this.options.onError?.(error);
      return;
    }

    const sources = sourcesResult.value;
    if (sources.length === 0) {
      this.setContent('settings-sources', `<div class="thinkt-settings-muted">${i18n._('No sources found.')}</div>`);
      return;
    }

    this.setContent('settings-sources', `
      <div class="thinkt-settings-list">
        ${sources.map((source) => this.renderSourceItem(source)).join('')}
      </div>
    `);
  }

  private async renderApps(token: number, appsPromise: Promise<AppsResponse>): Promise<void> {
    const result = await Promise.allSettled([appsPromise]);
    if (this.isStale(token)) return;

    const appsResult = result[0];
    if (appsResult.status === 'rejected') {
      const error = this.toError(appsResult.reason);
      this.setContent('settings-apps', `<div class="thinkt-settings-error">${i18n._('Failed to load apps: {message}', { message: this.escapeHtml(error.message) })}</div>`);
      this.options.onError?.(error);
      return;
    }

    const response = appsResult.value;
    const apps = response.apps ?? [];
    const defaultTerminal = response.default_terminal;

    if (apps.length === 0) {
      this.setContent('settings-apps', `<div class="thinkt-settings-muted">${i18n._('No apps configured.')}</div>`);
      return;
    }

    const defaultTerminalHtml = defaultTerminal
      ? `<div class="thinkt-settings-note">${i18n._('Default terminal: {app}', { app: this.escapeHtml(defaultTerminal) })}</div>`
      : '';

    this.setContent('settings-apps', `
      ${defaultTerminalHtml}
      <div class="thinkt-settings-list">
        ${apps.map((app) => this.renderAppItem(app, defaultTerminal)).join('')}
      </div>
    `);
  }

  private renderStats(stats: StatsPayload): string {
    const topTools = [...(stats.top_tools ?? [])]
      .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
      .slice(0, 10);

    const cards = [
      { label: i18n._('Sessions'), value: this.formatNumber(stats.total_sessions) },
      { label: i18n._('Projects'), value: this.formatNumber(stats.total_projects) },
      { label: i18n._('Entries'), value: this.formatNumber(stats.total_entries) },
      { label: i18n._('Total Tokens'), value: this.formatNumber(stats.total_tokens) },
    ];

    const topToolsHtml = topTools.length > 0
      ? `
        <div class="thinkt-settings-subtitle">${i18n._('Top Tools Used')}</div>
        <div class="thinkt-settings-tools">
          ${topTools.map((tool) => {
            const max = topTools[0]?.count ?? 1;
            const pct = Math.round(((tool.count ?? 0) / max) * 100);
            return `
              <div class="thinkt-settings-tool-row">
                <div class="thinkt-settings-tool-name">${this.escapeHtml(tool.name ?? '—')}</div>
                <div class="thinkt-settings-tool-bar">
                  <div class="thinkt-settings-tool-fill" style="width: ${pct}%"></div>
                </div>
                <div class="thinkt-settings-tool-count">${this.formatNumber(tool.count)}</div>
              </div>
            `;
          }).join('')}
        </div>
      `
      : `<div class="thinkt-settings-muted">${i18n._('No tool usage yet.')}</div>`;

    return `
      <div class="thinkt-settings-stat-grid">
        ${cards.map((card) => `
          <div class="thinkt-settings-stat-card">
            <div class="thinkt-settings-stat-label">${card.label}</div>
            <div class="thinkt-settings-stat-value">${card.value}</div>
          </div>
        `).join('')}
      </div>
      ${topToolsHtml}
    `;
  }

  private renderIndexerStatus(status: IndexerPayload): string {
    const running = status.running === true;
    const stateLabel = status.state ?? (running ? i18n._('Running') : i18n._('Idle'));
    const stateClass = running ? 'thinkt-settings-status--online' : 'thinkt-settings-status--idle';
    const watching = status.watching ? i18n._('Yes') : i18n._('No');
    const syncHtml = this.renderProgressInfo(i18n._('Sync Progress'), status.sync_progress, {
      includeProjects: true,
      includeSessions: true,
    });

    return `
      <div class="thinkt-settings-stat-grid thinkt-settings-stat-grid--indexer">
        <div class="thinkt-settings-stat-card">
          <div class="thinkt-settings-stat-label">${i18n._('Uptime')}</div>
          <div class="thinkt-settings-stat-value">${this.formatUptime(status.uptime_seconds)}</div>
        </div>
        <div class="thinkt-settings-stat-card">
          <div class="thinkt-settings-stat-label">${i18n._('Watching')}</div>
          <div class="thinkt-settings-stat-value">${watching}</div>
        </div>
        <div class="thinkt-settings-stat-card">
          <div class="thinkt-settings-stat-label">${i18n._('State')}</div>
          <div class="thinkt-settings-stat-value"><span class="thinkt-settings-status ${stateClass}">${this.escapeHtml(stateLabel)}</span></div>
        </div>
      </div>
      ${syncHtml}
      ${!syncHtml ? `<div class="thinkt-settings-muted">${i18n._('No active sync in progress.')}</div>` : ''}
    `;
  }

  private renderEmbeddingStatus(status: IndexerPayload): string {
    const hasModel = typeof status.model === 'string' && status.model.trim().length > 0;
    const isEmbeddingRunning = (status.state ?? '').includes('embedding') || status.embed_progress !== undefined;
    const embeddingStatusLabel = isEmbeddingRunning
      ? i18n._('Running')
      : (hasModel ? i18n._('Enabled') : i18n._('Not loaded'));
    const embeddingStatusClass = isEmbeddingRunning
      ? 'thinkt-settings-status--online'
      : (hasModel ? 'thinkt-settings-status--idle' : 'thinkt-settings-status--offline');
    const modelValue = hasModel ? this.escapeHtml(status.model ?? '') : this.escapeHtml(i18n._('Not loaded'));
    const modelMeta = status.model_dim !== undefined
      ? `${status.model_dim}d`
      : i18n._('No dimension reported');
    const embedHtml = this.renderProgressInfo(i18n._('Embedding Progress'), status.embed_progress, {
      includeSessions: true,
      includeChunks: true,
    });

    return `
      <div class="thinkt-settings-stat-grid thinkt-settings-stat-grid--embedding">
        <div class="thinkt-settings-stat-card">
          <div class="thinkt-settings-stat-label">${i18n._('Model')}</div>
          <div class="thinkt-settings-stat-value">${modelValue}</div>
          <div class="thinkt-settings-stat-meta">${this.escapeHtml(modelMeta)}</div>
        </div>
        <div class="thinkt-settings-stat-card">
          <div class="thinkt-settings-stat-label">${i18n._('Status')}</div>
          <div class="thinkt-settings-stat-value"><span class="thinkt-settings-status ${embeddingStatusClass}">${this.escapeHtml(embeddingStatusLabel)}</span></div>
        </div>
      </div>
      ${embedHtml}
      ${!embedHtml ? `<div class="thinkt-settings-muted">${i18n._('No active embedding in progress.')}</div>` : ''}
    `;
  }

  private renderProgressInfo(
    title: string,
    progress: IndexerStatusProgressInfo | undefined,
    options: ProgressRenderOptions = {},
  ): string {
    if (!progress) return '';

    const projectBar = options.includeProjects
      ? this.renderLabeledProgressBar(i18n._('Projects'), progress.project, progress.project_total)
      : '';
    const sessionBar = options.includeSessions
      ? this.renderLabeledProgressBar(i18n._('Sessions'), progress.done, progress.total)
      : '';
    const chunkBar = options.includeChunks
      ? this.renderLabeledProgressBar(i18n._('Chunks'), progress.chunks_done, progress.chunks_total)
      : '';
    const fallbackBar = !projectBar && !sessionBar && !chunkBar
      ? this.renderLabeledProgressBar(i18n._('Sessions'), progress.done ?? progress.chunks_done, progress.total ?? progress.chunks_total)
      : '';
    const message = progress.message ? `<div class="thinkt-settings-progress-msg">${this.escapeHtml(progress.message)}</div>` : '';
    const meta = progress.project_name
      ? `<div class="thinkt-settings-progress-meta">${i18n._('Project: {projectName}', { projectName: this.escapeHtml(progress.project_name) })}</div>`
      : '';
    const bars = `${projectBar}${sessionBar}${chunkBar}${fallbackBar}`;

    return `
      <div class="thinkt-settings-progress-section">
        <div class="thinkt-settings-subtitle">${this.escapeHtml(title)}</div>
        ${message}
        ${bars}
        ${meta}
      </div>
    `;
  }

  private renderLabeledProgressBar(label: string, done?: number, total?: number): string {
    if (done === undefined || total === undefined || total <= 0) return '';

    const pct = Math.min(100, Math.round((done / total) * 100));
    return `
      <div class="thinkt-settings-progress">
        <div class="thinkt-settings-progress-label">${this.escapeHtml(label)}</div>
        <div class="thinkt-settings-progress-row">
          <span>${this.formatNumber(done)} / ${this.formatNumber(total)}</span>
          <span>${pct}%</span>
        </div>
        <div class="thinkt-settings-progress-track">
          <div class="thinkt-settings-progress-fill" style="width: ${pct}%"></div>
        </div>
      </div>
    `;
  }

  private renderSourceItem(source: SourceItem): string {
    const name = source.name ?? i18n._('Unknown');
    const basePath = source.base_path ?? '';
    const canResume = source.can_resume === true;
    const isOffline = source.available === false;
    const sourceBadgeClass = this.getSourceBadgeClass(name);
    const statusClass = isOffline ? 'thinkt-settings-status--offline' : 'thinkt-settings-status--online';
    const statusLabel = isOffline ? i18n._('Offline') : i18n._('Online');

    return `
      <div class="thinkt-settings-list-item">
        <div class="thinkt-settings-list-content">
          <div class="thinkt-settings-list-title">
            <span class="thinkt-settings-badge thinkt-settings-badge--source ${sourceBadgeClass}">${this.escapeHtml(name)}</span>
          </div>
          <div class="thinkt-settings-list-meta">${this.escapeHtml(basePath)}</div>
        </div>
        <div class="thinkt-settings-list-badges">
          ${canResume ? `<span class="thinkt-settings-badge">${i18n._('Resumable')}</span>` : ''}
          <span class="thinkt-settings-status ${statusClass}">${statusLabel}</span>
        </div>
      </div>
    `;
  }

  private renderAppItem(app: AppItem, defaultTerminal?: string): string {
    const name = app.name ?? app.id ?? i18n._('Unknown');
    const id = app.id ?? '';
    const isTerminal = app.terminal === true;
    const isDefaultTerminal = isTerminal && defaultTerminal !== undefined && id === defaultTerminal;
    const enabled = app.enabled !== false;

    return `
      <div class="thinkt-settings-list-item">
        <div class="thinkt-settings-list-content">
          <div class="thinkt-settings-list-title">
            ${this.escapeHtml(name)}
            ${isTerminal ? `<span class="thinkt-settings-badge thinkt-settings-badge--terminal">${i18n._('terminal')}</span>` : ''}
            ${isDefaultTerminal ? `<span class="thinkt-settings-badge thinkt-settings-badge--default">${i18n._('default')}</span>` : ''}
          </div>
          <div class="thinkt-settings-list-meta">${this.escapeHtml(id)} · ${enabled ? i18n._('enabled') : i18n._('disabled')}</div>
        </div>
      </div>
    `;
  }

  private setContent(id: string, html: string): void {
    const element = this.overlay?.querySelector<HTMLElement>(`#${id}`);
    if (element) element.innerHTML = html;
  }

  private isStale(token: number): boolean {
    return !this.isOpen || !this.overlay || token !== this.refreshToken;
  }

  private formatNumber(num?: number): string {
    if (num === undefined) return '\u2014';
    return num.toLocaleString();
  }

  private formatUptime(seconds?: number): string {
    if (seconds === undefined) return '\u2014';
    if (seconds < 60) return `${seconds}s`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }

  private toError(error: unknown): Error {
    if (error instanceof Error) return error;
    return new Error(typeof error === 'string' ? error : i18n._('Unknown error'));
  }

  private getServerHostPort(): string {
    const baseUrl = this.client.getConfig().baseUrl;
    try {
      const url = new URL(baseUrl);
      if (url.port) return `${url.hostname}:${url.port}`;
      return url.hostname;
    } catch {
      return baseUrl.replace(/^https?:\/\//, '');
    }
  }

  private formatDateTime(value?: string): string {
    if (!value) return '\u2014';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  }

  private formatRevision(revision?: string): string {
    if (!revision) return '\u2014';
    return revision.length > 7 ? revision.slice(0, 7) : revision;
  }

  private formatLanguage(payload: LanguagesPayload): string {
    const active = typeof payload.active === 'string' ? payload.active.trim() : '';
    if (active.length > 0) return active;
    const activeLanguage = payload.languages?.find((lang) => lang.active === true);
    const activeTag = typeof activeLanguage?.tag === 'string' ? activeLanguage.tag.trim() : '';
    if (activeTag.length > 0) return activeTag;
    return '\u2014';
  }

  private async fetchServerInfo(signal?: AbortSignal): Promise<ServerInfoPayload> {
    const maybeClient = this.client as ThinktClient & {
      getInfo?: () => Promise<ServerInfoPayload>;
      api?: { getInfo?: () => Promise<ServerInfoPayload> };
    };

    if (typeof maybeClient.getInfo === 'function') {
      return maybeClient.getInfo();
    }

    if (maybeClient.api && typeof maybeClient.api.getInfo === 'function') {
      return maybeClient.api.getInfo();
    }

    const { baseUrl, apiVersion, token, fetch: customFetch } = this.client.getConfig();
    const fetchImpl = customFetch ?? fetch;
    const url = `${baseUrl}${apiVersion}/info`;
    const headers: Record<string, string> = {};
    if (token && token.trim().length > 0) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetchImpl(url, {
      method: 'GET',
      headers,
      signal,
    });

    if (!response.ok) {
      throw new Error(i18n._('Failed to load server info: HTTP {status}', { status: response.status }));
    }

    const payload = await response.json();
    if (!payload || typeof payload !== 'object') {
      throw new Error(i18n._('Invalid server info response'));
    }

    return payload as ServerInfoPayload;
  }

  private renderAuthState(statusMessage?: string): void {
    if (!this.overlay) return;

    const token = this.getEffectiveToken();
    const hasToken = typeof token === 'string' && token.length > 0;
    const hasInjectedToken = !hasToken && this.serverAuthEnabled === true;
    const currentEl = this.overlay.querySelector<HTMLElement>('#settings-auth-current');
    if (currentEl) {
      currentEl.textContent = hasToken
        ? (this.showAuthToken ? token : this.maskToken(token))
        : (hasInjectedToken ? i18n._('Set (injected)') : i18n._('Not set'));
    }

    const inputEl = this.overlay.querySelector<HTMLInputElement>('#settings-auth-input');
    if (inputEl) {
      inputEl.value = token ?? '';
    }

    const toggleEl = this.overlay.querySelector<HTMLButtonElement>('#settings-auth-toggle-btn');
    if (toggleEl) {
      toggleEl.disabled = !hasToken;
      if (!hasToken) {
        toggleEl.textContent = i18n._('Show');
        toggleEl.setAttribute('aria-label', i18n._('Show token'));
        toggleEl.setAttribute('title', i18n._('Show token'));
      } else if (this.showAuthToken) {
        toggleEl.textContent = i18n._('Hide');
        toggleEl.setAttribute('aria-label', i18n._('Hide token'));
        toggleEl.setAttribute('title', i18n._('Hide token'));
      } else {
        toggleEl.textContent = i18n._('Show');
        toggleEl.setAttribute('aria-label', i18n._('Show token'));
        toggleEl.setAttribute('title', i18n._('Show token'));
      }
    }

    const statusEl = this.overlay.querySelector<HTMLElement>('#settings-auth-status');
    if (statusEl) {
      const passiveStatusMessage = hasInjectedToken
        ? i18n._('Token is provided by the runtime and cannot be displayed in the browser.')
        : '';
      const message = statusMessage ?? passiveStatusMessage;
      statusEl.textContent = message;
      statusEl.className = message ? 'thinkt-settings-note' : 'thinkt-settings-muted';
    }
  }

  private async handleSaveToken(): Promise<void> {
    if (!this.overlay) return;

    const inputEl = this.overlay.querySelector<HTMLInputElement>('#settings-auth-input');
    if (!inputEl) return;
    const nextToken = inputEl.value.trim();

    this.showAuthToken = false;
    this.client.setConfig({ token: nextToken.length > 0 ? nextToken : undefined });
    this.updateTokenHash(nextToken.length > 0 ? nextToken : null);
    this.renderAuthState(i18n._('Auth token updated.'));
    this.refreshData();
  }

  private handleClearToken(): void {
    this.showAuthToken = false;
    this.client.setConfig({ token: undefined });
    this.updateTokenHash(null);
    this.renderAuthState(i18n._('Auth token cleared.'));
    this.refreshData();
  }

  private updateTokenHash(token: string | null): void {
    if (typeof window === 'undefined') return;

    const hash = window.location.hash.replace(/^#/, '');
    const params = new URLSearchParams(hash);
    if (token) {
      params.set('token', token);
    } else {
      params.delete('token');
    }

    const nextHash = params.toString();
    const nextUrl = `${window.location.pathname}${window.location.search}${nextHash ? `#${nextHash}` : ''}`;
    window.history.replaceState(null, '', nextUrl);
  }

  private maskToken(token: string): string {
    const thinktTokenMatch = /^thinkt_(\d{8})_(.+)$/.exec(token);
    if (thinktTokenMatch) {
      const created = thinktTokenMatch[1];
      const tail = token.slice(-4);
      return `thinkt_${created}_\u2022\u2022\u2022\u2022${tail}`;
    }

    if (token.length <= 8) {
      return token;
    }
    return `${token.slice(0, 4)}\u2022\u2022\u2022\u2022${token.slice(-4)}`;
  }

  private getEffectiveToken(): string | null {
    const configToken = this.client.getConfig().token;
    if (configToken && configToken.trim().length > 0) {
      return configToken;
    }

    if (typeof window === 'undefined') return null;
    const hash = window.location.hash.replace(/^#/, '');
    const fromHash = new URLSearchParams(hash).get('token');
    if (fromHash && fromHash.trim().length > 0) {
      return fromHash;
    }

    const fromQuery = new URLSearchParams(window.location.search).get('token');
    if (fromQuery && fromQuery.trim().length > 0) {
      return fromQuery;
    }

    return null;
  }

  private syncClientTokenFromUrlIfNeeded(): void {
    const configToken = this.client.getConfig().token;
    if (configToken && configToken.trim().length > 0) return;

    const urlToken = this.getEffectiveToken();
    if (urlToken && urlToken.trim().length > 0) {
      this.client.setConfig({ token: urlToken });
    }
  }

  private getSourceBadgeClass(sourceName: string): string {
    const source = sourceName.trim().toLowerCase();
    if (source === 'claude') return 'thinkt-settings-badge--source-claude';
    if (source === 'kimi') return 'thinkt-settings-badge--source-kimi';
    if (source === 'gemini') return 'thinkt-settings-badge--source-gemini';
    if (source === 'copilot') return 'thinkt-settings-badge--source-copilot';
    if (source === 'codex') return 'thinkt-settings-badge--source-codex';
    if (source === 'qwen') return 'thinkt-settings-badge--source-qwen';
    if (source === 'thinkt') return 'thinkt-settings-badge--source-thinkt';
    return 'thinkt-settings-badge--source-other';
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
