/**
 * SearchOverlay Component
 *
 * A modal overlay for searching across indexed sessions.
 * Features a project filter sidebar on the left for isolating results.
 */

import type { SearchSessionResult, SearchMatch, SearchOptions } from '@wethinkt/ts-thinkt/api';
import { type ThinktClient, getDefaultClient } from '@wethinkt/ts-thinkt/api';

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
  /** Callback when a session is selected (can be async) */
  onSessionSelect?: (result: SearchSessionResult) => void | Promise<void>;
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
  padding-top: 10vh;
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
  max-height: 70vh;
  background: var(--bg-secondary, #141414);
  border: 1px solid var(--border-color, #2a2a2a);
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
  border-bottom: 1px solid var(--border-color, #2a2a2a);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.thinkt-search-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #f0f0f0);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.thinkt-search-title kbd {
  font-family: var(--font-mono, monospace);
  font-size: 11px;
  font-weight: normal;
  padding: 2px 6px;
  background: var(--bg-tertiary, #1a1a1a);
  border: 1px solid var(--border-color-light, #333);
  border-radius: var(--radius-sm, 4px);
  color: var(--text-muted, #666);
}

.thinkt-search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.thinkt-search-icon {
  position: absolute;
  left: 12px;
  color: var(--text-muted, #666);
  font-size: 16px;
  pointer-events: none;
}

.thinkt-search-input {
  width: 100%;
  padding: 10px 12px 10px 36px;
  background: var(--bg-tertiary, #1a1a1a);
  border: 1px solid var(--border-color-light, #333);
  border-radius: var(--radius-md, 6px);
  color: var(--text-primary, #f0f0f0);
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s ease;
}

.thinkt-search-input:focus {
  border-color: var(--accent-primary, #6366f1);
}

.thinkt-search-input::placeholder {
  color: var(--text-muted, #666);
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
  color: var(--text-secondary, #a0a0a0);
  cursor: pointer;
  user-select: none;
}

.thinkt-search-option input[type="checkbox"] {
  width: 14px;
  height: 14px;
  accent-color: var(--accent-primary, #6366f1);
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
  border-right: 1px solid var(--border-color, #2a2a2a);
  background: var(--bg-tertiary, #1a1a1a);
  display: flex;
  flex-direction: column;
}

.thinkt-search-projects-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color, #2a2a2a);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted, #666);
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
  color: var(--accent-primary, #6366f1);
  font-size: 11px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
}

.thinkt-search-projects-actions button:hover {
  background: var(--bg-hover, #252525);
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
  color: var(--text-secondary, #a0a0a0);
  transition: background-color 0.12s ease;
}

.thinkt-search-project-item:hover {
  background: var(--bg-hover, #252525);
}

.thinkt-search-project-item input[type="checkbox"] {
  width: 14px;
  height: 14px;
  accent-color: var(--accent-primary, #6366f1);
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
  color: var(--text-muted, #666);
  background: var(--bg-secondary, #141414);
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
  background: var(--bg-hover, #252525);
}

.thinkt-search-result.selected {
  border-left: 2px solid var(--accent-primary, #6366f1);
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
  color: var(--text-primary, #f0f0f0);
}

.thinkt-search-result-sep {
  color: var(--text-muted, #666);
  font-size: 12px;
}

.thinkt-search-result-session {
  font-family: var(--font-mono, monospace);
  font-size: 12px;
  color: var(--text-secondary, #a0a0a0);
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
  color: var(--text-muted, #666);
  margin-left: auto;
}

.thinkt-search-result-preview {
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-secondary, #a0a0a0);
  font-family: var(--font-mono, monospace);
  padding: 8px;
  background: var(--bg-tertiary, #1a1a1a);
  border-radius: var(--radius-sm, 4px);
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

.thinkt-search-result-preview mark {
  background: rgba(99, 102, 241, 0.3);
  color: var(--text-primary, #f0f0f0);
  padding: 1px 2px;
  border-radius: 2px;
  font-weight: 600;
}

.thinkt-search-result-role {
  display: inline-block;
  font-size: 10px;
  color: var(--text-muted, #666);
  margin-right: 8px;
  text-transform: lowercase;
}

.thinkt-search-empty,
.thinkt-search-loading,
.thinkt-search-error {
  padding: 48px;
  text-align: center;
  color: var(--text-muted, #666);
}

.thinkt-search-empty-icon {
  font-size: 32px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.thinkt-search-help {
  padding: 12px 16px;
  border-top: 1px solid var(--border-color, #2a2a2a);
  font-size: 11px;
  color: var(--text-muted, #666);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.thinkt-search-help kbd {
  font-family: var(--font-mono, monospace);
  padding: 2px 4px;
  background: var(--bg-tertiary, #1a1a1a);
  border: 1px solid var(--border-color-light, #333);
  border-radius: var(--radius-sm, 4px);
  margin: 0 2px;
}

.thinkt-search-no-indexer {
  padding: 32px;
  text-align: center;
  color: var(--text-muted, #666);
}

.thinkt-search-no-indexer-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary, #a0a0a0);
  margin-bottom: 8px;
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
  private isLoading = false;
  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private boundHandlers: Array<() => void> = [];
  private stylesInjected = false;
  private isOpen = false;

  // Search options
  private caseSensitive = false;
  private useRegex = false;

  constructor(options: SearchOverlayOptions) {
    this.elements = options.elements;
    this.options = options;
    this.client = options.client ?? getDefaultClient();
    this.injectStyles();
  }

  // ============================================
  // Styles
  // ============================================

  private injectStyles(): void {
    if (this.stylesInjected) return;

    const styleId = 'thinkt-search-overlay-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = OVERLAY_STYLES;
      document.head.appendChild(style);
    }
    this.stylesInjected = true;
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
    }, 150);
  }

  private cleanup(): void {
    this.boundHandlers.forEach(remove => remove());
    this.boundHandlers = [];

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
            <span>Search Sessions</span>
            <kbd>esc</kbd>
          </div>
          <div class="thinkt-search-input-wrapper">
            <span class="thinkt-search-icon">🔍</span>
            <input type="text" class="thinkt-search-input" placeholder="Type to search across all sessions..." autocomplete="off">
          </div>
          <div class="thinkt-search-options">
            <label class="thinkt-search-option">
              <input type="checkbox" id="search-case-sensitive">
              <span>Case sensitive</span>
            </label>
            <label class="thinkt-search-option">
              <input type="checkbox" id="search-regex">
              <span>Regex</span>
            </label>
          </div>
        </div>
        <div class="thinkt-search-body">
          <div class="thinkt-search-projects" style="display: none;">
            <div class="thinkt-search-projects-header">
              <span>Projects</span>
              <div class="thinkt-search-projects-actions">
                <button id="search-select-all">All</button>
                <button id="search-select-none">None</button>
              </div>
            </div>
            <div class="thinkt-search-projects-list"></div>
          </div>
          <div class="thinkt-search-content">
            <div class="thinkt-search-empty">
              <div class="thinkt-search-empty-icon">🔍</div>
              <div>Type to search across all indexed sessions</div>
            </div>
          </div>
        </div>
        <div class="thinkt-search-help">
          <span><kbd>↑</kbd><kbd>↓</kbd> to navigate <kbd>↵</kbd> to select</span>
          <span>Search uses the indexer database</span>
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
    this.overlay.addEventListener('click', handleBackdropClick);
    this.boundHandlers.push(() => this.overlay?.removeEventListener('click', handleBackdropClick));

    // Input handling with debounce
    if (this.input) {
      const handleInput = () => this.handleSearchInput();
      this.input.addEventListener('input', handleInput);
      this.boundHandlers.push(() => this.input?.removeEventListener('input', handleInput));

      const handleKeydown = (e: KeyboardEvent) => this.handleKeydown(e);
      this.input.addEventListener('keydown', handleKeydown);
      this.boundHandlers.push(() => this.input?.removeEventListener('keydown', handleKeydown));
    }

    // Option checkboxes
    const caseSensitiveCheckbox = this.overlay.querySelector<HTMLInputElement>('#search-case-sensitive');
    const regexCheckbox = this.overlay.querySelector<HTMLInputElement>('#search-regex');

    if (caseSensitiveCheckbox) {
      const handleChange = () => {
        this.caseSensitive = caseSensitiveCheckbox.checked;
        this.triggerSearch();
      };
      caseSensitiveCheckbox.addEventListener('change', handleChange);
      this.boundHandlers.push(() => caseSensitiveCheckbox.removeEventListener('change', handleChange));
    }

    if (regexCheckbox) {
      const handleChange = () => {
        this.useRegex = regexCheckbox.checked;
        this.triggerSearch();
      };
      regexCheckbox.addEventListener('change', handleChange);
      this.boundHandlers.push(() => regexCheckbox.removeEventListener('change', handleChange));
    }

    // Global keyboard shortcuts
    const handleGlobalKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
      }
    };
    document.addEventListener('keydown', handleGlobalKeydown);
    this.boundHandlers.push(() => document.removeEventListener('keydown', handleGlobalKeydown));
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

    list.innerHTML = '';
    
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
        checkbox.addEventListener('change', handleChange);
        this.boundHandlers.push(() => checkbox.removeEventListener('change', handleChange));
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
      selectAllBtn.addEventListener('click', handleClick);
      this.boundHandlers.push(() => selectAllBtn.removeEventListener('click', handleClick));
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
      selectNoneBtn.addEventListener('click', handleClick);
      this.boundHandlers.push(() => selectNoneBtn.removeEventListener('click', handleClick));
    }
  }

  private applyProjectFilter(): void {
    if (this.selectedProjects.size === 0) {
      // No projects selected, show all results
      this.filteredResults = [...this.results];
    } else {
      // Filter to selected projects
      this.filteredResults = this.results.filter(r => 
        r.project_name && this.selectedProjects.has(r.project_name)
      );
    }
    
    this.selectedIndex = this.filteredResults.length > 0 ? 0 : -1;
    this.renderResultsList();
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
    }, 150);
  }

  private triggerSearch(): void {
    const query = this.input?.value.trim() ?? '';
    if (query) {
      if (this.searchDebounceTimer) {
        clearTimeout(this.searchDebounceTimer);
      }
      this.searchDebounceTimer = setTimeout(() => {
        void this.performSearch(query);
      }, 150);
    }
  }

  private async performSearch(query: string): Promise<void> {
    if (this.isLoading) return;
    this.isLoading = true;
    this.showLoadingState();

    try {
      const options: SearchOptions = {
        query,
        limit: 50,
        limitPerSession: 2,
        caseSensitive: this.caseSensitive,
        regex: this.useRegex,
      };

      const response = await this.client.search(options);
      this.results = response.sessions ?? [];
      
      // Extract projects and select all by default
      this.projects = this.extractProjects(this.results);
      this.selectedProjects = new Set(this.projects.keys());
      
      this.filteredResults = [...this.results];
      this.selectedIndex = this.filteredResults.length > 0 ? 0 : -1;
      
      this.renderProjects();
      this.renderResultsList();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.showErrorState(err);
      this.options.onError?.(err);
    } finally {
      this.isLoading = false;
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
    if (this.selectedIndex >= 0 && this.selectedIndex < this.filteredResults.length) {
      const result = this.filteredResults[this.selectedIndex];
      if (result) {
        void this.selectResult(result);
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
        <div>Searching...</div>
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
          <div class="thinkt-search-no-indexer-title">Indexer not available</div>
          <div>The search feature requires the thinkt-indexer to be installed and configured.</div>
        </div>
      `;
    } else {
      content.innerHTML = `
        <div class="thinkt-search-error">
          <div>Error: ${this.escapeHtml(error.message)}</div>
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
            <div>No results found</div>
          </div>
        `;
      } else {
        content.innerHTML = `
          <div class="thinkt-search-empty">
            <div class="thinkt-search-empty-icon">📁</div>
            <div>No results for selected projects</div>
            <div style="font-size: 11px; margin-top: 8px;">Select projects from the sidebar to filter</div>
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

    content.innerHTML = '';
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
        <span class="thinkt-search-result-project">${this.escapeHtml(result.project_name)}</span>
        <span class="thinkt-search-result-sep">·</span>
        <span class="thinkt-search-result-session">${this.escapeHtml(this.shortenId(result.session_id))}</span>
        <span class="thinkt-search-result-source thinkt-search-result-source--${source}">${source}</span>
        <span class="thinkt-search-result-matches">${matchCount} match${matchCount !== 1 ? 'es' : ''}</span>
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
      // Wait for the callback to complete before closing
      await this.options.onSessionSelect?.(result);
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

// ============================================
// Factory Function
// ============================================

export function createSearchOverlay(options: SearchOverlayOptions): SearchOverlay {
  return new SearchOverlay(options);
}
