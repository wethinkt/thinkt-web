/**
 * ProjectToolbar Component
 *
 * Displays project path, metrics, and provides quick actions
 * to open the project in various applications.
 */

import type { Project } from '../client';

// ============================================
// Types
// ============================================

export interface ProjectToolbarElements {
  container: HTMLElement;
}

export interface ProjectToolbarOptions {
  elements: ProjectToolbarElements;
  customApps?: CustomApp[];
}

export interface CustomApp {
  id: string;
  name: string;
  icon?: string;
  platform?: string;
  onClick: (projectPath: string) => void;
}

// ============================================
// Default Styles
// ============================================

const DEFAULT_STYLES = `
.thinkt-project-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--thinkt-border-color, #2a2a2a);
  background: rgba(255, 255, 255, 0.02);
  flex-shrink: 0;
}

.thinkt-project-toolbar__path {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.thinkt-project-toolbar__path-icon {
  font-size: 14px;
  color: var(--thinkt-muted-color, #666);
  flex-shrink: 0;
}

.thinkt-project-toolbar__path-text {
  font-size: 13px;
  color: var(--thinkt-text-color, #e0e0e0);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: var(--thinkt-font-mono, 'SF Mono', Monaco, monospace);
}

.thinkt-project-toolbar__metrics {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 11px;
  color: var(--thinkt-muted-color, #888);
  flex-shrink: 0;
}

.thinkt-project-toolbar__actions {
  position: relative;
  flex-shrink: 0;
}

.thinkt-project-toolbar__open-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--thinkt-border-color, #333);
  border-radius: 6px;
  color: var(--thinkt-text-color, #e0e0e0);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.thinkt-project-toolbar__open-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: var(--thinkt-border-color-light, #444);
}

.thinkt-project-toolbar__dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  min-width: 180px;
  background: var(--thinkt-bg-secondary, #141414);
  border: 1px solid var(--thinkt-border-color, #2a2a2a);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  z-index: 1000;
  display: none;
  overflow: hidden;
}

.thinkt-project-toolbar__dropdown.open {
  display: block;
}

.thinkt-project-toolbar__dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  font-size: 13px;
  color: var(--thinkt-text-color, #e0e0e0);
  cursor: pointer;
  transition: background 0.12s ease;
}

.thinkt-project-toolbar__dropdown-item:hover {
  background: rgba(255, 255, 255, 0.05);
}
`;

// ============================================
// Component Class
// ============================================

export class ProjectToolbar {
  private container: HTMLElement;
  private stylesInjected = false;

  constructor(options: ProjectToolbarOptions) {
    this.container = options.elements.container;
    this.init();
  }

  private init(): void {
    this.injectStyles();
    this.createStructure();
  }

  private injectStyles(): void {
    if (this.stylesInjected) return;
    const styleId = 'thinkt-project-toolbar-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = DEFAULT_STYLES;
      document.head.appendChild(style);
    }
    this.stylesInjected = true;
  }

  private createStructure(): void {
    this.container.className = 'thinkt-project-toolbar';
    this.container.innerHTML = `
      <div class="thinkt-project-toolbar__path">
        <span class="thinkt-project-toolbar__path-icon">📁</span>
        <span class="thinkt-project-toolbar__path-text">Select a project</span>
      </div>
      <div class="thinkt-project-toolbar__actions">
        <button class="thinkt-project-toolbar__open-btn">Open ▼</button>
        <div class="thinkt-project-toolbar__dropdown"></div>
      </div>
    `;
  }

  setProject(project: Project | null): void {
    const pathText = this.container.querySelector('.thinkt-project-toolbar__path-text');
    if (pathText) {
      pathText.textContent = project?.path ?? project?.name ?? 'Select a project';
    }
  }

  dispose(): void {
    this.container.innerHTML = '';
  }
}

export function createProjectToolbar(options: ProjectToolbarOptions): ProjectToolbar {
  return new ProjectToolbar(options);
}
