/**
 * SearchOverlay Component
 *
 * A modal overlay for searching across indexed sessions.
 * Orchestrates SearchProjectFilter and SearchResultRenderer.
 */

import type { SearchSessionResult, SearchOptions, SemanticSearchResult, SemanticSearchOptions } from '@wethinkt/ts-thinkt/api';
import { type ThinktClient, getDefaultClient } from '@wethinkt/ts-thinkt/api';
import { i18n } from '@lingui/core';
import { injectStyleSheet } from './style-manager';
import { SearchProjectFilter } from './SearchProjectFilter';
import { SearchResultRenderer } from './SearchResultRenderer';
import OVERLAY_STYLES from './search-overlay-styles.css?inline';

// ============================================
// Constants
// ============================================

const CLOSE_ANIMATION_MS = 150;
const TEXT_SEARCH_DEBOUNCE_MS = 150;
const SEMANTIC_SEARCH_DEBOUNCE_MS = 300;

// ============================================
// Types
// ============================================

export interface SearchOverlayElements {
  /** Container element (typically document.body) */
  container: HTMLElement;
}

export interface SearchOverlayOptions {
  elements: SearchOverlayElements;
  /** API client instance (defaults to getDefaultClient()) */
  client?: ThinktClient;
  /** Callback when a session is selected. For text search: SearchSessionResult + lineNum. For semantic: SemanticSearchResult. */
  onSessionSelect?: (
    result: SearchSessionResult | SemanticSearchResult,
    lineNum?: number,
  ) => void | Promise<void>;
  /** Callback when the overlay is closed */
  onClose?: () => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

// ============================================
// Component Class
// ============================================

export class SearchOverlay {
  private elements: SearchOverlayElements;
  private options: SearchOverlayOptions;
  private client: ThinktClient;
  private overlay: HTMLElement | null = null;
  private input: HTMLInputElement | null = null;
  private searchController: AbortController | null = null;
  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private abortController = new AbortController();
  private isOpen = false;

  // Search state
  private caseSensitive = false;
  private useRegex = false;
  private searchMode: 'text' | 'semantic' = 'text';
  private results: SearchSessionResult[] = [];
  private filteredResults: SearchSessionResult[] = [];
  private semanticResults: SemanticSearchResult[] = [];
  private filteredSemanticResults: SemanticSearchResult[] = [];
  private semanticPreviews: Map<string, string> = new Map();
  private selectedIndex = -1;

  // Extracted components
  private projectFilter: SearchProjectFilter | null = null;
  private resultRenderer: SearchResultRenderer | null = null;

  constructor(options: SearchOverlayOptions) {
    this.elements = options.elements;
    this.options = options;
    this.client = options.client ?? getDefaultClient();
    injectStyleSheet('thinkt-search-overlay-styles', OVERLAY_STYLES);
  }

  // ============================================
  // Open/Close
  // ============================================

  open(): void {
    if (this.isOpen) return;
    this.isOpen = true;

    this.createOverlay();
    this.attachListeners();
    this.input?.focus();
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

  private cleanup(): void {
    this.abortController.abort();
    this.abortController = new AbortController();

    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = null;
    }

    this.overlay?.remove();
    this.overlay = null;
    this.input = null;
    this.results = [];
    this.filteredResults = [];
    this.selectedIndex = -1;
    this.semanticResults = [];
    this.filteredSemanticResults = [];
    this.semanticPreviews.clear();
    this.projectFilter = null;
    this.resultRenderer = null;
  }

  // ============================================
  // DOM Creation
  // ============================================

