/**
 * ProjectTimelinePanel Component
 *
 * A timeline visualization that appears below the conversation pane
 * when a project is selected. Shows sessions per-source with start/end bubbles.
 */

import type { SessionMeta } from '@wethinkt/ts-thinkt';
import { type ThinktClient, getDefaultClient } from '@wethinkt/ts-thinkt/api';
import { i18n } from '@lingui/core';
import { injectStyleSheet } from './style-manager';

// ============================================
// Types
// ============================================

export interface ProjectTimelinePanelElements {
  /** Container element */
  container: HTMLElement;
}

export interface ProjectTimelinePanelOptions {
  elements: ProjectTimelinePanelElements;
  /** API client instance */
  client?: ThinktClient;
  /** Project ID to load sessions for */
  projectId?: string;
  /** Source for source-scoped project lookups */
  projectSource?: string;
  /** Callback when a session is selected */
  onSessionSelect?: (session: SessionMeta) => void;
  /** Callback when panel visibility changes */
  onVisibilityChange?: (visible: boolean) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

interface SessionWithTiming {
  session: SessionMeta;
  source: string;
  startTime: Date;
  endTime: Date;
  duration: number; // in minutes
}

interface SourceRow {
  source: string;
  color: string;
  sessions: SessionWithTiming[];
}

// ============================================
// Styles
// ============================================

const PANEL_STYLES = `
.thinkt-project-timeline {
  display: flex;
  flex-direction: column;
  height: 100%;
  font-family: var(--thinkt-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
  color: var(--thinkt-text-color, #e0e0e0);
  background: var(--thinkt-bg-secondary, #141414);
  border-top: 1px solid var(--thinkt-border-color, #2a2a2a);
}

.thinkt-project-timeline-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid var(--thinkt-border-color, #2a2a2a);
  background: var(--thinkt-bg-tertiary, #181a1f);
  flex-shrink: 0;
}

.thinkt-project-timeline-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--thinkt-muted-color, #888);
  display: flex;
  align-items: center;
  gap: 8px;
}

.thinkt-project-timeline-close {
  background: none;
  border: none;
  color: var(--thinkt-muted-color, #666);
  cursor: pointer;
  font-size: 16px;
  padding: 2px 6px;
  border-radius: 4px;
  line-height: 1;
}

.thinkt-project-timeline-close:hover {
  background: var(--thinkt-hover-bg, #252525);
  color: var(--thinkt-text-secondary, #94a3b8);
}

.thinkt-project-timeline-content {
  flex: 1;
  overflow: auto;
  padding: 12px;
}

.thinkt-project-timeline-svg {
  width: 100%;
  min-width: 400px;
}

/* Legend */
.thinkt-project-timeline-legend {
  display: flex;
  gap: 16px;
  padding: 8px 12px;
  border-top: 1px solid var(--thinkt-border-color, #2a2a2a);
  font-size: 11px;
  color: var(--thinkt-text-secondary, #94a3b8);
  flex-wrap: wrap;
  flex-shrink: 0;
}

.thinkt-project-timeline-legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.thinkt-project-timeline-legend-start {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid currentColor;
}

.thinkt-project-timeline-legend-end {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: currentColor;
}

.thinkt-project-timeline-legend-line {
  width: 20px;
  height: 2px;
  background: currentColor;
}

/* Empty & Loading */
.thinkt-project-timeline-empty,
.thinkt-project-timeline-loading,
.thinkt-project-timeline-error {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--thinkt-muted-color, #666);
  font-size: 12px;
}

/* Tooltip */
.thinkt-project-timeline-tooltip {
  position: absolute;
  background: var(--thinkt-dropdown-bg, #1a1a1a);
  border: 1px solid var(--thinkt-border-color, #333);
  border-radius: 6px;
  padding: 10px 12px;
  font-size: 12px;
  pointer-events: none;
  z-index: 100;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  max-width: 280px;
}

.thinkt-project-timeline-tooltip-title {
  font-weight: 500;
  color: var(--thinkt-text-primary, #f8fafc);
  margin-bottom: 4px;
  line-height: 1.3;
}

.thinkt-project-timeline-tooltip-meta {
  color: var(--thinkt-muted-color, #888);
  font-size: 11px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.thinkt-project-timeline-tooltip-duration {
  color: var(--thinkt-accent-color, #6366f1);
  font-weight: 500;
}
`;

// ============================================
// Component Class
// ============================================

export class ProjectTimelinePanel {
  private options: ProjectTimelinePanelOptions;
  private client: ThinktClient;
  private container: HTMLElement;
  private contentContainer: HTMLElement;
  private sessions: SessionWithTiming[] = [];
  private rows: SourceRow[] = [];
  private svg: SVGSVGElement | null = null;
  private tooltip: HTMLElement | null = null;
  private loadController: AbortController | null = null;
  private isVisible = false;
  private cachedProjectKey: string | null = null;

