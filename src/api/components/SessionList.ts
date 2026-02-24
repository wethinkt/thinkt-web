/**
 * SessionList Component
 *
 * A standalone component for listing sessions within a project.
 * Can be embedded in the main viewer or used independently.
 */

import type { SessionMeta } from '@wethinkt/ts-thinkt';
import { type ThinktClient, getDefaultClient } from '@wethinkt/ts-thinkt/api';
import { i18n } from '@lingui/core';
import { injectStyleSheet } from './style-manager';
import DEFAULT_STYLES from './session-list-styles.css?inline';

// ============================================
// Constants
// ============================================

const SESSION_TITLE_MAX_LENGTH = 80;

// ============================================
// Types
// ============================================

export interface SessionListElements {
  /** Container element */
  container: HTMLElement;
  /** Search input (optional) */
  searchInput?: HTMLInputElement;
  /** Sort select (optional) */
  sortSelect?: HTMLSelectElement;
  /** Loading indicator (optional) */
  loadingIndicator?: HTMLElement;
  /** Error display (optional) */
  errorDisplay?: HTMLElement;
}

export interface SessionListOptions {
  elements: SessionListElements;
  /** API client instance (defaults to getDefaultClient()) */
  client?: ThinktClient;
  /** Project ID to load sessions from */
  projectId?: string;
  /** Source for source-scoped project lookups */
  projectSource?: string;
  /** Callback when a session is selected */
  onSessionSelect?: (session: SessionMeta) => void;
  /** Callback when sessions are loaded */
  onSessionsLoaded?: (sessions: SessionMeta[]) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Custom renderer for session items */
  sessionRenderer?: (session: SessionMeta, index: number) => HTMLElement;
  /** Enable search filtering */
  enableSearch?: boolean;
  /** Custom CSS class prefix */
  classPrefix?: string;
  /** Date format locale (default: 'en-US') */
  dateLocale?: string;
  /** Show entry count */
  showEntryCount?: boolean;
  /** Show file size */
  showFileSize?: boolean;
  /** Show model info */
  showModel?: boolean;
}

export type SessionSortMode = 'date_desc' | 'date_asc';

// ============================================
// Utility Functions
// ============================================

function formatRelativeTime(date: Date | string | undefined): string {
  if (!date) return i18n._('Unknown');
  try {
    const d = date instanceof Date ? date : new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffSecs < 60) return i18n._('just now');
    if (diffMins < 60) return i18n._('{count}m ago', { count: diffMins });
    if (diffHours < 24) return i18n._('{count}h ago', { count: diffHours });
    if (diffDays < 7) return i18n._('{count}d ago', { count: diffDays });
    if (diffWeeks < 4) return i18n._('{count}w ago', { count: diffWeeks });
    if (diffMonths < 12) return i18n._('{count}mo ago', { count: diffMonths });
    return i18n._('{count}y ago', { count: diffYears });
  } catch {
    return i18n._('Invalid');
  }
}



function formatNumber(num: number | undefined): string {
  if (num === undefined || num === null) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toString();
}

// ============================================
// Component Class
// ============================================

export class SessionList {
  private elements: SessionListElements;
  private options: Required<Pick<SessionListOptions, 'enableSearch' | 'classPrefix' | 'dateLocale' | 'showEntryCount' | 'showFileSize' | 'showModel'>> &
    Omit<SessionListOptions, 'enableSearch' | 'classPrefix' | 'dateLocale' | 'showEntryCount' | 'showFileSize' | 'showModel'>;
  private client: ThinktClient;
  private sessions: SessionMeta[] = [];
  private filteredSessions: SessionMeta[] = [];
  private sortMode: SessionSortMode = 'date_desc';
  private selectedIndex = -1;
  private loadController: AbortController | null = null;
  private itemElements: Map<string, HTMLElement> = new Map();
  private currentError: Error | null = null;
  private abortController = new AbortController();
  private disposed = false;

  constructor(options: SessionListOptions) {
    this.elements = options.elements;
    this.options = {
      ...options,
      enableSearch: options.enableSearch ?? true,
      classPrefix: options.classPrefix ?? 'thinkt-session-list',
      dateLocale: options.dateLocale ?? 'en-US',
      showEntryCount: options.showEntryCount ?? true,
      showFileSize: options.showFileSize ?? true,
      showModel: options.showModel ?? true,
    };

    this.client = options.client ?? getDefaultClient();

    void this.init();
  }

