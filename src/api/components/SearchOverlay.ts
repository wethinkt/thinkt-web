/**
 * SearchOverlay Component
 *
 * A modal overlay for searching across indexed sessions.
 * Features a project filter sidebar on the left for isolating results.
 */

import type { SearchSessionResult, SearchMatch, SearchOptions, SemanticSearchResult, SemanticSearchOptions } from '@wethinkt/ts-thinkt/api';
import { type ThinktClient, getDefaultClient } from '@wethinkt/ts-thinkt/api';
import { i18n } from '@lingui/core';
import { injectStyleSheet } from './style-manager';

// ============================================
// Constants
// ============================================

const CLOSE_ANIMATION_MS = 150;
const TEXT_SEARCH_DEBOUNCE_MS = 150;
const SEMANTIC_SEARCH_DEBOUNCE_MS = 300;
const PREVIEW_TRUNCATE_LENGTH = 300;

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

interface ProjectInfo {
  name: string;
  count: number;
  source: string;
}

// ============================================
// Styles
// ============================================

const OVERLAY_STYLES = `
.thinkt-search-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 5vh;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  animation: thinkt-search-fade-in 0.15s ease;
}

.thinkt-search-overlay.closing {
  animation: thinkt-search-fade-out 0.15s ease forwards;
}

@keyframes thinkt-search-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes thinkt-search-fade-out {
  from { opacity: 1; }
  to { opacity: 0; }
}

.thinkt-search-modal {
  width: 85%;
  max-width: 1200px;
  max-height: 85vh;
  background: var(--thinkt-bg-secondary, #0f1115);
  border: 1px solid var(--thinkt-border-color, rgba(255, 255, 255, 0.08));
  border-radius: var(--radius-lg, 8px);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: thinkt-search-slide-in 0.2s ease;
}

@keyframes thinkt-search-slide-in {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.thinkt-search-header {
  padding: 16px;
  border-bottom: 1px solid var(--thinkt-border-color, rgba(255, 255, 255, 0.08));
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.thinkt-search-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--thinkt-text-primary, #f8fafc);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.thinkt-search-title kbd {
  font-family: var(--thinkt-font-mono, 'SF Mono', Monaco, 'Cascadia Code', monospace);
  font-size: 11px;
  font-weight: normal;
  padding: 2px 6px;
  background: var(--thinkt-bg-tertiary, #181a1f);
  border: 1px solid var(--thinkt-border-color-light, rgba(255, 255, 255, 0.12));
  border-radius: var(--radius-sm, 4px);
  color: var(--thinkt-muted-color, #64748b);
}

.thinkt-search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.thinkt-search-icon {
  position: absolute;
  left: 12px;
  color: var(--thinkt-muted-color, #64748b);
  font-size: 16px;
  pointer-events: none;
}

.thinkt-search-input {
  width: 100%;
  padding: 10px 12px 10px 36px;
  background: var(--thinkt-bg-tertiary, #181a1f);
  border: 1px solid var(--thinkt-border-color-light, rgba(255, 255, 255, 0.12));
  border-radius: var(--radius-md, 6px);
  color: var(--thinkt-text-primary, #f8fafc);
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s ease;
}

.thinkt-search-input:focus {
  border-color: var(--thinkt-accent-color, #6366f1);
}

.thinkt-search-input::placeholder {
  color: var(--thinkt-muted-color, #64748b);
}

.thinkt-search-options {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 12px;
}

.thinkt-search-option {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--thinkt-text-secondary, #94a3b8);
  cursor: pointer;
  user-select: none;
}

.thinkt-search-option input[type="checkbox"] {
  width: 14px;
  height: 14px;
  accent-color: var(--thinkt-accent-color, #6366f1);
  cursor: pointer;
}

.thinkt-search-body {
  display: flex;
  flex: 1;
  min-height: 0;
}

.thinkt-search-projects {
  width: 220px;
  min-width: 220px;
  border-right: 1px solid var(--thinkt-border-color, rgba(255, 255, 255, 0.08));
  background: var(--thinkt-bg-tertiary, #181a1f);
  display: flex;
  flex-direction: column;
}

.thinkt-search-projects-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--thinkt-border-color, rgba(255, 255, 255, 0.08));
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--thinkt-muted-color, #64748b);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.thinkt-search-projects-actions {
  display: flex;
  gap: 4px;
}

.thinkt-search-projects-actions button {
  background: none;
  border: none;
  color: var(--thinkt-accent-color, #6366f1);
  font-size: 11px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
}

.thinkt-search-projects-actions button:hover {
  background: var(--thinkt-hover-bg, rgba(255, 255, 255, 0.04));
}

.thinkt-search-projects-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.thinkt-search-project-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: var(--radius-sm, 4px);
  cursor: pointer;
  font-size: 12px;
  color: var(--thinkt-text-secondary, #94a3b8);
  transition: background-color 0.12s ease;
}

.thinkt-search-project-item:hover {
  background: var(--thinkt-hover-bg, rgba(255, 255, 255, 0.04));
}

.thinkt-search-project-item input[type="checkbox"] {
  width: 14px;
  height: 14px;
  accent-color: var(--thinkt-accent-color, #6366f1);
  cursor: pointer;
  flex-shrink: 0;
}

.thinkt-search-project-item label {
  flex: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
}

.thinkt-search-project-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.thinkt-search-project-count {
  font-size: 10px;
  color: var(--thinkt-muted-color, #64748b);
  background: var(--thinkt-bg-secondary, #0f1115);
  padding: 1px 4px;
  border-radius: 3px;
  flex-shrink: 0;
}

.thinkt-search-content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.thinkt-search-results {
  list-style: none;
  margin: 0;
  padding: 8px;
}

.thinkt-search-result {
  padding: 12px;
  border-radius: var(--radius-md, 6px);
  cursor: pointer;
  transition: background-color 0.12s ease;
  margin-bottom: 4px;
}

.thinkt-search-result:hover,
.thinkt-search-result.selected {
  background: var(--thinkt-hover-bg, rgba(255, 255, 255, 0.04));
}

.thinkt-search-result.selected {
  border-left: 2px solid var(--thinkt-accent-color, #6366f1);
  margin-left: -2px;
}

.thinkt-search-result-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.thinkt-search-result-project {
  font-weight: 500;
  font-size: 13px;
  color: var(--thinkt-text-primary, #f8fafc);
}

.thinkt-search-result-sep {
  color: var(--thinkt-muted-color, #64748b);
  font-size: 12px;
}

.thinkt-search-result-session {
  font-family: var(--thinkt-font-mono, 'SF Mono', Monaco, 'Cascadia Code', monospace);
  font-size: 12px;
  color: var(--thinkt-text-secondary, #94a3b8);
}

.thinkt-search-result-source {
  font-size: 10px;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: var(--radius-sm, 4px);
  font-weight: 600;
  letter-spacing: 0.3px;
}

.thinkt-search-result-source--claude {
  background: rgba(217, 119, 80, 0.15);
  color: #d97750;
}

.thinkt-search-result-source--kimi {
  background: rgba(25, 195, 155, 0.15);
  color: #19c39b;
}

.thinkt-search-result-source--gemini {
  background: rgba(99, 102, 241, 0.15);
  color: #6366f1;
}

.thinkt-search-result-matches {
  font-size: 12px;
  color: var(--thinkt-muted-color, #64748b);
  margin-left: auto;
}

.thinkt-search-result-preview {
  font-size: 12px;
  line-height: 1.5;
  color: var(--thinkt-text-secondary, #94a3b8);
  font-family: var(--thinkt-font-mono, 'SF Mono', Monaco, 'Cascadia Code', monospace);
  padding: 8px;
  background: var(--thinkt-bg-tertiary, #181a1f);
  border-radius: var(--radius-sm, 4px);
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

.thinkt-search-result-preview mark {
  background: rgba(99, 102, 241, 0.3);
  color: var(--thinkt-text-primary, #f8fafc);
  padding: 1px 2px;
  border-radius: 2px;
  font-weight: 600;
}

.thinkt-search-result-role {
  display: inline-block;
  font-size: 10px;
  color: var(--thinkt-muted-color, #64748b);
  margin-right: 8px;
  text-transform: lowercase;
}

.thinkt-search-empty,
.thinkt-search-loading,
.thinkt-search-error {
  padding: 48px;
  text-align: center;
  color: var(--thinkt-muted-color, #64748b);
}

.thinkt-search-empty-icon {
  font-size: 32px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.thinkt-search-help {
  padding: 12px 16px;
  border-top: 1px solid var(--thinkt-border-color, rgba(255, 255, 255, 0.08));
  font-size: 11px;
  color: var(--thinkt-muted-color, #64748b);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.thinkt-search-help kbd {
  font-family: var(--thinkt-font-mono, 'SF Mono', Monaco, 'Cascadia Code', monospace);
  padding: 2px 4px;
  background: var(--thinkt-bg-tertiary, #181a1f);
  border: 1px solid var(--thinkt-border-color-light, rgba(255, 255, 255, 0.12));
  border-radius: var(--radius-sm, 4px);
  margin: 0 2px;
}

.thinkt-search-no-indexer {
  padding: 32px;
  text-align: center;
  color: var(--thinkt-muted-color, #64748b);
}

.thinkt-search-no-indexer-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--thinkt-text-secondary, #94a3b8);
  margin-bottom: 8px;
}

.thinkt-search-mode-toggle {
  display: flex;
  gap: 0;
  background: var(--thinkt-bg-tertiary, #181a1f);
  border: 1px solid var(--thinkt-border-color-light, rgba(255, 255, 255, 0.12));
  border-radius: var(--radius-md, 6px);
  overflow: hidden;
  font-size: 12px;
}

.thinkt-search-mode-btn {
  padding: 6px 14px;
  background: none;
  border: none;
  color: var(--thinkt-muted-color, #64748b);
  cursor: pointer;
  transition: all 0.15s ease;
  font-size: 12px;
  white-space: nowrap;
}

.thinkt-search-mode-btn:hover {
  color: var(--thinkt-text-secondary, #94a3b8);
}

.thinkt-search-mode-btn.active {
  background: var(--thinkt-accent-color, #6366f1);
  color: #fff;
}

.thinkt-search-semantic-hint {
  font-size: 11px;
  color: var(--thinkt-muted-color, #64748b);
  font-style: italic;
  padding: 0 4px;
}

.thinkt-search-result-relevance {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: var(--radius-sm, 4px);
  font-weight: 600;
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
  margin-left: auto;
  flex-shrink: 0;
}

.thinkt-search-result-relevance.medium {
  background: rgba(234, 179, 8, 0.15);
  color: #eab308;
}

.thinkt-search-result-relevance.low {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.thinkt-search-result-first-prompt {
  font-size: 11px;
  color: var(--thinkt-muted-color, #64748b);
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.thinkt-search-result-timestamp {
  font-size: 11px;
  color: var(--thinkt-muted-color, #64748b);
}

.thinkt-search-preview-loading {
  font-size: 12px;
  color: var(--thinkt-muted-color, #64748b);
  font-style: italic;
  padding: 8px;
  background: var(--thinkt-bg-tertiary, #181a1f);
  border-radius: var(--radius-sm, 4px);
}
`;

