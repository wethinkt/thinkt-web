/**
 * ProjectFilterBar Component
 *
 * Manages the shared project filter bar (search, source dropdown, sort, include-deleted)
 * and source discovery/capability tracking. Extracted from ApiViewer.
 */

import type { Project, SessionMeta } from '@wethinkt/ts-thinkt';
import { type ThinktClient } from '@wethinkt/ts-thinkt/api';
import { i18n } from '@lingui/core';
import type { ProjectSortMode } from './ProjectBrowser';
import type { ProjectFilterState } from './ApiViewer';
import { SourceResolver, type SourceCapability } from './SourceResolver';

// ============================================
// Types
// ============================================

export interface ProjectFilterBarOptions {
  container: HTMLElement;
  client: ThinktClient;
  filters: ProjectFilterState;
  signal: AbortSignal;
  onFiltersChanged: () => void;
  onSourcesDiscovered?: (sources: string[]) => void;
}

// ============================================
// Styles
// ============================================

const FILTER_BAR_STYLES = `
.thinkt-project-filter {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(110px, auto) minmax(94px, 110px);
  gap: 6px;
  align-items: center;
  padding: 6px 8px;
  border-bottom: 1px solid var(--thinkt-border-color, #2a2a2a);
  background: var(--thinkt-bg-secondary, #141414);
}

.thinkt-project-filter__search,
.thinkt-project-filter__sort {
  border: 1px solid var(--thinkt-border-color, #333);
  border-radius: 4px;
  background: var(--thinkt-input-bg, #252525);
  color: var(--thinkt-text-color, #e0e0e0);
  font-size: 12px;
  padding: 6px 8px;
}

.thinkt-project-filter__search {
  min-width: 0;
  width: 100%;
}

.thinkt-project-filter__sort {
  width: 100%;
  min-width: 0;
}

.thinkt-project-filter__search:focus,
.thinkt-project-filter__sort:focus {
  outline: none;
  border-color: var(--thinkt-accent-color, #6366f1);
}

.thinkt-source-dropdown {
  position: relative;
  width: 100%;
  min-width: 0;
}

.thinkt-source-dropdown__btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  border: 1px solid var(--thinkt-border-color, #333);
  border-radius: 4px;
  background: var(--thinkt-input-bg, #252525);
  color: var(--thinkt-text-color, #e0e0e0);
  font-size: 12px;
  padding: 6px 8px;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
  white-space: nowrap;
  overflow: hidden;
}

.thinkt-source-dropdown__btn:hover {
  border-color: var(--thinkt-accent-color, #6366f1);
}

.thinkt-source-dropdown__btn.active {
  background: var(--thinkt-hover-bg, #333);
  border-color: var(--thinkt-accent-color, #6366f1);
}

.thinkt-source-dropdown__btn span:first-child {
  overflow: hidden;
  text-overflow: ellipsis;
  margin-right: 8px;
}

.thinkt-source-dropdown__icon {
  font-size: 8px;
  color: var(--thinkt-muted-color, #666);
  transition: transform 0.2s ease;
}

.thinkt-source-dropdown__btn.active .thinkt-source-dropdown__icon {
  transform: rotate(180deg);
}

.thinkt-source-dropdown__menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  min-width: 160px;
  background: var(--thinkt-dropdown-bg, #1a1a1a);
  border: 1px solid var(--thinkt-border-color, #333);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  padding: 4px;
  z-index: 100;
  display: none;
  flex-direction: column;
  gap: 2px;
}

.thinkt-source-dropdown__menu.open {
  display: flex;
  animation: dropdownFadeIn 0.15s ease;
}

@keyframes dropdownFadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

.thinkt-source-dropdown__list {
  max-height: 200px;
  overflow-y: auto;
}

.thinkt-source-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  font-size: 12px;
  color: var(--thinkt-text-color, #e0e0e0);
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.1s ease;
  user-select: none;
}

.thinkt-source-option:hover {
  background: var(--thinkt-hover-bg, #2a2a2a);
}

.thinkt-source-option input[type="checkbox"] {
  margin: 0;
  accent-color: var(--thinkt-accent-color, #6366f1);
  cursor: pointer;
}

.thinkt-source-dropdown__divider {
  height: 1px;
  background: var(--thinkt-border-color, #333);
  margin: 4px 0;
}

.thinkt-source-option--toggle {
  color: var(--thinkt-text-secondary, #94a3b8);
}
`;

// ============================================
// Component Class
// ============================================

export class ProjectFilterBar {
  private options: ProjectFilterBarOptions;
  private filters: ProjectFilterState;
  private client: ThinktClient;
  private signal: AbortSignal;

  private searchInput: HTMLInputElement | null = null;
  private sourceDropdownBtn: HTMLButtonElement | null = null;
  private sourceDropdownMenu: HTMLDivElement | null = null;
  private isSourceDropdownOpen = false;
  private sortFilter: HTMLSelectElement | null = null;
  private includeDeletedToggle: HTMLInputElement | null = null;
  private includeDeletedLabel: HTMLSpanElement | null = null;
  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  private discoveredSources: string[] = [];
  private sourceCapabilities: SourceCapability[] = [];
  private resumableSources: Set<string> = new Set();