  // ============================================
  // Initialization
  // ============================================

  private async init(): Promise<void> {
    injectStyleSheet('thinkt-session-list-styles', DEFAULT_STYLES);
    this.createStructure();
    this.attachListeners();

    window.addEventListener('thinkt:locale-changed', () => this.refreshI18n(), { signal: this.abortController.signal });

    if (this.options.projectId) {
      await this.loadSessions(this.options.projectId, this.options.projectSource);
    }
  }

  private createStructure(): void {
    const { container } = this.elements;
    const { classPrefix } = this.options;

    container.className = classPrefix;
    container.replaceChildren();

    // Header
    const header = document.createElement('div');
    header.className = `${classPrefix}__header`;

    if (this.options.enableSearch) {
      const controls = document.createElement('div');
      controls.className = `${classPrefix}__controls`;

      const searchInput = this.elements.searchInput ?? document.createElement('input');
      searchInput.className = `${classPrefix}__search`;
      searchInput.type = 'text';
      searchInput.placeholder = i18n._('Filter sessions...');
      if (!this.elements.searchInput) {
        this.elements.searchInput = searchInput;
      }

      const sortSelect = this.elements.sortSelect ?? document.createElement('select');
      sortSelect.className = `${classPrefix}__sort`;
      if (!this.elements.sortSelect) {
        this.elements.sortSelect = sortSelect;
      }
      this.renderSortOptions();

      controls.appendChild(searchInput);
      controls.appendChild(sortSelect);
      header.appendChild(controls);
    }

    const stats = document.createElement('div');
    stats.className = `${classPrefix}__stats`;
    stats.textContent = this.options.projectId ? i18n._('Loading...') : i18n._('Select a project');
    header.appendChild(stats);

    container.appendChild(header);

    // Content
    const content = document.createElement('div');
    content.className = `${classPrefix}__content`;

    const list = document.createElement('ul');
    list.className = `${classPrefix}__list`;
    list.setAttribute('role', 'listbox');
    content.appendChild(list);

    if (!this.elements.loadingIndicator) {
      this.elements.loadingIndicator = document.createElement('div');
      this.elements.loadingIndicator.className = `${classPrefix}__loading`;
      this.elements.loadingIndicator.textContent = i18n._('Loading sessions...');
    }
    content.appendChild(this.elements.loadingIndicator);

    if (!this.elements.errorDisplay) {
      this.elements.errorDisplay = document.createElement('div');
      this.elements.errorDisplay.className = `${classPrefix}__error`;
      this.elements.errorDisplay.style.display = 'none';
    }
    content.appendChild(this.elements.errorDisplay);

    container.appendChild(content);
  }

  // ============================================
  // Event Listeners
  // ============================================

  private attachListeners(): void {
    const { searchInput, sortSelect, container } = this.elements;

    if (searchInput) {
      const handleSearch = () => this.filterSessions();
      searchInput.addEventListener('input', handleSearch, { signal: this.abortController.signal });
    }

    if (sortSelect) {
      const handleSort = () => {
        this.sortMode = this.normalizeSortMode(sortSelect.value);
        this.filterSessions();
      };
      sortSelect.addEventListener('change', handleSort, { signal: this.abortController.signal });
    }

    const handleKeydown = (e: KeyboardEvent) => this.handleKeydown(e);
    container.addEventListener('keydown', handleKeydown, { signal: this.abortController.signal });

    container.setAttribute('tabindex', '0');
  }

