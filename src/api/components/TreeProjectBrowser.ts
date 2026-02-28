/**
 * TreeProjectBrowser Component
 *
 * A hierarchical tree view for browsing THINKT projects.
 * Groups sessions by underlying project, combining multiple sources (claude/kimi)
 * and different working directories.
 *
 * Tree structure (hierarchical mode):
 * - Project (grouped by project_path)
 *   - Source/Folder (claude, kimi, or specific working dir)
 *     - Session
 *
 * Flat structure (flat mode):
 * - Project (grouped by project_path)
 *   - Session (all sources combined, time-sorted)
 */

import type { Project, SessionMeta } from '@wethinkt/ts-thinkt';
import { type ThinktClient, getDefaultClient } from '@wethinkt/ts-thinkt/api';
import { i18n } from '@lingui/core';
import type { ProjectFilterState } from './ApiViewer';
import { injectStyleSheet } from './style-manager';
import TREE_STYLES from './tree-project-browser-styles.css?inline';

// ============================================
// Types
// ============================================

export type TreeViewMode = 'hierarchical' | 'flat';
export type TreeProjectSortMode = 'name_asc' | 'name_desc' | 'date_asc' | 'date_desc';

export interface TreeProjectBrowserElements {
  /** Container element */
  container: HTMLElement;
}

export interface TreeProjectBrowserOptions {
  elements: TreeProjectBrowserElements;
  /** API client instance (defaults to getDefaultClient()) */
  client?: ThinktClient;
  /** Callback when a session is selected */
  onSessionSelect?: (session: SessionMeta, project: ProjectGroup) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Initial view mode (default: 'hierarchical') */
  initialViewMode?: TreeViewMode;
  /** Shared filter state owned by ApiViewer */
  filters?: ProjectFilterState;
}

/** A group of projects that share the same underlying project path */
export interface ProjectGroup {
  /** The project path (e.g., "/home/user/projects/my-app") */
  path: string;
  /** Display name (last part of path) */
  name: string;
  /** Child projects by source */
  sources: Map<string, SourceGroup>;
  /** Total session count across all sources */
  totalSessions: number;
  /** Last modified across all sources */
  lastModified: Date;
}

/** Sessions grouped by source (claude/kimi) */
export interface SourceGroup {
  /** Source name (claude, kimi, etc.) */
  source: string;
  /** The underlying project data */
  project: Project;
  /** Sessions for this source */
  sessions: SessionMeta[];
  /** Whether sessions have been loaded from the API */
  loaded: boolean;
  /** Whether sessions are currently being loaded */
  loading: boolean;
}

/** Session with source info for flat view */
interface SessionWithSource {
  session: SessionMeta;
  source: string;
}

// ============================================
// Component Class
// ============================================

export class TreeProjectBrowser {
  private options: TreeProjectBrowserOptions;
  private client: ThinktClient;
  private container: HTMLElement;
  private contentContainer: HTMLElement;
  private headerContainer: HTMLElement;
  private projectGroups: Map<string, ProjectGroup> = new Map();
  private expandedProjects: Set<string> = new Set();
  private expandedSources: Set<string> = new Set();
  private selectedSessionId: string | null = null;
  private filters: ProjectFilterState;
  private readonly showAllWhenNoSourceSelected: boolean;
  private lastLoadedIncludeDeleted = false;
  private loadController: AbortController | null = null;
  private abortController = new AbortController();
  private viewMode: TreeViewMode = 'hierarchical';

  constructor(options: TreeProjectBrowserOptions) {
    this.options = options;
    this.client = options.client ?? getDefaultClient();
    this.container = options.elements.container;
    this.contentContainer = document.createElement('div');
    this.headerContainer = document.createElement('div');
    this.viewMode = options.initialViewMode ?? 'hierarchical';
    this.filters = options.filters ?? {
      searchQuery: '',
      sources: new Set(),
      sort: 'date_desc',
      includeDeleted: false,
    };
    this.showAllWhenNoSourceSelected = options.filters === undefined;
    this.init();
  }

