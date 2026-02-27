/**
 * ApiViewer Component
 *
 * A high-level orchestrator that connects the THINKT API to a conversation view.
 * Provides a complete browsing and conversation viewing experience (no 3D).
 *
 * Features multiple project view modes:
 * - List: Flat list of projects (original)
 * - Tree: Hierarchical tree by project → source → sessions
 * - Timeline: Visual timeline of sessions over time
 */

import type { Project, SessionMeta, Entry } from '@wethinkt/ts-thinkt';
import { type ThinktClient, getDefaultClient } from '@wethinkt/ts-thinkt/api';
import { i18n } from '@lingui/core';
import { ProjectBrowser, type ProjectSortMode } from './ProjectBrowser';
import { SessionList } from './SessionList';
import { ConversationView } from './ConversationView';
import { TreeProjectBrowser, type ProjectGroup } from './TreeProjectBrowser';
import { TimelineVisualization, type TimelineProjectSelection } from './TimelineVisualization';
import { ProjectTimelinePanel } from './ProjectTimelinePanel';
import { injectStyleSheet } from './style-manager';
import DEFAULT_STYLES from './api-viewer-styles.css?inline';
import SOURCE_COLORS from './thinkt-source-colors.css?inline';
import { SourceResolver, type SourceCapability } from './SourceResolver';
import { ProjectFilterBar } from './ProjectFilterBar';
import { SidebarLayout } from './SidebarLayout';

// ============================================
// Types
// ============================================

export interface ApiViewerElements {
  /** Main container */
  container: HTMLElement;
  /** Project browser container */
  projectBrowserContainer: HTMLElement;
  /** Session list container */
  sessionListContainer: HTMLElement;
  /** Viewer container (contains conversation + timeline panel) */
  viewerContainer: HTMLElement;
  /** Timeline panel container (optional, created if not provided) */
  timelinePanelContainer?: HTMLElement;
  /** Split pane resizer (optional) */
  resizer?: HTMLElement;
}

export interface ApiViewerOptions {
  elements: ApiViewerElements;
  /** API client instance */
  client?: ThinktClient;
  /** Callback when session is loaded into viewer */
  onSessionLoaded?: (session: SessionMeta, entries: Entry[]) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Initial project view mode */
  initialProjectView?: ProjectViewMode;
}

export type ProjectViewMode = 'list' | 'tree' | 'timeline';

export interface ProjectFilterState {
  searchQuery: string;
  sources: Set<string>;
  sort: ProjectSortMode;
  includeDeleted: boolean;
}

export interface LoadedSession {
  meta: SessionMeta;
  entries: Entry[];
}

// ============================================
// Session Storage Persistence
// ============================================

const STORAGE_KEY = 'thinkt-viewer-state';
const STREAM_CHUNK_SIZE = 50;

interface PersistedState {
  projectView?: ProjectViewMode;
  filterSort?: ProjectSortMode;
  filterSources?: string[];
  filterIncludeDeleted?: boolean;
  projectId?: string;
  projectName?: string;
  projectPath?: string;
  projectSource?: string;
}

function loadPersistedState(): PersistedState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function savePersistedState(state: PersistedState): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or unavailable — ignore
  }
}

// ============================================
// Component Class
// ============================================

export class ApiViewer {
  private elements: ApiViewerElements;
  private options: ApiViewerOptions;
  private client: ThinktClient;
  private layout: SidebarLayout;
  private filterBar: ProjectFilterBar;
  private projectBrowser: ProjectBrowser | null = null;
  private treeProjectBrowser: TreeProjectBrowser | null = null;
  private timelineVisualization: TimelineVisualization | null = null;
  private sessionList: SessionList | null = null;
  private conversationView: ConversationView | null = null;
  private projectTimelinePanel: ProjectTimelinePanel | null = null;
  private currentProject: Project | null = null;
  private currentSession: LoadedSession | null = null;
  private currentProjectView: ProjectViewMode = 'list';
  private projectFilters: ProjectFilterState = {
    searchQuery: '',
    sources: new Set(),
    sort: 'date_desc',
    includeDeleted: false,
  };
  private sessionLoadController: AbortController | null = null;
  private readonly initialized: Promise<void>;
  private abortController = new AbortController();
  private disposed = false;