  private handleKeydown(event: KeyboardEvent): void {
    if (this.filteredSessions.length === 0) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.selectIndex(Math.min(this.selectedIndex + 1, this.filteredSessions.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.selectIndex(Math.max(this.selectedIndex - 1, 0));
        break;
      case 'Enter':
        if (this.selectedIndex >= 0) {
          this.selectSession(this.filteredSessions[this.selectedIndex]);
        }
        break;
      case 'Home':
        event.preventDefault();
        this.selectIndex(0);
        break;
      case 'End':
        event.preventDefault();
        this.selectIndex(this.filteredSessions.length - 1);
        break;
    }
  }

  // ============================================
  // Data Loading
  // ============================================

  private get isLoading(): boolean {
    return this.loadController !== null && !this.loadController.signal.aborted;
  }

  async loadSessions(projectId: string, source?: string): Promise<void> {
    this.loadController?.abort();
    const controller = new AbortController();
    this.loadController = controller;

    this.options.projectId = projectId;
    this.options.projectSource = source?.trim().toLowerCase() || undefined;
    this.showLoading(true);
    this.showError(null);
    this.sessions = [];
    this.filteredSessions = [];
    this.selectedIndex = -1;
    this.render();

    try {
      this.sessions = await this.client.getSessions(projectId, this.options.projectSource, controller.signal);
      if (controller.signal.aborted) return;
      this.filterSessions();
      void Promise.resolve(this.options.onSessionsLoaded?.(this.sessions));
    } catch (error) {
      if (controller.signal.aborted) return;
      const err = error instanceof Error ? error : new Error(String(error));
      this.showError(err);
      this.options.onError?.(err);
    } finally {
      if (this.loadController === controller) {
        this.loadController = null;
        this.showLoading(false);
      }
    }
  }

  private showLoading(show: boolean): void {
    if (this.elements.loadingIndicator) {
      this.elements.loadingIndicator.style.display = show ? 'flex' : 'none';
    }

    const list = this.elements.container.querySelector<HTMLElement>(`.${this.options.classPrefix}__list`);
    if (list) {
      list.style.display = show ? 'none' : 'block';
    }
  }

  private showError(error: Error | null): void {
    if (!this.elements.errorDisplay) return;
    this.currentError = error;

    if (error) {
      this.elements.errorDisplay.replaceChildren();
      const msgDiv = document.createElement('div');
      msgDiv.textContent = error.message;
      this.elements.errorDisplay.appendChild(msgDiv);

      if (this.options.projectId) {
        const retryBtn = document.createElement('button');
        retryBtn.className = `${this.options.classPrefix}__retry`;
        retryBtn.textContent = i18n._('Retry');
        retryBtn.addEventListener('click', () => {
          if (this.options.projectId) {
            void this.loadSessions(this.options.projectId, this.options.projectSource);
          }
        });
        this.elements.errorDisplay.appendChild(retryBtn);
      }

      this.elements.errorDisplay.style.display = 'block';
    } else {
      this.elements.errorDisplay.style.display = 'none';
    }
  }

  // ============================================
  // Filtering
  // ============================================

  private filterSessions(): void {
    const searchTerm = this.elements.searchInput?.value.toLowerCase() ?? '';

    this.filteredSessions = this.sessions.filter(session => {
      if (!searchTerm) return true;

      const searchFields = [
        session.id,
        session.summary,
        session.firstPrompt,
        session.model,
        session.gitBranch,
      ];

      return searchFields.some(field =>
        field?.toLowerCase().includes(searchTerm)
      );
    });
    this.filteredSessions.sort((a, b) => this.compareSessions(a, b));

    this.selectedIndex = -1;
    this.render();
  }

  private normalizeSortMode(value: string): SessionSortMode {
    return value === 'date_asc' ? 'date_asc' : 'date_desc';
  }

  private sessionTime(session: SessionMeta): number {
    if (!session.modifiedAt) return 0;
    const d = session.modifiedAt instanceof Date ? session.modifiedAt : new Date(session.modifiedAt);
    return Number.isNaN(d.getTime()) ? 0 : d.getTime();
  }

  private compareSessions(a: SessionMeta, b: SessionMeta): number {
    const byDateAsc = this.sessionTime(a) - this.sessionTime(b);
    if (byDateAsc !== 0) {
      return this.sortMode === 'date_asc' ? byDateAsc : byDateAsc * -1;
    }

    const aLabel = (a.firstPrompt ?? a.id ?? '').toLowerCase();
    const bLabel = (b.firstPrompt ?? b.id ?? '').toLowerCase();
    return aLabel.localeCompare(bLabel);
  }

  private renderSortOptions(): void {
    const sortSelect = this.elements.sortSelect;
    if (!sortSelect) return;

    sortSelect.replaceChildren();
    const options: Array<{ value: SessionSortMode; label: string }> = [
      { value: 'date_desc', label: i18n._('Newest') },
      { value: 'date_asc', label: i18n._('Oldest') },
    ];

    options.forEach(({ value, label }) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      sortSelect.appendChild(option);
    });

    sortSelect.value = this.sortMode;
  }

