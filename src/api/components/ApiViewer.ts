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
import { i18n } from '@lingui/core';
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

interface SourceCapability {
  name: string;
  basePath: string;
  canResume: boolean;
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

/* Sidebar toggle button (narrow viewports, inside #top-bar) */
.thinkt-sidebar-toggle {
  display: none;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--thinkt-text-color, #e0e0e0);
  font-size: 16px;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  line-height: 1;
  padding: 0;
  flex-shrink: 0;
}

.thinkt-sidebar-toggle:hover {
  background: rgba(255, 255, 255, 0.1);
}

.thinkt-sidebar-overlay {
  display: none;
  position: fixed;
  inset: 0;
  z-index: 9;
  background: rgba(0, 0, 0, 0.5);
}

/* Responsive */
@media (max-width: 768px) {
  .thinkt-sidebar-toggle {
    display: flex;
  }

  .thinkt-api-viewer__sidebar {
    position: fixed;
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

  .thinkt-sidebar-overlay--open {
    display: block;
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
  private discoveredSources: string[] = [];
  private sourceCapabilities: SourceCapability[] = [];
  private resumableSources: Set<string> = new Set();
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
    this.syncTopBarToSidebar(sidebar);

    // Sidebar toggle (for narrow viewports, injected into #top-bar)
    const sidebarToggle = document.createElement('button');
    sidebarToggle.className = 'thinkt-sidebar-toggle';
    sidebarToggle.setAttribute('aria-label', 'Toggle sidebar');
    sidebarToggle.textContent = '\u2630'; // hamburger ☰
    const topBar = document.getElementById('top-bar');
    if (topBar) {
      topBar.insertBefore(sidebarToggle, topBar.firstChild);
    }

    const sidebarOverlay = document.createElement('div');
    sidebarOverlay.className = 'thinkt-sidebar-overlay';
    container.appendChild(sidebarOverlay);

    const toggleSidebar = () => {
      const opening = !sidebar.classList.contains('thinkt-api-viewer__sidebar--open');
      sidebar.classList.toggle('thinkt-api-viewer__sidebar--open', opening);
      sidebarOverlay.classList.toggle('thinkt-sidebar-overlay--open', opening);
    };
    const closeSidebar = () => {
      sidebar.classList.remove('thinkt-api-viewer__sidebar--open');
      sidebarOverlay.classList.remove('thinkt-sidebar-overlay--open');
    };
    sidebarToggle.addEventListener('click', toggleSidebar);
    sidebarOverlay.addEventListener('click', closeSidebar);
    this.boundHandlers.push(() => {
      sidebarToggle.removeEventListener('click', toggleSidebar);
      sidebarOverlay.removeEventListener('click', closeSidebar);
    });

    const handleWindowResize = () => {
      this.syncTopBarToSidebar(sidebar);
    };
    window.addEventListener('resize', handleWindowResize);
    this.boundHandlers.push(() => window.removeEventListener('resize', handleWindowResize));

    const handleLocaleChange = () => {
      this.refreshI18n();
    };
    window.addEventListener('thinkt:locale-changed', handleLocaleChange as EventListener);
    this.boundHandlers.push(() => window.removeEventListener('thinkt:locale-changed', handleLocaleChange as EventListener));

    // Resizer (optional)
    if (!this.elements.resizer) {
      const resizer = document.createElement('div');
      resizer.className = 'thinkt-api-viewer__resizer';
      this.elements.resizer = resizer;
    }
    container.appendChild(this.elements.resizer);
    this.setupResizer();

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

  private createProjectFilterBar(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'thinkt-project-filter';

    const searchInput = document.createElement('input');
    searchInput.className = 'thinkt-project-filter__search';
    searchInput.type = 'text';
    searchInput.placeholder = i18n._('Filter projects...');
    searchInput.value = this.projectSearchQuery;
    this.projectSearchInput = searchInput;

    const sourceFilter = document.createElement('select');
    sourceFilter.className = 'thinkt-project-filter__source';
    this.projectSourceFilter = sourceFilter;
    this.renderSourceFilterOptions();

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

  private normalizeSourceName(source: string): string {
    return source.trim().toLowerCase();
  }

  private normalizePath(pathValue: string): string {
    return pathValue.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/\/$/, '').toLowerCase();
  }

  private inferSourceFromPath(pathValue: string): string | null {
    const hiddenSourceMatch = pathValue.match(/\/\.([a-z0-9_-]+)(?:\/|$)/);
    if (!hiddenSourceMatch) return null;

    const inferred = hiddenSourceMatch[1];
    if (!inferred || inferred === 'config' || inferred === 'cache') {
      return null;
    }
    return inferred;
  }

  private detectSourceFromPaths(paths: Array<string | null | undefined>): string | null {
    const normalizedPaths = paths
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .map((value) => this.normalizePath(value));
    if (normalizedPaths.length === 0) return null;

    let bestMatch: SourceCapability | null = null;
    for (const sourceInfo of this.sourceCapabilities) {
      if (!sourceInfo.basePath) continue;
      const isMatch = normalizedPaths.some((pathValue) =>
        pathValue === sourceInfo.basePath || pathValue.startsWith(`${sourceInfo.basePath}/`));
      if (!isMatch) continue;
      if (!bestMatch || sourceInfo.basePath.length > bestMatch.basePath.length) {
        bestMatch = sourceInfo;
      }
    }
    if (bestMatch) {
      return bestMatch.name;
    }

    for (const pathValue of normalizedPaths) {
      const inferred = this.inferSourceFromPath(pathValue);
      if (inferred) return inferred;
    }

    return null;
  }

  private resolveSessionSource(session: SessionMeta): string | null {
    const pathSource = this.detectSourceFromPaths([
      session.fullPath,
      session.projectPath,
      this.currentProject?.path,
      this.currentProject?.sourceBasePath,
    ]);
    if (pathSource) {
      return pathSource;
    }

    const direct = (session.source || this.currentProject?.source || '').toString().trim().toLowerCase();
    return direct || null;
  }

  private mergeDiscoveredSources(sources: string[]): void {
    const merged = new Set(this.discoveredSources);
    for (const source of sources) {
      const normalized = this.normalizeSourceName(source);
      if (normalized) {
        merged.add(normalized);
      }
    }
    this.discoveredSources = Array.from(merged).sort((a, b) => a.localeCompare(b));
    this.renderSourceFilterOptions();
  }

  private renderSourceFilterOptions(): void {
    if (!this.projectSourceFilter) return;

    const sourceFilter = this.projectSourceFilter;
    const selected = this.normalizeSourceName(sourceFilter.value || this.projectSource || '');
    sourceFilter.innerHTML = '';

    const allOption = document.createElement('option');
    allOption.value = '';
    allOption.textContent = i18n._('All Sources');
    sourceFilter.appendChild(allOption);

    const optionSources = [...this.discoveredSources];
    if (selected && !optionSources.includes(selected)) {
      optionSources.push(selected);
    }

    optionSources.sort((a, b) => a.localeCompare(b));
    optionSources.forEach((source) => {
      const option = document.createElement('option');
      option.value = source;
      option.textContent = source.charAt(0).toUpperCase() + source.slice(1);
      sourceFilter.appendChild(option);
    });

    sourceFilter.value = selected;
    this.projectSource = sourceFilter.value;
  }

  private async discoverSourcesFromProjects(): Promise<void> {
    try {
      const projects = await this.client.getProjects();
      const discovered = projects
        .map((project) => (typeof project.source === 'string' ? project.source.trim() : ''))
        .filter((source) => source.length > 0);
      this.mergeDiscoveredSources(discovered);
    } catch {
      // Ignore discovery failures; project loading in active views still works.
    }
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

  private syncTopBarToSidebar(sidebar: HTMLElement): void {
    const topBar = document.getElementById('top-bar');
    if (!topBar) return;

    const inset = 12;
    const sidebarWidth = Math.round(sidebar.getBoundingClientRect().width);
    if (sidebarWidth <= 0) return;

    const width = Math.max(220, sidebarWidth - (inset * 2));
    topBar.style.left = `${inset}px`;
    topBar.style.right = 'auto';
    topBar.style.width = `${width}px`;
  }

  private setupResizer(): void {
    const { resizer, container } = this.elements;
    if (!resizer) return;

    const sidebar = container.querySelector('.thinkt-api-viewer__sidebar') as HTMLElement;
    if (!sidebar) return;
    this.syncTopBarToSidebar(sidebar);

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
        this.syncTopBarToSidebar(sidebar);
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
      onSourcesDiscovered: (sources) => {
        this.mergeDiscoveredSources(sources);
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
      onResumeSession: () => this.handleResumeSession(),
      canResumeSession: () => this.isCurrentSessionResumable(),
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
      const sources = await this.client.getSources();
      this.sourceCapabilities = sources
        .map((source) => {
          const name = this.normalizeSourceName(typeof source.name === 'string' ? source.name : '');
          const sourceCapabilities = source as {
            base_path?: string;
            basePath?: string;
            can_resume?: boolean;
            canResume?: boolean;
          };
          const rawBasePath = typeof sourceCapabilities.base_path === 'string'
            ? sourceCapabilities.base_path
            : sourceCapabilities.basePath;
          const basePath = rawBasePath && rawBasePath.trim().length > 0
            ? this.normalizePath(rawBasePath)
            : '';
          const canResume = Boolean(sourceCapabilities.can_resume || sourceCapabilities.canResume);
          return { name, basePath, canResume };
        })
        .filter((source) => source.name.length > 0);

      const resumable = new Set<string>();
      for (const sourceInfo of this.sourceCapabilities) {
        if (sourceInfo.canResume) {
          resumable.add(sourceInfo.name);
        }
      }
      this.resumableSources = resumable;

      const discovered = sources
        .map((source) => source.name)
        .filter((name): name is string => typeof name === 'string' && name.trim().length > 0);
      this.mergeDiscoveredSources(discovered);
      await this.discoverSourcesFromProjects();
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

  /**
   * Re-render translatable UI text in place when locale changes.
   */
  refreshI18n(): void {
    this.refreshViewSwitcherLabels();

    if (this.projectSearchInput) {
      this.projectSearchInput.placeholder = i18n._('Filter projects...');
    }
    this.renderSourceFilterOptions();

    this.projectBrowser?.refreshI18n();
    this.treeProjectBrowser?.refreshI18n();
    this.timelineVisualization?.refreshI18n();
    this.sessionList?.refreshI18n();
    this.conversationView?.refreshI18n();
    this.projectTimelinePanel?.refreshI18n();
  }

  private isCurrentSessionResumable(): boolean {
    const session = this.currentSession?.meta;
    if (!session?.fullPath) {
      return false;
    }

    const resolvedSource = this.resolveSessionSource(session);
    if (!resolvedSource) {
      return false;
    }
    return this.resumableSources.has(this.normalizeSourceName(resolvedSource));
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

  private closeMobileSidebar(): void {
    const sidebar = this.elements.container.querySelector('.thinkt-api-viewer__sidebar');
    const overlay = this.elements.container.querySelector('.thinkt-sidebar-overlay');
    sidebar?.classList.remove('thinkt-api-viewer__sidebar--open');
    overlay?.classList.remove('thinkt-sidebar-overlay--open');
  }

  private async handleTreeSessionSelect(session: SessionMeta, project: ProjectGroup): Promise<void> {
    this.closeMobileSidebar();
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

    // Skip if already viewing this session
    if (this.currentSession?.meta.id === session.id) {
      return;
    }

    this.closeMobileSidebar();
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
    void this.discoverSourcesFromProjects();
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
