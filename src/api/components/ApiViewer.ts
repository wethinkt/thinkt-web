/**
 * ApiViewer Component
 *
 * A high-level component that connects the THINKT API to a conversation view.
 * Provides a complete browsing and conversation viewing experience (no 3D).
 */

import type { Project, SessionMeta, Entry } from '@wethinkt/ts-thinkt';
import { type ThinktClient, getDefaultClient } from '@wethinkt/ts-thinkt/api';
import { ProjectBrowser } from './ProjectBrowser';
import { SessionList } from './SessionList';
import { ConversationView } from './ConversationView';

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
  /** Viewer container */
  viewerContainer: HTMLElement;
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
}

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
}

.thinkt-api-viewer__sessions {
  flex: 1;
  overflow: hidden;
  min-height: 200px;
}

.thinkt-api-viewer__viewer {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: var(--thinkt-bg-color, #0a0a0a);
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
  private sessionList: SessionList | null = null;
  private conversationView: ConversationView | null = null;
  private currentProject: Project | null = null;
  private currentSession: LoadedSession | null = null;
  private isLoadingSession = false;
  private boundHandlers: Array<() => void> = [];
  private disposed = false;
  private stylesInjected = false;

  constructor(options: ApiViewerOptions) {
    this.elements = options.elements;
    this.options = options;
    this.client = options.client ?? getDefaultClient();
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

    // Projects section
    const projectsSection = document.createElement('div');
    projectsSection.className = 'thinkt-api-viewer__projects';
    projectsSection.appendChild(this.elements.projectBrowserContainer);
    sidebar.appendChild(projectsSection);

    // Sessions section
    const sessionsSection = document.createElement('div');
    sessionsSection.className = 'thinkt-api-viewer__sessions';
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

    // Viewer section (conversation view)
    const viewerSection = document.createElement('div');
    viewerSection.className = 'thinkt-api-viewer__viewer';
    viewerSection.appendChild(this.elements.viewerContainer);
    container.appendChild(viewerSection);
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
  // Component Initialization
  // ============================================

  private async initializeComponentsAsync(): Promise<void> {
    // Check connection first
    await this.checkConnection();
    
    // Initialize Project Browser
    this.projectBrowser = new ProjectBrowser({
      elements: {
        container: this.elements.projectBrowserContainer,
      },
      client: this.client,
      onProjectSelect: (project) => { void this.handleProjectSelect(project); },
      onError: (error) => { this.handleError(error); },
    });

    // Initialize Session List
    this.sessionList = new SessionList({
      elements: {
        container: this.elements.sessionListContainer,
      },
      client: this.client,
      onSessionSelect: (session) => { void this.handleSessionSelect(session); },
      onError: (error) => { this.handleError(error); },
    });

    // Initialize Conversation View
    this.conversationView = new ConversationView({
      elements: {
        container: this.elements.viewerContainer,
      },
      client: this.client,
    });
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
    return this.projectBrowser?.refresh() ?? Promise.resolve();
  }

  /**
   * Get the ProjectBrowser instance
   */
  getProjectBrowser(): ProjectBrowser | null {
    return this.projectBrowser;
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
    this.projectBrowser?.focusSearch();
  }

  /**
   * Focus the session list search input
   */
  focusSessionSearch(): void {
    this.sessionList?.focusSearch();
  }

  // ============================================
  // Cleanup
  // ============================================

  dispose(): void {
    if (this.disposed) return;

    this.boundHandlers.forEach(remove => remove());
    this.boundHandlers = [];

    this.projectBrowser?.dispose();
    this.sessionList?.dispose();
    this.conversationView?.dispose();

    this.projectBrowser = null;
    this.sessionList = null;
    this.conversationView = null;
    this.currentProject = null;
    this.currentSession = null;

    this.disposed = true;
  }
}

// ============================================
// Factory Function
// ============================================

export function createApiViewer(options: ApiViewerOptions): ApiViewer {
  return new ApiViewer(options);
}