  constructor(options: ApiViewerOptions) {
    this.elements = options.elements;
    this.options = options;
    this.client = options.client ?? getDefaultClient();

    // Restore persisted state (options take priority)
    const persisted = loadPersistedState();
    this.currentProjectView = options.initialProjectView ?? persisted.projectView ?? 'list';
    if (persisted.filterSort) this.projectFilters.sort = persisted.filterSort;
    if (persisted.filterSources?.length) this.projectFilters.sources = new Set(persisted.filterSources);
    if (persisted.filterIncludeDeleted) this.projectFilters.includeDeleted = persisted.filterIncludeDeleted;

    injectStyleSheet('thinkt-source-colors', SOURCE_COLORS);
    injectStyleSheet('thinkt-api-viewer-styles', DEFAULT_STYLES);
    injectStyleSheet('thinkt-project-filter-styles', ProjectFilterBar.styles);

    // Create layout
    this.layout = new SidebarLayout({
      elements: this.elements,
      signal: this.abortController.signal,
      initialView: this.currentProjectView,
      onLocaleChanged: () => this.refreshI18n(),
      onSidebarCollapsedChange: (collapsed) => this.handleSidebarCollapsedChange(collapsed),
    });

    // Create view switcher (inserted into sidebar before projects)
    const viewSwitcher = this.createViewSwitcher();
    this.layout.sidebar.insertBefore(viewSwitcher, this.layout.projectsSection);

    // Create filter bar (inserted into sidebar before projects)
    const filterBarContainer = document.createElement('div');
    this.layout.sidebar.insertBefore(filterBarContainer, this.layout.projectsSection);
    this.filterBar = new ProjectFilterBar({
      container: filterBarContainer,
      client: this.client,
      filters: this.projectFilters,
      signal: this.abortController.signal,
      onFiltersChanged: () => this.applyProjectFilters(),
    });

    this.initialized = this.initializeComponentsAsync();
  }

  // ============================================
  // View Switcher
  // ============================================

  private createViewSwitcher(): HTMLElement {
    const switcher = document.createElement('div');
    switcher.className = 'thinkt-view-switcher';

    const views: { id: ProjectViewMode; label: string; icon: string }[] = [
      { id: 'list', label: i18n._('List'), icon: '☰' },
      { id: 'tree', label: i18n._('Tree'), icon: '🌳' },
      { id: 'timeline', label: i18n._('Timeline'), icon: '◯' },
    ];

    views.forEach(view => {
      const btn = document.createElement('button');
      btn.className = `thinkt-view-switcher-btn ${this.currentProjectView === view.id ? 'active' : ''}`;
      btn.dataset.view = view.id;
      btn.innerHTML = `<span class="icon">${view.icon}</span> ${view.label}`;
      btn.addEventListener('click', () => this.switchProjectView(view.id));
      switcher.appendChild(btn);
    });

    return switcher;
  }

  private refreshViewSwitcherLabels(): void {
    const labels: Record<ProjectViewMode, string> = {
      list: i18n._('List'),
      tree: i18n._('Tree'),
      timeline: i18n._('Timeline'),
    };

    this.elements.container.querySelectorAll<HTMLElement>('.thinkt-view-switcher-btn').forEach((button) => {
      const view = button.dataset.view as ProjectViewMode | undefined;
      if (!view) return;
      const icon = button.querySelector('.icon')?.textContent ?? '';
      button.innerHTML = `<span class="icon">${icon}</span> ${labels[view]}`;
    });
  }

  // ============================================
  // View Switching
  // ============================================

  private switchProjectView(mode: ProjectViewMode): void {
    if (this.currentProjectView === mode) return;

    this.currentProjectView = mode;
    this.persistState();

    // Update button states
    const buttons = this.elements.container.querySelectorAll('.thinkt-view-switcher-btn');
    buttons.forEach((btn, index) => {
      const modes: ProjectViewMode[] = ['list', 'tree', 'timeline'];
      btn.classList.toggle('active', modes[index] === mode);
    });

    // Clear current view
    this.elements.projectBrowserContainer.replaceChildren();

    // Dispose old views
    this.projectBrowser?.dispose();
    this.projectBrowser = null;
    this.treeProjectBrowser?.dispose();
    this.treeProjectBrowser = null;
    this.timelineVisualization?.dispose();
    this.timelineVisualization = null;

    // Show/hide sessions section based on view mode
    this.layout.updateForView(mode);

    switch (mode) {
      case 'list':
        void this.initListView();
        if (this.currentProject) {
          if (this.currentProject.id) {
            this.showProjectTimelinePanel(this.currentProject.id, this.currentProject.source);
          } else {
            this.hideProjectTimelinePanel();
          }
        }
        break;

      case 'tree':
        this.hideProjectTimelinePanel();
        void this.initTreeView();
        break;

      case 'timeline':
        this.hideProjectTimelinePanel();
        void this.initTimelineView();
        break;
    }
  }