  // Dimensions
  private readonly rowHeight = 50;
  private readonly blobRadius = 7;
  private readonly padding = { top: 30, right: 30, bottom: 20, left: 80 };
  private abortController = new AbortController();

  constructor(options: ProjectTimelinePanelOptions) {
    this.options = options;
    this.client = options.client ?? getDefaultClient();
    this.container = options.elements.container;
    this.container.className = 'thinkt-project-timeline';
    this.contentContainer = document.createElement('div');
    this.init();
  }

  private init(): void {
    injectStyleSheet('thinkt-project-timeline-styles', PANEL_STYLES);
    this.createStructure();

    // Create tooltip
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'thinkt-project-timeline-tooltip';
    this.tooltip.style.display = 'none';
    document.body.appendChild(this.tooltip);

    window.addEventListener('thinkt:locale-changed', () => this.refreshI18n(), { signal: this.abortController.signal });

    if (this.options.projectId) {
      void this.loadSessions(this.options.projectId, this.options.projectSource);
    }
  }

  private createStructure(): void {
    this.container.innerHTML = `
      <div class="thinkt-project-timeline-header">
        <span class="thinkt-project-timeline-title">📊 ${i18n._('Project Timeline')}</span>
        <button class="thinkt-project-timeline-close" title="${i18n._('Close')}">×</button>
      </div>
    `;

    this.contentContainer.className = 'thinkt-project-timeline-content';
    this.container.appendChild(this.contentContainer);

    // Close button
    const closeBtn = this.container.querySelector('.thinkt-project-timeline-close');
    closeBtn?.addEventListener('click', () => this.hide());

    // Legend
    const legend = document.createElement('div');
    legend.className = 'thinkt-project-timeline-legend';
    legend.innerHTML = `
      <div class="thinkt-project-timeline-legend-item">
        <span class="thinkt-project-timeline-legend-start"></span>
        <span>${i18n._('Start')}</span>
      </div>
      <div class="thinkt-project-timeline-legend-item">
        <span class="thinkt-project-timeline-legend-end"></span>
        <span>${i18n._('End')}</span>
      </div>
      <div class="thinkt-project-timeline-legend-item">
        <span class="thinkt-project-timeline-legend-line"></span>
        <span>${i18n._('Session duration')}</span>
      </div>
    `;
    this.container.appendChild(legend);
  }

  // ============================================
  // Data Loading
  // ============================================

  async loadSessions(projectId: string, source?: string, force = false): Promise<void> {
    const normalizedSource = source?.trim().toLowerCase() || undefined;
    const projectKey = `${normalizedSource ?? ''}::${projectId}`;

    // Use cached data if same project and not forced
    if (!force && this.cachedProjectKey === projectKey && this.sessions.length > 0) {
      this.render();
      return;
    }

    this.loadController?.abort();
    const controller = new AbortController();
    this.loadController = controller;

    this.options.projectId = projectId;
    this.options.projectSource = normalizedSource;
    this.cachedProjectKey = projectKey;
    this.showLoading();

    try {
      // Limit to recent sessions to avoid overwhelming the UI
      const sessions = await this.client.getSessions(projectId, this.options.projectSource, controller.signal);
      if (controller.signal.aborted) return;

      // Process sessions with timing info
      this.sessions = sessions
        .filter(s => s.createdAt && s.modifiedAt)
        .map(session => {
          const startTime = session.createdAt instanceof Date
            ? session.createdAt
            : new Date(session.createdAt!);
          const endTime = session.modifiedAt instanceof Date
            ? session.modifiedAt
            : new Date(session.modifiedAt!);

          return {
            session,
            source: session.source || 'unknown',
            startTime,
            endTime,
            duration: (endTime.getTime() - startTime.getTime()) / (1000 * 60), // minutes
          };
        })
        .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

      this.processRows();
      this.render();
    } catch (error) {
      if (controller.signal.aborted) return;
      const err = error instanceof Error ? error : new Error(String(error));
      this.showError(err);
      this.options.onError?.(err);
    } finally {
      if (this.loadController === controller) {
        this.loadController = null;
      }
    }
  }