// ============================================
// Component Class
// ============================================

export class SearchOverlay {
  private elements: SearchOverlayElements;
  private options: SearchOverlayOptions;
  private client: ThinktClient;
  private overlay: HTMLElement | null = null;
  private input: HTMLInputElement | null = null;
  private results: SearchSessionResult[] = [];
  private filteredResults: SearchSessionResult[] = [];
  private projects: Map<string, ProjectInfo> = new Map();
  private selectedProjects: Set<string> = new Set();
  private selectedIndex = -1;
  private searchController: AbortController | null = null;
  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private abortController = new AbortController();
  private isOpen = false;

  // Search options
  private caseSensitive = false;
  private useRegex = false;
  private searchMode: 'text' | 'semantic' = 'text';
  private semanticResults: SemanticSearchResult[] = [];
  private filteredSemanticResults: SemanticSearchResult[] = [];
  private semanticPreviews: Map<string, string> = new Map(); // entry_uuid -> preview text

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
    this.projects.clear();
    this.selectedProjects.clear();
    this.selectedIndex = -1;
    this.semanticResults = [];
    this.filteredSemanticResults = [];
    this.semanticPreviews.clear();
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
            <span>${i18n._('Search Sessions')}</span>
            <div class="thinkt-search-mode-toggle">
              <button class="thinkt-search-mode-btn active" data-mode="text">${i18n._('Text')}</button>
              <button class="thinkt-search-mode-btn" data-mode="semantic">${i18n._('Semantic')}</button>
            </div>
            <kbd>${i18n._('esc')}</kbd>
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
  }

  // ============================================
  // Event Listeners
  // ============================================

  private attachListeners(): void {
    if (!this.overlay) return;

    // Close on backdrop click
    const handleBackdropClick = (e: MouseEvent) => {
      if (e.target === this.overlay) {
        this.close();
      }
    };
    this.overlay.addEventListener('click', handleBackdropClick, { signal: this.abortController.signal });

    // Input handling with debounce
    if (this.input) {
      const handleInput = () => this.handleSearchInput();
      this.input.addEventListener('input', handleInput, { signal: this.abortController.signal });

      const handleKeydown = (e: KeyboardEvent) => this.handleKeydown(e);
      this.input.addEventListener('keydown', handleKeydown, { signal: this.abortController.signal });
    }

    // Option checkboxes
    const caseSensitiveCheckbox = this.overlay.querySelector<HTMLInputElement>('#search-case-sensitive');
    const regexCheckbox = this.overlay.querySelector<HTMLInputElement>('#search-regex');

    if (caseSensitiveCheckbox) {
      const handleChange = () => {
        this.caseSensitive = caseSensitiveCheckbox.checked;
        this.triggerSearch();
      };
      caseSensitiveCheckbox.addEventListener('change', handleChange, { signal: this.abortController.signal });
    }

    if (regexCheckbox) {
      const handleChange = () => {
        this.useRegex = regexCheckbox.checked;
        this.triggerSearch();
      };
      regexCheckbox.addEventListener('change', handleChange, { signal: this.abortController.signal });
    }

    // Mode toggle
    const modeButtons = this.overlay?.querySelectorAll<HTMLButtonElement>('.thinkt-search-mode-btn');
    modeButtons?.forEach(btn => {
      const handleClick = () => {
        const mode = btn.dataset.mode as 'text' | 'semantic';
        this.setSearchMode(mode);
      };
      btn.addEventListener('click', handleClick, { signal: this.abortController.signal });
    });

    // Global keyboard shortcuts
    const handleGlobalKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
      }
    };
    document.addEventListener('keydown', handleGlobalKeydown, { signal: this.abortController.signal });
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

    // Re-run search if there's a query
    this.triggerSearch();
  }

  // ============================================
  // Project Filter
  // ============================================

  private extractProjects(results: SearchSessionResult[]): Map<string, ProjectInfo> {
    const projects = new Map<string, ProjectInfo>();
    
    for (const result of results) {
      const name = result.project_name;
      if (!name) continue;
      
      const existing = projects.get(name);
      if (existing) {
        existing.count++;
      } else {
        projects.set(name, {
          name,
          count: 1,
          source: result.source ?? 'claude',
        });
      }
    }
    
    return projects;
  }

  private extractProjectsFromSemantic(results: SemanticSearchResult[]): Map<string, ProjectInfo> {
    const projects = new Map<string, ProjectInfo>();

    for (const result of results) {
      const name = result.project_name;
      if (!name) continue;

      const existing = projects.get(name);
      if (existing) {
        existing.count++;
      } else {
        projects.set(name, {
          name,
          count: 1,
          source: result.source ?? 'claude',
        });
      }
    }

    return projects;
  }

  private renderProjects(): void {
    const container = this.overlay?.querySelector('.thinkt-search-projects') as HTMLElement | null;
    const list = this.overlay?.querySelector('.thinkt-search-projects-list') as HTMLElement | null;
    if (!container || !list) return;

    if (this.projects.size === 0) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'flex';
    
    // Sort projects by name
    const sortedProjects = Array.from(this.projects.values()).sort((a, b) => 
      a.name.localeCompare(b.name)
    );

    list.replaceChildren();
    
    for (const project of sortedProjects) {
      const item = document.createElement('div');
      item.className = 'thinkt-search-project-item';
      
      const isSelected = this.selectedProjects.has(project.name);
      
      item.innerHTML = `
        <input type="checkbox" id="proj-${this.escapeHtml(project.name)}" ${isSelected ? 'checked' : ''}>
        <label for="proj-${this.escapeHtml(project.name)}">
          <span class="thinkt-search-project-name" title="${this.escapeHtml(project.name)}">${this.escapeHtml(project.name)}</span>
          <span class="thinkt-search-project-count">${project.count}</span>
        </label>
      `;
      
      const checkbox = item.querySelector('input');
      if (checkbox) {
        const handleChange = () => {
          if (checkbox.checked) {
            this.selectedProjects.add(project.name);
          } else {
            this.selectedProjects.delete(project.name);
          }
          this.applyProjectFilter();
        };
        checkbox.addEventListener('change', handleChange, { signal: this.abortController.signal });
      }
      
      // Click on label toggles checkbox
      const label = item.querySelector('label');
      if (label) {
        label.addEventListener('click', (e) => {
          e.preventDefault();
          if (checkbox) {
            checkbox.checked = !checkbox.checked;
            checkbox.dispatchEvent(new Event('change'));
          }
        });
      }
      
      list.appendChild(item);
    }

    // Select All button
    const selectAllBtn = this.overlay?.querySelector<HTMLButtonElement>('#search-select-all');
    if (selectAllBtn) {
      const handleClick = () => {
        const allSelected = this.selectedProjects.size === this.projects.size;
        if (allSelected) {
          // Deselect all
          this.selectedProjects.clear();
        } else {
          // Select all
          for (const name of this.projects.keys()) {
            this.selectedProjects.add(name);
          }
        }
        // Re-render to update checkboxes
        this.renderProjects();
        this.applyProjectFilter();
      };
      selectAllBtn.addEventListener('click', handleClick, { signal: this.abortController.signal });
    }

    // Select None button
    const selectNoneBtn = this.overlay?.querySelector<HTMLButtonElement>('#search-select-none');
    if (selectNoneBtn) {
      const handleClick = () => {
        this.selectedProjects.clear();
        // Re-render to update checkboxes
        this.renderProjects();
        this.applyProjectFilter();
      };
      selectNoneBtn.addEventListener('click', handleClick, { signal: this.abortController.signal });
    }
  }

  private applyProjectFilter(): void {
    if (this.searchMode === 'semantic') {
      if (this.selectedProjects.size === 0) {
        this.filteredSemanticResults = [...this.semanticResults];
      } else {
        this.filteredSemanticResults = this.semanticResults.filter(r =>
          r.project_name && this.selectedProjects.has(r.project_name)
        );
      }
      this.selectedIndex = this.filteredSemanticResults.length > 0 ? 0 : -1;
      this.renderSemanticResultsList();
    } else {
      if (this.selectedProjects.size === 0) {
        this.filteredResults = [...this.results];
      } else {
        this.filteredResults = this.results.filter(r =>
          r.project_name && this.selectedProjects.has(r.project_name)
        );
      }
      this.selectedIndex = this.filteredResults.length > 0 ? 0 : -1;
      this.renderResultsList();
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
      this.showEmptyState();
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
    this.showLoadingState();

    try {
      if (this.searchMode === 'semantic') {
        await this.performSemanticSearch(query, controller.signal);
      } else {
        await this.performTextSearch(query, controller.signal);
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      const err = error instanceof Error ? error : new Error(String(error));
      this.showErrorState(err);
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
    this.results = response.sessions ?? [];

    this.projects = this.extractProjects(this.results);
    this.selectedProjects = new Set(this.projects.keys());

    this.filteredResults = [...this.results];
    this.selectedIndex = this.filteredResults.length > 0 ? 0 : -1;

    this.renderProjects();
    this.renderResultsList();
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

    // Extract projects from semantic results
    this.projects = this.extractProjectsFromSemantic(this.semanticResults);
    this.selectedProjects = new Set(this.projects.keys());

    this.filteredSemanticResults = [...this.semanticResults];
    this.selectedIndex = this.filteredSemanticResults.length > 0 ? 0 : -1;

    this.renderProjects();
    this.renderSemanticResultsList();

    // Fetch previews asynchronously
    void this.fetchSemanticPreviews();
  }

  private renderSemanticResultsList(): void {
    const content = this.overlay?.querySelector('.thinkt-search-content');
    if (!content) return;

    if (this.filteredSemanticResults.length === 0) {
      content.innerHTML = `
        <div class="thinkt-search-empty">
          <div class="thinkt-search-empty-icon">🧠</div>
          <div>${i18n._('No semantic matches found')}</div>
        </div>
      `;
      return;
    }

    const list = document.createElement('ul');
    list.className = 'thinkt-search-results';

    this.filteredSemanticResults.forEach((result, index) => {
      const item = this.createSemanticResultItem(result, index);
      list.appendChild(item);
    });

    content.replaceChildren();
    content.appendChild(list);

    this.updateSelection();
  }

  private createSemanticResultItem(result: SemanticSearchResult, index: number): HTMLElement {
    const li = document.createElement('li');
    li.className = 'thinkt-search-result';
    if (index === this.selectedIndex) {
      li.classList.add('selected');
    }

    const source = result.source ?? 'claude';
    const distance = result.distance ?? 1;
    const relevance = this.formatRelevance(distance);
    const firstPrompt = result.first_prompt
      ? this.escapeHtml(this.truncate(result.first_prompt, 120))
      : '';
    const timestamp = result.timestamp ? this.formatTimestamp(result.timestamp) : '';
    const entryUuid = result.entry_uuid ?? '';
    const preview = this.semanticPreviews.get(entryUuid);
    const role = result.role ?? '';

    const previewHtml = preview
      ? `<div class="thinkt-search-result-preview"><span class="thinkt-search-result-role">[${this.escapeHtml(role)}]:</span> ${this.escapeHtml(this.truncate(preview, PREVIEW_TRUNCATE_LENGTH))}</div>`
      : `<div class="thinkt-search-preview-loading" data-entry-uuid="${this.escapeHtml(entryUuid)}">${i18n._('Loading preview...')}</div>`;

    li.innerHTML = `
      <div class="thinkt-search-result-header">
        <span class="thinkt-search-result-project">${this.escapeHtml(result.project_name ?? i18n._('Unknown'))}</span>
        <span class="thinkt-search-result-sep">·</span>
        <span class="thinkt-search-result-session">${this.escapeHtml(this.shortenId(result.session_id ?? ''))}</span>
        <span class="thinkt-search-result-source thinkt-search-result-source--${source}">${source}</span>
        <span class="thinkt-search-result-timestamp">${timestamp}</span>
        <span class="thinkt-search-result-relevance ${relevance.className}">${relevance.label}</span>
      </div>
      ${firstPrompt ? `<div class="thinkt-search-result-first-prompt">${firstPrompt}</div>` : ''}
      ${previewHtml}
    `;

    li.addEventListener('click', () => { void this.selectSemanticResult(result); });
    li.addEventListener('mouseenter', () => {
      this.selectedIndex = index;
      this.updateSelection();
    });

    return li;
  }

  private formatRelevance(distance: number): { label: string; className: string } {
    if (distance < 0.5) return { label: i18n._('High'), className: '' };
    if (distance < 1.0) return { label: i18n._('Medium'), className: 'medium' };
    return { label: i18n._('Low'), className: 'low' };
  }

  private formatTimestamp(ts: string): string {
    try {
      const date = new Date(ts);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return i18n._('today');
      if (diffDays === 1) return i18n._('yesterday');
      if (diffDays < 7) return i18n._('{days}d ago', { days: diffDays });
      if (diffDays < 30) return i18n._('{weeks}w ago', { weeks: Math.floor(diffDays / 7) });
      return date.toLocaleDateString();
    } catch {
      return '';
    }
  }

  private truncate(text: string, maxLen: number): string {
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen) + '...';
  }

  private async selectSemanticResult(result: SemanticSearchResult): Promise<void> {
    try {
      await this.options.onSessionSelect?.(result, result.line_number);
    } finally {
      this.close();
    }
  }

  private async fetchSemanticPreviews(): Promise<void> {
    // Group results by session_path to minimize API calls
    const sessionGroups = new Map<string, SemanticSearchResult[]>();
    for (const result of this.filteredSemanticResults) {
      if (!result.session_path || !result.entry_uuid) continue;
      const group = sessionGroups.get(result.session_path) ?? [];
      group.push(result);
      sessionGroups.set(result.session_path, group);
    }

    // Fetch each session and extract matching entries
    const fetchPromises = Array.from(sessionGroups.entries()).map(
      async ([sessionPath, results]) => {
        try {
          const session = await this.client.getSession(sessionPath);
          for (const result of results) {
            const entry = session.entries.find(e => e.uuid === result.entry_uuid);
            if (entry?.text) {
              this.semanticPreviews.set(result.entry_uuid!, entry.text);
            }
          }
        } catch (error) {
          console.warn('[THINKT] Failed to fetch preview for session:', sessionPath, error);
        }
      }
    );

    await Promise.allSettled(fetchPromises);

    // Update the DOM with previews if still in semantic mode
    if (this.searchMode === 'semantic' && this.isOpen) {
      this.updateSemanticPreviews();
    }
  }

  private updateSemanticPreviews(): void {
    const loadingElements = this.overlay?.querySelectorAll<HTMLElement>('.thinkt-search-preview-loading');
    loadingElements?.forEach(el => {
      const uuid = el.dataset.entryUuid;
      if (!uuid) return;
      const preview = this.semanticPreviews.get(uuid);
      if (preview) {
        // Find the corresponding result to get the role
        const result = this.filteredSemanticResults.find(r => r.entry_uuid === uuid);
        const role = result?.role ?? '';
        el.className = 'thinkt-search-result-preview';
        el.innerHTML = `<span class="thinkt-search-result-role">[${this.escapeHtml(role)}]:</span> ${this.escapeHtml(this.truncate(preview, PREVIEW_TRUNCATE_LENGTH))}`;
      }
    });
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
    if (this.filteredResults.length === 0) return;
    this.selectedIndex = (this.selectedIndex + 1) % this.filteredResults.length;
    this.updateSelection();
  }

  private selectPrevious(): void {
    if (this.filteredResults.length === 0) return;
    this.selectedIndex = this.selectedIndex <= 0 ? this.filteredResults.length - 1 : this.selectedIndex - 1;
    this.updateSelection();
  }

  private selectCurrent(): void {
    if (this.searchMode === 'semantic') {
      if (this.selectedIndex >= 0 && this.selectedIndex < this.filteredSemanticResults.length) {
        const result = this.filteredSemanticResults[this.selectedIndex];
        if (result) {
          void this.selectSemanticResult(result);
        }
      }
    } else {
      if (this.selectedIndex >= 0 && this.selectedIndex < this.filteredResults.length) {
        const result = this.filteredResults[this.selectedIndex];
        if (result) {
          void this.selectResult(result);
        }
      }
    }
  }

  private updateSelection(): void {
    const results = this.overlay?.querySelectorAll('.thinkt-search-result');
    results?.forEach((el, index) => {
      el.classList.toggle('selected', index === this.selectedIndex);
      if (index === this.selectedIndex) {
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    });
  }

  // ============================================
  // Rendering
  // ============================================

  private showEmptyState(): void {
    const content = this.overlay?.querySelector('.thinkt-search-content') as HTMLElement | null;
    const projectsPanel = this.overlay?.querySelector('.thinkt-search-projects') as HTMLElement | null;
    if (!content) return;

    if (projectsPanel) {
      projectsPanel.style.display = 'none';
    }

    content.innerHTML = `
      <div class="thinkt-search-empty">
        <div class="thinkt-search-empty-icon">🔍</div>
        <div>Type to search across all indexed sessions</div>
      </div>
    `;
  }

  private showLoadingState(): void {
    const content = this.overlay?.querySelector('.thinkt-search-content');
    if (!content) return;

    content.innerHTML = `
      <div class="thinkt-search-loading">
        <div>${i18n._('Searching...')}</div>
      </div>
    `;
  }

  private showErrorState(error: Error): void {
    const content = this.overlay?.querySelector('.thinkt-search-content');
    if (!content) return;

    const isIndexerError = error.message.includes('indexer') || error.message.includes('503');

    if (isIndexerError) {
      content.innerHTML = `
        <div class="thinkt-search-no-indexer">
          <div class="thinkt-search-no-indexer-title">${i18n._('Indexer not available')}</div>
          <div>${i18n._('The search feature requires the thinkt-indexer to be installed and configured.')}</div>
        </div>
      `;
    } else {
      content.innerHTML = `
        <div class="thinkt-search-error">
          <div>${i18n._('Error: {message}', { message: this.escapeHtml(error.message) })}</div>
        </div>
      `;
    }
  }

  private renderResultsList(): void {
    const content = this.overlay?.querySelector('.thinkt-search-content');
    if (!content) return;

    if (this.filteredResults.length === 0) {
      if (this.results.length === 0) {
        content.innerHTML = `
          <div class="thinkt-search-empty">
            <div class="thinkt-search-empty-icon">😕</div>
            <div>${i18n._('No results found')}</div>
          </div>
        `;
      } else {
        content.innerHTML = `
          <div class="thinkt-search-empty">
            <div class="thinkt-search-empty-icon">📁</div>
            <div>${i18n._('No results for selected projects')}</div>
            <div style="font-size: 11px; margin-top: 8px;">${i18n._('Select projects from the sidebar to filter')}</div>
          </div>
        `;
      }
      return;
    }

    const list = document.createElement('ul');
    list.className = 'thinkt-search-results';

    this.filteredResults.forEach((result, index) => {
      const item = this.createResultItem(result, index);
      list.appendChild(item);
    });

    content.replaceChildren();
    content.appendChild(list);

    this.updateSelection();
  }

  private createResultItem(result: SearchSessionResult, index: number): HTMLElement {
    const li = document.createElement('li');
    li.className = 'thinkt-search-result';
    if (index === this.selectedIndex) {
      li.classList.add('selected');
    }

    const source = result.source ?? 'claude';
    const matches = result.matches ?? [];
    const matchCount = matches.length;

    const previewsHtml = matches.map((match: SearchMatch) => this.renderMatchPreview(match)).join('');

    li.innerHTML = `
      <div class="thinkt-search-result-header">
        <span class="thinkt-search-result-project">${this.escapeHtml(result.project_name ?? i18n._('Unknown'))}</span>
        <span class="thinkt-search-result-sep">·</span>
        <span class="thinkt-search-result-session">${this.escapeHtml(this.shortenId(result.session_id ?? ''))}</span>
        <span class="thinkt-search-result-source thinkt-search-result-source--${source}">${source}</span>
        <span class="thinkt-search-result-matches">${i18n._('{count, plural, one {# match} other {# matches}}', { count: matchCount })}</span>
      </div>
      ${previewsHtml}
    `;

    li.addEventListener('click', () => { void this.selectResult(result); });
    li.addEventListener('mouseenter', () => {
      this.selectedIndex = index;
      this.updateSelection();
    });

    return li;
  }

  private renderMatchPreview(match: SearchMatch): string {
    const preview = match.preview ?? '';
    const role = match.role ?? 'unknown';

    return `
      <div class="thinkt-search-result-preview">
        <span class="thinkt-search-result-role">[${this.escapeHtml(role)}]:</span>
        ${this.escapeHtml(preview)}
      </div>
    `;
  }

  private async selectResult(result: SearchSessionResult): Promise<void> {
    try {
      // Get the first match's line number for scrolling
      const firstMatch = result.matches?.[0];
      const lineNum = firstMatch?.line_num;
      // Wait for the callback to complete before closing
      await this.options.onSessionSelect?.(result, lineNum);
    } finally {
      this.close();
    }
  }

  // ============================================
  // Utilities
  // ============================================

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private shortenId(id: string): string {
    if (!id) return '';
    if (id.length > 8) {
      return id.slice(0, 8) + '...';
    }
    return id;
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