  // ============================================
  // Rendering
  // ============================================

  private render(): void {
    this.updateStats();
    this.renderList();
  }

  private updateStats(): void {
    const stats = this.elements.container.querySelector(`.${this.options.classPrefix}__stats`);
    if (stats) {
      if (!this.options.projectId) {
        stats.textContent = i18n._('Select a project to view sessions');
      } else if (this.isLoading) {
        stats.textContent = i18n._('Loading sessions...');
      } else {
        const total = this.sessions.length;
        const showing = this.filteredSessions.length;
        if (showing === total) {
          stats.textContent = i18n._('{count, plural, one {# session} other {# sessions}}', { count: total });
        } else {
          stats.textContent = i18n._('Showing {showing} of {total} sessions', { showing, total });
        }
      }
    }
  }

  private renderList(): void {
    const list = this.elements.container.querySelector('ul');
    if (!list) return;

    // Clear list and remove ALL existing empty states first
    list.replaceChildren();
    this.itemElements.clear();
    const existingEmpty = this.elements.container.querySelectorAll(`.${this.options.classPrefix}__empty`);
    existingEmpty.forEach(el => el.remove());

    if (!this.options.projectId) {
      const empty = document.createElement('div');
      empty.className = `${this.options.classPrefix}__empty`;
      empty.textContent = i18n._('Select a project to view its sessions');
      list.parentElement?.appendChild(empty);
      return;
    }

    if (this.filteredSessions.length === 0) {
      const empty = document.createElement('div');
      empty.className = `${this.options.classPrefix}__empty`;
      empty.textContent = this.sessions.length === 0
        ? i18n._('No sessions found for this project')
        : i18n._('No sessions match your search');
      list.parentElement?.appendChild(empty);
      return;
    }

    for (let i = 0; i < this.filteredSessions.length; i++) {
      const session = this.filteredSessions[i];
      const item = this.renderSessionItem(session, i);
      list.appendChild(item);
      this.itemElements.set(this.sessionKey(session, i), item);
    }
  }

