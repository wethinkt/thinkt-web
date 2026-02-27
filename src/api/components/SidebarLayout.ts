/**
 * SidebarLayout Component
 *
 * Manages the sidebar DOM structure, split-pane resizing, mobile toggle,
 * and view-mode layout switching. Extracted from ApiViewer.
 */

import type { ProjectViewMode } from './ApiViewer';

// ============================================
// Types
// ============================================

export interface SidebarLayoutElements {
  container: HTMLElement;
  projectBrowserContainer: HTMLElement;
  sessionListContainer: HTMLElement;
  viewerContainer: HTMLElement;
  timelinePanelContainer?: HTMLElement;
  resizer?: HTMLElement;
}

export interface SidebarLayoutOptions {
  elements: SidebarLayoutElements;
  signal: AbortSignal;
  initialView: ProjectViewMode;
  onLocaleChanged?: () => void;
  onSidebarCollapsedChange?: (collapsed: boolean) => void;
}

// ============================================
// Component Class
// ============================================

const MIN_SIDEBAR_WIDTH_PX = 250;
const MAX_SIDEBAR_WIDTH_PX = 600;
const MIN_PROJECT_PANE_HEIGHT_PX = 150;
const MIN_SESSION_PANE_HEIGHT_PX = 200;

export class SidebarLayout {
  readonly sidebar: HTMLElement;
  readonly projectsSection: HTMLElement;
  readonly sessionsSection: HTMLElement;
  readonly viewerSection: HTMLElement;
  readonly timelinePanelContainer: HTMLElement;

  private sectionSplitter: HTMLElement;
  private projectPaneHeightPx: number | null = null;
  private disposed = false;
  private readonly minProjectPaneHeight = MIN_PROJECT_PANE_HEIGHT_PX;
  private readonly minSessionPaneHeight = MIN_SESSION_PANE_HEIGHT_PX;
  private currentView: ProjectViewMode;
  private sidebarCollapsed = false;

  constructor(private options: SidebarLayoutOptions) {
    this.currentView = options.initialView;

    const { container } = options.elements;
    container.className = 'thinkt-api-viewer';

    // Sidebar
    this.sidebar = document.createElement('div');
    this.sidebar.className = 'thinkt-api-viewer__sidebar';

    // Move #top-bar into sidebar
    const topBar = document.getElementById('top-bar');
    if (topBar) {
      this.sidebar.appendChild(topBar);
    }

    // Projects section
    this.projectsSection = document.createElement('div');
    this.projectsSection.className = 'thinkt-api-viewer__projects';
    this.projectsSection.id = 'projects-section';
    this.projectsSection.appendChild(options.elements.projectBrowserContainer);

    // Section splitter
    this.sectionSplitter = document.createElement('div');
    this.sectionSplitter.className = 'thinkt-api-viewer__sidebar-splitter';
    this.sectionSplitter.id = 'sidebar-section-splitter';
    this.sectionSplitter.setAttribute('role', 'separator');
    this.sectionSplitter.setAttribute('aria-orientation', 'horizontal');
    this.sectionSplitter.setAttribute('aria-label', 'Resize projects and sessions');

    // Sessions section
    this.sessionsSection = document.createElement('div');
    this.sessionsSection.className = 'thinkt-api-viewer__sessions';
    this.sessionsSection.id = 'sessions-section';
    this.sessionsSection.appendChild(options.elements.sessionListContainer);

    this.sidebar.appendChild(this.projectsSection);
    this.sidebar.appendChild(this.sectionSplitter);
    this.sidebar.appendChild(this.sessionsSection);
    container.appendChild(this.sidebar);

    // Mobile sidebar toggle
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
      const opening = !this.sidebar.classList.contains('thinkt-api-viewer__sidebar--open');
      this.sidebar.classList.toggle('thinkt-api-viewer__sidebar--open', opening);
      sidebarOverlay.classList.toggle('thinkt-sidebar-overlay--open', opening);
    };
    const closeSidebar = () => {
      this.sidebar.classList.remove('thinkt-api-viewer__sidebar--open');
      sidebarOverlay.classList.remove('thinkt-sidebar-overlay--open');
    };
    sidebarToggle.addEventListener('click', toggleSidebar, { signal: options.signal });
    sidebarOverlay.addEventListener('click', closeSidebar, { signal: options.signal });