  private processRows(): void {
    const sourceGroups = new Map<string, SessionWithTiming[]>();

    // Group by source
    for (const session of this.sessions) {
      if (!sourceGroups.has(session.source)) {
        sourceGroups.set(session.source, []);
      }
      sourceGroups.get(session.source)!.push(session);
    }

    // Create rows with colors
    const sourceColors: Record<string, string> = {
      claude: '#d97750',
      kimi: '#19c39b',
      gemini: '#6366f1',
      copilot: '#0078d4',
      thinkt: '#888888',
    };

    this.rows = Array.from(sourceGroups.entries()).map(([source, sessions]) => ({
      source,
      color: sourceColors[source.toLowerCase()] || '#6366f1',
      sessions: sessions.sort((a, b) => a.startTime.getTime() - b.startTime.getTime()),
    }));

    // Sort sources: claude, kimi, gemini, others
    const sourceOrder = { claude: 0, kimi: 1, gemini: 2, copilot: 3, thinkt: 4 };
    this.rows.sort((a, b) => 
      (sourceOrder[a.source as keyof typeof sourceOrder] ?? 99) - 
      (sourceOrder[b.source as keyof typeof sourceOrder] ?? 99)
    );
  }

  // ============================================
  // Rendering
  // ============================================

  private render(): void {
    if (this.sessions.length === 0) {
      this.showEmpty();
      return;
    }

    this.contentContainer.replaceChildren();

    // Calculate dimensions
    const width = Math.max(400, this.contentContainer.clientWidth);
    const height = this.padding.top + this.rows.length * this.rowHeight + this.padding.bottom;

    // Create SVG
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('class', 'thinkt-project-timeline-svg');
    this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    this.svg.style.height = `${height}px`;

    // Time scale
    const timeRange = this.getTimeRange();
    const timeScale = (time: Date) => {
      const pct = (time.getTime() - timeRange.start.getTime()) / 
        (timeRange.end.getTime() - timeRange.start.getTime());
      return this.padding.left + pct * (width - this.padding.left - this.padding.right);
    };

    // Draw time axis
    this.drawTimeAxis(width, timeRange, timeScale);

    // Draw rows
    this.rows.forEach((row, index) => {
      this.drawRow(row, index, width, timeScale);
    });

    this.contentContainer.appendChild(this.svg);
  }

  private getTimeRange(): { start: Date; end: Date } {
    const times = this.sessions.flatMap(s => [s.startTime.getTime(), s.endTime.getTime()]);
    const min = Math.min(...times);
    const max = Math.max(...times);
    
    // Add padding (10% on each side)
    const padding = (max - min) * 0.1 || 60000; // 1 minute default
    return {
      start: new Date(min - padding),
      end: new Date(max + padding),
    };
  }

