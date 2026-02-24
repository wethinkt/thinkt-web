/**
 * SearchProjectFilter Component
 *
 * Project filter sidebar for the SearchOverlay.
 * Manages project extraction from search results and checkbox-based filtering.
 */

import type { SearchSessionResult, SemanticSearchResult } from '@wethinkt/ts-thinkt/api';

// ============================================
// Types
// ============================================

export interface ProjectInfo {
  name: string;
  count: number;
  source: string;
}

export interface SearchProjectFilterOptions {
  container: HTMLElement;
  listContainer: HTMLElement;
  onFilterChanged: () => void;
  signal: AbortSignal;
}

// ============================================
// Component Class
// ============================================

export class SearchProjectFilter {
  private projects: Map<string, ProjectInfo> = new Map();
  private selectedProjects: Set<string> = new Set();
  private container: HTMLElement;
  private listContainer: HTMLElement;
  private onFilterChanged: () => void;
  private signal: AbortSignal;

  constructor(options: SearchProjectFilterOptions) {
    this.container = options.container;
    this.listContainer = options.listContainer;
    this.onFilterChanged = options.onFilterChanged;
    this.signal = options.signal;
  }

  extractProjects(results: (SearchSessionResult | SemanticSearchResult)[]): void {
    this.projects.clear();

    for (const result of results) {
      const name = result.project_name;
      if (!name) continue;

      const existing = this.projects.get(name);
      if (existing) {
        existing.count++;
      } else {
        this.projects.set(name, {
          name,
          count: 1,
          source: result.source ?? 'claude',
        });
      }
    }

    this.selectedProjects = new Set(this.projects.keys());
  }

  getSelectedProjects(): Set<string> {
    return this.selectedProjects;
  }

  isProjectSelected(projectName: string | undefined): boolean {
    if (this.selectedProjects.size === 0) return true;
    return projectName != null && this.selectedProjects.has(projectName);
  }

  render(): void {
    if (this.projects.size === 0) {
      this.container.style.display = 'none';
      return;
    }

    this.container.style.display = 'flex';

    const sortedProjects = Array.from(this.projects.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    this.listContainer.replaceChildren();

    for (const project of sortedProjects) {
      const item = document.createElement('div');
      item.className = 'thinkt-search-project-item';

      const isSelected = this.selectedProjects.has(project.name);

      item.innerHTML = `
        <input type="checkbox" id="proj-${escapeHtml(project.name)}" ${isSelected ? 'checked' : ''}>
        <label for="proj-${escapeHtml(project.name)}">
          <span class="thinkt-search-project-name" title="${escapeHtml(project.name)}">${escapeHtml(project.name)}</span>
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
          this.onFilterChanged();
        };
        checkbox.addEventListener('change', handleChange, { signal: this.signal });
      }

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

      this.listContainer.appendChild(item);
    }

    // Select All button
    const selectAllBtn = this.container.querySelector<HTMLButtonElement>('#search-select-all');
    if (selectAllBtn) {
      const handleClick = () => {
        const allSelected = this.selectedProjects.size === this.projects.size;
        if (allSelected) {
          this.selectedProjects.clear();
        } else {
          for (const name of this.projects.keys()) {
            this.selectedProjects.add(name);
          }
        }
        this.render();
        this.onFilterChanged();
      };
      selectAllBtn.addEventListener('click', handleClick, { signal: this.signal });
    }

    // Select None button
    const selectNoneBtn = this.container.querySelector<HTMLButtonElement>('#search-select-none');
    if (selectNoneBtn) {
      const handleClick = () => {
        this.selectedProjects.clear();
        this.render();
        this.onFilterChanged();
      };
      selectNoneBtn.addEventListener('click', handleClick, { signal: this.signal });
    }
  }

  hide(): void {
    this.container.style.display = 'none';
  }

  clear(): void {
    this.projects.clear();
    this.selectedProjects.clear();
  }
}

// ============================================
// Utilities
// ============================================

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