    window.addEventListener('resize', () => this.clampProjectPaneHeight(), { signal: options.signal });

    if (options.onLocaleChanged) {
      window.addEventListener('thinkt:locale-changed', options.onLocaleChanged as EventListener, { signal: options.signal });
    }

    // Resizer (optional)
    if (!options.elements.resizer) {
      const resizer = document.createElement('div');
      resizer.className = 'thinkt-api-viewer__resizer';
      options.elements.resizer = resizer;
    }
    container.appendChild(options.elements.resizer);

    // Sidebar width resizer
    if (options.elements.resizer) {
      this.setupDragResize(options.elements.resizer, {
        cursor: 'col-resize',
        onMove: (e) => {
          if (e.clientX >= MIN_SIDEBAR_WIDTH_PX && e.clientX <= MAX_SIDEBAR_WIDTH_PX) {
            this.sidebar.style.width = `${e.clientX}px`;
          }
        },
      });
    }

    // Sidebar section splitter (projects/sessions)
    this.setupDragResize(this.sectionSplitter, {
      cursor: 'row-resize',
      onStart: () => {
        if (this.currentView !== 'list') return false;
        this.sectionSplitter.classList.add('resizing');
      },
      onMove: (e) => {
        const bounds = this.getProjectPaneBounds();
        if (!bounds) return;
        const nextHeight = e.clientY - bounds.top;
        this.projectPaneHeightPx = Math.min(bounds.max, Math.max(bounds.min, nextHeight));
        this.clampProjectPaneHeight();
      },
      onEnd: () => {
        this.sectionSplitter.classList.remove('resizing');
      },
    });

    this.updateForView(this.currentView);

    // Viewer section
    this.viewerSection = document.createElement('div');
    this.viewerSection.className = 'thinkt-api-viewer__viewer';
    this.viewerSection.style.display = 'flex';
    this.viewerSection.style.flexDirection = 'column';

    // Create timeline panel container if not provided
    if (!options.elements.timelinePanelContainer) {
      options.elements.timelinePanelContainer = document.createElement('div');
      options.elements.timelinePanelContainer.className = 'thinkt-api-viewer__timeline-panel';
      options.elements.timelinePanelContainer.style.display = 'none';
      options.elements.timelinePanelContainer.style.height = '200px';
      options.elements.timelinePanelContainer.style.flexShrink = '0';
    }
    this.timelinePanelContainer = options.elements.timelinePanelContainer;

    // Conversation container
    const conversationContainer = document.createElement('div');
    conversationContainer.className = 'thinkt-api-viewer__conversation';
    conversationContainer.style.flex = '1';
    conversationContainer.style.overflow = 'hidden';
    conversationContainer.appendChild(options.elements.viewerContainer);