  private async initListView(): Promise<void> {
    this.projectBrowser = new ProjectBrowser({
      elements: {
        container: this.elements.projectBrowserContainer,
      },
      client: this.client,
      enableSearch: false,
      enableSourceFilter: false,
      filters: this.projectFilters,
      onProjectSelect: (project) => { this.handleProjectSelect(project); },
      onError: (error) => { this.handleError(error); },
    });
    this.applyProjectFilters();
  }

  private async initTreeView(): Promise<void> {
    this.treeProjectBrowser = new TreeProjectBrowser({
      elements: {
        container: this.elements.projectBrowserContainer,
      },
      client: this.client,
      filters: this.projectFilters,
      onSessionSelect: (session, project) => {
        void this.handleTreeSessionSelect(session, project);
      },
      onError: (error) => { this.handleError(error); },
    });
    this.applyProjectFilters();
  }

  private async initTimelineView(): Promise<void> {
    this.timelineVisualization = new TimelineVisualization({
      elements: {
        container: this.elements.projectBrowserContainer,
      },
      client: this.client,
      filters: this.projectFilters,
      onProjectSelect: (project) => {
        this.handleTimelineProjectSelect(project);
      },
      onSessionSelect: (session) => {
        void this.handleTimelineSessionSelect(session);
      },
      onSourcesDiscovered: (sources) => {
        this.filterBar.mergeDiscoveredSources(sources);
      },
      onError: (error) => { this.handleError(error); },
    });
    this.applyProjectFilters();
  }

  // ============================================
  // Filter Application
  // ============================================

  private applyProjectFilters(): void {
    this.filterBar.syncFromDom();

    switch (this.currentProjectView) {
      case 'list': this.projectBrowser?.applyFilters(); break;
      case 'tree': this.treeProjectBrowser?.applyFilters(); break;
      case 'timeline': this.timelineVisualization?.applyFilters(); break;
    }

    this.persistState();
  }

  private persistState(): void {
    savePersistedState({
      projectView: this.currentProjectView,
      filterSort: this.projectFilters.sort,
      filterSources: Array.from(this.projectFilters.sources),
      filterIncludeDeleted: this.projectFilters.includeDeleted,
      projectId: this.currentProject?.id,
      projectName: this.currentProject?.name,
      projectPath: this.currentProject?.path,
      projectSource: this.currentProject?.source,
    });
  }

  // ============================================
  // Component Initialization
  // ============================================

  private async initializeComponentsAsync(): Promise<void> {
    await this.checkConnection();

    switch (this.currentProjectView) {
      case 'list':
      default:
        await this.initListView();
        break;
      case 'tree':
        await this.initTreeView();
        break;
      case 'timeline':
        await this.initTimelineView();
        break;
    }

    if (this.currentProjectView === 'list') {
      this.sessionList = new SessionList({
        elements: {
          container: this.elements.sessionListContainer,
        },
        client: this.client,
        onSessionSelect: (session) => { void this.handleSessionSelect(session); },
        onError: (error) => { this.handleError(error); },
      });
    }

    this.conversationView = new ConversationView({
      elements: {
        container: this.elements.viewerContainer,
      },
      client: this.client,
      onResumeSession: () => this.handleResumeSession(),
      canResumeSession: () => this.isCurrentSessionResumable(),
      onToggleTimelinePanel: () => { this.handleTimelinePanelToggle(); },
      isTimelinePanelVisible: () => this.isTimelinePanelVisible(),
      canToggleTimelinePanel: () => Boolean(this.currentProject?.id),
      onToggleSidebar: () => this.toggleSidebar(),
      isSidebarCollapsed: () => this.isSidebarCollapsed(),
    });

    if (this.elements.timelinePanelContainer) {
      this.projectTimelinePanel = new ProjectTimelinePanel({
        elements: {
          container: this.elements.timelinePanelContainer,
        },
        client: this.client,
        onSessionSelect: (session) => {
          void this.handleSessionSelect(session);
        },
        onVisibilityChange: (visible) => {
          this.handleTimelinePanelVisibilityChange(visible);
        },
        onError: (error) => {
          this.handleError(error);
        },
      });
    }

    // Restore persisted project selection before signaling ready.
    await this.restorePersistedProject();
  }

