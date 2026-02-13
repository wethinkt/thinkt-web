/**
 * ApiViewer Component
 *
 * A high-level component that connects the THINKT API to a conversation view.
 * Provides a complete browsing and conversation viewing experience (no 3D).
 * 
 * Features multiple project view modes:
 * - List: Flat list of projects (original)
 * - Tree: Hierarchical tree by project → source → sessions
 * - Timeline: Visual timeline of sessions over time
 */

import type { Project, SessionMeta, Entry } from '@wethinkt/ts-thinkt';
import { type ThinktClient, getDefaultClient } from '@wethinkt/ts-thinkt/api';
import { ProjectBrowser } from './ProjectBrowser';
import { SessionList } from './SessionList';
import { ConversationView } from './ConversationView';
import { TreeProjectBrowser, type ProjectGroup } from './TreeProjectBrowser';
import { TimelineVisualization, type TimelineProjectSelection } from './TimelineVisualization';
import { ProjectTimelinePanel } from './ProjectTimelinePanel';

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

export interface LoadedSession {
  meta: SessionMeta;
  entries: Entry[];
}

// ============================================
// Default Styles
// ============================================

const DEFAULT_STYLES = `
.thinkt-api-viewer {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background: var(--thinkt-bg-color, #0a0a0a);
}

.thinkt-api-viewer__sidebar {
  display: flex;
  flex-direction: column;
  width: 380px;
  min-width: 280px;
  max-width: 500px;
  border-right: 1px solid var(--thinkt-border-color, #2a2a2a);
  background: var(--thinkt-sidebar-bg, #141414);
  padding-top: 40px; /* Space for fixed header (brand/status) */
}

.thinkt-project-browser,
.thinkt-session-list {
  background: transparent !important;
}

.thinkt-api-viewer__projects {
  flex: 0 0 auto;
  height: 45%;
  min-height: 150px;
  border-bottom: 1px solid var(--thinkt-border-color, #2a2a2a);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.thinkt-api-viewer__projects.full-height {
  flex: 1;
  height: auto;
}

.thinkt-api-viewer__projects.hidden {
  display: none;
}

.thinkt-api-viewer__sessions {
  flex: 1;
  overflow: hidden;
  min-height: 200px;
}

.thinkt-api-viewer__sessions.hidden {
  display: none;
}

.thinkt-api-viewer__viewer {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: var(--thinkt-bg-color, #0a0a0a);
  display: flex;
  flex-direction: column;
}

.thinkt-api-viewer__conversation {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.thinkt-api-viewer__timeline-panel {
  height: 200px;
  min-height: 150px;
  max-height: 400px;
  border-top: 1px solid var(--thinkt-border-color, #2a2a2a);
  background: var(--thinkt-bg-secondary, #141414);
  flex-shrink: 0;
  display: none;
}

.thinkt-api-viewer__timeline-panel.visible {
  display: flex;
}

.thinkt-api-viewer__resizer {
  width: 4px;
  background: var(--thinkt-border-color, #2a2a2a);
  cursor: col-resize;
  transition: background 0.15s ease;
}

.thinkt-api-viewer__resizer:hover,
.thinkt-api-viewer__resizer.resizing {
  background: var(--thinkt-accent-color, #6366f1);
}

/* View Switcher */
.thinkt-view-switcher {
  display: flex;
  padding: 6px 8px;
  border-bottom: 1px solid var(--thinkt-border-color, #2a2a2a);
  background: var(--thinkt-bg-secondary, #141414);
  gap: 4px;
}

.thinkt-view-switcher-btn {
  flex: 1;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  color: var(--thinkt-text-muted, #666);
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.thinkt-view-switcher-btn:hover {
  background: var(--thinkt-bg-hover, #252525);
  color: var(--thinkt-text-secondary, #a0a0a0);
}

.thinkt-view-switcher-btn.active {
  background: var(--thinkt-accent-color, #6366f1);
  color: white;
}

.thinkt-view-switcher-btn .icon {
  font-size: 10px;
}

.thinkt-project-filter {
  display: flex;
  gap: 6px;
  padding: 6px 8px;
  border-bottom: 1px solid var(--thinkt-border-color, #2a2a2a);
  background: var(--thinkt-bg-secondary, #141414);
}

.thinkt-project-filter__search,
.thinkt-project-filter__source {
  border: 1px solid var(--thinkt-border-color, #333);
  border-radius: 4px;
  background: var(--thinkt-input-bg, #252525);
  color: var(--thinkt-text-color, #e0e0e0);
  font-size: 12px;
  padding: 6px 8px;
}

.thinkt-project-filter__search {
  flex: 1;
}

.thinkt-project-filter__search:focus,
.thinkt-project-filter__source:focus {
  outline: none;
  border-color: var(--thinkt-accent-color, #6366f1);
}

/* Responsive */
@media (max-width: 768px) {
  .thinkt-api-viewer__sidebar {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: 10;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
  }

  .thinkt-api-viewer__sidebar--open {
    transform: translateX(0);
  }
  
  .thinkt-api-viewer__resizer {
    display: none;
  }
}
`;

