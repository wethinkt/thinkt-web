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
import FILTER_BAR_STYLES from './project-filter-bar-styles.css?inline';

// ============================================
// Constants
// ============================================

const SEARCH_DEBOUNCE_MS = 150;

// ============================================
// Types
// ============================================

export interface ProjectFilterBarOptions {
  container: HTMLElement;
  client: ThinktClient;
  filters: ProjectFilterState;
  /** If true, first discovered sources are auto-selected when no source filters exist yet */
  defaultSelectAllSources?: boolean;
  signal: AbortSignal;
  onFiltersChanged: () => void;
  onSourcesDiscovered?: (sources: string[]) => void;
}

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
  private defaultSelectAllSources = true;

  private discoveredSources: string[] = [];
  private sourceCapabilities: SourceCapability[] = [];
  private resumableSources: Set<string> = new Set();

  constructor(options: ProjectFilterBarOptions) {
    this.options = options;
    this.filters = options.filters;
    this.client = options.client;
    this.signal = options.signal;
    this.defaultSelectAllSources = options.defaultSelectAllSources ?? true;
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
      }, SEARCH_DEBOUNCE_MS);
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
    const previouslyDiscovered = [...this.discoveredSources];
    const previouslyAllSelected =
      previouslyDiscovered.length > 0
      && previouslyDiscovered.every((source) => this.filters.sources.has(source));
    let selectionChanged = false;

    const merged = new Set(this.discoveredSources);
    for (const source of sources) {
      const normalized = SourceResolver.normalizeSourceName(source);
      if (normalized) {
        merged.add(normalized);
      }
    }
    this.discoveredSources = Array.from(merged).sort((a, b) => a.localeCompare(b));

    if (this.defaultSelectAllSources && this.filters.sources.size === 0 && this.discoveredSources.length > 0) {
      for (const source of this.discoveredSources) {
        this.filters.sources.add(source);
      }
      selectionChanged = true;
      this.defaultSelectAllSources = false;
    } else if (previouslyAllSelected) {
      for (const source of this.discoveredSources) {
        if (!this.filters.sources.has(source)) {
          this.filters.sources.add(source);
          selectionChanged = true;
        }
      }
    }

    this.renderSourceFilterOptions();
    if (selectionChanged) {
      this.options.onFiltersChanged();
    }
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
        this.defaultSelectAllSources = false;
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
      const selectedCount = this.filters.sources.size;
      const totalKnownSources = this.discoveredSources.length;

      if (totalKnownSources > 0 && selectedCount === totalKnownSources) {
        btnText.textContent = i18n._('All Sources');
      } else if (selectedCount === 0) {
        btnText.textContent = i18n._('None');
      } else if (selectedCount === 1) {
        const source = Array.from(this.filters.sources)[0];
        btnText.textContent = source.charAt(0).toUpperCase() + source.slice(1);
      } else {
        btnText.textContent = i18n._('{count} Sources', { count: selectedCount });
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