  private renderSessionItem(session: SessionMeta, index: number): HTMLElement {
    if (this.options.sessionRenderer) {
      return this.options.sessionRenderer(session, index);
    }

    const { classPrefix, showEntryCount, showModel } = this.options;
    const li = document.createElement('li');
    li.className = `${classPrefix}__item`;
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', 'false');
    li.dataset.index = String(index);
    li.dataset.sessionId = session.id;

    const source = session.source ?? 'claude';
    const isChunked = (session.chunkCount ?? 0) > 1;

    // Build title from first prompt or ID
    const title = session.firstPrompt
      ? session.firstPrompt.slice(0, SESSION_TITLE_MAX_LENGTH) + (session.firstPrompt.length > SESSION_TITLE_MAX_LENGTH ? '...' : '')
      : session.id ?? i18n._('Unknown Session');

    // Build meta items - compact format like Kimi Code
    const metaItems: string[] = [];

    // Relative time (primary)
    metaItems.push(`<span class="${classPrefix}__meta-item">${formatRelativeTime(session.modifiedAt)}</span>`);

    // Entry count (compact)
    if (showEntryCount && session.entryCount !== undefined) {
      const msgLabel = i18n._('{count, plural, one {msg} other {msgs}}', { count: session.entryCount });
      metaItems.push(`<span class="${classPrefix}__meta-item">${formatNumber(session.entryCount)} ${msgLabel}</span>`);
    }

    // Model (shortened)
    if (showModel && session.model) {
      const shortModel = session.model.replace(/^(claude-|gpt-|gemini-)/, '');
      metaItems.push(`<span class="${classPrefix}__meta-item">${shortModel}</span>`);
    }

    // Source badge (only if not default)
    if (source !== 'claude') {
      metaItems.push(`<span class="${classPrefix}__badge ${classPrefix}__badge--${source}">${source}</span>`);
    }

    // Chunked indicator
    if (isChunked) {
      metaItems.push(`<span class="${classPrefix}__badge ${classPrefix}__badge--chunked">${i18n._('chunked')}</span>`);
    }

    li.innerHTML = `
      <div class="${classPrefix}__title">${this.escapeHtml(title)}</div>
      ${session.summary ? `<div class="${classPrefix}__summary">${this.escapeHtml(session.summary)}</div>` : ''}
      <div class="${classPrefix}__meta">${metaItems.join('')}</div>
    `;

    li.addEventListener('click', () => {
      this.selectIndex(index);
      this.selectSession(session);
    });

    return li;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ============================================
  // Selection
  // ============================================

  private sessionKey(session: SessionMeta, index: number): string {
    return session.id ?? `session-${index}`;
  }

  private selectIndex(index: number): void {
    // Deselect previous
    if (this.selectedIndex >= 0) {
      const prev = this.filteredSessions[this.selectedIndex];
      const prevItem = prev ? this.itemElements.get(this.sessionKey(prev, this.selectedIndex)) : undefined;
      if (prevItem) {
        prevItem.classList.remove(`${this.options.classPrefix}__item--selected`);
        prevItem.setAttribute('aria-selected', 'false');
      }
    }

    this.selectedIndex = index;

    // Select new
    if (index >= 0) {
      const current = this.filteredSessions[index];
      const item = current ? this.itemElements.get(this.sessionKey(current, index)) : undefined;
      if (item) {
        item.classList.add(`${this.options.classPrefix}__item--selected`);
        item.setAttribute('aria-selected', 'true');
        item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }

  private selectSession(session: SessionMeta): void {
    const handler = this.options.onSessionSelect;
    if (!handler) return;
    
    // Handler might return void or Promise<void>
    // We can't easily detect if it's async, so just call it
    // If the handler throws, it will be caught by the browser
    try {
      handler(session);
    } catch (err) {
      console.error('Session selection handler error:', err);
    }
  }

  // ============================================
  // Public API
  // ============================================

  /**
   * Get all loaded sessions
   */
  getSessions(): SessionMeta[] {
    return [...this.sessions];
  }

  /**
   * Get currently filtered sessions
   */
  getFilteredSessions(): SessionMeta[] {
    return [...this.filteredSessions];
  }

  /**
   * Get the currently selected session
   */
  getSelectedSession(): SessionMeta | null {
    if (this.selectedIndex >= 0) {
      return this.filteredSessions[this.selectedIndex] ?? null;
    }
    return null;
  }

  /**
   * Select a session by ID
   */
  selectSessionById(sessionId: string): void {
    const index = this.filteredSessions.findIndex(s => s.id === sessionId);
    if (index >= 0) {
      this.selectIndex(index);
    }
  }

  /**
   * Refresh the session list
   */
  refresh(): Promise<void> {
    if (this.options.projectId) {
      return this.loadSessions(this.options.projectId, this.options.projectSource);
    }
    return Promise.resolve();
  }

  /**
   * Set the search query
   */
  setSearch(query: string): void {
    if (this.elements.searchInput) {
      this.elements.searchInput.value = query;
      this.filterSessions();
    }
  }

  /**
   * Set session sort mode
   */
  setSort(sort: SessionSortMode): void {
    const normalized = this.normalizeSortMode(sort);
    if (this.sortMode === normalized) return;
    this.sortMode = normalized;
    if (this.elements.sortSelect) {
      this.elements.sortSelect.value = normalized;
    }
    this.filterSessions();
  }

  /**
   * Set the project ID and load sessions
   */
  setProjectId(projectId: string, source?: string): Promise<void> {
    return this.loadSessions(projectId, source);
  }

  /**
   * Focus the search input
   */
  focusSearch(): void {
    this.elements.searchInput?.focus();
  }

  /**
   * Re-render translated UI labels in place.
   */
  refreshI18n(): void {
    if (this.elements.searchInput) {
      this.elements.searchInput.placeholder = i18n._('Filter sessions...');
    }
    this.renderSortOptions();
    if (this.elements.loadingIndicator) {
      this.elements.loadingIndicator.textContent = i18n._('Loading sessions...');
    }

    this.updateStats();
    this.renderList();

    if (this.currentError) {
      this.showError(this.currentError);
    }
  }

  // ============================================
  // Cleanup
  // ============================================

  dispose(): void {
    if (this.disposed) return;

    this.abortController.abort();
    this.loadController?.abort();

    this.itemElements.clear();
    this.sessions = [];
    this.filteredSessions = [];

    this.elements.container.replaceChildren();

    this.disposed = true;
  }
}