  constructor(options: ProjectFilterBarOptions) {
    this.options = options;
    this.filters = options.filters;
    this.client = options.client;
    this.signal = options.signal;
    this.createFilterBar();
  }

  // ============================================
  // Initialization
  // ============================================

  private createFilterBar(): void {
    const container = this.options.container;
    container.className = 'thinkt-project-filter';

    const searchInput = document.createElement('input');
    searchInput.className = 'thinkt-project-filter__search';
    searchInput.type = 'text';
    searchInput.placeholder = i18n._('Filter projects...');
    searchInput.value = this.filters.searchQuery;
    this.searchInput = searchInput;

    const sourceDropdownContainer = document.createElement('div');
    sourceDropdownContainer.className = 'thinkt-source-dropdown';

    const sourceBtn = document.createElement('button');
    sourceBtn.className = 'thinkt-source-dropdown__btn';
    sourceBtn.innerHTML = `<span>${i18n._('All Sources')}</span><span class="thinkt-source-dropdown__icon">▼</span>`;
    this.sourceDropdownBtn = sourceBtn;

    const sourceMenu = document.createElement('div');
    sourceMenu.className = 'thinkt-source-dropdown__menu';
    this.sourceDropdownMenu = sourceMenu;

    sourceDropdownContainer.appendChild(sourceBtn);
    sourceDropdownContainer.appendChild(sourceMenu);

    const toggleDropdown = (e: Event) => {
      e.stopPropagation();
      this.isSourceDropdownOpen = !this.isSourceDropdownOpen;
      if (this.isSourceDropdownOpen) {
        sourceMenu.classList.add('open');
        sourceBtn.classList.add('active');
        const closeController = new AbortController();
        const closeMenu = (ev: Event) => {
          if (!sourceDropdownContainer.contains(ev.target as Node)) {
            this.isSourceDropdownOpen = false;
            sourceMenu.classList.remove('open');
            sourceBtn.classList.remove('active');
            closeController.abort();
          }
        };
        document.addEventListener('click', closeMenu, { signal: closeController.signal });
        this.signal.addEventListener('abort', () => closeController.abort());
      } else {
        sourceMenu.classList.remove('open');
        sourceBtn.classList.remove('active');
      }
    };
    sourceBtn.addEventListener('click', toggleDropdown, { signal: this.signal });

    const sortFilter = document.createElement('select');
    sortFilter.className = 'thinkt-project-filter__sort';
    this.sortFilter = sortFilter;
    this.renderSortFilterOptions();

    const includeDeletedToggle = document.createElement('input');
    includeDeletedToggle.type = 'checkbox';
    includeDeletedToggle.checked = this.filters.includeDeleted;
    this.includeDeletedToggle = includeDeletedToggle;

    const includeDeletedLabelText = document.createElement('span');
    includeDeletedLabelText.textContent = i18n._('Include Deleted');
    this.includeDeletedLabel = includeDeletedLabelText;

    const includeDeletedLabelEl = document.createElement('label');
    includeDeletedLabelEl.className = 'thinkt-source-option thinkt-source-option--toggle';
    includeDeletedLabelEl.appendChild(includeDeletedToggle);
    includeDeletedLabelEl.appendChild(includeDeletedLabelText);

    const handleSearchInput = () => {
      if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = setTimeout(() => {
        this.filters.searchQuery = searchInput.value;
        this.options.onFiltersChanged();
      }, 150);
    };
    searchInput.addEventListener('input', handleSearchInput, { signal: this.signal });

    const handleSortChange = () => {
      this.filters.sort = this.normalizeProjectSort(sortFilter.value);
      this.options.onFiltersChanged();
    };
    sortFilter.addEventListener('change', handleSortChange, { signal: this.signal });

    const handleIncludeDeletedChange = () => {
      this.filters.includeDeleted = includeDeletedToggle.checked;
      this.options.onFiltersChanged();
    };
    includeDeletedToggle.addEventListener('change', handleIncludeDeletedChange, { signal: this.signal });

    this.renderSourceFilterOptions();

    container.appendChild(searchInput);
    container.appendChild(sourceDropdownContainer);
    container.appendChild(sortFilter);
  }

  // ============================================
  // Source Discovery & Capabilities
  // ============================================

  setSourceCapabilities(capabilities: SourceCapability[], resumable: Set<string>): void {
    this.sourceCapabilities = capabilities;
    this.resumableSources = resumable;
  }

  getSourceCapabilities(): SourceCapability[] {
    return this.sourceCapabilities;
  }

  isSourceResumable(source: string): boolean {
    return this.resumableSources.has(SourceResolver.normalizeSourceName(source));
  }

  resolveSessionSource(session: SessionMeta, currentProject: Project | null): string | null {
    return SourceResolver.resolveSessionSource(session, currentProject, this.sourceCapabilities);
  }