  private createOverlay(): void {
    this.overlay = document.createElement('div');
    this.overlay.className = 'thinkt-search-overlay';
    this.overlay.innerHTML = `
      <div class="thinkt-search-modal">
        <div class="thinkt-search-header">
          <div class="thinkt-search-title">
            <div class="thinkt-search-title-main">
              <span>${i18n._('Search Sessions')}</span>
              <div class="thinkt-search-mode-toggle">
                <button class="thinkt-search-mode-btn active" data-mode="text">${i18n._('Text')}</button>
                <button class="thinkt-search-mode-btn" data-mode="semantic">${i18n._('Semantic')}</button>
              </div>
            </div>
            <div class="thinkt-search-close-wrap">
              <button id="search-close-btn" type="button" class="thinkt-search-close-btn" aria-label="${i18n._('Close')}" title="${i18n._('Close')} - ESC">&times;</button>
            </div>
          </div>
          <div class="thinkt-search-input-wrapper">
            <span class="thinkt-search-icon">🔍</span>
            <input type="text" class="thinkt-search-input" placeholder="${i18n._('Type to search across all sessions...')}" autocomplete="off">
          </div>
          <div class="thinkt-search-options" id="search-text-options">
            <label class="thinkt-search-option">
              <input type="checkbox" id="search-case-sensitive">
              <span>${i18n._('Case sensitive')}</span>
            </label>
            <label class="thinkt-search-option">
              <input type="checkbox" id="search-regex">
              <span>${i18n._('Regex')}</span>
            </label>
          </div>
          <div class="thinkt-search-options" id="search-semantic-options" style="display: none;">
            <span class="thinkt-search-semantic-hint">${i18n._('Ask a question in natural language')}</span>
          </div>
        </div>
        <div class="thinkt-search-body">
          <div class="thinkt-search-projects" style="display: none;">
            <div class="thinkt-search-projects-header">
              <span>${i18n._('Projects')}</span>
              <div class="thinkt-search-projects-actions">
                <button id="search-select-all">${i18n._('All')}</button>
                <button id="search-select-none">${i18n._('None')}</button>
              </div>
            </div>
            <div class="thinkt-search-projects-list"></div>
          </div>
          <div class="thinkt-search-content">
            <div class="thinkt-search-empty">
              <div class="thinkt-search-empty-icon">🔍</div>
              <div>${i18n._('Type to search across all indexed sessions')}</div>
            </div>
          </div>
        </div>
        <div class="thinkt-search-help">
          <span><kbd>↑</kbd><kbd>↓</kbd> ${i18n._('to navigate')} <kbd>↵</kbd> ${i18n._('to select')}</span>
          <span>${i18n._('Search uses the indexer database')}</span>
        </div>
      </div>
    `;

    this.elements.container.appendChild(this.overlay);
    this.input = this.overlay.querySelector('.thinkt-search-input');

    // Initialize extracted components
    const projectsContainer = this.overlay.querySelector<HTMLElement>('.thinkt-search-projects')!;
    const projectsList = this.overlay.querySelector<HTMLElement>('.thinkt-search-projects-list')!;
    const contentContainer = this.overlay.querySelector<HTMLElement>('.thinkt-search-content')!;

    this.projectFilter = new SearchProjectFilter({
      container: projectsContainer,
      listContainer: projectsList,
      onFilterChanged: () => this.applyProjectFilter(),
      signal: this.abortController.signal,
    });

    this.resultRenderer = new SearchResultRenderer({
      container: contentContainer,
      onSelectResult: (index) => this.handleResultSelect(index),
      onHoverResult: (index) => {
        this.selectedIndex = index;
        this.resultRenderer!.updateSelection(this.selectedIndex);
      },
    });
  }

  // ============================================
  // Event Listeners
  // ============================================

