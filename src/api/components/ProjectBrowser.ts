/**
 * ProjectBrowser Component
 *
 * A standalone component for browsing THINKT projects.
 * Can be embedded in the main viewer or used independently (e.g., in VSCode extension).
 */

import type { Project } from '@wethinkt/ts-thinkt';
import { type ThinktClient, getDefaultClient } from '@wethinkt/ts-thinkt/api';
import { i18n } from '@lingui/core';
import type { ProjectFilterState } from './ApiViewer';
import { injectStyleSheet } from './style-manager';

// ============================================
// Types
// ============================================

export interface ProjectBrowserElements {
  /** Container element */
  container: HTMLElement;
  /** Search input (optional) */
  searchInput?: HTMLInputElement;
  /** Source filter dropdown (optional) */
  sourceFilter?: HTMLSelectElement;
  /** Loading indicator (optional, will be created if not provided) */
  loadingIndicator?: HTMLElement;
  /** Error display (optional, will be created if not provided) */
  errorDisplay?: HTMLElement;
}

export interface ProjectBrowserOptions {
  elements: ProjectBrowserElements;
  /** API client instance (defaults to getDefaultClient()) */
  client?: ThinktClient;
  /** Callback when a project is selected */
  onProjectSelect?: (project: Project) => void;
  /** Callback when projects are loaded */
  onProjectsLoaded?: (projects: Project[]) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Custom renderer for project items */
  projectRenderer?: (project: Project, index: number) => HTMLElement;
  /** Shared filter state owned by ApiViewer */
  filters?: ProjectFilterState;
  /** Enable search filtering */
  enableSearch?: boolean;
  /** Enable source filtering */
  enableSourceFilter?: boolean;
  /** Custom CSS class prefix */
  classPrefix?: string;
}

export type ProjectSortMode = 'name_asc' | 'name_desc' | 'date_asc' | 'date_desc';

export interface ProjectItemState {
  project: Project;
  element: HTMLElement;
  index: number;
}

// ============================================
// Default Styles
// ============================================

const DEFAULT_STYLES = `
.thinkt-project-browser {
  display: flex;
  flex-direction: column;
  height: 100%;
  font-family: var(--thinkt-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
  color: var(--thinkt-text-color, #e0e0e0);
  background: var(--thinkt-bg-color, #1a1a1a);
}

.thinkt-project-browser__header {
  padding: 8px 12px;
  border-bottom: 1px solid var(--thinkt-border-color, #333);
  flex-shrink: 0;
}

.thinkt-project-browser__toolbar {
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
}

.thinkt-project-browser__search {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid var(--thinkt-border-color, #333);
  border-radius: 4px;
  background: var(--thinkt-input-bg, #252525);
  color: inherit;
  font-size: 13px;
}

.thinkt-project-browser__search:focus {
  outline: none;
  border-color: var(--thinkt-accent-color, #6366f1);
}

.thinkt-project-browser__search::placeholder {
  color: var(--thinkt-muted-color, #666);
}

.thinkt-project-browser__filter {
  padding: 6px 8px;
  border: 1px solid var(--thinkt-border-color, #333);
  border-radius: 4px;
  background: var(--thinkt-input-bg, #252525);
  color: inherit;
  font-size: 12px;
  min-width: 90px;
}

.thinkt-project-browser__stats {
  font-size: 11px;
  color: var(--thinkt-muted-color, #666);
}

.thinkt-project-browser__content {
  flex: 1;
  overflow-y: auto;
}

.thinkt-project-browser__list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.thinkt-project-browser__item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.12s ease;
  border-bottom: 1px solid var(--thinkt-border-color, #252525);
  border-left: 2px solid transparent;
}

.thinkt-project-browser__item:hover {
  background: var(--thinkt-hover-bg, #252525);
}

.thinkt-project-browser__item--selected {
  background: var(--thinkt-selected-bg, rgba(99, 102, 241, 0.15));
  border-left-color: var(--thinkt-accent-color, #6366f1);
}

.thinkt-project-browser__icon {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 10px;
  font-size: 14px;
  flex-shrink: 0;
}

.thinkt-project-browser__icon--claude {
  background: rgba(217, 119, 80, 0.15);
  color: #d97750;
}

.thinkt-project-browser__icon--kimi {
  background: rgba(25, 195, 155, 0.15);
  color: #19c39b;
}

.thinkt-project-browser__icon--gemini {
  background: rgba(99, 102, 241, 0.15);
  color: #6366f1;
}

.thinkt-project-browser__info {
  flex: 1;
  min-width: 0;
}

.thinkt-project-browser__name {
  font-weight: 500;
  font-size: 13px;
  margin-bottom: 1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--thinkt-text-color, #e0e0e0);
}

.thinkt-project-browser__path {
  font-size: 11px;
  color: var(--thinkt-muted-color, #666);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.thinkt-project-browser__meta {
  text-align: right;
  font-size: 11px;
  color: var(--thinkt-muted-color, #666);
}

.thinkt-project-browser__count {
  display: block;
  font-weight: 500;
  color: var(--thinkt-text-color, #e0e0e0);
}

.thinkt-project-browser__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: var(--thinkt-muted-color, #888);
}

.thinkt-project-browser__empty {
  text-align: center;
  padding: 48px;
  color: var(--thinkt-muted-color, #888);
}

.thinkt-project-browser__error {
  padding: 16px;
  margin: 16px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  color: #ef4444;
}

.thinkt-project-browser__retry {
  margin-top: 8px;
  padding: 6px 12px;
  background: transparent;
  border: 1px solid currentColor;
  border-radius: 4px;
  color: inherit;
  cursor: pointer;
  font-size: 12px;
}

.thinkt-project-browser__retry:hover {
  background: rgba(239, 68, 68, 0.2);
}
`;

