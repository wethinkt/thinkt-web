/**
 * SessionList Component
 *
 * A standalone component for listing sessions within a project.
 * Can be embedded in the main viewer or used independently.
 */

import type { SessionMeta } from '@wethinkt/ts-thinkt/api';
import { ThinktClient, getDefaultClient } from '@wethinkt/ts-thinkt/api';

// ============================================
// Types
// ============================================

export interface SessionListElements {
  /** Container element */
  container: HTMLElement;
  /** Search input (optional) */
  searchInput?: HTMLInputElement;
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

// ============================================
// Default Styles
// ============================================

const DEFAULT_STYLES = `
.thinkt-session-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  font-family: var(--thinkt-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
  color: var(--thinkt-text-color, #e0e0e0);
  background: var(--thinkt-bg-color, #1a1a1a);
}

.thinkt-session-list__header {
  padding: 8px 12px;
  border-bottom: 1px solid var(--thinkt-border-color, #333);
  flex-shrink: 0;
}

.thinkt-session-list__search {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid var(--thinkt-border-color, #333);
  border-radius: 4px;
  background: var(--thinkt-input-bg, #252525);
  color: inherit;
  font-size: 13px;
  box-sizing: border-box;
}

.thinkt-session-list__search:focus {
  outline: none;
  border-color: var(--thinkt-accent-color, #6366f1);
}

.thinkt-session-list__search::placeholder {
  color: var(--thinkt-muted-color, #666);
}

.thinkt-session-list__stats {
  font-size: 11px;
  color: var(--thinkt-muted-color, #666);
  margin-top: 6px;
}

.thinkt-session-list__content {
  flex: 1;
  overflow-y: auto;
}

.thinkt-session-list__list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.thinkt-session-list__item {
  padding: 10px 12px;
  cursor: pointer;
  transition: background-color 0.12s ease;
  border-bottom: 1px solid var(--thinkt-border-color, #252525);
  border-left: 2px solid transparent;
}

.thinkt-session-list__item:hover {
  background: var(--thinkt-hover-bg, #252525);
}

.thinkt-session-list__item--selected {
  background: var(--thinkt-selected-bg, rgba(99, 102, 241, 0.15));
  border-left-color: var(--thinkt-accent-color, #6366f1);
}

.thinkt-session-list__title {
  font-weight: 400;
  font-size: 13px;
  line-height: 1.4;
  margin-bottom: 4px;
  color: var(--thinkt-text-color, #e0e0e0);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.thinkt-session-list__summary {
  font-size: 12px;
  color: var(--thinkt-muted-color, #888);
  margin-bottom: 6px;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.3;
}

.thinkt-session-list__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: var(--thinkt-muted-color, #666);
  flex-wrap: wrap;
}

.thinkt-session-list__meta-item {
  display: flex;
  align-items: center;
  gap: 3px;
}

.thinkt-session-list__meta-icon {
  width: 12px;
  height: 12px;
  opacity: 0.6;
}

.thinkt-session-list__badge {
  display: inline-flex;
  align-items: center;
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.thinkt-session-list__badge--claude {
  background: rgba(217, 119, 80, 0.15);
  color: #d97750;
}

.thinkt-session-list__badge--kimi {
  background: rgba(25, 195, 155, 0.15);
  color: #19c39b;
}

.thinkt-session-list__badge--gemini {
  background: rgba(99, 102, 241, 0.15);
  color: #6366f1;
}

.thinkt-session-list__badge--chunked {
  background: rgba(99, 102, 241, 0.15);
  color: #6366f1;
}

.thinkt-session-list__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: var(--thinkt-muted-color, #888);
}

.thinkt-session-list__empty {
  text-align: center;
  padding: 48px;
  color: var(--thinkt-muted-color, #888);
}

.thinkt-session-list__error {
  padding: 16px;
  margin: 16px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  color: #ef4444;
}

.thinkt-session-list__retry {
  margin-top: 8px;
  padding: 6px 12px;
  background: transparent;
  border: 1px solid currentColor;
  border-radius: 4px;
  color: inherit;
  cursor: pointer;
  font-size: 12px;
}

.thinkt-session-list__retry:hover {
  background: rgba(239, 68, 68, 0.2);
}
`;

// ============================================
// Utility Functions
// ============================================

function formatRelativeTime(dateStr: string | undefined): string {
  if (!dateStr) return 'Unknown';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffSecs < 60) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffWeeks < 4) return `${diffWeeks}w ago`;
    if (diffMonths < 12) return `${diffMonths}mo ago`;
    return `${diffYears}y ago`;
  } catch {
    return 'Invalid';
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
  private selectedIndex = -1;
  private isLoading = false;
  private itemElements: Map<string, HTMLElement> = new Map();
  private boundHandlers: Array<() => void> = [];
  private disposed = false;
  private stylesInjected = false;

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
    this.injectStyles();
    this.createStructure();
    this.attachListeners();

    if (this.options.projectId) {
      await this.loadSessions(this.options.projectId);
    }
  }

  private injectStyles(): void {
    if (this.stylesInjected) return;

    const styleId = 'thinkt-session-list-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = DEFAULT_STYLES;
      document.head.appendChild(style);
    }
    this.stylesInjected = true;
  }

  private createStructure(): void {
    const { container } = this.elements;
    const { classPrefix } = this.options;

    container.className = classPrefix;
    container.innerHTML = '';

    // Header
    const header = document.createElement('div');
    header.className = `${classPrefix}__header`;

    if (this.options.enableSearch) {
      const searchInput = this.elements.searchInput ?? document.createElement('input');
      searchInput.className = `${classPrefix}__search`;
      searchInput.type = 'text';
      searchInput.placeholder = 'Search sessions...';
      if (!this.elements.searchInput) {
        this.elements.searchInput = searchInput;
      }
      header.appendChild(searchInput);
    }

    const stats = document.createElement('div');
    stats.className = `${classPrefix}__stats`;
    stats.textContent = this.options.projectId ? 'Loading...' : 'Select a project';
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
      this.elements.loadingIndicator.textContent = 'Loading sessions...';
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
    const { searchInput, container } = this.elements;

    if (searchInput) {
      const handleSearch = () => this.filterSessions();
      searchInput.addEventListener('input', handleSearch);
      this.boundHandlers.push(() => searchInput.removeEventListener('input', handleSearch));
    }

    const handleKeydown = (e: KeyboardEvent) => this.handleKeydown(e);
    container.addEventListener('keydown', handleKeydown);
    this.boundHandlers.push(() => container.removeEventListener('keydown', handleKeydown));

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

  async loadSessions(projectId: string): Promise<void> {
    if (this.isLoading) return;

    this.options.projectId = projectId;
    this.isLoading = true;
    this.showLoading(true);
    this.showError(null);
    this.sessions = [];
    this.filteredSessions = [];
    this.selectedIndex = -1;
    this.render();

    try {
      this.sessions = await this.client.getSessions(projectId);
      // Sort by modified date descending
      this.sessions.sort((a, b) => {
        const dateA = a.modified_at ? new Date(a.modified_at).getTime() : 0;
        const dateB = b.modified_at ? new Date(b.modified_at).getTime() : 0;
        return dateB - dateA;
      });
      this.filteredSessions = [...this.sessions];
      this.render();
      void Promise.resolve(this.options.onSessionsLoaded?.(this.sessions));
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.showError(err);
      this.options.onError?.(err);
    } finally {
      this.isLoading = false;
      this.showLoading(false);
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

    if (error) {
      this.elements.errorDisplay.innerHTML = '';
      const msgDiv = document.createElement('div');
      msgDiv.textContent = error.message;
      this.elements.errorDisplay.appendChild(msgDiv);

      if (this.options.projectId) {
        const retryBtn = document.createElement('button');
        retryBtn.className = `${this.options.classPrefix}__retry`;
        retryBtn.textContent = 'Retry';
        retryBtn.addEventListener('click', () => {
          if (this.options.projectId) {
            void this.loadSessions(this.options.projectId);
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
        session.first_prompt,
        session.model,
        session.git_branch,
      ];

      return searchFields.some(field =>
        field?.toLowerCase().includes(searchTerm)
      );
    });

    this.selectedIndex = -1;
    this.render();
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
        stats.textContent = 'Select a project to view sessions';
      } else if (this.isLoading) {
        stats.textContent = 'Loading sessions...';
      } else {
        const total = this.sessions.length;
        const showing = this.filteredSessions.length;
        if (showing === total) {
          stats.textContent = `${total} session${total !== 1 ? 's' : ''}`;
        } else {
          stats.textContent = `Showing ${showing} of ${total} sessions`;
        }
      }
    }
  }

  private renderList(): void {
    const list = this.elements.container.querySelector('ul');
    if (!list) return;

    // Clear list and remove ALL existing empty states first
    list.innerHTML = '';
    this.itemElements.clear();
    const existingEmpty = this.elements.container.querySelectorAll(`.${this.options.classPrefix}__empty`);
    existingEmpty.forEach(el => el.remove());

    if (!this.options.projectId) {
      const empty = document.createElement('div');
      empty.className = `${this.options.classPrefix}__empty`;
      empty.textContent = 'Select a project to view its sessions';
      list.parentElement?.appendChild(empty);
      return;
    }

    if (this.filteredSessions.length === 0) {
      const empty = document.createElement('div');
      empty.className = `${this.options.classPrefix}__empty`;
      empty.textContent = this.sessions.length === 0
        ? 'No sessions found for this project'
        : 'No sessions match your search';
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
    const isChunked = (session.chunk_count ?? 0) > 1;

    // Build title from first prompt or ID
    const title = session.first_prompt
      ? session.first_prompt.slice(0, 80) + (session.first_prompt.length > 80 ? '...' : '')
      : session.id ?? 'Unknown Session';

    // Build meta items - compact format like Kimi Code
    const metaItems: string[] = [];

    // Relative time (primary)
    metaItems.push(`<span class="${classPrefix}__meta-item">${formatRelativeTime(session.modified_at)}</span>`);

    // Entry count (compact)
    if (showEntryCount && session.entry_count !== undefined) {
      metaItems.push(`<span class="${classPrefix}__meta-item">${formatNumber(session.entry_count)} msgs</span>`);
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
      metaItems.push(`<span class="${classPrefix}__badge ${classPrefix}__badge--chunked">chunked</span>`);
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
      return this.loadSessions(this.options.projectId);
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
   * Set the project ID and load sessions
   */
  setProjectId(projectId: string): Promise<void> {
    return this.loadSessions(projectId);
  }

  // ============================================
  // Cleanup
  // ============================================

  dispose(): void {
    if (this.disposed) return;

    this.boundHandlers.forEach(remove => remove());
    this.boundHandlers = [];

    this.itemElements.clear();
    this.sessions = [];
    this.filteredSessions = [];

    this.elements.container.innerHTML = '';

    this.disposed = true;
  }
}

// ============================================
// Factory Function
// ============================================

export function createSessionList(options: SessionListOptions): SessionList {
  return new SessionList(options);
}
