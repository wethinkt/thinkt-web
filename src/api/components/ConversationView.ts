/**
 * ConversationView Component
 *
 * Rich conversation viewer with:
 * - Markdown rendering for assistant text
 * - Compact tool calls with inline status (expandable)
 * - Collapsible thinking blocks
 * - Copy buttons on code blocks and text
 * - Filter toggles for content types
 */

import type { ThinktClient, AppInfo } from '@wethinkt/ts-thinkt/api';
import type { Entry, ToolResultBlock } from '@wethinkt/ts-thinkt';
import { i18n } from '@lingui/core';
import CONVERSATION_STYLES from './conversation-styles.css?inline';
import { escapeHtml, formatToolSummary, renderMarkdown, formatDuration } from './conversation-renderers';
import { injectStyleSheet } from './style-manager';
import { exportAsHtml, exportAsMarkdown, exportAsRawJson, downloadFile, getSafeFilename } from './export';

// ============================================
// Constants
// ============================================

const COPY_FEEDBACK_MS = 1500;
const HIGHLIGHT_DURATION_MS = 2000;

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
  /** Resume the currently loaded session in its original CLI */
  onResumeSession?: () => Promise<void> | void;
  /** Whether the currently loaded session supports resume */
  canResumeSession?: () => boolean;
  /** Toggle timeline panel visibility */
  onToggleTimelinePanel?: () => void;
  /** Whether timeline panel is visible */
  isTimelinePanelVisible?: () => boolean;
  /** Whether timeline panel can be toggled */
  canToggleTimelinePanel?: () => boolean;
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
// Component Class
// ============================================

export class ConversationView {
  private container: HTMLElement;
  private contentContainer!: HTMLElement;
  private filterContainer!: HTMLElement;
  private toolbarContainer!: HTMLElement;
  private client: ThinktClient | null = null;
  private onResumeSession: (() => Promise<void> | void) | null = null;
  private canResumeSession: (() => boolean) | null = null;
  private onToggleTimelinePanel: (() => void) | null = null;
  private isTimelinePanelVisible: (() => boolean) | null = null;
  private canToggleTimelinePanel: (() => boolean) | null = null;

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

  // Current session entries for export
  private currentEntries: Entry[] = [];
  private currentSessionSource: string | null = null;
  private currentSessionModel: string | null = null;

  // Tool result index: toolUseId → ToolResultBlock
  private toolResultIndex: Map<string, ToolResultBlock> = new Map();
  // Track which tool results were inlined with their tool_use
  private inlinedToolResults: Set<string> = new Set();

  private abortController = new AbortController();

  // Available apps for open-in
  private availableApps: AppInfo[] = [];

  // Export dropdown state
  private exportDropdownOpen = false;

  constructor(options: ConversationViewOptions) {
    this.container = options.elements.container;
    this.client = options.client ?? null;
    this.onResumeSession = options.onResumeSession ?? null;
    this.canResumeSession = options.canResumeSession ?? null;
    this.onToggleTimelinePanel = options.onToggleTimelinePanel ?? null;
    this.isTimelinePanelVisible = options.isTimelinePanelVisible ?? null;
    this.canToggleTimelinePanel = options.canToggleTimelinePanel ?? null;
    this.init();
    void this.fetchAvailableApps();
  }

  private init(): void {
    injectStyleSheet('thinkt-conversation-view-styles', CONVERSATION_STYLES);
    this.container.className = 'thinkt-conversation-view';
    this.createStructure();
    this.setupFilters();

    window.addEventListener('thinkt:locale-changed', () => this.refreshI18n(), { signal: this.abortController.signal });
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

    // Event delegation on content container
    this.contentContainer.addEventListener('click', (e) => this.handleContentClick(e), { signal: this.abortController.signal });

    this.showEmpty();
  }

  // ============================================
  // Event Delegation
  // ============================================

