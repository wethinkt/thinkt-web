/**
 * ConversationView Component
 *
 * A simple conversation viewer for the API app (no 3D).
 * Displays entries in a scrollable, formatted view with filter toggles.
 */

import type { ThinktClient } from '@wethinkt/ts-thinkt/api';
import type { Session, Entry, ContentBlock } from '@wethinkt/ts-thinkt';

// ============================================
// Types
// ============================================

export interface ConversationViewElements {
  /** Container element */
  container: HTMLElement;
}

export interface ConversationViewOptions {
  elements: ConversationViewElements;
  /** API client for opening in external apps */
  client?: ThinktClient;
}

/**
 * Filter state for conversation content visibility
 */
export interface FilterState {
  user: boolean;
  assistant: boolean;
  thinking: boolean;
  toolUse: boolean;
  toolResult: boolean;
  system: boolean;
}

// ============================================
// Default Styles
// ============================================

const DEFAULT_STYLES = `
.thinkt-conversation-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  font-family: var(--thinkt-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
  font-size: 13px;
  line-height: 1.6;
  color: var(--thinkt-text-color, #e0e0e0);
  background: var(--thinkt-bg-color, #0a0a0a);
}

.thinkt-conversation-view__filters {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--thinkt-border-color, #2a2a2a);
  background: rgba(255, 255, 255, 0.02);
  overflow-x: auto;
  flex-shrink: 0;
}

.thinkt-conversation-view__filter-label {
  font-size: 11px;
  color: var(--thinkt-muted-color, #666);
  margin-right: 4px;
  white-space: nowrap;
}

.thinkt-conversation-view__filter-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid var(--thinkt-border-color, #333);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.03);
  color: var(--thinkt-muted-color, #888);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.thinkt-conversation-view__filter-btn:hover {
  border-color: var(--thinkt-border-color-light, #444);
  color: var(--thinkt-text-color, #e0e0e0);
}

.thinkt-conversation-view__filter-btn.active {
  background: rgba(99, 102, 241, 0.15);
  border-color: rgba(99, 102, 241, 0.4);
  color: #6366f1;
}

.thinkt-conversation-view__filter-btn.active[data-filter="assistant"] {
  background: rgba(217, 119, 80, 0.15);
  border-color: rgba(217, 119, 80, 0.4);
  color: #d97750;
}

.thinkt-conversation-view__filter-btn.active[data-filter="thinking"] {
  background: rgba(99, 102, 241, 0.15);
  border-color: rgba(99, 102, 241, 0.4);
  color: #6366f1;
}

.thinkt-conversation-view__filter-btn.active[data-filter="toolUse"] {
  background: rgba(25, 195, 155, 0.15);
  border-color: rgba(25, 195, 155, 0.4);
  color: #19c39b;
}

.thinkt-conversation-view__filter-btn.active[data-filter="toolResult"] {
  background: rgba(34, 197, 94, 0.15);
  border-color: rgba(34, 197, 94, 0.4);
  color: #22c55e;
}

.thinkt-conversation-view__filter-btn.active[data-filter="system"] {
  background: rgba(136, 136, 136, 0.15);
  border-color: rgba(136, 136, 136, 0.4);
  color: #888;
}

.thinkt-conversation-view__content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.thinkt-conversation-entry {
  margin-bottom: 16px;
  border-radius: 8px;
  border: 1px solid var(--thinkt-border-color, #2a2a2a);
  background: var(--thinkt-bg-secondary, #141414);
  overflow: hidden;
}

.thinkt-conversation-entry.hidden {
  display: none;
}

.thinkt-conversation-entry__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid var(--thinkt-border-color, #2a2a2a);
}

.thinkt-conversation-entry__role {
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.thinkt-conversation-entry__role--user {
  color: #6366f1;
}

.thinkt-conversation-entry__role--assistant {
  color: #d97750;
}

.thinkt-conversation-entry__role--system {
  color: #888;
}

.thinkt-conversation-entry__role--tool {
  color: #19c39b;
}

.thinkt-conversation-entry__timestamp {
  margin-left: auto;
  font-size: 11px;
  color: var(--thinkt-muted-color, #666);
}

.thinkt-conversation-entry__content {
  padding: 12px;
}

.thinkt-conversation-entry__text {
  white-space: pre-wrap;
  word-break: break-word;
}

.thinkt-conversation-entry__thinking {
  margin-top: 12px;
  padding: 10px 12px;
  background: rgba(99, 102, 241, 0.1);
  border-left: 3px solid #6366f1;
  border-radius: 0 4px 4px 0;
  font-style: italic;
  color: #a5a6f3;
}

.thinkt-conversation-entry__thinking.hidden {
  display: none;
}

.thinkt-conversation-entry__thinking-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
  color: #6366f1;
}

.thinkt-conversation-entry__tool-use {
  margin-top: 12px;
  padding: 10px 12px;
  background: rgba(25, 195, 155, 0.1);
  border-left: 3px solid #19c39b;
  border-radius: 0 4px 4px 0;
}

.thinkt-conversation-entry__tool-use.hidden {
  display: none;
}

.thinkt-conversation-entry__tool-name {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
  color: #19c39b;
}

.thinkt-conversation-entry__tool-input {
  font-family: var(--thinkt-font-mono, 'SF Mono', Monaco, monospace);
  font-size: 11px;
  background: rgba(0, 0, 0, 0.3);
  padding: 8px;
  border-radius: 4px;
  overflow-x: auto;
  max-height: 200px;
  overflow-y: auto;
}

.thinkt-conversation-entry__tool-result {
  margin-top: 12px;
  padding: 10px 12px;
  background: rgba(34, 197, 94, 0.1);
  border-left: 3px solid #22c55e;
  border-radius: 0 4px 4px 0;
}

.thinkt-conversation-entry__tool-result.hidden {
  display: none;
}

.thinkt-conversation-entry__tool-result-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
  color: #22c55e;
}

.thinkt-conversation-entry__tool-result--error {
  background: rgba(239, 68, 68, 0.1);
  border-left-color: #ef4444;
}

.thinkt-conversation-entry__tool-result--error .thinkt-conversation-entry__tool-result-label {
  color: #ef4444;
}

.thinkt-conversation-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--thinkt-muted-color, #666);
  text-align: center;
  padding: 48px;
}

.thinkt-conversation-empty__icon {
  font-size: 40px;
  margin-bottom: 12px;
  opacity: 0.4;
}

.thinkt-conversation-empty__title {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 6px;
  color: var(--thinkt-text-color, #e0e0e0);
}

/* Project Toolbar */
.thinkt-conversation-view__toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--thinkt-border-color, #2a2a2a);
  background: rgba(255, 255, 255, 0.02);
  flex-shrink: 0;
}

.thinkt-conversation-view__toolbar-path {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.thinkt-conversation-view__toolbar-path-icon {
  font-size: 14px;
  color: var(--thinkt-muted-color, #666);
  flex-shrink: 0;
}

.thinkt-conversation-view__toolbar-path-text {
  font-size: 13px;
  color: var(--thinkt-text-color, #e0e0e0);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: var(--thinkt-font-mono, 'SF Mono', Monaco, monospace);
}

.thinkt-conversation-view__toolbar-path-actions {
  display: flex;
  align-items: center;
  margin-left: 4px;
}

.thinkt-conversation-view__toolbar-metrics {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 11px;
  color: var(--thinkt-muted-color, #888);
  margin-left: auto;
}

.thinkt-conversation-view__toolbar-actions {
  position: relative;
  flex-shrink: 0;
}

.thinkt-conversation-view__toolbar-btn {
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

.thinkt-conversation-view__toolbar-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: var(--thinkt-border-color-light, #444);
}

.thinkt-conversation-view__toolbar-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  min-width: 160px;
  background: var(--thinkt-bg-secondary, #141414);
  border: 1px solid var(--thinkt-border-color, #2a2a2a);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  z-index: 1000;
  display: none;
  overflow: hidden;
}

.thinkt-conversation-view__toolbar-dropdown.open {
  display: block;
}

.thinkt-conversation-view__toolbar-dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  font-size: 13px;
  color: var(--thinkt-text-color, #e0e0e0);
  cursor: pointer;
  transition: background 0.12s ease;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
}

.thinkt-conversation-view__toolbar-dropdown-item:last-child {
  border-bottom: none;
}

.thinkt-conversation-view__toolbar-dropdown-item:hover {
  background: rgba(255, 255, 255, 0.05);
}
`;