// ============================================
// Component Class
// ============================================

export class ProjectBrowser {
  private elements: ProjectBrowserElements;
  private options: Required<Pick<ProjectBrowserOptions, 'enableSearch' | 'enableSourceFilter' | 'classPrefix'>> &
    Omit<ProjectBrowserOptions, 'enableSearch' | 'enableSourceFilter' | 'classPrefix'>;
  private client: ThinktClient;
  private projects: Project[] = [];
  private filteredProjects: Project[] = [];
  private discoveredSources: string[] = [];
  private filters: ProjectFilterState;
  private lastLoadedIncludeDeleted = false;
  private selectedIndex = -1;
  private loadController: AbortController | null = null;
  private itemElements: Map<string, HTMLElement> = new Map();
  private currentError: Error | null = null;
  private abortController = new AbortController();
  private disposed = false;

  constructor(options: ProjectBrowserOptions) {
    this.elements = options.elements;
    this.options = {
      ...options,
      enableSearch: options.enableSearch ?? true,
      enableSourceFilter: options.enableSourceFilter ?? true,
      classPrefix: options.classPrefix ?? 'thinkt-project-browser',
    };
    this.filters = options.filters ?? {
      searchQuery: '',
      sources: new Set(),
      sort: 'date_desc',
      includeDeleted: false,
    };

    // Get client (either provided or default)
    this.client = options.client ?? getDefaultClient();
    this.init();

    // Load projects after initialization
    void this.loadProjects();
  }

  // ============================================
  // Initialization
  // ============================================

  private init(): void {
    injectStyleSheet('thinkt-project-browser-styles', DEFAULT_STYLES);
    this.createStructure();
    this.attachListeners();

    window.addEventListener('thinkt:locale-changed', () => this.refreshI18n(), { signal: this.abortController.signal });
  }