  private drawTimeAxis(
    width: number,
    timeRange: { start: Date; end: Date },
    timeScale: (time: Date) => number
  ): void {
    const axisGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    axisGroup.setAttribute('class', 'thinkt-project-timeline-axis');

    const y = this.padding.top - 10;

    // Axis line
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', String(this.padding.left));
    line.setAttribute('y1', String(y));
    line.setAttribute('x2', String(width - this.padding.right));
    line.setAttribute('y2', String(y));
    line.setAttribute('stroke', 'var(--thinkt-border-color, #333)');
    axisGroup.appendChild(line);

    // Time labels (5 ticks)
    const labelCount = 5;
    for (let i = 0; i <= labelCount; i++) {
      const t = new Date(timeRange.start.getTime() + 
        (timeRange.end.getTime() - timeRange.start.getTime()) * (i / labelCount));
      const x = timeScale(t);
      
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', String(x));
      text.setAttribute('y', String(y - 5));
      text.setAttribute('fill', 'var(--thinkt-muted-color, #666)');
      text.setAttribute('font-size', '9');
      text.setAttribute('text-anchor', i === 0 ? 'start' : i === labelCount ? 'end' : 'middle');
      text.textContent = this.formatTime(t);
      axisGroup.appendChild(text);

      // Tick mark
      const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      tick.setAttribute('x1', String(x));
      tick.setAttribute('y1', String(y));
      tick.setAttribute('x2', String(x));
      tick.setAttribute('y2', String(y + 4));
      tick.setAttribute('stroke', 'var(--thinkt-border-color, #333)');
      axisGroup.appendChild(tick);
    }

    this.svg!.appendChild(axisGroup);
  }

  private drawRow(
    row: SourceRow,
    index: number,
    _width: number,
    timeScale: (time: Date) => number
  ): void {
    const y = this.padding.top + index * this.rowHeight + this.rowHeight / 2;

    const rowGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    rowGroup.setAttribute('class', 'thinkt-project-timeline-row');

    // Row label (source name)
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', '10');
    label.setAttribute('y', String(y + 4));
    label.setAttribute('fill', 'var(--thinkt-text-secondary, #94a3b8)');
    label.setAttribute('font-size', '11');
    label.setAttribute('font-weight', '500');
    label.setAttribute('text-anchor', 'start');
    label.textContent = row.source.charAt(0).toUpperCase() + row.source.slice(1);
    rowGroup.appendChild(label);

    // Draw sessions
    for (const session of row.sessions) {
      const startX = timeScale(session.startTime);
      const endX = timeScale(session.endTime);
      const isInstant = Math.abs(endX - startX) < 4;

      // Duration line (if session has duration)
      if (!isInstant) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', String(startX));
        line.setAttribute('y1', String(y));
        line.setAttribute('x2', String(endX));
        line.setAttribute('y2', String(y));
        line.setAttribute('stroke', row.color);
        line.setAttribute('stroke-width', '2');
        line.setAttribute('opacity', '0.4');
        rowGroup.appendChild(line);
      }

      // Start bubble (hollow)
      const startCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      startCircle.setAttribute('cx', String(startX));
      startCircle.setAttribute('cy', String(y));
      startCircle.setAttribute('r', String(this.blobRadius));
      startCircle.setAttribute('fill', 'var(--thinkt-bg-secondary, #141414)');
      startCircle.setAttribute('stroke', row.color);
      startCircle.setAttribute('stroke-width', '2');
      startCircle.setAttribute('cursor', 'pointer');
      this.attachInteraction(startCircle, session, 'start');
      rowGroup.appendChild(startCircle);

      // End bubble (filled) - only if session has duration
      if (!isInstant) {
        const endCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        endCircle.setAttribute('cx', String(endX));
        endCircle.setAttribute('cy', String(y));
        endCircle.setAttribute('r', String(this.blobRadius));
        endCircle.setAttribute('fill', row.color);
        endCircle.setAttribute('stroke', row.color);
        endCircle.setAttribute('stroke-width', '2');
        endCircle.setAttribute('cursor', 'pointer');
        this.attachInteraction(endCircle, session, 'end');
        rowGroup.appendChild(endCircle);
      }
    }

    this.svg!.appendChild(rowGroup);
  }

  private attachInteraction(
    element: SVGCircleElement,
    session: SessionWithTiming,
    point: 'start' | 'end'
  ): void {
    element.addEventListener('mouseenter', (e) => {
      element.setAttribute('r', String(this.blobRadius + 2));
      this.showTooltip(e, session, point);
    });

    element.addEventListener('mouseleave', () => {
      element.setAttribute('r', String(this.blobRadius));
      this.hideTooltip();
    });

    element.addEventListener('click', () => {
      this.options.onSessionSelect?.(session.session);
    });
  }