// ============================================
// Component Class
// ============================================

export class ApiViewer {
  private elements: ApiViewerElements;
  private options: ApiViewerOptions;
  private client: ThinktClient;
  private projectBrowser: ProjectBrowser | null = null;
  private treeProjectBrowser: TreeProjectBrowser | null = null;
  private timelineVisualization: TimelineVisualization | null = null;
  private sessionList: SessionList | null = null;
  private conversationView: ConversationView | null = null;
  private projectTimelinePanel: ProjectTimelinePanel | null = null;
  private currentProject: Project | null = null;
  private currentSession: LoadedSession | null = null;
  private currentProjectView: ProjectViewMode = 'list';
  private projectFilterContainer: HTMLElement | null = null;
  private projectSearchInput: HTMLInputElement | null = null;
  private projectSourceFilter: HTMLSelectElement | null = null;
  private projectSearchQuery = '';
  private projectSource = '';
  private isLoadingSession = false;
  private boundHandlers: Array<() => void> = [];
  private disposed = false;
  private stylesInjected = false;

  constructor(options: ApiViewerOptions) {
    this.elements = options.elements;
    this.options = options;
    this.client = options.client ?? getDefaultClient();
    this.currentProjectView = options.initialProjectView ?? 'list';
    this.init();
  }

  // ============================================
  // Initialization
  // ============================================

  private init(): void {
    this.injectStyles();
    this.createStructure();
    void this.initializeComponentsAsync();
  }

  private injectStyles(): void {
    if (this.stylesInjected) return;

    const styleId = 'thinkt-api-viewer-styles';
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
    container.className = 'thinkt-api-viewer';

    // Sidebar - contains projects and sessions
    const sidebar = document.createElement('div');
    sidebar.className = 'thinkt-api-viewer__sidebar';

    // View switcher
    const viewSwitcher = this.createViewSwitcher();
    sidebar.appendChild(viewSwitcher);

    // Shared project filters (applies to list/tree/timeline views)
    this.projectFilterContainer = this.createProjectFilterBar();
    sidebar.appendChild(this.projectFilterContainer);

    // Projects section
    const projectsSection = document.createElement('div');
    projectsSection.className = 'thinkt-api-viewer__projects';
    projectsSection.id = 'projects-section';
    projectsSection.appendChild(this.elements.projectBrowserContainer);
    sidebar.appendChild(projectsSection);

    // Sessions section
    const sessionsSection = document.createElement('div');
    sessionsSection.className = 'thinkt-api-viewer__sessions';
    sessionsSection.id = 'sessions-section';
    sessionsSection.appendChild(this.elements.sessionListContainer);
    sidebar.appendChild(sessionsSection);

    container.appendChild(sidebar);

    // Resizer (optional)
    if (this.elements.resizer) {
      container.appendChild(this.elements.resizer);
    } else {
      const resizer = document.createElement('div');
      resizer.className = 'thinkt-api-viewer__resizer';
      this.elements.resizer = resizer;
      container.appendChild(resizer);
      this.setupResizer();
    }

    // Viewer section - contains conversation and timeline panel
    const viewerSection = document.createElement('div');
    viewerSection.className = 'thinkt-api-viewer__viewer';
    
    // Create timeline panel container if not provided
    if (!this.elements.timelinePanelContainer) {
      this.elements.timelinePanelContainer = document.createElement('div');
      this.elements.timelinePanelContainer.className = 'thinkt-api-viewer__timeline-panel';
      this.elements.timelinePanelContainer.style.display = 'none';
      this.elements.timelinePanelContainer.style.height = '200px';
      this.elements.timelinePanelContainer.style.flexShrink = '0';
    }
    
    // Conversation container (flex: 1 to take remaining space)
    const conversationContainer = document.createElement('div');
    conversationContainer.className = 'thinkt-api-viewer__conversation';
    conversationContainer.style.flex = '1';
    conversationContainer.style.overflow = 'hidden';
    conversationContainer.appendChild(this.elements.viewerContainer);
    
    // Assemble viewer section with flex column layout
    viewerSection.style.display = 'flex';
    viewerSection.style.flexDirection = 'column';
    viewerSection.appendChild(conversationContainer);
    viewerSection.appendChild(this.elements.timelinePanelContainer);
    
    container.appendChild(viewerSection);
  }