  private createStructure(): void {
    const { container } = this.elements;
    const { classPrefix } = this.options;

    container.className = classPrefix;

    // Create header
    const header = document.createElement('div');
    header.className = `${classPrefix}__header`;

    const hasToolbar = this.options.enableSearch || this.options.enableSourceFilter;
    const toolbar = document.createElement('div');
    toolbar.className = `${classPrefix}__toolbar`;

    // Search input
    if (this.options.enableSearch) {
      const searchInput = this.elements.searchInput ?? document.createElement('input');
      searchInput.className = `${classPrefix}__search`;
      searchInput.type = 'text';
      searchInput.placeholder = i18n._('Filter projects...');
      searchInput.value = this.filters.searchQuery;
      if (!this.elements.searchInput) {
        this.elements.searchInput = searchInput;
        toolbar.appendChild(searchInput);
      }
    }

    // Source filter
    if (this.options.enableSourceFilter) {
      const sourceFilter = this.elements.sourceFilter ?? document.createElement('select');
      sourceFilter.className = `${classPrefix}__filter`;
      if (!this.elements.sourceFilter) {
        this.elements.sourceFilter = sourceFilter;
        toolbar.appendChild(sourceFilter);
      }
      this.renderSourceFilterOptions();
    }

    if (hasToolbar && toolbar.childElementCount > 0) {
      header.appendChild(toolbar);
    }

    // Stats
    const stats = document.createElement('div');
    stats.className = `${classPrefix}__stats`;
    stats.textContent = i18n._('Loading...');
    header.appendChild(stats);

    container.appendChild(header);

    // Content area
    const content = document.createElement('div');
    content.className = `${classPrefix}__content`;

    // List
    const list = document.createElement('ul');
    list.className = `${classPrefix}__list`;
    list.setAttribute('role', 'listbox');
    content.appendChild(list);

    // Loading indicator
    if (!this.elements.loadingIndicator) {
      this.elements.loadingIndicator = document.createElement('div');
      this.elements.loadingIndicator.className = `${classPrefix}__loading`;
      this.elements.loadingIndicator.textContent = i18n._('Loading projects...');
    }
    content.appendChild(this.elements.loadingIndicator);

    // Error display
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

    // Search input
    if (searchInput) {
      const handleSearch = () => {
        this.filters.searchQuery = searchInput.value.toLowerCase();
        this.filterProjects();
      };
      searchInput.addEventListener('input', handleSearch, { signal: this.abortController.signal });
    }

    // Native source filter removed; managed externally by ApiViewer

    // Keyboard navigation
    const handleKeydown = (e: KeyboardEvent) => this.handleKeydown(e);
    container.addEventListener('keydown', handleKeydown, { signal: this.abortController.signal });

    // Make container focusable
    container.setAttribute('tabindex', '0');
  }

