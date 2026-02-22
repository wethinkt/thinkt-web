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
import { ProjectBrowser, type ProjectSortMode } from './ProjectBrowser';
import { SessionList } from './SessionList';
import { ConversationView } from './ConversationView';
import { TreeProjectBrowser, type ProjectGroup, type TreeProjectSortMode } from './TreeProjectBrowser';
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
}

.thinkt-project-browser,
.thinkt-session-list {
  background: transparent !important;
}

.thinkt-api-viewer__projects {
  flex: 0 0 auto;
  height: 45%;
  min-height: 150px;
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

.thinkt-api-viewer__sidebar-splitter {
  height: 6px;
  flex: 0 0 6px;
  cursor: row-resize;
  background: var(--thinkt-bg-secondary, #141414);
  border-top: 1px solid var(--thinkt-border-color, #2a2a2a);
  border-bottom: 1px solid var(--thinkt-border-color, #2a2a2a);
}

.thinkt-api-viewer__sidebar-splitter:hover,
.thinkt-api-viewer__sidebar-splitter.resizing {
  background: rgba(99, 102, 241, 0.2);
}

.thinkt-api-viewer__sidebar-splitter.hidden {
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
  color: var(--thinkt-text-secondary, #a0a0a0);
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
  private sidebarProjectsSection: HTMLElement | null = null;
  private sidebarSessionsSection: HTMLElement | null = null;
  private sidebarSectionSplitter: HTMLElement | null = null;
  private projectFilterContainer: HTMLElement | null = null;
  private projectSearchInput: HTMLInputElement | null = null;
  private projectSourceDropdownBtn: HTMLButtonElement | null = null;
  private projectSourceDropdownMenu: HTMLDivElement | null = null;
  private isSourceDropdownOpen = false;
  private projectSortFilter: HTMLSelectElement | null = null;
  private projectIncludeDeletedToggle: HTMLInputElement | null = null;
  private projectIncludeDeletedLabel: HTMLSpanElement | null = null;
  private projectPaneHeightPx: number | null = null;
  private projectSearchQuery = '';
  private projectSources = new Set<string>();
  private projectSort: ProjectSortMode = 'date_desc';
  private projectIncludeDeleted = false;
  private discoveredSources: string[] = [];
  private sourceCapabilities: SourceCapability[] = [];
  private resumableSources: Set<string> = new Set();
  private isLoadingSession = false;
  private boundHandlers: Array<() => void> = [];
  private disposed = false;
  private stylesInjected = false;
  private readonly minProjectPaneHeight = 150;
  private readonly minSessionPaneHeight = 200;

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

    // Move #top-bar into sidebar
    const topBar = document.getElementById('top-bar');
    if (topBar) {
      sidebar.appendChild(topBar);
    }

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
    this.sidebarProjectsSection = projectsSection;
    sidebar.appendChild(projectsSection);

    const sectionSplitter = document.createElement('div');
    sectionSplitter.className = 'thinkt-api-viewer__sidebar-splitter';
    sectionSplitter.id = 'sidebar-section-splitter';
    sectionSplitter.setAttribute('role', 'separator');
    sectionSplitter.setAttribute('aria-orientation', 'horizontal');
    sectionSplitter.setAttribute('aria-label', 'Resize projects and sessions');
    this.sidebarSectionSplitter = sectionSplitter;
    sidebar.appendChild(sectionSplitter);

    // Sessions section
    const sessionsSection = document.createElement('div');
    sessionsSection.className = 'thinkt-api-viewer__sessions';
    sessionsSection.id = 'sessions-section';
    sessionsSection.appendChild(this.elements.sessionListContainer);
    this.sidebarSessionsSection = sessionsSection;
    sidebar.appendChild(sessionsSection);

    container.appendChild(sidebar);

    // Sidebar toggle (for narrow viewports, injected into #top-bar)
    const sidebarToggle = document.createElement('button');
    sidebarToggle.className = 'thinkt-sidebar-toggle';
    sidebarToggle.setAttribute('aria-label', 'Toggle sidebar');
    sidebarToggle.textContent = '\u2630'; // hamburger ☰
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
      this.clampProjectPaneHeightToBounds();
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
    this.setupSidebarSectionResizer();
    this.updateSidebarSectionsForView(this.currentProjectView);

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

  private getProjectPaneBounds(): { top: number; min: number; max: number } | null {
    const projectsSection = this.sidebarProjectsSection;
    const sessionsSection = this.sidebarSessionsSection;
    const splitter = this.sidebarSectionSplitter;
    if (!projectsSection || !sessionsSection || !splitter) return null;

    const projectsRect = projectsSection.getBoundingClientRect();
    const sessionsRect = sessionsSection.getBoundingClientRect();
    const splitterHeight = splitter.getBoundingClientRect().height;
    const available = sessionsRect.bottom - projectsRect.top - splitterHeight;
    const min = this.minProjectPaneHeight;
    const max = Math.max(min, available - this.minSessionPaneHeight);
    return { top: projectsRect.top, min, max };
  }

  private clampProjectPaneHeightToBounds(): void {
    if (this.currentProjectView !== 'list') return;
    const projectsSection = this.sidebarProjectsSection;
    const sessionsSection = this.sidebarSessionsSection;
    if (!projectsSection || !sessionsSection) return;

    const bounds = this.getProjectPaneBounds();
    if (!bounds) return;

    const currentHeight = this.projectPaneHeightPx ?? projectsSection.getBoundingClientRect().height;
    const clamped = Math.min(bounds.max, Math.max(bounds.min, currentHeight));
    this.projectPaneHeightPx = clamped;
    projectsSection.style.height = `${Math.round(clamped)}px`;
    projectsSection.style.flex = '0 0 auto';
    sessionsSection.style.flex = '1 1 auto';
  }

  private setupSidebarSectionResizer(): void {
    const splitter = this.sidebarSectionSplitter;
    if (!splitter) return;

    let isResizing = false;

    const startResize = (e: MouseEvent) => {
      if (this.currentProjectView !== 'list') return;
      isResizing = true;
      splitter.classList.add('resizing');
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    };

    const doResize = (e: MouseEvent) => {
      if (!isResizing) return;
      const bounds = this.getProjectPaneBounds();
      if (!bounds) return;

      const nextHeight = e.clientY - bounds.top;
      const clamped = Math.min(bounds.max, Math.max(bounds.min, nextHeight));
      this.projectPaneHeightPx = clamped;
      this.clampProjectPaneHeightToBounds();
    };

    const stopResize = () => {
      if (!isResizing) return;
      isResizing = false;
      splitter.classList.remove('resizing');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    splitter.addEventListener('mousedown', startResize);
    document.addEventListener('mousemove', doResize);
    document.addEventListener('mouseup', stopResize);

    this.boundHandlers.push(() => {
      splitter.removeEventListener('mousedown', startResize);
      document.removeEventListener('mousemove', doResize);
      document.removeEventListener('mouseup', stopResize);
    });
  }

  private updateSidebarSectionsForView(mode: ProjectViewMode): void {
    const projectsSection = this.sidebarProjectsSection;
    const sessionsSection = this.sidebarSessionsSection;
    const splitter = this.sidebarSectionSplitter;
    if (!projectsSection || !sessionsSection || !splitter) return;

    if (mode === 'list') {
      projectsSection.classList.remove('full-height', 'hidden');
      sessionsSection.classList.remove('hidden');
      splitter.classList.remove('hidden');

      if (this.projectPaneHeightPx === null) {
        projectsSection.style.height = '45%';
      }
      projectsSection.style.flex = '0 0 auto';
      sessionsSection.style.flex = '1 1 auto';

      window.requestAnimationFrame(() => {
        if (this.disposed || this.currentProjectView !== 'list') return;
        this.clampProjectPaneHeightToBounds();
      });
      return;
    }

    splitter.classList.add('hidden');
    projectsSection.classList.add('full-height');
    projectsSection.classList.remove('hidden');
    sessionsSection.classList.add('hidden');
    projectsSection.style.height = '';
    projectsSection.style.flex = '';
    sessionsSection.style.flex = '';
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

    const sourceDropdownContainer = document.createElement('div');
    sourceDropdownContainer.className = 'thinkt-source-dropdown';

    const sourceBtn = document.createElement('button');
    sourceBtn.className = 'thinkt-source-dropdown__btn';
    sourceBtn.innerHTML = `<span>${i18n._('All Sources')}</span><span class="thinkt-source-dropdown__icon">▼</span>`;
    this.projectSourceDropdownBtn = sourceBtn;

    const sourceMenu = document.createElement('div');
    sourceMenu.className = 'thinkt-source-dropdown__menu';
    this.projectSourceDropdownMenu = sourceMenu;

    sourceDropdownContainer.appendChild(sourceBtn);
    sourceDropdownContainer.appendChild(sourceMenu);

    const toggleDropdown = (e: Event) => {
      e.stopPropagation();
      this.isSourceDropdownOpen = !this.isSourceDropdownOpen;
      if (this.isSourceDropdownOpen) {
        sourceMenu.classList.add('open');
        sourceBtn.classList.add('active');
        const closeMenu = (ev: Event) => {
          if (!sourceDropdownContainer.contains(ev.target as Node)) {
            this.isSourceDropdownOpen = false;
            sourceMenu.classList.remove('open');
            sourceBtn.classList.remove('active');
            document.removeEventListener('click', closeMenu);
          }
        };
        document.addEventListener('click', closeMenu);
      } else {
        sourceMenu.classList.remove('open');
        sourceBtn.classList.remove('active');
      }
    };
    sourceBtn.addEventListener('click', toggleDropdown);
    this.boundHandlers.push(() => sourceBtn.removeEventListener('click', toggleDropdown));

    const sortFilter = document.createElement('select');
    sortFilter.className = 'thinkt-project-filter__sort';
    this.projectSortFilter = sortFilter;
    this.renderSortFilterOptions();

    const includeDeletedToggle = document.createElement('input');
    includeDeletedToggle.type = 'checkbox';
    includeDeletedToggle.checked = this.projectIncludeDeleted;
    this.projectIncludeDeletedToggle = includeDeletedToggle;

    const includeDeletedLabelText = document.createElement('span');
    includeDeletedLabelText.textContent = i18n._('Include Deleted');
    this.projectIncludeDeletedLabel = includeDeletedLabelText;

    const includeDeletedLabel = document.createElement('label');
    includeDeletedLabel.className = 'thinkt-source-option thinkt-source-option--toggle';
    includeDeletedLabel.appendChild(includeDeletedToggle);
    includeDeletedLabel.appendChild(includeDeletedLabelText);

    const handleSearchInput = () => {
      this.projectSearchQuery = searchInput.value;
      this.applyProjectFilters();
    };
    searchInput.addEventListener('input', handleSearchInput);
    this.boundHandlers.push(() => searchInput.removeEventListener('input', handleSearchInput));

    const handleSortChange = () => {
      this.projectSort = this.normalizeProjectSort(sortFilter.value);
      this.applyProjectFilters();
    };
    sortFilter.addEventListener('change', handleSortChange);
    this.boundHandlers.push(() => sortFilter.removeEventListener('change', handleSortChange));

    const handleIncludeDeletedChange = () => {
      this.projectIncludeDeleted = includeDeletedToggle.checked;
      this.applyProjectFilters();
    };
    includeDeletedToggle.addEventListener('change', handleIncludeDeletedChange);
    this.boundHandlers.push(() => includeDeletedToggle.removeEventListener('change', handleIncludeDeletedChange));

    this.renderSourceFilterOptions();

    container.appendChild(searchInput);
    container.appendChild(sourceDropdownContainer);
    container.appendChild(sortFilter);
    return container;
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
    if (!this.projectSourceDropdownMenu || !this.projectSourceDropdownBtn) return;

    const menu = this.projectSourceDropdownMenu;
    const toggleElement = this.projectIncludeDeletedLabel?.parentElement;

    menu.innerHTML = '';

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
      checkbox.checked = this.projectSources.has(source);

      const text = document.createElement('span');
      text.textContent = source.charAt(0).toUpperCase() + source.slice(1);

      label.appendChild(checkbox);
      label.appendChild(text);
      listContainer.appendChild(label);

      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          this.projectSources.add(source);
        } else {
          this.projectSources.delete(source);
        }
        this.updateSourceDropdownButton();
        this.applyProjectFilters();
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
    if (!this.projectSourceDropdownBtn) return;
    const btnText = this.projectSourceDropdownBtn.querySelector('span:first-child');
    if (btnText) {
      if (this.projectSources.size === 0) {
        btnText.textContent = i18n._('All Sources');
      } else if (this.projectSources.size === 1) {
        const source = Array.from(this.projectSources)[0];
        btnText.textContent = source.charAt(0).toUpperCase() + source.slice(1);
      } else {
        btnText.textContent = i18n._('{count} Sources', { count: this.projectSources.size });
      }
    }
  }

  private renderSortFilterOptions(): void {
    if (!this.projectSortFilter) return;

    const sortFilter = this.projectSortFilter;
    const selected = this.normalizeProjectSort(sortFilter.value || this.projectSort);
    sortFilter.innerHTML = '';

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
    this.projectSort = selected;
  }

  private async discoverSourcesFromProjects(): Promise<void> {
    try {
      const projects = await this.client.getProjects(undefined, {
        includeDeleted: this.projectIncludeDeleted,
      });
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
    const sort = this.projectSortFilter?.value || this.projectSort;
    const includeDeleted = this.projectIncludeDeletedToggle?.checked ?? this.projectIncludeDeleted;
    const normalizedSort = this.normalizeProjectSort(sort);
    this.projectSearchQuery = query;
    this.projectSort = normalizedSort;
    this.projectIncludeDeleted = includeDeleted;

    switch (this.currentProjectView) {
      case 'list':
        this.projectBrowser?.setIncludeDeleted(includeDeleted);
        this.projectBrowser?.setSearch(query);
        this.projectBrowser?.setSourceFilter(this.projectSources);
        this.projectBrowser?.setSort(normalizedSort);
        break;
      case 'tree':
        this.treeProjectBrowser?.setIncludeDeleted(includeDeleted);
        this.treeProjectBrowser?.setSearch(query);
        this.treeProjectBrowser?.setSourceFilter(this.projectSources);
        this.treeProjectBrowser?.setSort(normalizedSort as TreeProjectSortMode);
        break;
      case 'timeline':
        this.timelineVisualization?.setIncludeDeleted(includeDeleted);
        this.timelineVisualization?.setSearch(query);
        this.timelineVisualization?.setSourceFilter(this.projectSources);
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
    this.updateSidebarSectionsForView(mode);

    switch (mode) {
      case 'list':
        // List view: normal layout with projects and sessions
        void this.initListView();
        // Show timeline panel if a project is selected
        if (this.currentProject) {
          if (this.currentProject.id) {
            this.showProjectTimelinePanel(this.currentProject.id, this.currentProject.source);
          } else {
            this.hideProjectTimelinePanel();
          }
        }
        break;

      case 'tree':
        // Tree view: projects take full height (sessions are in the tree)
        this.hideProjectTimelinePanel();
        void this.initTreeView();
        break;

      case 'timeline':
        // Timeline view: full height, no separate sessions list
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
      initialIncludeDeleted: this.projectIncludeDeleted,
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
      initialIncludeDeleted: this.projectIncludeDeleted,
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
      includeDeletedProjects: this.projectIncludeDeleted,
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
    if (this.projectIncludeDeletedLabel) {
      this.projectIncludeDeletedLabel.textContent = i18n._('Include Deleted');
    }
    this.renderSourceFilterOptions();
    this.renderSortFilterOptions();

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
      void this.sessionList?.setProjectId(project.id, project.source);
    }
    // Update project path in conversation view toolbar
    this.conversationView?.setProjectPath(project.path ?? project.name ?? null, 0);

    // Show timeline panel for this project
    if (this.currentProjectView === 'list' && project.id) {
      this.showProjectTimelinePanel(project.id, project.source);
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
    this.conversationView?.clear();
    this.conversationView?.refreshToolbar();
  }

  private showProjectTimelinePanel(projectId: string, source?: string): void {
    this.projectTimelinePanel?.setProject(projectId, source);
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
      this.showProjectTimelinePanel(this.currentProject.id, this.currentProject.source);
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
      // Scroll to top for new session
      this.conversationView?.scrollToTop?.();

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
    this.projectSourceDropdownBtn = null;
    this.projectSourceDropdownMenu = null;
    this.projectSortFilter = null;
    this.projectIncludeDeletedToggle = null;
    this.projectIncludeDeletedLabel = null;
    this.sidebarProjectsSection = null;
    this.sidebarSessionsSection = null;
    this.sidebarSectionSplitter = null;

    this.disposed = true;
  }
}

// ============================================
// Factory Function
// ============================================

export function createApiViewer(options: ApiViewerOptions): ApiViewer {
  return new ApiViewer(options);
}