  private async restorePersistedProject(): Promise<void> {
    const persisted = loadPersistedState();
    if (!persisted.projectId) return;

    try {
      const projects = await this.client.getProjects(undefined, {
        includeDeleted: this.projectFilters.includeDeleted,
      });
      const match = projects.find((p) => p.id === persisted.projectId);
      if (match) {
        this.handleProjectSelect(match);
      }
    } catch {
      // Project no longer available — ignore
    }
  }

  // ============================================
  // Connection Status
  // ============================================

  private async checkConnection(): Promise<void> {
    try {
      const sources = await this.client.getSources();
      const capabilities: SourceCapability[] = sources
        .map((source) => {
          const name = SourceResolver.normalizeSourceName(typeof source.name === 'string' ? source.name : '');
          const basePath = source.base_path && source.base_path.trim().length > 0
            ? SourceResolver.normalizePath(source.base_path)
            : '';
          const canResume = Boolean(source.can_resume);
          return { name, basePath, canResume };
        })
        .filter((source) => source.name.length > 0);

      const resumable = new Set<string>();
      for (const sourceInfo of capabilities) {
        if (sourceInfo.canResume) {
          resumable.add(sourceInfo.name);
        }
      }
      this.filterBar.setSourceCapabilities(capabilities, resumable);

      const discovered = sources
        .map((source) => source.name)
        .filter((name): name is string => typeof name === 'string' && name.trim().length > 0);
      this.filterBar.mergeDiscoveredSources(discovered);
      await this.filterBar.discoverSourcesFromProjects();
      this.updateConnectionStatus(true);
    } catch (error) {
      this.updateConnectionStatus(false, error instanceof Error ? error.message : i18n._('Connection failed'));
    }
  }

  private updateConnectionStatus(connected: boolean, errorMessage?: string): void {
    const status = document.getElementById('global-status');
    if (!status) return;

    status.classList.remove('connected', 'error', 'connecting');
    status.classList.add(connected ? 'connected' : 'error');

    const text = status.querySelector('.status-text');
    if (text) {
      text.textContent = connected ? i18n._('Connected') : (errorMessage ?? i18n._('Disconnected'));
    }
  }

  // ============================================
  // I18N
  // ============================================

  refreshI18n(): void {
    this.refreshViewSwitcherLabels();
    this.filterBar.refreshI18n();
  }

  // ============================================
  // Session Resume
  // ============================================

  private isCurrentSessionResumable(): boolean {
    const session = this.currentSession?.meta;
    if (!session?.fullPath) {
      return false;
    }

    const resolvedSource = this.filterBar.resolveSessionSource(session, this.currentProject);
    if (!resolvedSource) {
      return false;
    }
    return this.filterBar.isSourceResumable(resolvedSource);
  }

  private async handleResumeSession(): Promise<void> {
    const sessionPath = this.currentSession?.meta.fullPath;
    if (!sessionPath) return;

    try {
      await this.client.execResumeSession(sessionPath);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.handleError(err);
    }
  }

  // ============================================
  // Event Handlers
  // ============================================

  private handleProjectSelect(project: Project): void {
    this.currentProject = project;
    this.persistState();
    if (project.id) {
      void this.sessionList?.setProjectId(project.id, project.source);
    }
    this.conversationView?.setProjectPath(project.path ?? project.name ?? null, 0);
    this.conversationView?.setSessionContext(null);

    if (this.currentProjectView === 'list' && project.id) {
      this.showProjectTimelinePanel(project.id, project.source);
    }
    this.conversationView?.refreshToolbar();
  }

  private async handleTreeSessionSelect(session: SessionMeta, project: ProjectGroup): Promise<void> {
    this.layout.closeMobileSidebar();
    this.conversationView?.setProjectPath(project.name, 0);

    if (session.fullPath) {
      await this.loadSession(session.fullPath);
    }
    this.conversationView?.refreshToolbar();
  }

  private async handleTimelineSessionSelect(session: SessionMeta): Promise<void> {
    this.conversationView?.setProjectPath(session.projectPath ?? null, 0);

    if (session.fullPath) {
      await this.loadSession(session.fullPath);
    }
    this.conversationView?.refreshToolbar();
  }