  private handleContentClick(e: Event): void {
    const target = e.target as HTMLElement;

    // Thinking block toggle
    const thinkingHeader = target.closest('.thinkt-thinking-block__header');
    if (thinkingHeader) {
      const block = thinkingHeader.closest('.thinkt-thinking-block') as HTMLElement;
      block?.classList.toggle('expanded');
      return;
    }

    // Tool call toggle
    const toolSummary = target.closest('.thinkt-tool-call__summary');
    if (toolSummary) {
      const block = toolSummary.closest('.thinkt-tool-call') as HTMLElement;
      block?.classList.toggle('expanded');
      return;
    }

    // Copy button
    const copyBtn = target.closest('.thinkt-copy-btn') as HTMLElement | null;
    if (copyBtn) {
      void this.handleCopy(copyBtn);
      return;
    }
  }

  private async handleCopy(btn: HTMLElement): Promise<void> {
    let text = '';
    const action = btn.dataset.copyAction;

    if (action === 'code') {
      const codeBlock = btn.closest('.thinkt-code-block');
      const code = codeBlock?.querySelector('code');
      text = code?.textContent ?? '';
    } else if (action === 'text') {
      const textBlock = btn.closest('.thinkt-conversation-entry__text');
      // Clone and remove the copy button to avoid including "Copy" in output
      if (textBlock) {
        const clone = textBlock.cloneNode(true) as HTMLElement;
        clone.querySelectorAll('.thinkt-copy-btn').forEach(b => b.remove());
        text = clone.textContent ?? '';
      }
    } else if (action === 'detail') {
      const detail = btn.closest('.thinkt-tool-call__detail-content');
      if (detail) {
        const clone = detail.cloneNode(true) as HTMLElement;
        clone.querySelectorAll('.thinkt-copy-btn').forEach(b => b.remove());
        text = clone.textContent ?? '';
      }
    }

    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      const original = btn.textContent;
      btn.textContent = '\u2713';
      setTimeout(() => { btn.textContent = original; }, COPY_FEEDBACK_MS);
    } catch {
      // Silently fail
    }
  }

  // ============================================
  // Toolbar
  // ============================================

  private async fetchAvailableApps(): Promise<void> {
    if (!this.client) return;
    try {
      const appsResponse = await this.client.getOpenInApps();
      this.availableApps = appsResponse.apps ?? [];
      this.renderToolbar();
    } catch {
      // Silently fall back to no app items
    }
  }

  private renderToolbar(): void {
    const path = this.currentProjectPath ?? i18n._('No project selected');
    const entryCount = this.currentEntryCount;
    const canResumeSession = this.canResumeSession?.() ?? false;
    const resumeBtn = this.onResumeSession && canResumeSession
      ? `<button class="thinkt-conversation-view__toolbar-btn" id="toolbar-resume-btn">${i18n._('Resume')}</button>`
      : '';
    const timelineVisible = this.isTimelinePanelVisible?.() ?? false;
    const canToggleTimeline = this.canToggleTimelinePanel?.() ?? false;
    const timelineBtn = this.onToggleTimelinePanel
      ? `
          <button class="thinkt-conversation-view__toolbar-btn" id="toolbar-timeline-btn" ${canToggleTimeline ? '' : 'disabled'}>
            ${timelineVisible ? i18n._('Hide Timeline') : i18n._('Show Timeline')}
          </button>
        `
      : '';

    const appItems = this.availableApps
      .filter(app => app.enabled)
      .map(app => `
        <div class="thinkt-conversation-view__toolbar-dropdown-item" data-action="${escapeHtml(app.id ?? '')}">
          ${i18n._('Open in')} ${escapeHtml(app.name ?? app.id ?? '')}
        </div>
      `).join('');

    this.toolbarContainer.innerHTML = `
      <div class="thinkt-conversation-view__toolbar-path">
        <span class="thinkt-conversation-view__toolbar-path-icon">\u{1F4C1}</span>
        <span class="thinkt-conversation-view__toolbar-path-text" title="${escapeHtml(path)}">${escapeHtml(path)}</span>
      </div>
      <div class="thinkt-conversation-view__toolbar-right">
        <div class="thinkt-conversation-view__toolbar-metrics">
          ${entryCount > 0 ? `<span>${i18n._('{count, plural, one {# entry} other {# entries}}', { count: entryCount })}</span>` : ''}
        </div>
        <div class="thinkt-conversation-view__toolbar-actions">
          ${resumeBtn}
          <button class="thinkt-conversation-view__toolbar-btn" id="toolbar-open-btn">
            ${i18n._('Open')} \u25BC
          </button>
          <div class="thinkt-conversation-view__toolbar-dropdown" id="toolbar-dropdown">
            ${appItems}
            <div class="thinkt-conversation-view__toolbar-dropdown-item" data-action="copy">
              <span class="icon">\u{1F4CB}</span> ${i18n._('Copy Path')}
            </div>
          </div>
        </div>
        ${timelineBtn}
      </div>
    `;

    this.setupToolbarActions();
  }

  private setupToolbarActions(): void {
    const resumeBtn = this.toolbarContainer.querySelector('#toolbar-resume-btn') as HTMLElement | null;
    if (resumeBtn) {
      resumeBtn.addEventListener('click', () => {
        void this.handleResumeAction();
      });
    }

    const timelineBtn = this.toolbarContainer.querySelector('#toolbar-timeline-btn') as HTMLElement | null;
    if (timelineBtn) {
      timelineBtn.addEventListener('click', () => {
        this.onToggleTimelinePanel?.();
        this.renderToolbar();
      });
    }

    const openBtn = this.toolbarContainer.querySelector('#toolbar-open-btn') as HTMLElement | null;
    const dropdown = this.toolbarContainer.querySelector('#toolbar-dropdown') as HTMLElement | null;
    if (!openBtn || !dropdown) return;

    openBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('open');
    });

    document.addEventListener('click', () => {
      dropdown.classList.remove('open');
    }, { signal: this.abortController.signal });

    dropdown.querySelectorAll('.thinkt-conversation-view__toolbar-dropdown-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = (item as HTMLElement).dataset.action;
        void this.handleToolbarAction(action ?? '');
        dropdown.classList.remove('open');
      });
    });
  }

  private async handleResumeAction(): Promise<void> {
    if (!this.onResumeSession) return;
    try {
      await this.onResumeSession();
    } catch {
      // Resume handler owns error reporting
    }
  }

  private async handleToolbarAction(action: string): Promise<void> {
    if (!this.currentProjectPath) return;

    if (action === 'copy') {
      try {
        await navigator.clipboard.writeText(this.currentProjectPath);
      } catch {
        // Silently fail
      }
      return;
    }

    if (this.client) {
      try {
        await this.client.openIn(action, this.currentProjectPath);
      } catch (error) {
        console.warn('[THINKT] Failed to open in app, copying path to clipboard:', error);
        try { await navigator.clipboard.writeText(this.currentProjectPath!); } catch { /* */ }
      }
    } else {
      try { await navigator.clipboard.writeText(this.currentProjectPath); } catch { /* */ }
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

  setSessionContext(session: { source?: string | null; model?: string | null } | null): void {
    this.currentSessionSource = session?.source?.trim() || null;
    this.currentSessionModel = session?.model?.trim() || null;
    this.renderFilterBar();
    this.setupFilters();
    this.applyFilters();
  }

  // ============================================
  // Filter Bar
  // ============================================

  private renderFilterBar(): void {
    const hasEntries = this.currentEntries.length > 0;
    const sourceBadge = this.renderSourceBadge();
    const modelBadge = this.renderModelBadge();
    const sessionContextHtml = (sourceBadge || modelBadge)
      ? `<div class="thinkt-conversation-view__session-context">${sourceBadge}${modelBadge}</div>`
      : '';
    this.filterContainer.innerHTML = `
      ${sessionContextHtml}
      <span class="thinkt-conversation-view__filter-label">${i18n._('Show:')}</span>
      <button class="thinkt-conversation-view__filter-btn ${this.filterState.user ? 'active' : ''}" data-filter="user">
        ${i18n._('User')}
      </button>
      <button class="thinkt-conversation-view__filter-btn ${this.filterState.assistant ? 'active' : ''}" data-filter="assistant">
        ${i18n._('Assistant')}
      </button>
      <button class="thinkt-conversation-view__filter-btn ${this.filterState.thinking ? 'active' : ''}" data-filter="thinking">
        ${i18n._('Thinking')}
      </button>
      <button class="thinkt-conversation-view__filter-btn ${this.filterState.toolUse ? 'active' : ''}" data-filter="toolUse">
        ${i18n._('Tool Use')}
      </button>
      <button class="thinkt-conversation-view__filter-btn ${this.filterState.toolResult ? 'active' : ''}" data-filter="toolResult">
        ${i18n._('Tool Result')}
      </button>
      <button class="thinkt-conversation-view__filter-btn ${this.filterState.system ? 'active' : ''}" data-filter="system">
        ${i18n._('System')}
      </button>
      <div class="thinkt-conversation-view__export">
        <button class="thinkt-conversation-view__export-btn" id="export-btn" ${hasEntries ? '' : 'disabled'}>
          ${i18n._('Export')} ▼
        </button>
        <div class="thinkt-conversation-view__export-dropdown" id="export-dropdown">
          <div class="thinkt-conversation-view__export-dropdown-item" data-format="html">
            <span class="icon">🌐</span> ${i18n._('Export as HTML')}
          </div>
          <div class="thinkt-conversation-view__export-dropdown-item" data-format="markdown">
            <span class="icon">📝</span> ${i18n._('Export as Markdown')}
          </div>
          <div class="thinkt-conversation-view__export-dropdown-item" data-format="raw-json">
            <span class="icon">{}</span> ${i18n._('Export as Raw JSON')}
          </div>
        </div>
      </div>
    `;

    this.setupExportHandlers();
  }

  private renderSourceBadge(): string {
    const source = this.currentSessionSource?.trim();
    if (!source) return '';
    const sourceClass = this.getSourceBadgeClass(source);
    return `<span class="thinkt-conversation-view__session-badge thinkt-conversation-view__session-badge--source ${sourceClass}">${escapeHtml(source)}</span>`;
  }

  private renderModelBadge(): string {
    const model = this.currentSessionModel?.trim();
    if (!model) return '';
    return `<span class="thinkt-conversation-view__session-badge thinkt-conversation-view__session-badge--model" title="${escapeHtml(model)}">${escapeHtml(model)}</span>`;
  }

  private getSourceBadgeClass(sourceName: string): string {
    const source = sourceName.trim().toLowerCase();
    if (source === 'claude') return 'thinkt-conversation-view__session-badge--source-claude';
    if (source === 'kimi') return 'thinkt-conversation-view__session-badge--source-kimi';
    if (source === 'gemini') return 'thinkt-conversation-view__session-badge--source-gemini';
    if (source === 'copilot') return 'thinkt-conversation-view__session-badge--source-copilot';
    if (source === 'codex') return 'thinkt-conversation-view__session-badge--source-codex';
    if (source === 'qwen') return 'thinkt-conversation-view__session-badge--source-qwen';
    if (source === 'thinkt') return 'thinkt-conversation-view__session-badge--source-thinkt';
    return 'thinkt-conversation-view__session-badge--source-other';
  }

  private setupExportHandlers(): void {
    const exportBtn = this.filterContainer.querySelector('#export-btn') as HTMLElement | null;
    const dropdown = this.filterContainer.querySelector('#export-dropdown') as HTMLElement | null;
    if (!exportBtn || !dropdown) return;

    // Toggle dropdown
    exportBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.exportDropdownOpen = !this.exportDropdownOpen;
      if (this.exportDropdownOpen) {
        this.positionDropdown(exportBtn, dropdown);
        dropdown.classList.add('open');
      } else {
        dropdown.classList.remove('open');
      }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
      if (this.exportDropdownOpen) {
        this.exportDropdownOpen = false;
        dropdown.classList.remove('open');
      }
    }, { signal: this.abortController.signal });

    // Handle export format selection
    dropdown.querySelectorAll('.thinkt-conversation-view__export-dropdown-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const format = (item as HTMLElement).dataset.format;
        if (format) {
          this.handleExport(format);
        }
        this.exportDropdownOpen = false;
        dropdown.classList.remove('open');
      });
    });
  }

  private positionDropdown(button: HTMLElement, dropdown: HTMLElement): void {
    const rect = button.getBoundingClientRect();
    dropdown.style.top = `${rect.bottom + 4}px`;
    dropdown.style.right = `${window.innerWidth - rect.right}px`;
  }

  private handleExport(format: string): void {
    const title = this.currentProjectPath
      ? `${this.currentProjectPath.split('/').pop() || i18n._('conversation')}`
      : i18n._('conversation');

    // Pass current filter state to export
    const exportFilters = {
      user: this.filterState.user,
      assistant: this.filterState.assistant,
      thinking: this.filterState.thinking,
      toolUse: this.filterState.toolUse,
      toolResult: this.filterState.toolResult,
      system: this.filterState.system,
    };

    // File/copy exports require entries
    if (this.currentEntries.length === 0) return;

    const safeFilename = getSafeFilename(title);

    if (format === 'html') {
      const html = exportAsHtml(this.currentEntries, title, exportFilters);
      downloadFile(html, `${safeFilename}.html`, 'text/html');
    } else if (format === 'markdown') {
      const md = exportAsMarkdown(this.currentEntries, title, exportFilters);
      downloadFile(md, `${safeFilename}.md`, 'text/markdown');
    } else if (format === 'raw-json') {
      const json = exportAsRawJson(this.currentEntries, title, exportFilters, {
        sourcePath: this.currentProjectPath ?? undefined,
      });
      downloadFile(json, `${safeFilename}.json`, 'application/json');
    }
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

      button.addEventListener('click', handler, { signal: this.abortController.signal });
    });
  }

  private applyFilters(): void {
    // All top-level items have data-role and data-block-type
    this.contentContainer.querySelectorAll('[data-role]').forEach((el) => {
      const item = el as HTMLElement;
      const role = (item.dataset.role ?? '').toLowerCase();
      const blockType = item.dataset.blockType;

      // Check role filter
      let hidden = false;
      if (role === 'user') hidden = !this.filterState.user;
      else if (role === 'assistant') hidden = !this.filterState.assistant;
      else if (role === 'system' || role === 'progress' || role === 'checkpoint') hidden = !this.filterState.system;

      // Check block-type filter (standalone blocks only)
      if (!hidden && blockType) {
        if (blockType === 'thinking') hidden = !this.filterState.thinking;
        else if (blockType === 'toolUse') hidden = !this.filterState.toolUse;
        else if (blockType === 'toolResult') hidden = !this.filterState.toolResult;
      }

      item.classList.toggle('hidden', hidden);
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

  // ============================================
  // Tool Result Index
  // ============================================

  private buildToolResultIndex(entries: Entry[]): void {
    this.toolResultIndex.clear();
    this.inlinedToolResults.clear();

    for (const entry of entries) {
      if (!entry.contentBlocks) continue;
      for (const block of entry.contentBlocks) {
        if (block.type === 'tool_result') {
          const tb = block as ToolResultBlock;
          this.toolResultIndex.set(tb.toolUseId, tb);
        }
      }
    }
  }

  // ============================================
  // Display Methods
  // ============================================

  /**
   * Display entries in the conversation view
   */
  displayEntries(entries: Entry[]): void {
    this.contentContainer.replaceChildren();
    this.currentEntries = entries || [];

    if (this.currentEntries.length === 0) {
      this.showEmpty();
      this.renderFilterBar();
      return;
    }

    this.buildToolResultIndex(this.currentEntries);

    for (let i = 0; i < this.currentEntries.length; i++) {
      const entry = this.currentEntries[i];
      const entryEl = this.renderEntry(entry, i);
      this.contentContainer.appendChild(entryEl);
    }

    this.currentEntryCount = this.currentEntries.length;
    this.renderToolbar();
    this.renderFilterBar();
    this.setupFilters();
    this.applyFilters();
    // Note: Caller decides scroll position (preserves scroll by default)
  }

  /**
   * Begin a progressive display session. Entries are appended incrementally
   * via appendEntries(), then finalized to link tool results.
   */
  beginProgressiveDisplay(): void {
    this.contentContainer.replaceChildren();
    this.currentEntries = [];
    this.toolResultIndex.clear();
    this.inlinedToolResults.clear();
    this.currentEntryCount = 0;
    this.renderToolbar();
    this.renderFilterBar();
    this.setupFilters();
    this.applyFilters();
  }

  /**
   * Append a batch of entries during progressive loading.
   */
  appendEntries(entries: Entry[]): void {
    for (const entry of entries) {
      this.currentEntries.push(entry);
      const entryEl = this.renderEntry(entry, this.currentEntries.length - 1);
      this.contentContainer.appendChild(entryEl);
    }
    this.currentEntryCount = this.currentEntries.length;
    // Keep visibility consistent with the current filter state while streaming.
    this.applyFilters();
  }

  /**
   * Finalize progressive display: rebuild tool result index and re-render
   * to link tool_use blocks with their results.
   */
  finalizeProgressiveDisplay(): void {
    this.buildToolResultIndex(this.currentEntries);

    // Only re-render if there are tool results to link
    if (this.toolResultIndex.size > 0) {
      this.contentContainer.replaceChildren();
      for (let i = 0; i < this.currentEntries.length; i++) {
        const entryEl = this.renderEntry(this.currentEntries[i], i);
        this.contentContainer.appendChild(entryEl);
      }
    }

    this.renderToolbar();
    this.renderFilterBar();
    this.setupFilters();
    this.applyFilters();
  }

  // ============================================
  // Entry Rendering
  // ============================================

  /**
   * Render an entry as a DocumentFragment.
   * Text blocks go into entry cards (with header).
   * Thinking, tool_use, and tool_result blocks render as standalone peers.
   * Block order is preserved.
   */
  private renderEntry(entry: Entry, entryIndex?: number): DocumentFragment {
    const fragment = document.createDocumentFragment();
    const role = entry.role || 'unknown';
    const timestamp = entry.timestamp
      ? new Date(entry.timestamp).toLocaleString()
      : '';

    // Simple text-only entry (no content blocks)
    if (!entry.contentBlocks?.length) {
      if (entry.text) {
        const textHtml = role === 'assistant'
          ? this.renderAssistantText(entry.text)
          : this.renderPlainText(entry.text);
        fragment.appendChild(this.createTextCard(role, timestamp, textHtml));
      }
      return fragment;
    }

    // Process blocks in order, grouping consecutive text into cards
    let pendingTextHtml = '';
    let showTimestamp = true;

    const flushText = () => {
      if (!pendingTextHtml) return;
      fragment.appendChild(this.createTextCard(role, showTimestamp ? timestamp : '', pendingTextHtml));
      pendingTextHtml = '';
      showTimestamp = false;
    };

    for (const block of entry.contentBlocks) {
      switch (block.type) {
        case 'text':
          // Skip empty text blocks to avoid blank cards
          if (block.text && block.text.trim()) {
            pendingTextHtml += role === 'assistant'
              ? this.renderAssistantText(block.text)
              : this.renderPlainText(block.text);
          }
          break;

        case 'thinking':
          flushText();
          fragment.appendChild(this.createStandaloneBlock(role, 'thinking',
            this.renderThinkingBlock(block.thinking || '', block.durationMs)));
          break;

        case 'tool_use':
          flushText();
          fragment.appendChild(this.createStandaloneBlock(role, 'toolUse',
            this.renderToolCall(block.toolUseId, block.toolName, block.toolInput)));
          break;

        case 'tool_result':
          if (!this.inlinedToolResults.has(block.toolUseId)) {
            flushText();
            fragment.appendChild(this.createStandaloneBlock(role, 'toolResult',
              this.renderToolResultBlock(block)));
          }
          break;
      }
    }

    flushText();

    // Add entry index to all top-level elements for scrolling
    if (entryIndex !== undefined) {
      for (let i = 0; i < fragment.childNodes.length; i++) {
        const child = fragment.childNodes[i];
        if (child instanceof HTMLElement) {
          child.dataset.entryIndex = String(entryIndex);
        }
      }
    }

    return fragment;
  }

  private createTextCard(role: string, timestamp: string, contentHtml: string): HTMLElement {
    const div = document.createElement('div');
    div.className = 'thinkt-conversation-entry';
    div.dataset.role = role;
    div.dataset.blockType = 'text';
    const roleClass = `thinkt-conversation-entry__role--${role}`;
    div.innerHTML = `
      <div class="thinkt-conversation-entry__header">
        <span class="thinkt-conversation-entry__role ${roleClass}">${escapeHtml(role)}</span>
        ${timestamp ? `<span class="thinkt-conversation-entry__timestamp">${escapeHtml(timestamp)}</span>` : ''}
      </div>
      <div class="thinkt-conversation-entry__content">${contentHtml}</div>
    `;
    return div;
  }

  private createStandaloneBlock(role: string, blockType: string, innerHTML: string): HTMLElement {
    const div = document.createElement('div');
    div.className = 'thinkt-standalone-block';
    div.dataset.role = role;
    div.dataset.blockType = blockType;
    div.innerHTML = innerHTML;
    return div;
  }

  private renderAssistantText(text: string): string {
    return `<div class="thinkt-conversation-entry__text thinkt-conversation-entry__text--markdown">${renderMarkdown(text)}<button class="thinkt-copy-btn thinkt-copy-btn--float" data-copy-action="text">${i18n._('Copy')}</button></div>`;
  }

  private renderPlainText(text: string): string {
    return `<div class="thinkt-conversation-entry__text">${escapeHtml(text)}</div>`;
  }

  private renderToolResultBlock(block: ToolResultBlock): string {
    const resultClass = block.isError ? 'thinkt-conversation-entry__tool-result--error' : '';
    const resultLabel = block.isError ? i18n._('Error') : i18n._('Result');
    return `
      <div class="thinkt-conversation-entry__tool-result ${resultClass}">
        <div class="thinkt-conversation-entry__tool-result-label">${resultLabel}</div>
        <div class="thinkt-conversation-entry__text">${escapeHtml(String(block.toolResult || ''))}</div>
      </div>
    `;
  }

  // ============================================
  // Thinking Block (collapsible)
  // ============================================

  private renderThinkingBlock(thinking: string, durationMs?: number): string {
    const duration = formatDuration(durationMs);
    const durationHtml = duration ? `<span class="thinkt-thinking-block__duration">(${escapeHtml(duration)})</span>` : '';

    // Preview: first ~80 chars, single line
    const preview = thinking.replace(/\n/g, ' ').slice(0, 80);
    const previewHtml = preview ? `<span class="thinkt-thinking-block__preview">${escapeHtml(preview)}${thinking.length > 80 ? '\u2026' : ''}</span>` : '';

    return `
      <div class="thinkt-thinking-block" data-type="thinking">
        <div class="thinkt-thinking-block__header">
          <span class="thinkt-thinking-block__toggle">\u25B6</span>
          <span class="thinkt-thinking-block__label">${i18n._('Thinking')}</span>
          ${durationHtml}
          ${previewHtml}
        </div>
        <div class="thinkt-thinking-block__content">${escapeHtml(thinking)}</div>
      </div>
    `;
  }

  // ============================================
  // Tool Call (compact with inline status)
  // ============================================

  private renderToolCall(toolUseId: string, toolName: string, toolInput: unknown): string {
    const summary = formatToolSummary(toolName, toolInput);
    const summaryHtml = summary ? `<span class="thinkt-tool-call__arg">(${escapeHtml(summary)})</span>` : '';

    // Look up the result
    const result = this.toolResultIndex.get(toolUseId);
    let statusHtml: string;
    let resultDetailHtml = '';
    let durationHtml = '';

    if (result) {
      this.inlinedToolResults.add(toolUseId);

      if (result.isError) {
        statusHtml = '<span class="thinkt-tool-call__status thinkt-tool-call__status--error">\u2717</span>';
      } else {
        statusHtml = '<span class="thinkt-tool-call__status thinkt-tool-call__status--ok">\u2713</span>';
      }

      const duration = formatDuration(result.durationMs);
      if (duration) {
        durationHtml = `<span class="thinkt-tool-call__duration">${escapeHtml(duration)}</span>`;
      }

      const errorClass = result.isError ? ' thinkt-tool-call__detail-result--error' : '';
      const resultLabel = result.isError ? i18n._('Error') : i18n._('Result');
      resultDetailHtml = `
        <div class="thinkt-tool-call__detail-section thinkt-tool-call__detail-result${errorClass}">
          <div class="thinkt-tool-call__detail-label">${resultLabel}</div>
          <div class="thinkt-tool-call__detail-content">${escapeHtml(String(result.toolResult || ''))}<button class="thinkt-copy-btn thinkt-copy-btn--float" data-copy-action="detail">${i18n._('Copy')}</button></div>
        </div>
      `;
    } else {
      statusHtml = '<span class="thinkt-tool-call__status thinkt-tool-call__status--pending">\u2022</span>';
    }

    const inputJson = escapeHtml(JSON.stringify(toolInput, null, 2));

    return `
      <div class="thinkt-tool-call" data-type="toolUse" data-tool-use-id="${escapeHtml(toolUseId)}">
        <div class="thinkt-tool-call__summary">
          <span class="thinkt-tool-call__toggle">\u25B6</span>
          <span class="thinkt-tool-call__bullet">\u2022</span>
          <span class="thinkt-tool-call__name">${escapeHtml(toolName)}</span>
          ${summaryHtml}
          ${durationHtml}
          ${statusHtml}
        </div>
        <div class="thinkt-tool-call__detail">
          <div class="thinkt-tool-call__detail-section">
            <div class="thinkt-tool-call__detail-label">${i18n._('Input')}</div>
            <div class="thinkt-tool-call__detail-content">${inputJson}<button class="thinkt-copy-btn thinkt-copy-btn--float" data-copy-action="detail">${i18n._('Copy')}</button></div>
          </div>
          ${resultDetailHtml}
        </div>
      </div>
    `;
  }

  // ============================================
  // Empty State
  // ============================================

  private showEmpty(): void {
    this.currentEntries = [];
    this.contentContainer.innerHTML = `
      <div class="thinkt-conversation-empty">
        <div class="thinkt-conversation-empty__icon">\u{1F4AC}</div>
        <div class="thinkt-conversation-empty__title">${i18n._('No conversation loaded')}</div>
        <div>${i18n._('Select a session to view the conversation')}</div>
      </div>
    `;
    this.renderFilterBar();
  }

  /**
   * Clear the view
   */
  clear(): void {
    this.currentSessionSource = null;
    this.currentSessionModel = null;
    this.showEmpty();
  }

  /**
   * Re-render toolbar for external state changes (timeline panel visibility).
   */
  refreshToolbar(): void {
    this.renderToolbar();
  }

  /**
   * Re-render translatable UI text in place when locale changes.
   */
  refreshI18n(): void {
    this.renderToolbar();

    if (this.currentEntries.length === 0) {
      this.showEmpty();
      return;
    }

    const scrollTop = this.contentContainer.scrollTop;
    this.displayEntries(this.currentEntries);
    // Restore scroll after DOM settles
    requestAnimationFrame(() => {
      this.contentContainer.scrollTop = scrollTop;
    });
  }

  /**
   * Scroll to a specific entry by index
   */
  scrollToEntry(entryIndex: number): void {
    const element = this.contentContainer.querySelector(`[data-entry-index="${entryIndex}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Highlight the entry temporarily
      element.classList.add('thinkt-conversation-entry--highlighted');
      setTimeout(() => {
        element.classList.remove('thinkt-conversation-entry--highlighted');
      }, HIGHLIGHT_DURATION_MS);
    }
  }

  /**
   * Scroll to the top of the conversation
   */
  scrollToTop(): void {
    this.contentContainer.scrollTop = 0;
  }

  /**
   * Dispose the view
   */
  dispose(): void {
    this.abortController.abort();
    this.container.replaceChildren();
  }
}