  mergeDiscoveredSources(sources: string[]): void {
    const merged = new Set(this.discoveredSources);
    for (const source of sources) {
      const normalized = SourceResolver.normalizeSourceName(source);
      if (normalized) {
        merged.add(normalized);
      }
    }
    this.discoveredSources = Array.from(merged).sort((a, b) => a.localeCompare(b));
    this.renderSourceFilterOptions();
  }

  async discoverSourcesFromProjects(): Promise<void> {
    try {
      const projects = await this.client.getProjects(undefined, {
        includeDeleted: this.filters.includeDeleted,
      });
      const discovered = projects
        .map((project) => (typeof project.source === 'string' ? project.source.trim() : ''))
        .filter((source) => source.length > 0);
      this.mergeDiscoveredSources(discovered);
    } catch (error) {
      console.warn('[THINKT] Source discovery failed:', error);
    }
  }

  // ============================================
  // Filter Sync
  // ============================================

  syncFromDom(): void {
    if (this.searchInput) this.filters.searchQuery = this.searchInput.value;
    if (this.sortFilter) this.filters.sort = this.normalizeProjectSort(this.sortFilter.value);
    if (this.includeDeletedToggle) this.filters.includeDeleted = this.includeDeletedToggle.checked;
  }

  focusSearch(): void {
    this.searchInput?.focus();
  }

  // ============================================
  // Rendering
  // ============================================

  private renderSourceFilterOptions(): void {
    if (!this.sourceDropdownMenu || !this.sourceDropdownBtn) return;

    const menu = this.sourceDropdownMenu;
    const toggleElement = this.includeDeletedLabel?.parentElement;

    menu.replaceChildren();

    const listContainer = document.createElement('div');
    listContainer.className = 'thinkt-source-dropdown__list';

    const optionSources = [...this.discoveredSources];
    optionSources.sort((a, b) => a.localeCompare(b));

    optionSources.forEach((source) => {
      const label = document.createElement('label');
      label.className = 'thinkt-source-option';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = source;
      checkbox.checked = this.filters.sources.has(source);

      const text = document.createElement('span');
      text.textContent = source.charAt(0).toUpperCase() + source.slice(1);

      label.appendChild(checkbox);
      label.appendChild(text);
      listContainer.appendChild(label);

      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          this.filters.sources.add(source);
        } else {
          this.filters.sources.delete(source);
        }
        this.updateSourceDropdownButton();
        this.options.onFiltersChanged();
      });
    });

    menu.appendChild(listContainer);

    if (optionSources.length > 0 && toggleElement) {
      const divider = document.createElement('div');
      divider.className = 'thinkt-source-dropdown__divider';
      menu.appendChild(divider);
    }

    if (toggleElement) {
      menu.appendChild(toggleElement);
    }

    this.updateSourceDropdownButton();
  }

  private updateSourceDropdownButton(): void {
    if (!this.sourceDropdownBtn) return;
    const btnText = this.sourceDropdownBtn.querySelector('span:first-child');
    if (btnText) {
      if (this.filters.sources.size === 0) {
        btnText.textContent = i18n._('All Sources');
      } else if (this.filters.sources.size === 1) {
        const source = Array.from(this.filters.sources)[0];
        btnText.textContent = source.charAt(0).toUpperCase() + source.slice(1);
      } else {
        btnText.textContent = i18n._('{count} Sources', { count: this.filters.sources.size });
      }
    }
  }

  private renderSortFilterOptions(): void {
    if (!this.sortFilter) return;

    const sortFilter = this.sortFilter;
    const selected = this.normalizeProjectSort(sortFilter.value || this.filters.sort);
    sortFilter.replaceChildren();

    const options: Array<{ value: ProjectSortMode; label: string }> = [
      { value: 'date_desc', label: i18n._('Newest') },
      { value: 'date_asc', label: i18n._('Oldest') },
      { value: 'name_asc', label: i18n._('Name A-Z') },
      { value: 'name_desc', label: i18n._('Name Z-A') },
    ];

    options.forEach(({ value, label }) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      sortFilter.appendChild(option);
    });

    sortFilter.value = selected;
    this.filters.sort = selected;
  }

  private normalizeProjectSort(sort: string): ProjectSortMode {
    switch (sort) {
      case 'name_asc':
      case 'name_desc':
      case 'date_asc':
      case 'date_desc':
        return sort;
      default:
        return 'date_desc';
    }
  }

  // ============================================
  // I18N
  // ============================================

  refreshI18n(): void {
    if (this.searchInput) {
      this.searchInput.placeholder = i18n._('Filter projects...');
    }
    if (this.includeDeletedLabel) {
      this.includeDeletedLabel.textContent = i18n._('Include Deleted');
    }
    this.renderSourceFilterOptions();
    this.renderSortFilterOptions();
  }

  // ============================================
  // Styles
  // ============================================

  static get styles(): string {
    return FILTER_BAR_STYLES;
  }
}
