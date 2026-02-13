/**
 * ProjectBrowser Component
 *
 * A standalone component for browsing THINKT projects.
 * Can be embedded in the main viewer or used independently (e.g., in VSCode extension).
 */

import type { Project } from '@wethinkt/ts-thinkt';
import { type ThinktClient, getDefaultClient } from '@wethinkt/ts-thinkt/api';

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
  /** Initial source filter */
  initialSource?: string;
  /** Enable search filtering */
  enableSearch?: boolean;
  /** Enable source filtering */
  enableSourceFilter?: boolean;
  /** Custom CSS class prefix */
  classPrefix?: string;
}

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
  private searchQuery = '';
  private currentSourceFilter: string | null = null;
  private selectedIndex = -1;
  private isLoading = false;
  private itemElements: Map<string, HTMLElement> = new Map();
  private boundHandlers: Array<() => void> = [];
  private disposed = false;
  private stylesInjected = false;

  constructor(options: ProjectBrowserOptions) {
    this.elements = options.elements;
    this.options = {
      ...options,
      enableSearch: options.enableSearch ?? true,
      enableSourceFilter: options.enableSourceFilter ?? true,
      classPrefix: options.classPrefix ?? 'thinkt-project-browser',
    };
    this.currentSourceFilter = options.initialSource ?? null;

    // Get client (either provided or default)
    this.client = options.client ?? getDefaultClient();
    this.init();
    
    // Load projects after initialization
    void this.loadProjects(this.currentSourceFilter ?? undefined);
  }

  // ============================================
  // Initialization
  // ============================================

  private init(): void {
    this.injectStyles();
    this.createStructure();
    this.attachListeners();
  }

  private injectStyles(): void {
    if (this.stylesInjected) return;

    const styleId = 'thinkt-project-browser-styles';
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
      searchInput.placeholder = 'Search projects...';
      searchInput.value = this.searchQuery;
      if (!this.elements.searchInput) {
        this.elements.searchInput = searchInput;
        toolbar.appendChild(searchInput);
      }
    }

    // Source filter
    if (this.options.enableSourceFilter) {
      const sourceFilter = this.elements.sourceFilter ?? document.createElement('select');
      sourceFilter.className = `${classPrefix}__filter`;
      sourceFilter.innerHTML = `
        <option value="">All Sources</option>
        <option value="claude">Claude</option>
        <option value="kimi">Kimi</option>
        <option value="gemini">Gemini</option>
      `;
      sourceFilter.value = this.currentSourceFilter ?? '';
      if (!this.elements.sourceFilter) {
        this.elements.sourceFilter = sourceFilter;
        toolbar.appendChild(sourceFilter);
      }
    }

    if (hasToolbar && toolbar.childElementCount > 0) {
      header.appendChild(toolbar);
    }

    // Stats
    const stats = document.createElement('div');
    stats.className = `${classPrefix}__stats`;
    stats.textContent = 'Loading...';
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
      this.elements.loadingIndicator.textContent = 'Loading projects...';
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
    const { searchInput, sourceFilter, container } = this.elements;

    // Search input
    if (searchInput) {
      const handleSearch = () => {
        this.searchQuery = searchInput.value.toLowerCase();
        this.filterProjects();
      };
      searchInput.addEventListener('input', handleSearch);
      this.boundHandlers.push(() => searchInput.removeEventListener('input', handleSearch));
    }

    // Source filter
    if (sourceFilter) {
      const handleFilter = () => {
        this.currentSourceFilter = sourceFilter.value || null;
        void this.loadProjects(this.currentSourceFilter ?? undefined);
      };
      sourceFilter.addEventListener('change', handleFilter);
      this.boundHandlers.push(() => sourceFilter.removeEventListener('change', handleFilter));
    }

    // Keyboard navigation
    const handleKeydown = (e: KeyboardEvent) => this.handleKeydown(e);
    container.addEventListener('keydown', handleKeydown);
    this.boundHandlers.push(() => container.removeEventListener('keydown', handleKeydown));

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

  async loadProjects(source?: string): Promise<void> {
    if (this.isLoading) return;
    if (typeof source === 'string') {
      this.currentSourceFilter = source || null;
    }
    const activeSource = this.currentSourceFilter ?? undefined;

    this.isLoading = true;
    this.showLoading(true);
    this.showError(null);

    try {
      this.projects = await this.client.getProjects(activeSource);
      this.filterProjects();
      void Promise.resolve(this.options.onProjectsLoaded?.(this.projects));
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.showError(err);
      this.options.onError?.(err);
    } finally {
      this.isLoading = false;
      this.showLoading(false);
      const latestSource = this.currentSourceFilter ?? undefined;
      if (latestSource !== activeSource) {
        void this.loadProjects(latestSource);
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

    if (error) {
      this.elements.errorDisplay.innerHTML = '';
      const msgDiv = document.createElement('div');
      msgDiv.textContent = error.message;
      this.elements.errorDisplay.appendChild(msgDiv);

      const retryBtn = document.createElement('button');
      retryBtn.className = `${this.options.classPrefix}__retry`;
      retryBtn.textContent = 'Retry';
      retryBtn.addEventListener('click', () => {
        void this.loadProjects(this.currentSourceFilter ?? undefined);
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
    const searchTerm = this.searchQuery.trim();

    this.filteredProjects = this.projects.filter(project => {
      const matchesSearch = !searchTerm ||
        project.name?.toLowerCase().includes(searchTerm) ||
        project.path?.toLowerCase().includes(searchTerm);

      return matchesSearch;
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
      const total = this.projects.length;
      const showing = this.filteredProjects.length;
      if (showing === total) {
        stats.textContent = `${total} project${total !== 1 ? 's' : ''}`;
      } else {
        stats.textContent = `Showing ${showing} of ${total} projects`;
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

    if (this.filteredProjects.length === 0) {
      const empty = document.createElement('div');
      empty.className = `${this.options.classPrefix}__empty`;
      empty.textContent = this.projects.length === 0
        ? 'No projects found'
        : 'No projects match your search';
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
        <div class="${classPrefix}__name">${this.escapeHtml(project.name ?? 'Unknown')}</div>
        <div class="${classPrefix}__path">${this.escapeHtml(project.displayPath ?? project.path ?? '')}</div>
      </div>
      <div class="${classPrefix}__meta">
        <span class="${classPrefix}__count">${project.sessionCount ?? 0}</span>
        <span>session${(project.sessionCount ?? 0) !== 1 ? 's' : ''}</span>
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
    void this.loadProjects(this.currentSourceFilter ?? undefined);
  }

  /**
   * Set the search query
   */
  setSearch(query: string): void {
    this.searchQuery = query.toLowerCase();
    if (this.elements.searchInput) {
      this.elements.searchInput.value = query;
    }
    if (this.isLoading) return;
    this.filterProjects();
  }

  /**
   * Set the source filter
   */
  setSourceFilter(source: string | null): void {
    const normalized = source && source.length > 0 ? source : null;
    if (this.currentSourceFilter === normalized) {
      return;
    }
    this.currentSourceFilter = normalized;
    if (this.elements.sourceFilter) {
      this.elements.sourceFilter.value = normalized ?? '';
    }
    void this.loadProjects(normalized ?? undefined);
  }

  /**
   * Focus the search input
   */
  focusSearch(): void {
    this.elements.searchInput?.focus();
  }

  // ============================================
  // Cleanup
  // ============================================

  dispose(): void {
    if (this.disposed) return;

    // Remove event listeners
    this.boundHandlers.forEach(remove => remove());
    this.boundHandlers = [];

    // Clear references
    this.itemElements.clear();
    this.projects = [];
    this.filteredProjects = [];

    // Remove elements created by us (but not the container)
    const content = this.elements.container.querySelector(`.${this.options.classPrefix}__content`);
    if (content) {
      content.innerHTML = '';
    }

    this.disposed = true;
  }
}

// ============================================
// Factory Function
// ============================================

export function createProjectBrowser(options: ProjectBrowserOptions): ProjectBrowser {
  return new ProjectBrowser(options);
}