  private showTooltip(
    event: Event,
    session: SessionWithTiming,
    point: 'start' | 'end'
  ): void {
    if (!this.tooltip) return;

    const title = session.session.firstPrompt
      ? session.session.firstPrompt.slice(0, 80) + (session.session.firstPrompt.length > 80 ? '...' : '')
      : session.session.id?.slice(0, 8) || i18n._('Unknown');

    const timeLabel = point === 'start' ? i18n._('Started') : i18n._('Ended');
    const time = point === 'start' ? session.startTime : session.endTime;

    this.tooltip.innerHTML = `
      <div class="thinkt-project-timeline-tooltip-title">${this.escapeHtml(title)}</div>
      <div class="thinkt-project-timeline-tooltip-meta">
        <span>${timeLabel}: ${time.toLocaleString()}</span>
        <span class="thinkt-project-timeline-tooltip-duration">
          ${i18n._('Duration: {duration}', { duration: this.formatDuration(session.duration) })}
        </span>
        <span>${i18n._('Source: {source}', { source: session.source })}</span>
      </div>
    `;

    this.tooltip.style.display = 'block';

    const rect = (event.target as SVGElement).getBoundingClientRect();
    this.tooltip.style.left = `${rect.left}px`;
    this.tooltip.style.top = `${rect.bottom + 8}px`;
  }

  private hideTooltip(): void {
    if (this.tooltip) {
      this.tooltip.style.display = 'none';
    }
  }

  private formatTime(date: Date): string {
    return date.toLocaleTimeString(undefined, { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false,
    });
  }

  private formatDuration(minutes: number): string {
    if (minutes < 1) return i18n._('< 1 min');
    if (minutes < 60) return i18n._('{count} min', { count: Math.round(minutes) });
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return i18n._('{hours}h {mins}m', { hours, mins });
  }

  // ============================================
  // State Views
  // ============================================

  private showLoading(): void {
    this.contentContainer.innerHTML = `
      <div class="thinkt-project-timeline-loading">${i18n._('Loading timeline...')}</div>
    `;
  }

  private showEmpty(): void {
    this.contentContainer.innerHTML = `
      <div class="thinkt-project-timeline-empty">${i18n._('No sessions with timing data')}</div>
    `;
  }

  private showError(error: Error): void {
    this.contentContainer.innerHTML = `
      <div class="thinkt-project-timeline-error">${i18n._('Error: {message}', { message: this.escapeHtml(error.message) })}</div>
    `;
  }

  // ============================================
  // Utilities
  // ============================================

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ============================================
  // Public API
  // ============================================

  show(): void {
    const wasVisible = this.isVisible;
    this.isVisible = true;
    this.container.style.display = 'flex';
    if (!wasVisible) {
      this.options.onVisibilityChange?.(true);
    }
    if (this.options.projectId) {
      // Don't force reload - use cache if available
      void this.loadSessions(this.options.projectId, this.options.projectSource, false);
    }
  }

  hide(): void {
    const wasVisible = this.isVisible;
    this.isVisible = false;
    this.container.style.display = 'none';
    if (wasVisible) {
      this.options.onVisibilityChange?.(false);
    }
  }

  isShown(): boolean {
    return this.isVisible;
  }

  setProject(projectId: string, source?: string): void {
    const normalizedSource = source?.trim().toLowerCase() || undefined;
    const isNewProject = this.options.projectId !== projectId || this.options.projectSource !== normalizedSource;
    this.options.projectId = projectId;
    this.options.projectSource = normalizedSource;
    if (this.isVisible) {
      // Only force reload if project changed
      void this.loadSessions(projectId, this.options.projectSource, isNewProject);
    }
  }

  /**
   * Force refresh the timeline data
   */
  refresh(): void {
    if (this.options.projectId && this.isVisible) {
      void this.loadSessions(this.options.projectId, this.options.projectSource, true);
    }
  }

  /**
   * Re-render translatable UI text in place when locale changes.
   */
  refreshI18n(): void {
    this.createStructure();
    this.render();
  }

  dispose(): void {
    this.abortController.abort();
    this.loadController?.abort();

    if (this.tooltip) {
      this.tooltip.remove();
      this.tooltip = null;
    }
    this.container.replaceChildren();
    this.sessions = [];
    this.rows = [];
    this.cachedProjectKey = null;
  }
}