  private handleTimelineProjectSelect(project: TimelineProjectSelection): void {
    const isSameProject = this.currentProject?.id === project.projectId;
    this.showProjectTimelinePanel(project.projectId, project.projectSource);
    if (isSameProject && this.currentSession) {
      this.conversationView?.refreshToolbar();
      return;
    }

    this.currentProject = {
      id: project.projectId,
      name: project.projectName,
      path: project.projectPath ?? undefined,
      source: (project.projectSource ?? this.currentProject?.source ?? 'claude') as Project['source'],
    } as Project;
    this.currentSession = null;
    this.conversationView?.setProjectPath(project.projectPath ?? project.projectName, 0);
    this.conversationView?.setSessionContext(null);
    this.conversationView?.clear();
    this.conversationView?.refreshToolbar();
  }

  private async handleSessionSelect(session: SessionMeta): Promise<void> {
    if (this.currentSession?.meta.id === session.id) {
      return;
    }

    this.sessionLoadController?.abort();
    const controller = new AbortController();
    this.sessionLoadController = controller;

    this.layout.closeMobileSidebar();

    try {
      const sessionPath = session.fullPath;
      if (!sessionPath) {
        throw new Error('Session has no path');
      }
      const sessionSource = session.source ?? this.currentProject?.source ?? null;
      this.conversationView?.setSessionContext({
        source: sessionSource,
        model: session.model ?? null,
      });

      // Stream entries progressively — renders as chunks arrive
      this.conversationView?.beginProgressiveDisplay();
      this.conversationView?.scrollToTop?.();

      const entries: Entry[] = [];
      let batch: Entry[] = [];

      for await (const entry of this.client.streamSessionEntries(sessionPath, STREAM_CHUNK_SIZE, controller.signal)) {
        if (controller.signal.aborted) return;
        entries.push(entry);
        batch.push(entry);

        if (batch.length >= STREAM_CHUNK_SIZE) {
          this.conversationView?.appendEntries(batch);
          batch = [];
        }
      }

      if (controller.signal.aborted) return;

      // Flush remaining entries
      if (batch.length > 0) {
        this.conversationView?.appendEntries(batch);
      }

      // Finalize: link tool results, set up filters
      this.conversationView?.finalizeProgressiveDisplay();

      this.currentSession = {
        meta: session,
        entries,
      };

      void Promise.resolve(this.options.onSessionLoaded?.(session, entries));
    } catch (error) {
      if (controller.signal.aborted) return;
      this.handleError(error instanceof Error ? error : new Error(String(error)));
    } finally {
      if (this.sessionLoadController === controller) {
        this.sessionLoadController = null;
      }
    }
  }

  // ============================================
  // Timeline Panel Control
  // ============================================

  private showProjectTimelinePanel(projectId: string, source?: string): void {
    this.projectTimelinePanel?.setProject(projectId, source);
    this.projectTimelinePanel?.show();
    this.layout.timelinePanelContainer.classList.add('visible');
    this.conversationView?.refreshToolbar();
  }

  private hideProjectTimelinePanel(): void {
    this.projectTimelinePanel?.hide();
    this.layout.timelinePanelContainer.classList.remove('visible');
    this.conversationView?.refreshToolbar();
  }

  private handleTimelinePanelVisibilityChange(visible: boolean): void {
    this.layout.timelinePanelContainer.classList.toggle('visible', visible);
    this.conversationView?.refreshToolbar();
  }

  private isTimelinePanelVisible(): boolean {
    return this.layout.timelinePanelContainer.classList.contains('visible') ?? false;
  }

  private handleTimelinePanelToggle(): void {
    if (!this.currentProject?.id) {
      return;
    }

    if (this.isTimelinePanelVisible()) {
      this.hideProjectTimelinePanel();
    } else {
      this.showProjectTimelinePanel(this.currentProject.id, this.currentProject.source);
    }
  }

  // ============================================
  // Error Handling
  // ============================================

  private handleError(error: Error): void {
    console.error('ApiViewer error:', error);
    this.options.onError?.(error);
    this.updateConnectionStatus(false, error.message);
  }

  private handleSidebarCollapsedChange(collapsed: boolean): void {
    this.conversationView?.refreshToolbar();
    window.dispatchEvent(new CustomEvent('thinkt:sidebar-collapsed-change', { detail: { collapsed } }));
  }