// ============================================
// Component Class
// ============================================

export class ConversationView {
  private container: HTMLElement;
  private contentContainer!: HTMLElement;
  private filterContainer!: HTMLElement;
  private toolbarContainer!: HTMLElement;
  private stylesInjected = false;
  private client: ThinktClient | null = null;

  // Filter state (default: show user and assistant, hide thinking/tools)
  private filterState: FilterState = {
    user: true,
    assistant: true,
    thinking: false,
    toolUse: false,
    toolResult: false,
    system: false,
  };

  // Current project info
  private currentProjectPath: string | null = null;
  private currentEntryCount = 0;

  // Bound handlers for cleanup
  private boundFilterHandlers: Map<HTMLElement, () => void> = new Map();

  constructor(options: ConversationViewOptions) {
    this.container = options.elements.container;
    this.client = options.client ?? null;
    this.init();
  }

  private init(): void {
    this.injectStyles();
    this.container.className = 'thinkt-conversation-view';
    this.createStructure();
    this.setupFilters();
  }

  private injectStyles(): void {
    if (this.stylesInjected) return;

    const styleId = 'thinkt-conversation-view-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = DEFAULT_STYLES;
      document.head.appendChild(style);
    }
    this.stylesInjected = true;
  }

  private createStructure(): void {
    // Toolbar
    this.toolbarContainer = document.createElement('div');
    this.toolbarContainer.className = 'thinkt-conversation-view__toolbar';
    this.renderToolbar();
    this.container.appendChild(this.toolbarContainer);

    // Filter bar
    this.filterContainer = document.createElement('div');
    this.filterContainer.className = 'thinkt-conversation-view__filters';
    this.renderFilterBar();
    this.container.appendChild(this.filterContainer);

    // Content area
    this.contentContainer = document.createElement('div');
    this.contentContainer.className = 'thinkt-conversation-view__content';
    this.container.appendChild(this.contentContainer);

    this.showEmpty();
  }

  private renderToolbar(): void {
    const path = this.currentProjectPath ?? 'No project selected';
    const entryCount = this.currentEntryCount;

    this.toolbarContainer.innerHTML = `
      <div class="thinkt-conversation-view__toolbar-path">
        <span class="thinkt-conversation-view__toolbar-path-icon">📁</span>
        <span class="thinkt-conversation-view__toolbar-path-text" title="${path}">${path}</span>
        <div class="thinkt-conversation-view__toolbar-path-actions">
          <div class="thinkt-conversation-view__toolbar-actions">
            <button class="thinkt-conversation-view__toolbar-btn" id="toolbar-open-btn">
              Open ▼
            </button>
            <div class="thinkt-conversation-view__toolbar-dropdown" id="toolbar-dropdown">
              <div class="thinkt-conversation-view__toolbar-dropdown-item" data-action="finder">
                <span class="icon">📂</span> Open in Finder
              </div>
              <div class="thinkt-conversation-view__toolbar-dropdown-item" data-action="ghostty">
                <span class="icon">⌨️</span> Open in Ghostty
              </div>
              <div class="thinkt-conversation-view__toolbar-dropdown-item" data-action="copy">
                <span class="icon">📋</span> Copy Path
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="thinkt-conversation-view__toolbar-metrics">
        ${entryCount > 0 ? `<span>${entryCount} entries</span>` : ''}
      </div>
    `;

    this.setupToolbarActions();
  }

  private setupToolbarActions(): void {
    const openBtn = this.toolbarContainer.querySelector('#toolbar-open-btn') as HTMLElement | null;
    const dropdown = this.toolbarContainer.querySelector('#toolbar-dropdown') as HTMLElement | null;
    if (!openBtn || !dropdown) return;

    // Toggle dropdown
    openBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('open');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
      dropdown.classList.remove('open');
    });

    // Handle actions
    dropdown.querySelectorAll('.thinkt-conversation-view__toolbar-dropdown-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = (item as HTMLElement).dataset.action;
        void this.handleToolbarAction(action ?? '');
        dropdown.classList.remove('open');
      });
    });
  }

  private async handleToolbarAction(action: string): Promise<void> {
    if (!this.currentProjectPath) {
      console.warn('[ConversationView] No project path set, cannot perform action:', action);
      return;
    }

    // Map action to app name
    const appMap: Record<string, string> = {
      'finder': 'finder',
      'ghostty': 'ghostty',
      'vscode': 'vscode',
      'cursor': 'cursor',
      'terminal': 'terminal',
    };

    const app = appMap[action];

    if (action === 'copy') {
      // Copy path to clipboard
      try {
        await navigator.clipboard.writeText(this.currentProjectPath);
      } catch (err) {
        console.error('[ConversationView] Failed to copy path:', err);
      }
      return;
    }

    if (!app) {
      console.warn('[ConversationView] Unknown toolbar action:', action);
      return;
    }

    // Use the API to open in external app
    if (this.client) {
      try {
        await this.client.openIn(app, this.currentProjectPath);
      } catch (err) {
        console.error('[ConversationView] Failed to open via API:', err);
        // Fallback to clipboard
        try {
          await navigator.clipboard.writeText(this.currentProjectPath);
        } catch (clipboardErr) {
          console.error('[ConversationView] Failed to copy to clipboard:', clipboardErr);
        }
      }
    } else {
      console.warn('[ConversationView] No API client available, cannot open externally');
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(this.currentProjectPath);
      } catch (clipboardErr) {
        console.error('[ConversationView] Failed to copy to clipboard:', clipboardErr);
      }
    }
  }

  /**
   * Set the current project path and update toolbar
   */
  setProjectPath(path: string | null, entryCount?: number): void {
    this.currentProjectPath = path;
    if (entryCount !== undefined) {
      this.currentEntryCount = entryCount;
    }
    this.renderToolbar();
  }

  private renderFilterBar(): void {
    this.filterContainer.innerHTML = `
      <span class="thinkt-conversation-view__filter-label">Show:</span>
      <button class="thinkt-conversation-view__filter-btn ${this.filterState.user ? 'active' : ''}" data-filter="user">
        User
      </button>
      <button class="thinkt-conversation-view__filter-btn ${this.filterState.assistant ? 'active' : ''}" data-filter="assistant">
        Assistant
      </button>
      <button class="thinkt-conversation-view__filter-btn ${this.filterState.thinking ? 'active' : ''}" data-filter="thinking">
        Thinking
      </button>
      <button class="thinkt-conversation-view__filter-btn ${this.filterState.toolUse ? 'active' : ''}" data-filter="toolUse">
        Tool Use
      </button>
      <button class="thinkt-conversation-view__filter-btn ${this.filterState.toolResult ? 'active' : ''}" data-filter="toolResult">
        Tool Result
      </button>
      <button class="thinkt-conversation-view__filter-btn ${this.filterState.system ? 'active' : ''}" data-filter="system">
        System
      </button>
    `;
  }

  private setupFilters(): void {
    const buttons = this.filterContainer.querySelectorAll('.thinkt-conversation-view__filter-btn');
    buttons.forEach((btn) => {
      const button = btn as HTMLElement;
      const filter = button.dataset.filter as keyof FilterState;
      if (!filter) return;

      const handler = () => {
        this.filterState[filter] = !this.filterState[filter];
        button.classList.toggle('active', this.filterState[filter]);
        this.applyFilters();
      };

      button.addEventListener('click', handler);
      this.boundFilterHandlers.set(button, handler);
    });
  }

  private applyFilters(): void {
    // Show/hide entries based on role
    this.contentContainer.querySelectorAll('.thinkt-conversation-entry').forEach((el) => {
      const entry = el as HTMLElement;
      const role = entry.dataset.role;
      if (role === 'user') {
        entry.classList.toggle('hidden', !this.filterState.user);
      } else if (role === 'assistant') {
        entry.classList.toggle('hidden', !this.filterState.assistant);
      } else if (role === 'system') {
        entry.classList.toggle('hidden', !this.filterState.system);
      }
    });

    // Show/hide thinking blocks
    this.contentContainer.querySelectorAll('.thinkt-conversation-entry__thinking').forEach((el) => {
      (el as HTMLElement).classList.toggle('hidden', !this.filterState.thinking);
    });

    // Show/hide tool use blocks
    this.contentContainer.querySelectorAll('.thinkt-conversation-entry__tool-use').forEach((el) => {
      (el as HTMLElement).classList.toggle('hidden', !this.filterState.toolUse);
    });

    // Show/hide tool result blocks
    this.contentContainer.querySelectorAll('.thinkt-conversation-entry__tool-result').forEach((el) => {
      (el as HTMLElement).classList.toggle('hidden', !this.filterState.toolResult);
    });
  }

  /**
   * Get current filter state
   */
  getFilterState(): FilterState {
    return { ...this.filterState };
  }

  /**
   * Set filter state
   */
  setFilterState(state: Partial<FilterState>): void {
    Object.assign(this.filterState, state);
    this.renderFilterBar();
    this.setupFilters();
    this.applyFilters();
  }

  /**
   * Display entries from a session
   */
  displaySession(session: Session): void {
    this.contentContainer.innerHTML = '';

    if (!session.entries || session.entries.length === 0) {
      this.showEmpty();
      return;
    }

    for (const entry of session.entries) {
      const entryEl = this.renderEntry(entry);
      this.contentContainer.appendChild(entryEl);
    }

    this.applyFilters();
    this.contentContainer.scrollTop = 0;
  }

  /**
   * Display entries in the conversation view
   */
  displayEntries(entries: Entry[]): void {
    this.contentContainer.innerHTML = '';

    if (!entries || entries.length === 0) {
      this.showEmpty();
      return;
    }

    for (const entry of entries) {
      const entryEl = this.renderEntry(entry);
      this.contentContainer.appendChild(entryEl);
    }

    // Update entry count in toolbar
    this.currentEntryCount = entries.length;
    this.renderToolbar();

    this.applyFilters();
    this.contentContainer.scrollTop = 0;
  }

  private renderEntry(entry: Entry): HTMLElement {
    const role = entry.role || 'unknown';
    const roleClass = `thinkt-conversation-entry__role--${role}`;

    const div = document.createElement('div');
    div.className = 'thinkt-conversation-entry';
    div.dataset.role = role;

    const timestamp = entry.timestamp
      ? new Date(entry.timestamp).toLocaleString()
      : '';

    let contentHtml = '';

    // Render content blocks if available
    if (entry.contentBlocks && entry.contentBlocks.length > 0) {
      for (const block of entry.contentBlocks) {
        contentHtml += this.renderContentBlock(block);
      }
    } else if (entry.text) {
      contentHtml = `<div class="thinkt-conversation-entry__text">${this.escapeHtml(entry.text)}</div>`;
    }

    div.innerHTML = `
      <div class="thinkt-conversation-entry__header">
        <span class="thinkt-conversation-entry__role ${roleClass}">${role}</span>
        ${timestamp ? `<span class="thinkt-conversation-entry__timestamp">${timestamp}</span>` : ''}
      </div>
      <div class="thinkt-conversation-entry__content">
        ${contentHtml}
      </div>
    `;

    return div;
  }

  private renderContentBlock(block: ContentBlock): string {
    switch (block.type) {
      case 'text':
        return `<div class="thinkt-conversation-entry__text">${this.escapeHtml(block.text || '')}</div>`;

      case 'thinking':
        return `
          <div class="thinkt-conversation-entry__thinking" data-type="thinking">
            <div class="thinkt-conversation-entry__thinking-label">Thinking</div>
            ${this.escapeHtml(block.thinking || '')}
          </div>
        `;

      case 'tool_use':
        return `
          <div class="thinkt-conversation-entry__tool-use" data-type="toolUse">
            <div class="thinkt-conversation-entry__tool-name">${this.escapeHtml(block.toolName)}</div>
            <pre class="thinkt-conversation-entry__tool-input">${this.escapeHtml(JSON.stringify(block.toolInput, null, 2))}</pre>
          </div>
        `;

      case 'tool_result': {
        const resultClass = block.isError ? 'thinkt-conversation-entry__tool-result--error' : '';
        const resultLabel = block.isError ? 'Error' : 'Result';
        return `
          <div class="thinkt-conversation-entry__tool-result ${resultClass}" data-type="toolResult">
            <div class="thinkt-conversation-entry__tool-result-label">${resultLabel}</div>
            <div class="thinkt-conversation-entry__text">${this.escapeHtml(String(block.toolResult || ''))}</div>
          </div>
        `;
      }

      default:
        return '';
    }
  }

  private showEmpty(): void {
    this.contentContainer.innerHTML = `
      <div class="thinkt-conversation-empty">
        <div class="thinkt-conversation-empty__icon">💬</div>
        <div class="thinkt-conversation-empty__title">No conversation loaded</div>
        <div>Select a session to view the conversation</div>
      </div>
    `;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Clear the view
   */
  clear(): void {
    this.showEmpty();
  }

  /**
   * Dispose the view
   */
  dispose(): void {
    // Clean up filter handlers
    this.boundFilterHandlers.forEach((handler, button) => {
      button.removeEventListener('click', handler);
    });
    this.boundFilterHandlers.clear();

    this.container.innerHTML = '';
  }
}

// ============================================
// Factory Function
// ============================================

export function createConversationView(options: ConversationViewOptions): ConversationView {
  return new ConversationView(options);
}