  private createViewSwitcher(): HTMLElement {
    const switcher = document.createElement('div');
    switcher.className = 'thinkt-view-switcher';
    
    const views: { id: ProjectViewMode; label: string; icon: string }[] = [
      { id: 'list', label: 'List', icon: '☰' },
      { id: 'tree', label: 'Tree', icon: '🌳' },
      { id: 'timeline', label: 'Timeline', icon: '◯' },
    ];

    views.forEach(view => {
      const btn = document.createElement('button');
      btn.className = `thinkt-view-switcher-btn ${this.currentProjectView === view.id ? 'active' : ''}`;
      btn.innerHTML = `<span class="icon">${view.icon}</span> ${view.label}`;
      btn.addEventListener('click', () => this.switchProjectView(view.id));
      switcher.appendChild(btn);
    });

    return switcher;
  }

  private createProjectFilterBar(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'thinkt-project-filter';

    const searchInput = document.createElement('input');
    searchInput.className = 'thinkt-project-filter__search';
    searchInput.type = 'text';
    searchInput.placeholder = 'Filter projects...';
    searchInput.value = this.projectSearchQuery;
    this.projectSearchInput = searchInput;

    const sourceFilter = document.createElement('select');
    sourceFilter.className = 'thinkt-project-filter__source';
    sourceFilter.innerHTML = `
      <option value="">All Sources</option>
      <option value="claude">Claude</option>
      <option value="kimi">Kimi</option>
      <option value="gemini">Gemini</option>
      <option value="copilot">Copilot</option>
      <option value="thinkt">Thinkt</option>
    `;
    sourceFilter.value = this.projectSource;
    this.projectSourceFilter = sourceFilter;

    const handleSearchInput = () => {
      this.projectSearchQuery = searchInput.value;
      this.applyProjectFilters();
    };
    searchInput.addEventListener('input', handleSearchInput);
    this.boundHandlers.push(() => searchInput.removeEventListener('input', handleSearchInput));

    const handleSourceChange = () => {
      this.projectSource = sourceFilter.value;
      this.applyProjectFilters();
    };
    sourceFilter.addEventListener('change', handleSourceChange);
    this.boundHandlers.push(() => sourceFilter.removeEventListener('change', handleSourceChange));

    container.appendChild(searchInput);
    container.appendChild(sourceFilter);
    return container;
  }

  private applyProjectFilters(): void {
    const query = this.projectSearchInput?.value ?? this.projectSearchQuery;
    const source = this.projectSourceFilter?.value || this.projectSource;
    this.projectSearchQuery = query;
    this.projectSource = source;
    const normalizedSource = source || null;

    switch (this.currentProjectView) {
      case 'list':
        this.projectBrowser?.setSearch(query);
        this.projectBrowser?.setSourceFilter(normalizedSource);
        break;
      case 'tree':
        this.treeProjectBrowser?.setSearch(query);
        this.treeProjectBrowser?.setSourceFilter(normalizedSource);
        break;
      case 'timeline':
        this.timelineVisualization?.setSearch(query);
        this.timelineVisualization?.setSourceFilter(normalizedSource);
        break;
    }
  }