  private attachListeners(): void {
    if (!this.overlay) return;

    // Close on backdrop click
    this.overlay.addEventListener('click', (e: MouseEvent) => {
      if (e.target === this.overlay) {
        this.close();
      }
    }, { signal: this.abortController.signal });

    // Input handling with debounce
    if (this.input) {
      this.input.addEventListener('input', () => this.handleSearchInput(), { signal: this.abortController.signal });
      this.input.addEventListener('keydown', (e: KeyboardEvent) => this.handleKeydown(e), { signal: this.abortController.signal });
    }

    const closeBtn = this.overlay.querySelector<HTMLButtonElement>('#search-close-btn');
    closeBtn?.addEventListener('click', () => this.close(), { signal: this.abortController.signal });

    // Option checkboxes
    const caseSensitiveCheckbox = this.overlay.querySelector<HTMLInputElement>('#search-case-sensitive');
    const regexCheckbox = this.overlay.querySelector<HTMLInputElement>('#search-regex');

    if (caseSensitiveCheckbox) {
      caseSensitiveCheckbox.addEventListener('change', () => {
        this.caseSensitive = caseSensitiveCheckbox.checked;
        this.triggerSearch();
      }, { signal: this.abortController.signal });
    }

    if (regexCheckbox) {
      regexCheckbox.addEventListener('change', () => {
        this.useRegex = regexCheckbox.checked;
        this.triggerSearch();
      }, { signal: this.abortController.signal });
    }

    // Mode toggle
    const modeButtons = this.overlay.querySelectorAll<HTMLButtonElement>('.thinkt-search-mode-btn');
    modeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode as 'text' | 'semantic';
        this.setSearchMode(mode);
      }, { signal: this.abortController.signal });
    });

    // Global keyboard shortcuts
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
      }
    }, { signal: this.abortController.signal });
  }

  private setSearchMode(mode: 'text' | 'semantic'): void {
    if (this.searchMode === mode) return;
    this.searchMode = mode;

    // Update toggle button styles
    const buttons = this.overlay?.querySelectorAll<HTMLButtonElement>('.thinkt-search-mode-btn');
    buttons?.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    // Toggle option panels
    const textOptions = this.overlay?.querySelector<HTMLElement>('#search-text-options');
    const semanticOptions = this.overlay?.querySelector<HTMLElement>('#search-semantic-options');
    if (textOptions) textOptions.style.display = mode === 'text' ? 'flex' : 'none';
    if (semanticOptions) semanticOptions.style.display = mode === 'semantic' ? 'flex' : 'none';

    // Update placeholder
    if (this.input) {
      this.input.placeholder = mode === 'text'
        ? i18n._('Type to search across all sessions...')
        : i18n._('Ask a question about your sessions...');
    }

    this.triggerSearch();
  }

  // ============================================
  // Project Filter
  // ============================================

  private applyProjectFilter(): void {
    if (this.searchMode === 'semantic') {
      const selected = this.projectFilter!.getSelectedProjects();
      if (selected.size === 0) {
        this.filteredSemanticResults = [...this.semanticResults];
      } else {
        this.filteredSemanticResults = this.semanticResults.filter(r =>
          r.project_name && selected.has(r.project_name),
        );
      }
      this.selectedIndex = this.filteredSemanticResults.length > 0 ? 0 : -1;
      this.resultRenderer!.renderSemanticResults(this.filteredSemanticResults, this.semanticPreviews, this.selectedIndex);
    } else {
      const selected = this.projectFilter!.getSelectedProjects();
      if (selected.size === 0) {
        this.filteredResults = [...this.results];
      } else {
        this.filteredResults = this.results.filter(r =>
          r.project_name && selected.has(r.project_name),
        );
      }
      this.selectedIndex = this.filteredResults.length > 0 ? 0 : -1;
      this.resultRenderer!.renderTextResults(this.filteredResults, this.results.length === 0, this.selectedIndex);
    }
  }

  // ============================================
  // Search Logic
  // ============================================

  private handleSearchInput(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    const query = this.input?.value.trim() ?? '';
    if (!query) {
      this.projectFilter?.hide();
      this.resultRenderer?.renderEmpty();
      return;
    }

    this.searchDebounceTimer = setTimeout(() => {
      void this.performSearch(query);
    }, this.searchMode === 'semantic' ? SEMANTIC_SEARCH_DEBOUNCE_MS : TEXT_SEARCH_DEBOUNCE_MS);
  }

  private triggerSearch(): void {
    const query = this.input?.value.trim() ?? '';
    if (query) {
      if (this.searchDebounceTimer) {
        clearTimeout(this.searchDebounceTimer);
      }
      this.searchDebounceTimer = setTimeout(() => {
        void this.performSearch(query);
      }, this.searchMode === 'semantic' ? SEMANTIC_SEARCH_DEBOUNCE_MS : TEXT_SEARCH_DEBOUNCE_MS);
    }
  }

  private async performSearch(query: string): Promise<void> {
    this.searchController?.abort();
    const controller = new AbortController();
    this.searchController = controller;
    this.resultRenderer?.renderLoading();

    try {
      if (this.searchMode === 'semantic') {
        await this.performSemanticSearch(query, controller.signal);
      } else {
        await this.performTextSearch(query, controller.signal);
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      const err = error instanceof Error ? error : new Error(String(error));
      this.resultRenderer?.renderError(err);
      this.options.onError?.(err);
    } finally {
      if (this.searchController === controller) {
        this.searchController = null;
      }
    }
  }

  private async performTextSearch(query: string, signal?: AbortSignal): Promise<void> {
    const options: SearchOptions = {
      query,
      limit: 50,
      limitPerSession: 2,
      caseSensitive: this.caseSensitive,
      regex: this.useRegex,
      signal,
    };

    const response = await this.client.search(options);
    this.results = response.results ?? [];

    this.projectFilter!.extractProjects(this.results);
    this.filteredResults = [...this.results];
    this.selectedIndex = this.filteredResults.length > 0 ? 0 : -1;

    this.projectFilter!.render();
    this.resultRenderer!.renderTextResults(this.filteredResults, this.results.length === 0, this.selectedIndex);
  }

  private async performSemanticSearch(query: string, signal?: AbortSignal): Promise<void> {
    const options: SemanticSearchOptions = {
      query,
      limit: 20,
      diversity: true,
      signal,
    };

    const response = await this.client.semanticSearch(options);
    this.semanticResults = response.results ?? [];

    this.projectFilter!.extractProjects(this.semanticResults);
    this.filteredSemanticResults = [...this.semanticResults];
    this.selectedIndex = this.filteredSemanticResults.length > 0 ? 0 : -1;

    this.projectFilter!.render();
    this.resultRenderer!.renderSemanticResults(this.filteredSemanticResults, this.semanticPreviews, this.selectedIndex);

    void this.fetchSemanticPreviews();
  }

  private async fetchSemanticPreviews(): Promise<void> {
    const fetchPromises = this.filteredSemanticResults.map(async (result) => {
      if (!result.session_path || !result.entry_uuid) return;

      try {
        const offset = result.line_number ?? 0;
        const session = await this.client.getSession(result.session_path, {
          limit: 1,
          offset,
        });
        const entry = session.entries.find(e => e.uuid === result.entry_uuid) ?? session.entries[0];
        if (entry?.text) {
          this.semanticPreviews.set(result.entry_uuid!, entry.text);
        }
      } catch (error) {
        console.warn('[THINKT] Failed to fetch preview for entry:', result.entry_uuid, error);
      }
    });

    await Promise.allSettled(fetchPromises);

    if (this.searchMode === 'semantic' && this.isOpen) {
      this.resultRenderer?.updateSemanticPreviews(this.filteredSemanticResults, this.semanticPreviews);
    }
  }

  // ============================================
  // Result Selection
  // ============================================

  private handleResultSelect(index: number): void {
    if (this.searchMode === 'semantic') {
      const result = this.filteredSemanticResults[index];
      if (result) {
        void this.selectSemanticResult(result);
      }
    } else {
      const result = this.filteredResults[index];
      if (result) {
        void this.selectResult(result);
      }
    }
  }

  private async selectResult(result: SearchSessionResult): Promise<void> {
    try {
      const firstMatch = result.matches?.[0];
      const lineNum = firstMatch?.line_num;
      await this.options.onSessionSelect?.(result, lineNum);
    } finally {
      this.close();
    }
  }

  private async selectSemanticResult(result: SemanticSearchResult): Promise<void> {
    try {
      await this.options.onSessionSelect?.(result, result.line_number);
    } finally {
      this.close();
    }
  }

  // ============================================
  // Keyboard Navigation
  // ============================================

  private handleKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.selectNext();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.selectPrevious();
        break;
      case 'Enter':
        event.preventDefault();
        this.selectCurrent();
        break;
    }
  }

  private selectNext(): void {
    const count = this.searchMode === 'semantic'
      ? this.filteredSemanticResults.length
      : this.filteredResults.length;
    if (count === 0) return;
    this.selectedIndex = (this.selectedIndex + 1) % count;
    this.resultRenderer?.updateSelection(this.selectedIndex);
  }

  private selectPrevious(): void {
    const count = this.searchMode === 'semantic'
      ? this.filteredSemanticResults.length
      : this.filteredResults.length;
    if (count === 0) return;
    this.selectedIndex = this.selectedIndex <= 0 ? count - 1 : this.selectedIndex - 1;
    this.resultRenderer?.updateSelection(this.selectedIndex);
  }

  private selectCurrent(): void {
    if (this.selectedIndex >= 0) {
      this.handleResultSelect(this.selectedIndex);
    }
  }

  // ============================================
  // Public API
  // ============================================

  isOpened(): boolean {
    return this.isOpen;
  }

  dispose(): void {
    this.close();
  }
}