  // ============================================
  // Public API
  // ============================================

  getCurrentProject(): Project | null {
    return this.currentProject;
  }

  whenReady(): Promise<void> {
    return this.initialized;
  }

  getCurrentSession(): LoadedSession | null {
    return this.currentSession;
  }

  async loadSession(sessionPath: string): Promise<void> {
    const metadata = await this.client.getSessionMetadata(sessionPath, {
      summaryOnly: true,
      limit: 1,
    });
    const meta = metadata.meta;
    await this.handleSessionSelect({
      ...meta,
      fullPath: meta.fullPath ?? sessionPath,
      entryCount: metadata.totalEntries || meta.entryCount,
    });
  }

  refreshProjects(): Promise<void> {
    void this.filterBar.discoverSourcesFromProjects();
    switch (this.currentProjectView) {
      case 'list':
        return this.projectBrowser?.refresh() ?? Promise.resolve();
      case 'tree':
        return this.treeProjectBrowser?.refresh() ?? Promise.resolve();
      case 'timeline':
        return this.timelineVisualization?.refresh() ?? Promise.resolve();
      default:
        return Promise.resolve();
    }
  }

  setProjectView(mode: ProjectViewMode): void {
    this.switchProjectView(mode);
  }

  getProjectView(): ProjectViewMode {
    return this.currentProjectView;
  }

  getProjectBrowser(): ProjectBrowser | null {
    return this.projectBrowser;
  }

  getTreeProjectBrowser(): TreeProjectBrowser | null {
    return this.treeProjectBrowser;
  }

  getTimelineVisualization(): TimelineVisualization | null {
    return this.timelineVisualization;
  }

  getProjectTimelinePanel(): ProjectTimelinePanel | null {
    return this.projectTimelinePanel;
  }

  getSessionList(): SessionList | null {
    return this.sessionList;
  }

  getConversationView(): ConversationView | null {
    return this.conversationView;
  }

  focusProjectSearch(): void {
    this.filterBar.focusSearch();
  }

  focusSessionSearch(): void {
    this.sessionList?.focusSearch();
  }

  async selectProject(projectId: string): Promise<void> {
    let project = this.projectBrowser?.getProjects().find(p => p.id === projectId);
    if (!project) {
      await this.refreshProjects();
      project = this.projectBrowser?.getProjects().find(p => p.id === projectId);
    }
    if (!project) {
      const projects = await this.client.getProjects(undefined, {
        includeDeleted: this.projectFilters.includeDeleted,
      });
      project = projects.find((p) => p.id === projectId);
    }
    if (!project) return;

    this.projectBrowser?.selectProjectById(projectId);
    this.handleProjectSelect(project);
  }

  async selectProjectByName(projectName: string): Promise<void> {
    let project = this.projectBrowser?.getProjects().find(p => p.name === projectName);
    if (!project) {
      await this.refreshProjects();
      project = this.projectBrowser?.getProjects().find(p => p.name === projectName);
    }
    if (!project) {
      const projects = await this.client.getProjects(undefined, {
        includeDeleted: this.projectFilters.includeDeleted,
      });
      project = projects.find((p) => p.name === projectName);
    }
    if (!project?.id) return;

    await this.selectProject(project.id);
  }

  selectSessionById(sessionId: string): void {
    this.sessionList?.selectSessionById(sessionId);
  }

  scrollToEntry(entryIndex: number): void {
    this.conversationView?.scrollToEntry(entryIndex);
  }

  toggleSidebar(): void {
    this.layout.toggleSidebarCollapsed();
  }

  isSidebarCollapsed(): boolean {
    return this.layout.isSidebarCollapsed();
  }

  // ============================================
  // Cleanup
  // ============================================

  dispose(): void {
    if (this.disposed) return;

    this.abortController.abort();
    this.sessionLoadController?.abort();

    this.layout.dispose();

    this.projectBrowser?.dispose();
    this.treeProjectBrowser?.dispose();
    this.timelineVisualization?.dispose();
    this.sessionList?.dispose();
    this.conversationView?.dispose();
    this.projectTimelinePanel?.dispose();

    this.projectBrowser = null;
    this.treeProjectBrowser = null;
    this.timelineVisualization = null;
    this.sessionList = null;
    this.conversationView = null;
    this.projectTimelinePanel = null;
    this.currentProject = null;
    this.currentSession = null;

    this.disposed = true;
  }
}