  private setupResizer(): void {
    const { resizer, container } = this.elements;
    if (!resizer) return;

    const sidebar = container.querySelector('.thinkt-api-viewer__sidebar') as HTMLElement;
    if (!sidebar) return;

    let isResizing = false;

    const startResize = (e: MouseEvent) => {
      isResizing = true;
      document.body.style.cursor = 'col-resize';
      e.preventDefault();
    };

    const doResize = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = e.clientX;
      if (newWidth >= 250 && newWidth <= 600) {
        sidebar.style.width = `${newWidth}px`;
      }
    };

    const stopResize = () => {
      isResizing = false;
      document.body.style.cursor = '';
    };

    resizer.addEventListener('mousedown', startResize);
    document.addEventListener('mousemove', doResize);
    document.addEventListener('mouseup', stopResize);

    this.boundHandlers.push(() => {
      resizer.removeEventListener('mousedown', startResize);
      document.removeEventListener('mousemove', doResize);
      document.removeEventListener('mouseup', stopResize);
    });
  }

  // ============================================
  // View Switching
  // ============================================

  private switchProjectView(mode: ProjectViewMode): void {
    if (this.currentProjectView === mode) return;
    
    this.currentProjectView = mode;

    // Update button states
    const buttons = this.elements.container.querySelectorAll('.thinkt-view-switcher-btn');
    buttons.forEach((btn, index) => {
      const modes: ProjectViewMode[] = ['list', 'tree', 'timeline'];
      btn.classList.toggle('active', modes[index] === mode);
    });

    // Clear current view
    this.elements.projectBrowserContainer.innerHTML = '';
    
    // Dispose old views
    this.projectBrowser?.dispose();
    this.projectBrowser = null;
    this.treeProjectBrowser?.dispose();
    this.treeProjectBrowser = null;
    this.timelineVisualization?.dispose();
    this.timelineVisualization = null;

    // Show/hide sessions section based on view mode
    const projectsSection = document.getElementById('projects-section');
    const sessionsSection = document.getElementById('sessions-section');

    switch (mode) {
      case 'list':
        // List view: normal layout with projects and sessions
        projectsSection?.classList.remove('full-height', 'hidden');
        sessionsSection?.classList.remove('hidden');
        void this.initListView();
        // Show timeline panel if a project is selected
        if (this.currentProject) {
          if (this.currentProject.id) {
            this.showProjectTimelinePanel(this.currentProject.id);
          } else {
            this.hideProjectTimelinePanel();
          }
        }
        break;
      
      case 'tree':
        // Tree view: projects take full height (sessions are in the tree)
        projectsSection?.classList.add('full-height');
        projectsSection?.classList.remove('hidden');
        sessionsSection?.classList.add('hidden');
        this.hideProjectTimelinePanel();
        void this.initTreeView();
        break;
      
      case 'timeline':
        // Timeline view: full height, no separate sessions list
        projectsSection?.classList.add('full-height');
        projectsSection?.classList.remove('hidden');
        sessionsSection?.classList.add('hidden');
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
      onProjectSelect: (project) => {
        this.handleTimelineProjectSelect(project);
      },
      onSessionSelect: (session) => { 
        void this.handleTimelineSessionSelect(session);
      },
      onError: (error) => { this.handleError(error); },
    });
    this.applyProjectFilters();
  }

  // ============================================
  // Component Initialization
  // ============================================

  private async initializeComponentsAsync(): Promise<void> {
    // Check connection first
    await this.checkConnection();
    
    // Initialize current project view
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

    // Initialize Session List (only for list view)
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

    // Initialize Conversation View
    this.conversationView = new ConversationView({
      elements: {
        container: this.elements.viewerContainer,
      },
      client: this.client,
      onToggleTimelinePanel: () => { this.handleTimelinePanelToggle(); },
      isTimelinePanelVisible: () => this.isTimelinePanelVisible(),
      canToggleTimelinePanel: () => Boolean(this.currentProject?.id),
    });

    // Initialize Project Timeline Panel
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
  }

  // ============================================
  // Connection Status
  // ============================================

  private async checkConnection(): Promise<void> {
    try {
      await this.client.getSources();
      this.updateConnectionStatus(true);
    } catch (error) {
      this.updateConnectionStatus(false, error instanceof Error ? error.message : 'Connection failed');
    }
  }

  private updateConnectionStatus(connected: boolean, errorMessage?: string): void {
    const status = document.getElementById('global-status');
    if (!status) return;

    status.classList.remove('connected', 'error', 'connecting');
    status.classList.add(connected ? 'connected' : 'error');

    const text = status.querySelector('.status-text');
    if (text) {
      text.textContent = connected ? 'Connected' : (errorMessage ?? 'Disconnected');
    }
  }

  // ============================================
  // Event Handlers
  // ============================================

  private handleProjectSelect(project: Project): void {
    this.currentProject = project;
    if (project.id) {
      void this.sessionList?.setProjectId(project.id);
    }
    // Update project path in conversation view toolbar
    this.conversationView?.setProjectPath(project.path ?? project.name ?? null, 0);
    
    // Show timeline panel for this project
    if (this.currentProjectView === 'list' && project.id) {
      this.showProjectTimelinePanel(project.id);
    }
    this.conversationView?.refreshToolbar();
  }

  private async handleTreeSessionSelect(session: SessionMeta, project: ProjectGroup): Promise<void> {
    // Update current project context
    this.conversationView?.setProjectPath(project.name, 0);
    
    // Load the session
    if (session.fullPath) {
      await this.loadSession(session.fullPath);
    }
    this.conversationView?.refreshToolbar();
  }

  private async handleTimelineSessionSelect(session: SessionMeta): Promise<void> {
    // Update project path from session metadata
    this.conversationView?.setProjectPath(session.projectPath ?? null, 0);
    
    // Load the session
    if (session.fullPath) {
      await this.loadSession(session.fullPath);
    }
    this.conversationView?.refreshToolbar();
  }

  private handleTimelineProjectSelect(project: TimelineProjectSelection): void {
    const isSameProject = this.currentProject?.id === project.projectId;
    this.showProjectTimelinePanel(project.projectId);
    if (isSameProject && this.currentSession) {
      this.conversationView?.refreshToolbar();
      return;
    }

    this.currentProject = {
      id: project.projectId,
      name: project.projectName,
      path: project.projectPath ?? undefined,
    } as Project;
    this.currentSession = null;
    this.conversationView?.setProjectPath(project.projectPath ?? project.projectName, 0);
    this.conversationView?.clear();
    this.conversationView?.refreshToolbar();
  }

  private showProjectTimelinePanel(projectId: string): void {
    this.projectTimelinePanel?.setProject(projectId);
    this.projectTimelinePanel?.show();
    this.elements.timelinePanelContainer?.classList.add('visible');
    this.conversationView?.refreshToolbar();
  }

  private hideProjectTimelinePanel(): void {
    this.projectTimelinePanel?.hide();
    this.elements.timelinePanelContainer?.classList.remove('visible');
    this.conversationView?.refreshToolbar();
  }

  private handleTimelinePanelVisibilityChange(visible: boolean): void {
    this.elements.timelinePanelContainer?.classList.toggle('visible', visible);
    this.conversationView?.refreshToolbar();
  }

  private isTimelinePanelVisible(): boolean {
    return this.elements.timelinePanelContainer?.classList.contains('visible') ?? false;
  }

  private handleTimelinePanelToggle(): void {
    if (!this.currentProject?.id) {
      return;
    }

    if (this.isTimelinePanelVisible()) {
      this.hideProjectTimelinePanel();
    } else {
      this.showProjectTimelinePanel(this.currentProject.id);
    }
  }

  private async handleSessionSelect(session: SessionMeta): Promise<void> {
    if (this.isLoadingSession) return;

    this.isLoadingSession = true;

    try {
      // Load all entries for the session
      const sessionPath = session.fullPath;
      if (!sessionPath) {
        throw new Error('Session has no path');
      }
      const entries = await this.client.getAllSessionEntries(sessionPath);

      this.currentSession = {
        meta: session,
        entries,
      };

      // Load into conversation view
      this.conversationView?.displayEntries(entries);

      void Promise.resolve(this.options.onSessionLoaded?.(session, entries));
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error(String(error)));
    } finally {
      this.isLoadingSession = false;
    }
  }

  private handleError(error: Error): void {
    console.error('ApiViewer error:', error);
    this.options.onError?.(error);
    this.updateConnectionStatus(false, error.message);
  }

  // ============================================
  // Public API
  // ============================================

  /**
   * Get the current project
   */
  getCurrentProject(): Project | null {
    return this.currentProject;
  }

  /**
   * Get the current session
   */
  getCurrentSession(): LoadedSession | null {
    return this.currentSession;
  }

  /**
   * Load a specific session by path
   */
  async loadSession(sessionPath: string): Promise<void> {
    const session = await this.client.getSession(sessionPath);
    await this.handleSessionSelect(session.meta);
  }

  /**
   * Refresh the project list
   */
  refreshProjects(): Promise<void> {
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

  /**
   * Switch project view
   */
  setProjectView(mode: ProjectViewMode): void {
    this.switchProjectView(mode);
  }

  /**
   * Get current project view mode
   */
  getProjectView(): ProjectViewMode {
    return this.currentProjectView;
  }

  /**
   * Get the ProjectBrowser instance (list view only)
   */
  getProjectBrowser(): ProjectBrowser | null {
    return this.projectBrowser;
  }

  /**
   * Get the TreeProjectBrowser instance (tree view only)
   */
  getTreeProjectBrowser(): TreeProjectBrowser | null {
    return this.treeProjectBrowser;
  }

  /**
   * Get the TimelineVisualization instance (timeline view only)
   */
  getTimelineVisualization(): TimelineVisualization | null {
    return this.timelineVisualization;
  }

  /**
   * Get the ProjectTimelinePanel instance
   */
  getProjectTimelinePanel(): ProjectTimelinePanel | null {
    return this.projectTimelinePanel;
  }

  /**
   * Get the SessionList instance
   */
  getSessionList(): SessionList | null {
    return this.sessionList;
  }

  /**
   * Get the ConversationView instance
   */
  getConversationView(): ConversationView | null {
    return this.conversationView;
  }

  /**
   * Focus the project browser search input
   */
  focusProjectSearch(): void {
    this.projectSearchInput?.focus();
  }

  /**
   * Focus the session list search input
   */
  focusSessionSearch(): void {
    this.sessionList?.focusSearch();
  }

  /**
   * Select a project by ID and load its sessions
   */
  async selectProject(projectId: string): Promise<void> {
    // Find the project in the browser
    const project = this.projectBrowser?.getProjects().find(p => p.id === projectId);
    if (project) {
      // Update UI selection
      this.projectBrowser?.selectProjectById(projectId);
      this.handleProjectSelect(project);
    } else {
      // Project not loaded yet, try to refresh and find it
      await this.refreshProjects();
      const refreshedProject = this.projectBrowser?.getProjects().find(p => p.id === projectId);
      if (refreshedProject) {
        // Update UI selection
        this.projectBrowser?.selectProjectById(projectId);
        this.handleProjectSelect(refreshedProject);
      }
    }
  }

  /**
   * Select a session by ID (project must be selected first)
   */
  selectSessionById(sessionId: string): void {
    this.sessionList?.selectSessionById(sessionId);
  }

  /**
   * Scroll to a specific entry in the conversation by index
   */
  scrollToEntry(entryIndex: number): void {
    this.conversationView?.scrollToEntry(entryIndex);
  }

  // ============================================
  // Cleanup
  // ============================================

  dispose(): void {
    if (this.disposed) return;

    this.boundHandlers.forEach(remove => remove());
    this.boundHandlers = [];

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
    this.projectFilterContainer = null;
    this.projectSearchInput = null;
    this.projectSourceFilter = null;

    this.disposed = true;
  }
}

// ============================================
// Factory Function
// ============================================

export function createApiViewer(options: ApiViewerOptions): ApiViewer {
  return new ApiViewer(options);
}