    this.viewerSection.appendChild(conversationContainer);
    this.viewerSection.appendChild(this.timelinePanelContainer);
    container.appendChild(this.viewerSection);
  }

  // ============================================
  // View Mode Layout
  // ============================================

  updateForView(mode: ProjectViewMode): void {
    this.currentView = mode;

    if (mode === 'list') {
      this.projectsSection.classList.remove('full-height', 'hidden');
      this.sessionsSection.classList.remove('hidden');
      this.sectionSplitter.classList.remove('hidden');

      if (this.projectPaneHeightPx === null) {
        this.projectsSection.style.height = '45%';
      }
      this.projectsSection.style.flex = '0 0 auto';
      this.sessionsSection.style.flex = '1 1 auto';

      window.requestAnimationFrame(() => {
        if (this.disposed || this.currentView !== 'list') return;
        this.clampProjectPaneHeight();
      });
      return;
    }

    this.sectionSplitter.classList.add('hidden');
    this.projectsSection.classList.add('full-height');
    this.projectsSection.classList.remove('hidden');
    this.sessionsSection.classList.add('hidden');
    this.projectsSection.style.height = '';
    this.projectsSection.style.flex = '';
    this.sessionsSection.style.flex = '';
  }

  // ============================================
  // Mobile Sidebar
  // ============================================

  closeMobileSidebar(): void {
    const container = this.options.elements.container;
    const sidebar = container.querySelector('.thinkt-api-viewer__sidebar');
    const overlay = container.querySelector('.thinkt-sidebar-overlay');
    sidebar?.classList.remove('thinkt-api-viewer__sidebar--open');
    overlay?.classList.remove('thinkt-sidebar-overlay--open');
  }

  isSidebarCollapsed(): boolean {
    return this.sidebarCollapsed;
  }

  setSidebarCollapsed(collapsed: boolean): void {
    if (this.sidebarCollapsed === collapsed) {
      return;
    }

    this.sidebarCollapsed = collapsed;
    this.options.elements.container.classList.toggle('thinkt-api-viewer--sidebar-collapsed', collapsed);
    if (collapsed) {
      this.closeMobileSidebar();
    }
    this.options.onSidebarCollapsedChange?.(collapsed);
  }

  toggleSidebarCollapsed(): boolean {
    const next = !this.sidebarCollapsed;
    this.setSidebarCollapsed(next);
    return next;
  }

  // ============================================
  // Resize Logic
  // ============================================

  clampProjectPaneHeight(): void {
    if (this.currentView !== 'list') return;

    const bounds = this.getProjectPaneBounds();
    if (!bounds) return;

    const currentHeight = this.projectPaneHeightPx ?? this.projectsSection.getBoundingClientRect().height;
    const clamped = Math.min(bounds.max, Math.max(bounds.min, currentHeight));
    this.projectPaneHeightPx = clamped;
    this.projectsSection.style.height = `${Math.round(clamped)}px`;
    this.projectsSection.style.flex = '0 0 auto';
    this.sessionsSection.style.flex = '1 1 auto';
  }

  private getProjectPaneBounds(): { top: number; min: number; max: number } | null {
    const projectsRect = this.projectsSection.getBoundingClientRect();
    const sessionsRect = this.sessionsSection.getBoundingClientRect();
    const splitterHeight = this.sectionSplitter.getBoundingClientRect().height;
    const available = sessionsRect.bottom - projectsRect.top - splitterHeight;
    const min = this.minProjectPaneHeight;
    const max = Math.max(min, available - this.minSessionPaneHeight);
    return { top: projectsRect.top, min, max };
  }

  private setupDragResize(
    handle: HTMLElement,
    callbacks: {
      cursor: string;
      onStart?: (e: MouseEvent) => boolean | void;
      onMove: (e: MouseEvent) => void;
      onEnd?: () => void;
    },
  ): void {
    let active = false;

    const start = (e: MouseEvent) => {
      if (callbacks.onStart?.(e) === false) return;
      active = true;
      document.body.style.cursor = callbacks.cursor;
      document.body.style.userSelect = 'none';
      e.preventDefault();
    };

    const move = (e: MouseEvent) => {
      if (!active) return;
      callbacks.onMove(e);
    };

    const end = () => {
      if (!active) return;
      active = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      callbacks.onEnd?.();
    };

    handle.addEventListener('mousedown', start, { signal: this.options.signal });
    document.addEventListener('mousemove', move, { signal: this.options.signal });
    document.addEventListener('mouseup', end, { signal: this.options.signal });
  }

  // ============================================
  // Cleanup
  // ============================================

  dispose(): void {
    this.disposed = true;
  }
}