  private init(): void {
    injectStyleSheet('thinkt-tree-browser-styles', TREE_STYLES);
    this.createStructure();
    void this.loadData();

    window.addEventListener('thinkt:locale-changed', () => this.refreshI18n(), { signal: this.abortController.signal });
  }

  private createStructure(): void {
    this.container.className = 'thinkt-tree-browser';
    this.container.replaceChildren();

    // Header with view toggle
    this.headerContainer.className = 'thinkt-tree-header';
    this.headerContainer.innerHTML = `
      <span class="thinkt-tree-title">${i18n._('Projects')}</span>
      <div class="thinkt-tree-view-toggle">
        <button class="thinkt-tree-view-btn ${this.viewMode === 'hierarchical' ? 'active' : ''}" 
                data-mode="hierarchical" title="${i18n._('Group by source')}">
          <span class="thinkt-tree-view-icon">📂</span>
        </button>
        <button class="thinkt-tree-view-btn ${this.viewMode === 'flat' ? 'active' : ''}" 
                data-mode="flat" title="${i18n._('Flat list')}">
          <span class="thinkt-tree-view-icon">📄</span>
        </button>
      </div>
    `;
    this.container.appendChild(this.headerContainer);

    // View toggle handlers
    this.headerContainer.querySelectorAll('.thinkt-tree-view-btn').forEach((btn) => {
      const handler = () => {
        const mode = (btn as HTMLElement).dataset.mode as TreeViewMode;
        this.setViewMode(mode);
      };
      btn.addEventListener('click', handler, { signal: this.abortController.signal });
    });

    this.contentContainer.className = 'thinkt-tree-content';
    this.container.appendChild(this.contentContainer);

    this.showLoading();
  }

  // ============================================
  // Data Loading
  // ============================================

  private get isLoading(): boolean {
    return this.loadController !== null && !this.loadController.signal.aborted;
  }

