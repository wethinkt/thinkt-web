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
  /** Initial project sort mode (default: 'date_desc') */
  initialSort?: TreeProjectSortMode;
  /** Include projects whose paths no longer exist */
  initialIncludeDeleted?: boolean;
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
// Styles
// ============================================

const TREE_STYLES = `
.thinkt-tree-browser {
  display: flex;
  flex-direction: column;
  height: 100%;
  font-family: var(--thinkt-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
  color: var(--thinkt-text-color, #e0e0e0);
  background: var(--thinkt-bg-color, #1a1a1a);
  overflow: hidden;
}

.thinkt-tree-header {
  padding: 12px;
  border-bottom: 1px solid var(--thinkt-border-color, #333);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.thinkt-tree-view-toggle {
  display: flex;
  gap: 2px;
  background: var(--thinkt-bg-tertiary, #2a2a2a);
  padding: 2px;
  border-radius: 4px;
}

.thinkt-tree-view-btn {
  background: transparent;
  border: none;
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 3px;
  font-size: 12px;
  opacity: 0.6;
  transition: all 0.15s ease;
}

.thinkt-tree-view-btn:hover {
  opacity: 0.9;
  background: var(--thinkt-hover-bg, #333);
}

.thinkt-tree-view-btn.active {
  opacity: 1;
  background: var(--thinkt-bg-secondary, #1a1a1a);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.thinkt-tree-title {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--thinkt-muted-color, #888);
}

.thinkt-tree-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.thinkt-tree-empty {
  padding: 48px 24px;
  text-align: center;
  color: var(--thinkt-muted-color, #666);
}

.thinkt-tree-empty-icon {
  font-size: 32px;
  margin-bottom: 12px;
  opacity: 0.5;
}

/* Project Group */
.thinkt-tree-project {
  margin-bottom: 4px;
}

.thinkt-tree-project-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.15s ease;
  user-select: none;
}

.thinkt-tree-project-header:hover {
  background: var(--thinkt-hover-bg, #252525);
}

.thinkt-tree-project-header.expanded {
  background: var(--thinkt-hover-bg, #252525);
}

.thinkt-tree-chevron {
  font-size: 10px;
  color: var(--thinkt-muted-color, #666);
  transition: transform 0.2s ease;
  width: 12px;
  text-align: center;
}

.thinkt-tree-chevron.expanded {
  transform: rotate(90deg);
}

.thinkt-tree-folder-icon {
  font-size: 14px;
  color: var(--thinkt-accent-color, #6366f1);
}

.thinkt-tree-project-name {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.thinkt-tree-project-meta {
  font-size: 11px;
  color: var(--thinkt-muted-color, #666);
  display: flex;
  align-items: center;
  gap: 6px;
}

.thinkt-tree-badge {
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 3px;
  background: var(--thinkt-bg-tertiary, #2a2a2a);
  color: var(--thinkt-muted-color, #888);
}

/* Source Group */
.thinkt-tree-source {
  margin-left: 20px;
  margin-bottom: 2px;
}

.thinkt-tree-source-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.15s ease;
  user-select: none;
}

.thinkt-tree-source-header:hover {
  background: var(--thinkt-hover-bg, #252525);
}

.thinkt-tree-source-icon {
  font-size: 12px;
  width: 16px;
  text-align: center;
}

.thinkt-tree-source-icon--claude {
  color: #d97750;
}

.thinkt-tree-source-icon--kimi {
  color: #19c39b;
}

.thinkt-tree-source-icon--gemini {
  color: #6366f1;
}

.thinkt-tree-source-name {
  flex: 1;
  font-size: 12px;
  color: var(--thinkt-text-secondary, #a0a0a0);
  text-transform: capitalize;
}

.thinkt-tree-source-count {
  font-size: 10px;
  color: var(--thinkt-muted-color, #666);
}

/* Sessions */
.thinkt-tree-sessions {
  margin-left: 36px;
}

/* Flat view sessions (directly under project) */
.thinkt-tree-sessions--flat {
  margin-left: 20px;
}

.thinkt-tree-session-source {
  font-size: 9px;
  padding: 1px 4px;
  border-radius: 3px;
  background: var(--thinkt-bg-tertiary, #2a2a2a);
  color: var(--thinkt-muted-color, #888);
  text-transform: uppercase;
  margin-left: 4px;
}

.thinkt-tree-session-source--claude { color: #d97750; }
.thinkt-tree-session-source--kimi { color: #19c39b; }
.thinkt-tree-session-source--gemini { color: #6366f1; }

.thinkt-tree-session {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.12s ease;
  margin-bottom: 1px;
}

.thinkt-tree-session:hover {
  background: var(--thinkt-hover-bg, #252525);
}

.thinkt-tree-session.selected {
  background: var(--thinkt-selected-bg, rgba(99, 102, 241, 0.15));
  border-left: 2px solid var(--thinkt-accent-color, #6366f1);
  margin-left: -2px;
}

.thinkt-tree-session-icon {
  font-size: 10px;
  color: var(--thinkt-muted-color, #666);
}

.thinkt-tree-session-title {
  flex: 1;
  font-size: 11px;
  color: var(--thinkt-text-secondary, #a0a0a0);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.thinkt-tree-session-time {
  font-size: 10px;
  color: var(--thinkt-muted-color, #666);
}

.thinkt-tree-session--loading {
  padding: 6px 12px 6px 48px;
  font-size: 11px;
  color: var(--thinkt-muted-color, #666);
  font-style: italic;
}

/* Loading & Error */
.thinkt-tree-loading,
.thinkt-tree-error {
  padding: 48px;
  text-align: center;
  color: var(--thinkt-muted-color, #666);
}

.thinkt-tree-retry {
  margin-top: 12px;
  padding: 6px 16px;
  background: transparent;
  border: 1px solid var(--thinkt-border-color, #333);
  border-radius: 4px;
  color: inherit;
  cursor: pointer;
  font-size: 12px;
}

.thinkt-tree-retry:hover {
  background: var(--thinkt-hover-bg, #252525);
}
`;

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
  private searchQuery = '';
  private sourceFilter: string | null = null;
  private isLoading = false;
  private stylesInjected = false;
  private boundHandlers: Array<() => void> = [];
  private viewMode: TreeViewMode = 'hierarchical';
  private sortMode: TreeProjectSortMode = 'date_desc';
  private includeDeletedProjects = false;

  constructor(options: TreeProjectBrowserOptions) {
    this.options = options;
    this.client = options.client ?? getDefaultClient();
    this.container = options.elements.container;
    this.contentContainer = document.createElement('div');
    this.headerContainer = document.createElement('div');
    this.viewMode = options.initialViewMode ?? 'hierarchical';
    this.sortMode = options.initialSort ?? 'date_desc';
    this.includeDeletedProjects = options.initialIncludeDeleted ?? false;
    this.init();
  }

  private init(): void {
    this.injectStyles();
    this.createStructure();
    void this.loadData();
  }

  private injectStyles(): void {
    if (this.stylesInjected) return;

    const styleId = 'thinkt-tree-browser-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = TREE_STYLES;
      document.head.appendChild(style);
    }
    this.stylesInjected = true;
  }

  private createStructure(): void {
    this.container.className = 'thinkt-tree-browser';
    this.container.innerHTML = '';

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
      btn.addEventListener('click', handler);
      this.boundHandlers.push(() => btn.removeEventListener('click', handler));
    });

    this.contentContainer.className = 'thinkt-tree-content';
    this.container.appendChild(this.contentContainer);

    this.showLoading();
  }

  // ============================================
  // Data Loading
  // ============================================

  private async loadData(): Promise<void> {
    if (this.isLoading) return;
    this.isLoading = true;
    this.showLoading();

    try {
      // Load all projects from all sources
      const projects = await this.client.getProjects(undefined, {
        includeDeleted: this.includeDeletedProjects,
      });

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
      const err = error instanceof Error ? error : new Error(String(error));
      this.showError(err);
      this.options.onError?.(err);
    } finally {
      this.isLoading = false;
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
    } catch {
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

    this.contentContainer.innerHTML = '';

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
        <div>${i18n._('Error: {message}', { message: error.message })}</div>
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

    switch (this.sortMode) {
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

  setSearch(query: string): void {
    this.searchQuery = query.trim().toLowerCase();
    if (this.isLoading) return;
    this.render();
  }

  setSourceFilter(source: string | null): void {
    this.sourceFilter = source?.trim().toLowerCase() || null;
    if (this.isLoading) return;
    this.render();
  }

  setSort(sort: TreeProjectSortMode): void {
    if (this.sortMode === sort) return;
    this.sortMode = sort;
    if (this.isLoading) return;
    this.render();
  }

  setIncludeDeleted(includeDeleted: boolean): void {
    if (this.includeDeletedProjects === includeDeleted) return;
    this.includeDeletedProjects = includeDeleted;
    void this.loadData();
  }

  private hasActiveFilters(): boolean {
    return this.searchQuery.length > 0 || this.sourceFilter !== null;
  }

  private getFilteredProjectGroups(): ProjectGroup[] {
    const query = this.searchQuery;
    const sourceFilter = this.sourceFilter;
    const result: ProjectGroup[] = [];

    for (const group of this.projectGroups.values()) {
      const matchingSources = new Map<string, SourceGroup>();
      for (const [sourceKey, sourceGroup] of group.sources) {
        if (sourceFilter && sourceKey.toLowerCase() !== sourceFilter) {
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
    this.boundHandlers.forEach(remove => remove());
    this.boundHandlers = [];
    this.container.innerHTML = '';
  }
}

// ============================================
// Factory Function
// ============================================

export function createTreeProjectBrowser(options: TreeProjectBrowserOptions): TreeProjectBrowser {
  return new TreeProjectBrowser(options);
}