  private handleKeydown(event: KeyboardEvent): void {
    if (this.filteredProjects.length === 0) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.selectIndex(Math.min(this.selectedIndex + 1, this.filteredProjects.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.selectIndex(Math.max(this.selectedIndex - 1, 0));
        break;
      case 'Enter':
        if (this.selectedIndex >= 0) {
          this.selectProject(this.filteredProjects[this.selectedIndex]);
        }
        break;
      case 'Home':
        event.preventDefault();
        this.selectIndex(0);
        break;
      case 'End':
        event.preventDefault();
        this.selectIndex(this.filteredProjects.length - 1);
        break;
    }
  }

  // ============================================
  // Data Loading
  // ============================================

  private get isLoading(): boolean {
    return this.loadController !== null && !this.loadController.signal.aborted;
  }

  async loadProjects(): Promise<void> {
    this.loadController?.abort();
    const controller = new AbortController();
    this.loadController = controller;

    this.showLoading(true);
    this.showError(null);

    try {
      // Fetch all projects regardless of source, we filter locally
      this.projects = await this.client.getProjects(undefined, {
        includeDeleted: this.filters.includeDeleted,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      this.lastLoadedIncludeDeleted = this.filters.includeDeleted;
      const seen = new Set(this.discoveredSources);
      this.projects.forEach((project) => {
        if (typeof project.source === 'string' && project.source.trim().length > 0) {
          seen.add(project.source.trim().toLowerCase());
        }
      });
      this.discoveredSources = Array.from(seen).sort((a, b) => a.localeCompare(b));
      this.renderSourceFilterOptions();
      this.filterProjects();
      void Promise.resolve(this.options.onProjectsLoaded?.(this.projects));
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

      const retryBtn = document.createElement('button');
      retryBtn.className = `${this.options.classPrefix}__retry`;
      retryBtn.textContent = i18n._('Retry');
      retryBtn.addEventListener('click', () => {
        void this.loadProjects();
      });
      this.elements.errorDisplay.appendChild(retryBtn);

      this.elements.errorDisplay.style.display = 'block';
    } else {
      this.elements.errorDisplay.style.display = 'none';
    }
  }

  // ============================================
  // Filtering
  // ============================================

  private filterProjects(): void {
    const searchTerm = this.filters.searchQuery.trim().toLowerCase();
    const sourceFilters = this.filters.sources;

    this.filteredProjects = this.projects.filter(project => {
      const matchesSearch = !searchTerm ||
        project.name?.toLowerCase().includes(searchTerm) ||
        project.path?.toLowerCase().includes(searchTerm);

      const matchesSource = sourceFilters.size === 0 ||
        (typeof project.source === 'string' && sourceFilters.has(project.source.trim().toLowerCase()));

      return matchesSearch && matchesSource;
    });
    this.filteredProjects.sort((a, b) => this.compareProjects(a, b));

    this.selectedIndex = -1;
    this.render();
  }

  private projectSortName(project: Project): string {
    return (project.name ?? project.displayPath ?? project.path ?? '').toLowerCase();
  }

  private projectSortTime(project: Project): number {
    if (!project.lastModified) return 0;
    const value = project.lastModified instanceof Date ? project.lastModified : new Date(project.lastModified);
    return Number.isNaN(value.getTime()) ? 0 : value.getTime();
  }

  private compareProjects(a: Project, b: Project): number {
    const byNameAsc = (): number => this.projectSortName(a).localeCompare(this.projectSortName(b));
    const byDateAsc = (): number => this.projectSortTime(a) - this.projectSortTime(b);

    switch (this.filters.sort) {
      case 'name_asc':
        return byNameAsc();
      case 'name_desc':
        return byNameAsc() * -1;
      case 'date_asc': {
        const byDate = byDateAsc();
        return byDate !== 0 ? byDate : byNameAsc();
      }
      case 'date_desc':
      default: {
        const byDate = byDateAsc() * -1;
        return byDate !== 0 ? byDate : byNameAsc();
      }
    }
  }

  private renderSourceFilterOptions(): void {
    // Native source option rendering removed; dropdown managed by ApiViewer
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
      const total = this.projects.length;
      const showing = this.filteredProjects.length;
      if (showing === total) {
        stats.textContent = i18n._('{count, plural, one {# project} other {# projects}}', { count: total });
      } else {
        stats.textContent = i18n._('Showing {showing} of {total} projects', { showing, total });
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

    if (this.filteredProjects.length === 0) {
      const empty = document.createElement('div');
      empty.className = `${this.options.classPrefix}__empty`;
      empty.textContent = this.projects.length === 0
        ? i18n._('No projects found')
        : i18n._('No projects match your search');
      list.parentElement?.appendChild(empty);
      return;
    }

    for (let i = 0; i < this.filteredProjects.length; i++) {
      const project = this.filteredProjects[i];
      const item = this.renderProjectItem(project, i);
      list.appendChild(item);
      this.itemElements.set(this.projectKey(project, i), item);
    }
  }

  private renderProjectItem(project: Project, index: number): HTMLElement {
    if (this.options.projectRenderer) {
      return this.options.projectRenderer(project, index);
    }

    const { classPrefix } = this.options;
    const li = document.createElement('li');
    li.className = `${classPrefix}__item`;
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', 'false');
    li.dataset.index = String(index);
    li.dataset.projectId = project.id;

    // Icon based on source
    const source = (project.source ?? 'claude') as string;
    const iconClass = `${classPrefix}__icon--${source}`;
    let icon = '🅲';
    if (source === 'kimi') icon = '🅺';
    if (source === 'gemini') icon = '🅶';

    li.innerHTML = `
      <div class="${classPrefix}__icon ${iconClass}">${icon}</div>
      <div class="${classPrefix}__info">
        <div class="${classPrefix}__name">${this.escapeHtml(project.name ?? i18n._('Unknown'))}</div>
        <div class="${classPrefix}__path">${this.escapeHtml(project.displayPath ?? project.path ?? '')}</div>
      </div>
      <div class="${classPrefix}__meta">
        <span class="${classPrefix}__count">${project.sessionCount ?? 0}</span>
        <span>${i18n._('{count, plural, one {session} other {sessions}}', { count: project.sessionCount ?? 0 })}</span>
      </div>
    `;

    li.addEventListener('click', () => {
      this.selectIndex(index);
      this.selectProject(project);
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

  private projectKey(project: Project, index: number): string {
    return project.id ?? `project-${index}`;
  }

  private selectIndex(index: number): void {
    // Deselect previous
    if (this.selectedIndex >= 0) {
      const prev = this.filteredProjects[this.selectedIndex];
      const prevItem = prev ? this.itemElements.get(this.projectKey(prev, this.selectedIndex)) : undefined;
      if (prevItem) {
        prevItem.classList.remove(`${this.options.classPrefix}__item--selected`);
        prevItem.setAttribute('aria-selected', 'false');
      }
    }

    this.selectedIndex = index;

    // Select new
    if (index >= 0) {
      const current = this.filteredProjects[index];
      const item = current ? this.itemElements.get(this.projectKey(current, index)) : undefined;
      if (item) {
        item.classList.add(`${this.options.classPrefix}__item--selected`);
        item.setAttribute('aria-selected', 'true');
        item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }

  private selectProject(project: Project): void {
    this.options.onProjectSelect?.(project);
  }

  // ============================================
  // Public API
  // ============================================

  /**
   * Get all loaded projects
   */
  getProjects(): Project[] {
    return [...this.projects];
  }

  /**
   * Get currently filtered projects
   */
  getFilteredProjects(): Project[] {
    return [...this.filteredProjects];
  }

  /**
   * Get the currently selected project
   */
  getSelectedProject(): Project | null {
    if (this.selectedIndex >= 0) {
      return this.filteredProjects[this.selectedIndex] ?? null;
    }
    return null;
  }

  /**
   * Select a project by ID
   */
  selectProjectById(projectId: string): void {
    const index = this.filteredProjects.findIndex(p => p.id === projectId);
    if (index >= 0) {
      this.selectIndex(index);
    }
  }

  /**
   * Refresh the project list
   */
  refresh(): void {
    void this.loadProjects();
  }

  /**
   * Apply current shared filter state. Reloads from API if includeDeleted changed.
   */
  applyFilters(): void {
    if (this.filters.includeDeleted !== this.lastLoadedIncludeDeleted) {
      void this.loadProjects();
      return;
    }
    if (!this.isLoading) {
      this.filterProjects();
    }
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
      this.elements.searchInput.placeholder = i18n._('Filter projects...');
    }
    if (this.elements.loadingIndicator) {
      this.elements.loadingIndicator.textContent = i18n._('Loading projects...');
    }

    this.renderSourceFilterOptions();
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

    // Cancel pending requests and event listeners
    this.abortController.abort();
    this.loadController?.abort();

    // Clear references
    this.itemElements.clear();
    this.projects = [];
    this.filteredProjects = [];

    // Remove elements created by us (but not the container)
    const content = this.elements.container.querySelector(`.${this.options.classPrefix}__content`);
    if (content) {
      content.replaceChildren();
    }

    this.disposed = true;
  }
}