  private async loadData(): Promise<void> {
    this.loadController?.abort();
    const controller = new AbortController();
    this.loadController = controller;
    this.showLoading();

    try {
      // Load all projects from all sources
      const projects = await this.client.getProjects(undefined, {
        includeDeleted: this.filters.includeDeleted,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      this.lastLoadedIncludeDeleted = this.filters.includeDeleted;

      // Group projects by their underlying path
      this.projectGroups = this.groupProjectsByPath(projects);

      // Render the tree immediately with project structure
      // (sessions load lazily when source groups are expanded)

      // Expand first project by default if there are few
      if (this.projectGroups.size <= 3) {
        for (const path of this.projectGroups.keys()) {
          this.expandedProjects.add(path);
        }
      }

      this.render();
    } catch (error) {
      if (controller.signal.aborted) return;
      const err = error instanceof Error ? error : new Error(String(error));
      this.showError(err);
      this.options.onError?.(err);
    } finally {
      if (this.loadController === controller) {
        this.loadController = null;
      }
    }
  }

  private groupProjectsByPath(projects: Project[]): Map<string, ProjectGroup> {
    const groups = new Map<string, ProjectGroup>();

    for (const project of projects) {
      if (!project.path) continue;

      // Extract the project path - use displayPath or derive from path
      // For ~/.claude/projects/my-app or ~/.kimi/projects/my-app
      // we want to group by "my-app"
      const projectPath = project.displayPath || project.path;
      const projectName = project.name || this.extractProjectName(projectPath);

      // Use the displayPath or the parent directory as the grouping key
      const groupKey = this.normalizeProjectPath(projectPath);

      let group = groups.get(groupKey);
      if (!group) {
        group = {
          path: groupKey,
          name: projectName,
          sources: new Map(),
          totalSessions: 0,
          lastModified: new Date(0),
        };
        groups.set(groupKey, group);
      }

      // Add this project as a source
      const source = project.source || 'unknown';
      if (!group.sources.has(source)) {
        group.sources.set(source, {
          source,
          project,
          sessions: [],
          loaded: false,
          loading: false,
        });
      }

      // Update metadata
      group.totalSessions += project.sessionCount || 0;
      if (project.lastModified) {
        const modified = new Date(project.lastModified);
        if (modified > group.lastModified) {
          group.lastModified = modified;
        }
      }
    }

    return groups;
  }

  private extractProjectName(path: string): string {
    // Extract the last meaningful part of the path
    // ~/.claude/projects/my-app -> my-app
    // /home/user/workspace/project -> project
    const parts = path.split(/[/\\]/).filter(p => p && p !== '.' && p !== '..');

    // Remove common parent directories
    while (parts.length > 1) {
      const last = parts[parts.length - 1];
      const parent = parts[parts.length - 2];

      // Skip if parent is a common container
      if (['projects', 'workspaces', 'repos', 'src'].includes(parent)) {
        return last;
      }

      // Check if this looks like a project name (not a hidden folder)
      if (!last.startsWith('.') && last.length > 2) {
        return last;
      }

      parts.pop();
    }

    return parts[parts.length - 1] || 'Unknown';
  }

  private normalizeProjectPath(path: string): string {
    // Normalize path for grouping
    // Remove home directory and common source prefixes
    let normalized = path.replace(/^~\//, '/').replace(/\\/g, '/');

    // Remove common source prefixes
    const sourcePatterns = [
      /\.claude\/projects\//,
      /\.kimi\/projects\//,
      /\.thinkt\/projects\//,
    ];

    for (const pattern of sourcePatterns) {
      normalized = normalized.replace(pattern, '');
    }

    return normalized;
  }

  private async loadSessionsForSource(group: ProjectGroup, sourceGroup: SourceGroup): Promise<void> {
    if (sourceGroup.loaded || sourceGroup.loading || !sourceGroup.project.id) return;

    sourceGroup.loading = true;
    this.render();

    try {
      const sessions = await this.client.getSessions(sourceGroup.project.id, sourceGroup.source);
      sessions.sort((a, b) => {
        const dateA = a.modifiedAt?.getTime() || 0;
        const dateB = b.modifiedAt?.getTime() || 0;
        return dateB - dateA;
      });
      sourceGroup.sessions = sessions;
      sourceGroup.loaded = true;
    } catch (error) {
      console.warn('[THINKT] Failed to load sessions for source:', sourceGroup.source, error);
      sourceGroup.sessions = [];
      sourceGroup.loaded = true;
    } finally {
      sourceGroup.loading = false;

      // Update total sessions from actual loaded data
      let total = 0;
      for (const sg of group.sources.values()) {
        total += sg.loaded ? sg.sessions.length : (sg.project.sessionCount || 0);
      }
      group.totalSessions = total;

      this.render();
    }
  }

  // ============================================
  // Rendering
  // ============================================

  private render(): void {
    const filteredProjects = this.getFilteredProjectGroups();
    if (filteredProjects.length === 0) {
      this.showEmpty(this.hasActiveFilters() && this.projectGroups.size > 0
        ? i18n._('No projects match your filter')
        : i18n._('No projects found'));
      return;
    }

    this.contentContainer.replaceChildren();

    const sortedProjects = filteredProjects.sort((a, b) => this.compareProjectGroups(a, b));

    for (const project of sortedProjects) {
      const el = this.renderProjectGroup(project);
      this.contentContainer.appendChild(el);
    }
  }

  private renderProjectGroup(project: ProjectGroup): HTMLElement {
    const isExpanded = this.expandedProjects.has(project.path);

    const container = document.createElement('div');
    container.className = 'thinkt-tree-project';

    // Header
    const header = document.createElement('div');
    header.className = `thinkt-tree-project-header ${isExpanded ? 'expanded' : ''}`;

    // Show different meta info based on view mode
    const metaInfo = this.viewMode === 'hierarchical'
      ? `<span class="thinkt-tree-badge">${i18n._('{count, plural, one {# source} other {# sources}}', { count: project.sources.size })}</span>
         <span class="thinkt-tree-badge">${i18n._('{count, plural, one {# session} other {# sessions}}', { count: project.totalSessions })}</span>`
      : `<span class="thinkt-tree-badge">${i18n._('{count, plural, one {# session} other {# sessions}}', { count: project.totalSessions })}</span>`;

    header.innerHTML = `
      <span class="thinkt-tree-chevron ${isExpanded ? 'expanded' : ''}">▶</span>
      <span class="thinkt-tree-folder-icon">📁</span>
      <span class="thinkt-tree-project-name" title="${this.escapeHtml(project.path)}">${this.escapeHtml(project.name)}</span>
      <span class="thinkt-tree-project-meta">
        ${metaInfo}
      </span>
    `;

    header.addEventListener('click', () => {
      if (isExpanded) {
        this.expandedProjects.delete(project.path);
      } else {
        this.expandedProjects.add(project.path);
      }
      this.render();
    });

    container.appendChild(header);

    // Children (if expanded)
    if (isExpanded) {
      if (this.viewMode === 'hierarchical') {
        container.appendChild(this.renderHierarchicalChildren(project));
      } else {
        container.appendChild(this.renderFlatChildren(project));
      }
    }

    return container;
  }

  private renderHierarchicalChildren(project: ProjectGroup): HTMLElement {
    const sourcesContainer = document.createElement('div');
    sourcesContainer.className = 'thinkt-tree-sources';

    // Sort sources: claude first, then kimi, then others
    const sortedSources = Array.from(project.sources.values()).sort((a, b) => {
      const order = { claude: 0, kimi: 1, gemini: 2, copilot: 3, thinkt: 4 };
      return (order[a.source as keyof typeof order] ?? 99) - (order[b.source as keyof typeof order] ?? 99);
    });

    for (const sourceGroup of sortedSources) {
      const sourceEl = this.renderSourceGroup(project, sourceGroup);
      sourcesContainer.appendChild(sourceEl);
    }

    return sourcesContainer;
  }

  private renderFlatChildren(project: ProjectGroup): HTMLElement {
    const sessionsContainer = document.createElement('div');
    sessionsContainer.className = 'thinkt-tree-sessions thinkt-tree-sessions--flat';

    // Trigger lazy load for any unloaded sources
    let anyLoading = false;
    for (const sourceGroup of project.sources.values()) {
      if (!sourceGroup.loaded && !sourceGroup.loading) {
        void this.loadSessionsForSource(project, sourceGroup);
      }
      if (sourceGroup.loading) {
        anyLoading = true;
      }
    }

    if (anyLoading) {
      const loadingEl = document.createElement('div');
      loadingEl.className = 'thinkt-tree-session thinkt-tree-session--loading';
      loadingEl.textContent = i18n._('Loading sessions…');
      sessionsContainer.appendChild(loadingEl);
      return sessionsContainer;
    }

    // Collect all sessions from all sources
    const allSessions: SessionWithSource[] = [];
    for (const sourceGroup of project.sources.values()) {
      for (const session of sourceGroup.sessions) {
        allSessions.push({ session, source: sourceGroup.source });
      }
    }

    // Sort by modified date descending
    allSessions.sort((a, b) => {
      const dateA = a.session.modifiedAt?.getTime() || 0;
      const dateB = b.session.modifiedAt?.getTime() || 0;
      return dateB - dateA;
    });

    for (const { session, source } of allSessions) {
      const sessionEl = this.renderSession(session, project, source);
      sessionsContainer.appendChild(sessionEl);
    }

    return sessionsContainer;
  }

  private renderSourceGroup(project: ProjectGroup, sourceGroup: SourceGroup): HTMLElement {
    const sourceKey = `${project.path}::${sourceGroup.source}`;
    const isExpanded = this.expandedSources.has(sourceKey);

    const container = document.createElement('div');
    container.className = 'thinkt-tree-source';

    // Header
    const header = document.createElement('div');
    header.className = 'thinkt-tree-source-header';

    const sourceIcon = this.getSourceIcon(sourceGroup.source);
    const sessionCount = sourceGroup.loaded
      ? sourceGroup.sessions.length
      : (sourceGroup.project.sessionCount || 0);

    header.innerHTML = `
      <span class="thinkt-tree-chevron ${isExpanded ? 'expanded' : ''}">▶</span>
      <span class="thinkt-tree-source-icon thinkt-tree-source-icon--${sourceGroup.source}">${sourceIcon}</span>
      <span class="thinkt-tree-source-name">${this.escapeHtml(sourceGroup.source)}</span>
      <span class="thinkt-tree-source-count">${sessionCount}</span>
    `;

    header.addEventListener('click', () => {
      if (isExpanded) {
        this.expandedSources.delete(sourceKey);
      } else {
        this.expandedSources.add(sourceKey);
        // Trigger lazy load when expanding
        if (!sourceGroup.loaded && !sourceGroup.loading) {
          void this.loadSessionsForSource(project, sourceGroup);
        }
      }
      this.render();
    });

    container.appendChild(header);

    // Sessions (if expanded)
    if (isExpanded) {
      const sessionsContainer = document.createElement('div');
      sessionsContainer.className = 'thinkt-tree-sessions';

      if (sourceGroup.loading) {
        const loadingEl = document.createElement('div');
        loadingEl.className = 'thinkt-tree-session thinkt-tree-session--loading';
        loadingEl.textContent = i18n._('Loading sessions…');
        sessionsContainer.appendChild(loadingEl);
      } else {
        for (const session of sourceGroup.sessions) {
          const sessionEl = this.renderSession(session, project);
          sessionsContainer.appendChild(sessionEl);
        }
      }

      container.appendChild(sessionsContainer);
    }

    return container;
  }

  private renderSession(session: SessionMeta, project: ProjectGroup, source?: string): HTMLElement {
    const el = document.createElement('div');
    el.className = 'thinkt-tree-session';

    if (session.id === this.selectedSessionId) {
      el.classList.add('selected');
    }

    const title = session.firstPrompt
      ? session.firstPrompt.slice(0, 50) + (session.firstPrompt.length > 50 ? '...' : '')
      : session.id?.slice(0, 8) || 'Unknown';

    const time = session.modifiedAt
      ? this.formatRelativeTime(session.modifiedAt)
      : '';

    // Show source badge in flat view
    const sourceBadge = source && this.viewMode === 'flat'
      ? `<span class="thinkt-tree-session-source thinkt-tree-session-source--${source}">${this.escapeHtml(source)}</span>`
      : '';

    el.innerHTML = `
      <span class="thinkt-tree-session-icon">💬</span>
      <span class="thinkt-tree-session-title" title="${this.escapeHtml(session.firstPrompt || '')}">${this.escapeHtml(title)}</span>
      ${sourceBadge}
      ${time ? `<span class="thinkt-tree-session-time">${time}</span>` : ''}
    `;

    el.addEventListener('click', () => {
      this.selectSession(session, project);
    });

    return el;
  }

  private getSourceIcon(source: string): string {
    const icons: Record<string, string> = {
      claude: '◉',
      kimi: '◉',
      gemini: '◉',
      copilot: '◉',
      thinkt: '◉',
    };
    return icons[source] || '◉';
  }

  private formatRelativeTime(date: Date | string): string {
    const d = date instanceof Date ? date : new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return i18n._('now');
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  // ============================================
  // Selection
  // ============================================

  private selectSession(session: SessionMeta, project: ProjectGroup): void {
    this.selectedSessionId = session.id || null;
    this.render(); // Re-render to show selection
    this.options.onSessionSelect?.(session, project);
  }

  // ============================================
  // State Views
  // ============================================

  private showLoading(): void {
    this.contentContainer.innerHTML = `
      <div class="thinkt-tree-loading">
        <div>${i18n._('Loading projects...')}</div>
      </div>
    `;
  }

  private showEmpty(message = i18n._('No projects found')): void {
    this.contentContainer.innerHTML = `
      <div class="thinkt-tree-empty">
        <div class="thinkt-tree-empty-icon">📁</div>
        <div>${this.escapeHtml(message)}</div>
      </div>
    `;
  }

  private showError(error: Error): void {
    this.contentContainer.innerHTML = `
      <div class="thinkt-tree-error">
        <div>${i18n._('Error: {message}', { message: this.escapeHtml(error.message) })}</div>
        <button class="thinkt-tree-retry">${i18n._('Retry')}</button>
      </div>
    `;

    const retryBtn = this.contentContainer.querySelector('.thinkt-tree-retry');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        void this.loadData();
      });
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

  private compareProjectGroups(a: ProjectGroup, b: ProjectGroup): number {
    const byNameAsc = (): number =>
      (a.name || a.path).toLowerCase().localeCompare((b.name || b.path).toLowerCase());
    const byDateAsc = (): number =>
      a.lastModified.getTime() - b.lastModified.getTime();

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

  // ============================================
  // Public API
  // ============================================

  refresh(): Promise<void> {
    return this.loadData();
  }

  applyFilters(): void {
    if (this.filters.includeDeleted !== this.lastLoadedIncludeDeleted) {
      void this.loadData();
      return;
    }
    if (!this.isLoading) {
      this.render();
    }
  }

  private hasActiveFilters(): boolean {
    if (this.filters.searchQuery.length > 0) {
      return true;
    }

    if (this.showAllWhenNoSourceSelected && this.filters.sources.size === 0) {
      return false;
    }

    const knownSources = new Set<string>();
    for (const group of this.projectGroups.values()) {
      for (const sourceKey of group.sources.keys()) {
        knownSources.add(sourceKey.toLowerCase());
      }
    }

    if (knownSources.size === 0) {
      return this.filters.sources.size > 0;
    }
    if (this.filters.sources.size !== knownSources.size) {
      return true;
    }
    for (const source of knownSources) {
      if (!this.filters.sources.has(source)) {
        return true;
      }
    }
    return false;
  }

  private getFilteredProjectGroups(): ProjectGroup[] {
    const query = this.filters.searchQuery.trim().toLowerCase();
    const sourceFilters = this.filters.sources;
    const result: ProjectGroup[] = [];

    for (const group of this.projectGroups.values()) {
      const matchingSources = new Map<string, SourceGroup>();
      for (const [sourceKey, sourceGroup] of group.sources) {
        const normalizedSource = sourceKey.toLowerCase();
        const includeSource = (this.showAllWhenNoSourceSelected && sourceFilters.size === 0)
          || sourceFilters.has(normalizedSource);
        if (!includeSource) {
          continue;
        }
        matchingSources.set(sourceKey, sourceGroup);
      }

      if (matchingSources.size === 0) {
        continue;
      }

      const matchesQuery = query.length === 0
        || group.name.toLowerCase().includes(query)
        || group.path.toLowerCase().includes(query)
        || Array.from(matchingSources.values()).some((sourceGroup) =>
          sourceGroup.source.toLowerCase().includes(query));
      if (!matchesQuery) {
        continue;
      }

      let totalSessions = 0;
      let lastModified = new Date(0);
      for (const sourceGroup of matchingSources.values()) {
        totalSessions += sourceGroup.sessions.length;
        if (sourceGroup.project.lastModified) {
          const modified = new Date(sourceGroup.project.lastModified);
          if (modified > lastModified) {
            lastModified = modified;
          }
        }
      }

      result.push({
        ...group,
        sources: matchingSources,
        totalSessions,
        lastModified: lastModified.getTime() > 0 ? lastModified : group.lastModified,
      });
    }

    return result;
  }

  /**
   * Re-render translatable UI text in place when locale changes.
   */
  refreshI18n(): void {
    this.createStructure();
    this.render();
  }

  /**
   * Get current view mode
   */
  getViewMode(): TreeViewMode {
    return this.viewMode;
  }

  /**
   * Set view mode ('hierarchical' or 'flat')
   */
  setViewMode(mode: TreeViewMode): void {
    if (this.viewMode === mode) return;
    this.viewMode = mode;

    // Update toggle buttons
    this.headerContainer.querySelectorAll('.thinkt-tree-view-btn').forEach((btn) => {
      const btnMode = (btn as HTMLElement).dataset.mode as TreeViewMode;
      btn.classList.toggle('active', btnMode === mode);
    });

    // Re-render with new view mode
    this.render();
  }

  dispose(): void {
    this.abortController.abort();
    this.loadController?.abort();
    this.container.replaceChildren();
  }
}
