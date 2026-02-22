/**
 * TimelineVisualization Component
 *
 * A visual timeline showing conversation sessions over time.
 * Uses one scroll surface with floating project labels anchored to the
 * left side of the viewport.
 */

import type { SessionMeta } from '@wethinkt/ts-thinkt';
import { type ThinktClient, getDefaultClient } from '@wethinkt/ts-thinkt/api';
import { i18n } from '@lingui/core';

// ============================================
// Types
// ============================================

export interface TimelineVisualizationElements {
  /** Container element */
  container: HTMLElement;
}

export interface TimelineVisualizationOptions {
  elements: TimelineVisualizationElements;
  /** API client instance (defaults to getDefaultClient()) */
  client?: ThinktClient;
  /** Callback when a session is selected */
  onSessionSelect?: (session: SessionMeta) => void;
  /** Callback when a project label is selected */
  onProjectSelect?: (project: TimelineProjectSelection) => void;
  /** Callback when sources are discovered from loaded sessions */
  onSourcesDiscovered?: (sources: string[]) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Grouping mode: 'project' | 'source' */
  groupBy?: 'project' | 'source';
  /** Include projects whose paths no longer exist */
  includeDeletedProjects?: boolean;
}

export interface TimelineProjectSelection {
  projectId: string;
  projectName: string;
  projectPath: string | null;
  projectSource?: string;
}

interface TimelineSession {
  session: SessionMeta;
  projectId: string;
  projectName: string;
  projectPath: string | null;
  source: string;
  timestamp: Date;
}

interface TimelineSourceInfo {
  name: string;
  basePath: string;
}

interface TimelineRow {
  projectId: string | null;
  projectPath: string | null;
  projectSource: string | null;
  label: string;
  sessions: TimelineSession[];
  color: string;
}

interface TimelineLayout {
  timeRange: { start: Date; end: Date };
  totalDuration: number;
  timelineStartX: number;
  pxPerMs: number;
  latestX: number;
  chartWidth: number;
}

interface VerticalTimelineLayout {
  timeRange: { start: Date; end: Date };
  totalDuration: number;
  timelineStartY: number;
  pxPerMs: number;
  latestY: number;
  chartWidth: number;
  chartHeight: number;
  timelineStartX: number;
  columnWidth: number;
  columnGap: number;
}

type ZoomPreset = '1d' | '1w' | 'all';

const ZOOM_PRESETS: Array<{ id: ZoomPreset; label: string }> = [
  { id: '1d', label: '1d' },
  { id: '1w', label: '1w' },
  { id: 'all', label: 'All' },
];

const SOURCE_COLORS: Record<string, string> = {
  claude: '#d97750',
  kimi: '#19c39b',
  gemini: '#6366f1',
  copilot: '#0078d4',
  thinkt: '#888888',
};

// ============================================
// Styles
// ============================================

const TIMELINE_STYLES = `
.thinkt-timeline {
  display: flex;
  flex-direction: column;
  height: 100%;
  font-family: var(--thinkt-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
  color: var(--thinkt-text-color, #e0e0e0);
  background: var(--thinkt-bg-color, #1a1a1a);
  overflow: hidden;
}

.thinkt-timeline-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--thinkt-border-color, #333);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.thinkt-timeline-title {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--thinkt-muted-color, #888);
}

.thinkt-timeline-controls {
  display: flex;
  gap: 8px;
  align-items: center;
}

.thinkt-timeline-btn {
  font-size: 11px;
  padding: 4px 10px;
  background: var(--thinkt-bg-tertiary, #252525);
  border: 1px solid var(--thinkt-border-color, #333);
  border-radius: 4px;
  color: var(--thinkt-text-secondary, #a0a0a0);
  cursor: pointer;
  transition: all 0.15s ease;
}

.thinkt-timeline-btn:hover {
  background: var(--thinkt-hover-bg, #333);
}

.thinkt-timeline-btn.active {
  background: var(--thinkt-accent-color, #6366f1);
  border-color: var(--thinkt-accent-color, #6366f1);
  color: white;
}

.thinkt-timeline-zoom {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: 6px;
  padding-left: 8px;
  border-left: 1px solid var(--thinkt-border-color, #333);
}

.thinkt-timeline-zoom-preset {
  font-size: 10px;
  padding: 3px 6px;
  min-width: 30px;
  background: var(--thinkt-bg-tertiary, #252525);
  border: 1px solid var(--thinkt-border-color, #333);
  border-radius: 3px;
  color: var(--thinkt-text-secondary, #a0a0a0);
  cursor: pointer;
}

.thinkt-timeline-zoom-preset:hover {
  background: var(--thinkt-hover-bg, #333);
}

.thinkt-timeline-scroll:focus-visible {
  outline: 1px solid var(--thinkt-accent-color, #6366f1);
  outline-offset: -1px;
}

.thinkt-timeline-scroll {
  position: absolute;
  inset: 0;
  overflow: auto;
}

.thinkt-timeline-viewport {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.thinkt-timeline-chart-content {
  position: relative;
  min-height: 100%;
}

.thinkt-timeline-time-axis {
  position: sticky;
  top: 0;
  height: 30px;
  background: transparent;
  border-bottom: 1px solid var(--thinkt-border-color, #333);
  z-index: 20;
}

.thinkt-timeline-time-label {
  position: absolute;
  top: 8px;
  font-size: 10px;
  color: var(--thinkt-muted-color, #666);
  transform: translateX(-50%);
  white-space: nowrap;
}

.thinkt-timeline-source-content {
  min-width: 100%;
  min-height: 100%;
}

.thinkt-timeline-source-header {
  position: sticky;
  top: 0;
  height: 30px;
  border-bottom: 1px solid var(--thinkt-border-color, #333);
  background: var(--thinkt-bg-color, #1a1a1a);
  z-index: 20;
}

.thinkt-timeline-source-axis-corner {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  border-right: 1px solid var(--thinkt-border-color, #2a2a2a);
}

.thinkt-timeline-source-header-label {
  position: absolute;
  top: 8px;
  transform: translateX(-50%);
  font-size: 11px;
  font-weight: 600;
  color: var(--thinkt-text-secondary, #a0a0a0);
  white-space: nowrap;
}

.thinkt-timeline-source-time-label {
  position: absolute;
  left: 8px;
  transform: translateY(-50%);
  font-size: 10px;
  color: var(--thinkt-muted-color, #666);
  white-space: nowrap;
  pointer-events: none;
}

.thinkt-timeline-source-svg {
  display: block;
}

.thinkt-timeline-chart-row {
  height: 50px;
  border-bottom: 1px solid var(--thinkt-border-color, #222);
  position: relative;
}

.thinkt-timeline-chart-svg {
  display: block;
  height: 100%;
}

/* Floating labels: fixed X, synced Y with scroll position */
.thinkt-timeline-label-overlay {
  position: absolute;
  left: 0;
  right: auto;
  top: 0;
  bottom: 0;
  width: 140px;
  overflow: hidden;
  pointer-events: none;
  z-index: 30;
}

.thinkt-timeline-label-track {
  position: absolute;
  left: 0;
  right: 0;
  top: 30px;
  will-change: transform;
}

.thinkt-timeline-label-item {
  position: absolute;
  left: 10px;
  right: 8px;
  height: 50px;
  display: flex;
  align-items: flex-start;
  padding-top: 7px;
  font-size: 11px;
  font-weight: 500;
  line-height: 1.1;
  color: var(--thinkt-text-secondary, #a0a0a0);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  background: transparent;
}

.thinkt-timeline-label-item.clickable {
  pointer-events: auto;
  cursor: pointer;
}

.thinkt-timeline-label-item.clickable:hover {
  color: var(--thinkt-text-color, #e0e0e0);
}

.thinkt-timeline-tooltip {
  position: absolute;
  background: var(--thinkt-bg-secondary, #1a1a1a);
  border: 1px solid var(--thinkt-border-color, #333);
  border-radius: 6px;
  padding: 10px 12px;
  font-size: 12px;
  pointer-events: none;
  z-index: 100;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  max-width: 280px;
}

.thinkt-timeline-tooltip-title {
  font-weight: 500;
  color: var(--thinkt-text-primary, #f0f0f0);
  margin-bottom: 4px;
  line-height: 1.3;
}

.thinkt-timeline-tooltip-meta {
  color: var(--thinkt-muted-color, #888);
  font-size: 11px;
}

.thinkt-timeline-empty,
.thinkt-timeline-loading,
.thinkt-timeline-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--thinkt-muted-color, #666);
  text-align: center;
  padding: 48px;
}
`;

// ============================================
// Component Class
// ============================================

export class TimelineVisualization {
  private options: TimelineVisualizationOptions;
  private client: ThinktClient;
  private container: HTMLElement;
  private viewport: HTMLElement;
  private scrollArea: HTMLElement;
  private labelOverlay: HTMLElement;
  private labelTrack: HTMLElement;
  private allSessions: TimelineSession[] = [];
  private sessions: TimelineSession[] = [];
  private rows: TimelineRow[] = [];
  private sourceInfos: TimelineSourceInfo[] = [];
  private searchQuery = '';
  private sourceFilters: Set<string> | null = null;
  private includeDeletedProjects = false;
  private tooltip: HTMLElement | null = null;
  private isLoading = false;
  private stylesInjected = false;
  private groupBy: 'project' | 'source' = 'project';
  private disposed = false;
  private rafScrollSync = 0;
  private hasInitialAlignment = false;
  private hasUserNavigated = false;
  private autoFollowUntilMs = 0;
  private expectedScrollLeft: number | null = null;
  private expectedScrollTop: number | null = null;
  private suppressUserNavigationDetection = false;
  private pendingZoomAnchor:
    | { timeMs: number; viewportCoord: number; axis: 'x' | 'y' }
    | null = null;

  private readonly rowHeight = 50;
  private readonly blobRadius = 6;
  private readonly labelWidth = 140;
  private readonly labelPadding = 16;
  private readonly timeAxisHeight = 30;
  private readonly minChartWidth = 640;
  private readonly minChartHeight = 480;
  private readonly rightPadding = 32;
  private readonly sourceAxisWidth = 64;
  private readonly sourceColumnWidth = 96;
  private readonly sourceColumnGap = 8;
  private readonly defaultMsPerPixel = 7 * 60 * 1000; // 7 min per px
  private readonly minMsPerPixel = 30 * 1000; // 30 sec / px
  private readonly maxMsPerPixel = 24 * 60 * 60 * 1000; // 1 day / px
  private readonly maxConcurrentSessionFetches = 6;
  private readonly progressiveCommitDelayMs = 80;
  private readonly autoFollowGraceMs = 3000;
  private readonly userScrollEpsilonPx = 6;
  private zoomMsPerPixel = this.defaultMsPerPixel;

  constructor(options: TimelineVisualizationOptions) {
    this.options = options;
    this.client = options.client ?? getDefaultClient();
    this.groupBy = options.groupBy ?? 'project';
    this.includeDeletedProjects = options.includeDeletedProjects ?? false;
    this.container = options.elements.container;
    this.viewport = document.createElement('div');
    this.scrollArea = document.createElement('div');
    this.labelOverlay = document.createElement('div');
    this.labelTrack = document.createElement('div');
    this.init();
  }

  private init(): void {
    this.injectStyles();
    this.createStructure();
    void this.loadData();
  }

  private injectStyles(): void {
    if (this.stylesInjected) return;

    const styleId = 'thinkt-timeline-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = TIMELINE_STYLES;
      document.head.appendChild(style);
    }
    this.stylesInjected = true;
  }

  private createStructure(): void {
    this.container.className = 'thinkt-timeline';
    this.container.innerHTML = `
      <div class="thinkt-timeline-header">
        <span class="thinkt-timeline-title">${i18n._('Timeline')}</span>
        <div class="thinkt-timeline-controls">
          <button class="thinkt-timeline-btn ${this.groupBy === 'project' ? 'active' : ''}" data-group="project">${i18n._('By Project')}</button>
          <button class="thinkt-timeline-btn ${this.groupBy === 'source' ? 'active' : ''}" data-group="source">${i18n._('By Source')}</button>
          <div class="thinkt-timeline-zoom">
            ${ZOOM_PRESETS.map((preset) => `<button class="thinkt-timeline-zoom-preset" data-zoom-preset="${preset.id}">${preset.label}</button>`).join('')}
          </div>
        </div>
      </div>
    `;

    this.viewport.className = 'thinkt-timeline-viewport';
    this.container.appendChild(this.viewport);

    this.scrollArea.className = 'thinkt-timeline-scroll';
    this.scrollArea.tabIndex = 0;
    this.scrollArea.addEventListener('scroll', this.handleScroll);
    this.scrollArea.addEventListener('wheel', this.handleWheel, { passive: false });
    this.scrollArea.addEventListener('keydown', this.handleKeyDown);
    this.viewport.appendChild(this.scrollArea);

    this.labelOverlay.className = 'thinkt-timeline-label-overlay';
    this.labelTrack.className = 'thinkt-timeline-label-track';
    this.labelTrack.style.top = `${this.timeAxisHeight}px`;
    this.labelOverlay.appendChild(this.labelTrack);
    this.viewport.appendChild(this.labelOverlay);

    const buttons = this.container.querySelectorAll('.thinkt-timeline-btn');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const group = (btn as HTMLElement).dataset.group as 'project' | 'source';
        this.setGroupBy(group);
        buttons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    const presetButtons = this.container.querySelectorAll('.thinkt-timeline-zoom-preset');
    presetButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const preset = (btn as HTMLButtonElement).dataset.zoomPreset as ZoomPreset;
        this.applyZoomPreset(preset);
      });
    });

    this.tooltip = document.createElement('div');
    this.tooltip.className = 'thinkt-timeline-tooltip';
    this.tooltip.style.display = 'none';
    document.body.appendChild(this.tooltip);

    this.showLoading();
  }

  private handleScroll = (): void => {
    if (!this.hasUserNavigated && !this.suppressUserNavigationDetection) {
      const expectedLeft = this.expectedScrollLeft;
      const expectedTop = this.expectedScrollTop;
      const leftDiff = expectedLeft === null
        ? 0
        : Math.abs(this.scrollArea.scrollLeft - expectedLeft);
      const topDiff = expectedTop === null
        ? 0
        : Math.abs(this.scrollArea.scrollTop - expectedTop);
      if (leftDiff > this.userScrollEpsilonPx || topDiff > this.userScrollEpsilonPx) {
        this.markUserNavigated();
      }
    }

    if (this.groupBy !== 'project') return;
    if (this.rafScrollSync !== 0) return;
    this.rafScrollSync = window.requestAnimationFrame(() => {
      this.rafScrollSync = 0;
      this.updateLabelTrackPosition();
    });
  };

  private markUserNavigated(): void {
    this.hasUserNavigated = true;
    this.autoFollowUntilMs = 0;
    this.expectedScrollLeft = null;
    this.expectedScrollTop = null;
    this.suppressUserNavigationDetection = false;
  }

  private beginProgrammaticAlignment(): void {
    this.suppressUserNavigationDetection = true;
    this.expectedScrollLeft = null;
    this.expectedScrollTop = null;
  }

  private endProgrammaticAlignment(): void {
    this.suppressUserNavigationDetection = false;
  }

  private updateLabelTrackPosition(): void {
    if (this.groupBy !== 'project') return;
    const top = this.scrollArea.scrollTop;
    this.labelTrack.style.transform = `translateY(${-top}px)`;
  }

  private handleWheel = (event: WheelEvent): void => {
    if (!(event.ctrlKey || event.metaKey)) return;
    this.markUserNavigated();
    event.preventDefault();

    const factor = Math.exp(event.deltaY * 0.0015);
    const nextZoom = this.clampZoom(this.zoomMsPerPixel * factor);
    const rect = this.scrollArea.getBoundingClientRect();
    const viewportCoord = this.groupBy === 'project'
      ? event.clientX - rect.left
      : event.clientY - rect.top;
    this.setZoom(nextZoom, viewportCoord);
  };

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (this.isEditableTarget(event.target)) return;

    if ([
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'PageUp',
      'PageDown',
      'Home',
      'End',
      ' ',
    ].includes(event.key)) {
      this.markUserNavigated();
    }

    const viewportCenterCoord = this.groupBy === 'project'
      ? this.scrollArea.clientWidth / 2
      : this.scrollArea.clientHeight / 2;
    if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      this.setZoom(this.zoomMsPerPixel * 0.85, viewportCenterCoord);
      return;
    }

    if (event.key === '-' || event.key === '_') {
      event.preventDefault();
      this.setZoom(this.zoomMsPerPixel * 1.15, viewportCenterCoord);
      return;
    }

    if (event.key === '0') {
      event.preventDefault();
      this.setZoom(this.defaultMsPerPixel, viewportCenterCoord);
    }
  };

  private isEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || target.isContentEditable;
  }

  private clampZoom(msPerPixel: number): number {
    return Math.min(this.maxMsPerPixel, Math.max(this.minMsPerPixel, msPerPixel));
  }

  private applyZoomPreset(preset: ZoomPreset): void {
    if (this.sessions.length === 0) return;

    const viewportTimelinePx = this.groupBy === 'project'
      ? Math.max(
        200,
        this.scrollArea.clientWidth - this.labelWidth - this.labelPadding - this.rightPadding,
      )
      : Math.max(
        200,
        this.scrollArea.clientHeight - this.timeAxisHeight - this.rightPadding,
      );

    let targetZoom = this.zoomMsPerPixel;
    switch (preset) {
      case '1d':
        targetZoom = (24 * 60 * 60 * 1000) / viewportTimelinePx;
        break;
      case '1w':
        targetZoom = (7 * 24 * 60 * 60 * 1000) / viewportTimelinePx;
        break;
      case 'all': {
        const timeRange = this.getTimeRange();
        const totalDuration = Math.max(1, timeRange.end.getTime() - timeRange.start.getTime());
        targetZoom = totalDuration / viewportTimelinePx;
        break;
      }
    }

    const viewportCoord = this.groupBy === 'project'
      ? this.scrollArea.clientWidth / 2
      : this.scrollArea.clientHeight / 2;
    this.setZoom(targetZoom, viewportCoord);
  }

  private setZoom(msPerPixel: number, viewportCoord: number): void {
    if (this.sessions.length === 0) return;
    const nextZoom = this.clampZoom(msPerPixel);
    if (Math.abs(nextZoom - this.zoomMsPerPixel) < 0.0001) return;
    this.markUserNavigated();

    if (this.groupBy === 'project') {
      const layout = this.computeLayout(this.zoomMsPerPixel);
      const anchorTime = this.getTimeAtViewportX(layout, viewportCoord);
      this.pendingZoomAnchor = { timeMs: anchorTime, viewportCoord, axis: 'x' };
    } else {
      const layout = this.computeVerticalLayout(this.zoomMsPerPixel);
      const anchorTime = this.getTimeAtViewportY(layout, viewportCoord);
      this.pendingZoomAnchor = { timeMs: anchorTime, viewportCoord, axis: 'y' };
    }
    this.zoomMsPerPixel = nextZoom;
    this.render();
  }

  private getTimeAtViewportX(layout: TimelineLayout, viewportX: number): number {
    const contentX = this.scrollArea.scrollLeft + viewportX;
    const timelineX = contentX - layout.timelineStartX;
    const elapsed = timelineX / layout.pxPerMs;
    const clampedElapsed = Math.min(layout.totalDuration, Math.max(0, elapsed));
    return layout.timeRange.start.getTime() + clampedElapsed;
  }

  private getTimeAtViewportY(layout: VerticalTimelineLayout, viewportY: number): number {
    const contentY = this.scrollArea.scrollTop + viewportY;
    const timelineY = contentY - layout.timelineStartY;
    const elapsed = timelineY / layout.pxPerMs;
    const clampedElapsed = Math.min(layout.totalDuration, Math.max(0, elapsed));
    return layout.timeRange.end.getTime() - clampedElapsed;
  }

  private computeLayout(msPerPixel: number): TimelineLayout {
    const timeRange = this.getTimeRange();
    const totalDuration = Math.max(1, timeRange.end.getTime() - timeRange.start.getTime());

    const viewportWidth = this.scrollArea.clientWidth || this.minChartWidth;
    const timelineWidth = Math.max(this.minChartWidth, Math.ceil(totalDuration / msPerPixel));
    const timelineStartX = this.labelWidth + this.labelPadding;
    const pxPerMs = timelineWidth / totalDuration;
    const latestX = timelineStartX + timelineWidth;
    const chartWidth = Math.max(
      viewportWidth + this.rightPadding,
      Math.ceil(latestX + this.rightPadding),
    );

    return {
      timeRange,
      totalDuration,
      timelineStartX,
      pxPerMs,
      latestX,
      chartWidth,
    };
  }

  private computeVerticalLayout(msPerPixel: number): VerticalTimelineLayout {
    const timeRange = this.getTimeRange();
    const totalDuration = Math.max(1, timeRange.end.getTime() - timeRange.start.getTime());

    const viewportWidth = this.scrollArea.clientWidth || this.minChartWidth;
    const viewportHeight = this.scrollArea.clientHeight || this.minChartHeight;
    const timelineHeight = Math.max(this.minChartHeight, Math.ceil(totalDuration / msPerPixel));
    const timelineStartY = this.timeAxisHeight + 10;
    const pxPerMs = timelineHeight / totalDuration;
    const latestY = timelineStartY + totalDuration * pxPerMs;

    const columnCount = Math.max(1, this.rows.length);
    const columnsWidth = (columnCount * this.sourceColumnWidth)
      + (Math.max(0, columnCount - 1) * this.sourceColumnGap);
    const timelineStartX = this.sourceAxisWidth;
    const chartWidth = Math.max(
      viewportWidth + this.rightPadding,
      timelineStartX + columnsWidth + this.rightPadding,
    );
    const chartHeight = Math.max(
      viewportHeight + this.rightPadding,
      Math.ceil(latestY + this.rightPadding),
    );

    return {
      timeRange,
      totalDuration,
      timelineStartY,
      pxPerMs,
      latestY,
      chartWidth,
      chartHeight,
      timelineStartX,
      columnWidth: this.sourceColumnWidth,
      columnGap: this.sourceColumnGap,
    };
  }

  private normalizePath(value: string): string {
    return value.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
  }

  private toTimestampMs(date: Date): number {
    const time = date.getTime();
    return Number.isFinite(time) ? time : 0;
  }

  private inferSourceFromPath(pathValue: string): string | null {
    const normalized = this.normalizePath(pathValue);
    const hiddenSourceMatch = normalized.match(/\/\.([a-z0-9_-]+)(?:\/|$)/);
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

    let bestMatch: TimelineSourceInfo | null = null;
    for (const sourceInfo of this.sourceInfos) {
      const basePath = sourceInfo.basePath;
      if (!basePath) continue;
      const isMatch = normalizedPaths.some((pathValue) =>
        pathValue === basePath || pathValue.startsWith(`${basePath}/`));
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
      if (inferred) {
        return inferred;
      }
    }

    return null;
  }

  private resolveSource(
    session: SessionMeta,
    project: { path?: string | null; source?: string | null; sourceBasePath?: string | null },
  ): string {
    const pathSource = this.detectSourceFromPaths([
      session.fullPath,
      session.projectPath,
      project.path ?? null,
      project.sourceBasePath ?? null,
    ]);
    if (pathSource) {
      return pathSource;
    }

    const direct = (session.source || project.source || '').toString().trim().toLowerCase();
    return direct || 'unknown';
  }

  private async loadSourceInfos(): Promise<void> {
    try {
      const sourceInfos = await this.client.getSources();
      this.sourceInfos = sourceInfos
        .map((sourceInfo) => {
          const name = (sourceInfo.name ?? '').toString().trim().toLowerCase();
          const rawBasePath = 'base_path' in sourceInfo
            ? sourceInfo.base_path
            : ('basePath' in sourceInfo ? sourceInfo.basePath : '');
          const basePath = typeof rawBasePath === 'string' && rawBasePath.trim().length > 0
            ? this.normalizePath(rawBasePath)
            : '';
          return { name, basePath };
        })
        .filter((sourceInfo) => sourceInfo.name.length > 0);
    } catch {
      this.sourceInfos = [];
    }
  }

  private async loadData(): Promise<void> {
    if (this.isLoading || this.disposed) return;
    this.isLoading = true;
    this.autoFollowUntilMs = Date.now() + this.autoFollowGraceMs;
    this.showLoading();

    let progressiveCommitTimer: number | null = null;

    try {
      const [projects] = await Promise.all([
        this.client.getProjects(undefined, {
          includeDeleted: this.includeDeletedProjects,
        }),
        this.loadSourceInfos(),
      ]);
      const allSessions: TimelineSession[] = [];
      const discoveredSources = new Set<string>();
      let hasPendingCommit = false;
      let hasCommittedInitialBatch = false;

      // Reset current state before progressive repopulation.
      this.allSessions = [];
      this.sessions = [];
      this.rows = [];
      this.hasInitialAlignment = false;
      this.hasUserNavigated = false;
      this.expectedScrollLeft = null;
      this.expectedScrollTop = null;
      this.pendingZoomAnchor = null;

      const commitProgressiveState = (): void => {
        if (this.disposed) return;
        this.allSessions = allSessions;
        this.options.onSourcesDiscovered?.(Array.from(discoveredSources));
        this.applyFilters({ preserveAlignment: true });
      };

      const scheduleProgressiveCommit = (): void => {
        if (this.disposed) return;
        if (!hasCommittedInitialBatch) {
          hasCommittedInitialBatch = true;
          commitProgressiveState();
          return;
        }
        if (hasPendingCommit) return;
        hasPendingCommit = true;
        progressiveCommitTimer = window.setTimeout(() => {
          hasPendingCommit = false;
          progressiveCommitTimer = null;
          commitProgressiveState();
        }, this.progressiveCommitDelayMs);
      };

      const flushProgressiveCommit = (): void => {
        if (progressiveCommitTimer !== null) {
          window.clearTimeout(progressiveCommitTimer);
          progressiveCommitTimer = null;
        }
        hasPendingCommit = false;
        commitProgressiveState();
      };

      const validProjects = projects.filter((project) => Boolean(project.id));
      let projectIndex = 0;
      const workerCount = Math.max(
        1,
        Math.min(this.maxConcurrentSessionFetches, validProjects.length),
      );

      const loadProjectSessions = async (): Promise<void> => {
        while (!this.disposed) {
          const project = validProjects[projectIndex];
          projectIndex += 1;
          if (!project || !project.id) {
            return;
          }

          try {
            const sessions = await this.client.getSessions(project.id, project.source ?? undefined);
            let didAddSessions = false;
            for (const session of sessions) {
              if (!session.modifiedAt) continue;
              const source = this.resolveSource(session, {
                path: project.path ?? null,
                source: project.source ?? null,
                sourceBasePath: project.sourceBasePath ?? null,
              });
              if (source.length > 0) {
                discoveredSources.add(source.trim().toLowerCase());
              }
              allSessions.push({
                session,
                projectId: project.id,
                projectName: project.name || 'Unknown',
                projectPath: project.path ?? null,
                source,
                timestamp: session.modifiedAt instanceof Date
                  ? session.modifiedAt
                  : new Date(session.modifiedAt),
              });
              const timestamp = allSessions[allSessions.length - 1].timestamp;
              if (!Number.isFinite(timestamp.getTime())) {
                allSessions.pop();
                continue;
              }
              didAddSessions = true;
            }

            if (didAddSessions) {
              scheduleProgressiveCommit();
            }
          } catch {
            // Skip failed project session fetches.
          }
        }
      };

      await Promise.all(Array.from({ length: workerCount }, () => loadProjectSessions()));

      allSessions.sort((a, b) => this.toTimestampMs(a.timestamp) - this.toTimestampMs(b.timestamp));
      if (this.disposed) return;
      flushProgressiveCommit();
      this.allSessions = allSessions;
      this.options.onSourcesDiscovered?.(Array.from(discoveredSources));
      this.applyFilters({ preserveAlignment: true, force: true });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.showError(err);
      this.options.onError?.(err);
    } finally {
      if (progressiveCommitTimer !== null) {
        window.clearTimeout(progressiveCommitTimer);
      }
      this.isLoading = false;
    }
  }

  private applyFilters(options?: { preserveAlignment?: boolean; force?: boolean }): void {
    if (!options?.force && this.isLoading && this.allSessions.length === 0) {
      return;
    }

    const query = this.searchQuery.trim();
    const sourceFilters = this.sourceFilters;
    this.sessions = this.allSessions.filter((session) => {
      if (sourceFilters && sourceFilters.size > 0 && !sourceFilters.has(session.source.toLowerCase())) {
        return false;
      }

      if (!query) {
        return true;
      }

      return session.projectName.toLowerCase().includes(query)
        || session.source.toLowerCase().includes(query)
        || (session.projectPath?.toLowerCase().includes(query) ?? false);
    });

    this.processRows();
    if (!options?.preserveAlignment) {
      this.hasInitialAlignment = false;
      this.pendingZoomAnchor = null;
    }
    this.render();
  }

  private shouldAutoFollow(): boolean {
    if (this.hasUserNavigated) return false;
    if (this.isLoading) return true;
    return Date.now() <= this.autoFollowUntilMs;
  }

  private setProgrammaticScrollPosition(axis: 'x' | 'y', value: number): void {
    if (axis === 'x') {
      this.scrollArea.scrollLeft = Math.max(0, value);
      this.expectedScrollLeft = this.scrollArea.scrollLeft;
    } else {
      this.scrollArea.scrollTop = Math.max(0, value);
      this.expectedScrollTop = this.scrollArea.scrollTop;
    }
  }

  private processRows(): void {
    const grouped = new Map<
      string,
      {
        projectId: string | null;
        projectPath: string | null;
        projectSource: string | null;
        label: string;
        sessions: TimelineSession[];
      }
    >();

    for (const session of this.sessions) {
      const key = this.groupBy === 'project'
        ? `project:${session.projectId}`
        : `source:${session.source.toLowerCase()}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          projectId: this.groupBy === 'project' ? session.projectId : null,
          projectPath: this.groupBy === 'project' ? session.projectPath : null,
          projectSource: this.groupBy === 'project' ? session.source : null,
          label: this.groupBy === 'project' ? session.projectName : session.source,
          sessions: [],
        });
      }
      grouped.get(key)?.sessions.push(session);
    }

    this.rows = Array.from(grouped.values()).map((group) => ({
      projectId: group.projectId,
      projectPath: group.projectPath,
      projectSource: group.projectSource,
      label: group.label,
      sessions: group.sessions.sort((a, b) => this.toTimestampMs(a.timestamp) - this.toTimestampMs(b.timestamp)),
      color: this.groupBy === 'source'
        ? this.getSourceColor(group.label)
        : this.getDefaultColor(group.label),
    }));

    this.rows.sort((a, b) => {
      const aLast = a.sessions[a.sessions.length - 1]
        ? this.toTimestampMs(a.sessions[a.sessions.length - 1].timestamp)
        : 0;
      const bLast = b.sessions[b.sessions.length - 1]
        ? this.toTimestampMs(b.sessions[b.sessions.length - 1].timestamp)
        : 0;
      if (bLast !== aLast) {
        return bLast - aLast;
      }
      return a.label.localeCompare(b.label);
    });
  }

  private getSourceColor(source: string): string {
    const key = source.toLowerCase();
    return SOURCE_COLORS[key] || this.getDefaultColor(source);
  }

  private getDefaultColor(label: string): string {
    const colors = [
      '#6366f1', '#d97750', '#19c39b', '#f59e0b', '#ec4899',
      '#8b5cf6', '#06b6d4', '#84cc16', '#f97316', '#ef4444',
    ];
    let hash = 0;
    for (let i = 0; i < label.length; i++) {
      hash = label.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  private render(): void {
    if (this.sessions.length === 0) {
      this.showEmpty();
      return;
    }

    this.scrollArea.innerHTML = '';
    this.labelTrack.innerHTML = '';

    if (this.groupBy === 'source') {
      this.labelOverlay.style.display = 'none';
      this.renderVerticalSourceTimeline();
      return;
    }

    this.labelOverlay.style.display = 'block';
    this.renderHorizontalProjectTimeline();
  }

  private renderHorizontalProjectTimeline(): void {
    const layout = this.computeLayout(this.zoomMsPerPixel);
    const shouldAlignToAnchor = this.pendingZoomAnchor?.axis === 'x';
    const shouldAlignToEdge = !this.hasInitialAlignment || this.shouldAutoFollow();
    const shouldApplyProgrammaticAlignment = shouldAlignToAnchor || shouldAlignToEdge;

    if (shouldApplyProgrammaticAlignment) {
      this.beginProgrammaticAlignment();
    }

    const timeScale = (time: Date): number => {
      const elapsed = time.getTime() - layout.timeRange.start.getTime();
      return layout.timelineStartX + elapsed * layout.pxPerMs;
    };

    const chartContent = document.createElement('div');
    chartContent.className = 'thinkt-timeline-chart-content';
    chartContent.style.width = `${layout.chartWidth}px`;

    const timeAxis = document.createElement('div');
    timeAxis.className = 'thinkt-timeline-time-axis';
    timeAxis.style.height = `${this.timeAxisHeight}px`;
    timeAxis.style.width = `${layout.chartWidth}px`;

    const labelCount = Math.max(4, Math.floor(layout.chartWidth / 220));
    for (let i = 0; i <= labelCount; i++) {
      const t = new Date(
        layout.timeRange.start.getTime()
        + ((layout.timeRange.end.getTime() - layout.timeRange.start.getTime()) * i) / labelCount,
      );
      const label = document.createElement('span');
      label.className = 'thinkt-timeline-time-label';
      label.style.left = `${timeScale(t)}px`;
      label.textContent = this.formatTime(t);
      timeAxis.appendChild(label);
    }
    chartContent.appendChild(timeAxis);

    this.rows.forEach((row) => {
      const rowEl = document.createElement('div');
      rowEl.className = 'thinkt-timeline-chart-row';
      rowEl.style.width = `${layout.chartWidth}px`;

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'thinkt-timeline-chart-svg');
      svg.setAttribute('width', String(layout.chartWidth));
      svg.setAttribute('height', String(this.rowHeight));

      const y = this.rowHeight / 2;

      const gridLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      gridLine.setAttribute('x1', String(layout.timelineStartX));
      gridLine.setAttribute('y1', String(y));
      gridLine.setAttribute('x2', String(layout.latestX));
      gridLine.setAttribute('y2', String(y));
      gridLine.setAttribute('stroke', 'var(--thinkt-border-color, #333)');
      gridLine.setAttribute('stroke-opacity', '0.3');
      svg.appendChild(gridLine);

      for (let i = 0; i < row.sessions.length - 1; i++) {
        const curr = row.sessions[i];
        const next = row.sessions[i + 1];
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', String(timeScale(curr.timestamp)));
        line.setAttribute('y1', String(y));
        line.setAttribute('x2', String(timeScale(next.timestamp)));
        line.setAttribute('y2', String(y));
        line.setAttribute('stroke', row.color);
        line.setAttribute('stroke-width', '2');
        line.setAttribute('opacity', '0.35');
        svg.appendChild(line);
      }

      row.sessions.forEach((session) => {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', String(timeScale(session.timestamp)));
        circle.setAttribute('cy', String(y));
        circle.setAttribute('r', String(this.blobRadius));
        circle.setAttribute('fill', row.color);
        circle.setAttribute('stroke', 'var(--thinkt-bg-color, #1a1a1a)');
        circle.setAttribute('stroke-width', '2');
        circle.setAttribute('cursor', 'pointer');

        circle.addEventListener('mouseenter', (event) => {
          circle.setAttribute('r', String(this.blobRadius + 2));
          this.showTooltip(event, session);
        });
        circle.addEventListener('mouseleave', () => {
          circle.setAttribute('r', String(this.blobRadius));
          this.hideTooltip();
        });
        circle.addEventListener('click', () => {
          this.options.onSessionSelect?.(session.session);
        });

        svg.appendChild(circle);
      });

      rowEl.appendChild(svg);
      chartContent.appendChild(rowEl);
    });

    this.renderLabelOverlay();

    this.scrollArea.appendChild(chartContent);
    this.updateLabelTrackPosition();

    window.requestAnimationFrame(() => {
      if (this.disposed) return;
      try {
        if (this.pendingZoomAnchor?.axis === 'x') {
          const anchorX = layout.timelineStartX
            + (this.pendingZoomAnchor.timeMs - layout.timeRange.start.getTime()) * layout.pxPerMs;
          this.setProgrammaticScrollPosition('x', anchorX - this.pendingZoomAnchor.viewportCoord);
          this.pendingZoomAnchor = null;
          this.hasInitialAlignment = true;
        } else if (!this.hasInitialAlignment || this.shouldAutoFollow()) {
          this.setProgrammaticScrollPosition('x', this.scrollArea.scrollWidth - this.scrollArea.clientWidth);
          this.setProgrammaticScrollPosition('y', 0);
          this.hasInitialAlignment = true;
        } else if (this.pendingZoomAnchor) {
          this.pendingZoomAnchor = null;
        }
      } finally {
        if (shouldApplyProgrammaticAlignment) {
          this.endProgrammaticAlignment();
        }
      }
    });
  }

  private renderVerticalSourceTimeline(): void {
    const layout = this.computeVerticalLayout(this.zoomMsPerPixel);
    const shouldAlignToAnchor = this.pendingZoomAnchor?.axis === 'y';
    const shouldAlignToEdge = !this.hasInitialAlignment || this.shouldAutoFollow();
    const shouldApplyProgrammaticAlignment = shouldAlignToAnchor || shouldAlignToEdge;

    if (shouldApplyProgrammaticAlignment) {
      this.beginProgrammaticAlignment();
    }

    const timeScaleY = (time: Date): number => {
      const elapsed = layout.timeRange.end.getTime() - time.getTime();
      return layout.timelineStartY + elapsed * layout.pxPerMs;
    };

    const columnCenterX = (index: number): number => (
      layout.timelineStartX
      + (index * (layout.columnWidth + layout.columnGap))
      + (layout.columnWidth / 2)
    );

    const columnsRight = layout.timelineStartX
      + (Math.max(1, this.rows.length) * layout.columnWidth)
      + (Math.max(0, this.rows.length - 1) * layout.columnGap);

    const chartContent = document.createElement('div');
    chartContent.className = 'thinkt-timeline-chart-content thinkt-timeline-source-content';
    chartContent.style.width = `${layout.chartWidth}px`;
    chartContent.style.height = `${layout.chartHeight}px`;

    const sourceHeader = document.createElement('div');
    sourceHeader.className = 'thinkt-timeline-source-header';
    sourceHeader.style.width = `${layout.chartWidth}px`;
    sourceHeader.style.height = `${this.timeAxisHeight}px`;

    const corner = document.createElement('div');
    corner.className = 'thinkt-timeline-source-axis-corner';
    corner.style.width = `${layout.timelineStartX}px`;
    sourceHeader.appendChild(corner);

    this.rows.forEach((row, index) => {
      const label = document.createElement('span');
      label.className = 'thinkt-timeline-source-header-label';
      label.style.left = `${columnCenterX(index)}px`;
      label.title = row.label;
      label.textContent = this.truncateLabel(row.label, 16);
      sourceHeader.appendChild(label);
    });
    chartContent.appendChild(sourceHeader);

    const labelCount = Math.max(4, Math.floor(layout.chartHeight / 180));
    for (let i = 0; i <= labelCount; i++) {
      const t = new Date(
        layout.timeRange.end.getTime()
        - ((layout.timeRange.end.getTime() - layout.timeRange.start.getTime()) * i) / labelCount,
      );
      const y = timeScaleY(t);

      const label = document.createElement('span');
      label.className = 'thinkt-timeline-source-time-label';
      label.style.top = `${y}px`;
      label.textContent = this.formatTime(t);
      chartContent.appendChild(label);
    }

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'thinkt-timeline-source-svg');
    svg.setAttribute('width', String(layout.chartWidth));
    svg.setAttribute('height', String(layout.chartHeight));

    const axisLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    axisLine.setAttribute('x1', String(layout.timelineStartX));
    axisLine.setAttribute('y1', String(layout.timelineStartY));
    axisLine.setAttribute('x2', String(layout.timelineStartX));
    axisLine.setAttribute('y2', String(layout.latestY));
    axisLine.setAttribute('stroke', 'var(--thinkt-border-color, #333)');
    axisLine.setAttribute('stroke-opacity', '0.35');
    svg.appendChild(axisLine);

    for (let i = 0; i <= labelCount; i++) {
      const t = new Date(
        layout.timeRange.end.getTime()
        - ((layout.timeRange.end.getTime() - layout.timeRange.start.getTime()) * i) / labelCount,
      );
      const y = timeScaleY(t);
      const gridLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      gridLine.setAttribute('x1', String(layout.timelineStartX));
      gridLine.setAttribute('y1', String(y));
      gridLine.setAttribute('x2', String(columnsRight));
      gridLine.setAttribute('y2', String(y));
      gridLine.setAttribute('stroke', 'var(--thinkt-border-color, #333)');
      gridLine.setAttribute('stroke-opacity', '0.25');
      svg.appendChild(gridLine);
    }

    this.rows.forEach((row, rowIndex) => {
      const x = columnCenterX(rowIndex);

      const guide = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      guide.setAttribute('x1', String(x));
      guide.setAttribute('y1', String(layout.timelineStartY));
      guide.setAttribute('x2', String(x));
      guide.setAttribute('y2', String(layout.latestY));
      guide.setAttribute('stroke', 'var(--thinkt-border-color, #333)');
      guide.setAttribute('stroke-opacity', '0.25');
      svg.appendChild(guide);

      for (let i = 0; i < row.sessions.length - 1; i++) {
        const curr = row.sessions[i];
        const next = row.sessions[i + 1];
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', String(x));
        line.setAttribute('y1', String(timeScaleY(curr.timestamp)));
        line.setAttribute('x2', String(x));
        line.setAttribute('y2', String(timeScaleY(next.timestamp)));
        line.setAttribute('stroke', row.color);
        line.setAttribute('stroke-width', '2');
        line.setAttribute('opacity', '0.4');
        svg.appendChild(line);
      }

      row.sessions.forEach((session) => {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', String(x));
        circle.setAttribute('cy', String(timeScaleY(session.timestamp)));
        circle.setAttribute('r', String(this.blobRadius));
        circle.setAttribute('fill', row.color);
        circle.setAttribute('stroke', 'var(--thinkt-bg-color, #1a1a1a)');
        circle.setAttribute('stroke-width', '2');
        circle.setAttribute('cursor', 'pointer');

        circle.addEventListener('mouseenter', (event) => {
          circle.setAttribute('r', String(this.blobRadius + 2));
          this.showTooltip(event, session);
        });
        circle.addEventListener('mouseleave', () => {
          circle.setAttribute('r', String(this.blobRadius));
          this.hideTooltip();
        });
        circle.addEventListener('click', () => {
          this.options.onSessionSelect?.(session.session);
        });

        svg.appendChild(circle);
      });
    });

    chartContent.appendChild(svg);
    this.scrollArea.appendChild(chartContent);

    window.requestAnimationFrame(() => {
      if (this.disposed) return;
      try {
        if (this.pendingZoomAnchor?.axis === 'y') {
          const anchorY = layout.timelineStartY
            + (layout.timeRange.end.getTime() - this.pendingZoomAnchor.timeMs) * layout.pxPerMs;
          this.setProgrammaticScrollPosition('y', anchorY - this.pendingZoomAnchor.viewportCoord);
          this.pendingZoomAnchor = null;
          this.hasInitialAlignment = true;
        } else if (!this.hasInitialAlignment || this.shouldAutoFollow()) {
          this.setProgrammaticScrollPosition('x', 0);
          this.setProgrammaticScrollPosition('y', 0);
          this.hasInitialAlignment = true;
        } else if (this.pendingZoomAnchor) {
          this.pendingZoomAnchor = null;
        }
      } finally {
        if (shouldApplyProgrammaticAlignment) {
          this.endProgrammaticAlignment();
        }
      }
    });
  }

  private renderLabelOverlay(): void {
    this.labelTrack.innerHTML = '';
    this.rows.forEach((row, index) => {
      const label = document.createElement('div');
      label.className = 'thinkt-timeline-label-item';
      label.style.top = `${index * this.rowHeight}px`;
      label.title = row.label;
      label.textContent = this.truncateLabel(row.label, 18);
      if (this.groupBy === 'project' && row.projectId) {
        label.classList.add('clickable');
        label.addEventListener('click', () => {
          this.options.onProjectSelect?.({
            projectId: row.projectId!,
            projectName: row.label,
            projectPath: row.projectPath,
            projectSource: row.projectSource ?? undefined,
          });
        });
      }
      this.labelTrack.appendChild(label);
    });
  }

  private getTimeRange(): { start: Date; end: Date } {
    const times = this.sessions.map((session) => session.timestamp.getTime());
    const min = Math.min(...times);
    const max = Math.max(...times);
    const endTime = this.groupBy === 'project' ? Math.max(max, Date.now()) : max;
    const leftPadding = (endTime - min) * 0.02 || 60_000;
    return {
      start: new Date(min - leftPadding),
      end: new Date(endTime),
    };
  }

  private formatTime(date: Date): string {
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  private showTooltip(event: Event, session: TimelineSession): void {
    if (!this.tooltip) return;

    const title = session.session.firstPrompt
      ? `${session.session.firstPrompt.slice(0, 100)}${session.session.firstPrompt.length > 100 ? '...' : ''}`
      : (session.session.id?.slice(0, 8) || 'Unknown');

    this.tooltip.innerHTML = `
      <div class="thinkt-timeline-tooltip-title">${this.escapeHtml(title)}</div>
      <div class="thinkt-timeline-tooltip-meta">
        ${this.escapeHtml(session.projectName)} · ${this.escapeHtml(session.source)} · ${session.timestamp.toLocaleString()}
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

  private showLoading(): void {
    this.scrollArea.innerHTML = `
      <div class="thinkt-timeline-loading">
        <div>${i18n._('Loading timeline...')}</div>
      </div>
    `;
  }

  private showEmpty(): void {
    this.scrollArea.innerHTML = `
      <div class="thinkt-timeline-empty">
        <div>${i18n._('No sessions to display')}</div>
      </div>
    `;
  }

  private showError(error: Error): void {
    this.scrollArea.innerHTML = `
      <div class="thinkt-timeline-error">
        <div>${i18n._('Error: {message}', { message: error.message })}</div>
      </div>
    `;
  }

  private truncateLabel(label: string, maxLen: number): string {
    if (label.length <= maxLen) return label;
    return `${label.slice(0, maxLen - 3)}...`;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  setGroupBy(groupBy: 'project' | 'source'): void {
    if (this.groupBy === groupBy) return;
    this.groupBy = groupBy;
    this.processRows();
    this.hasInitialAlignment = false;
    this.hasUserNavigated = false;
    this.expectedScrollLeft = null;
    this.expectedScrollTop = null;
    this.pendingZoomAnchor = null;
    this.render();
  }

  setSearch(query: string): void {
    this.searchQuery = query.trim().toLowerCase();
    this.applyFilters();
  }

  setSourceFilter(sources: Set<string> | string[] | null): void {
    if (sources === null || (Array.isArray(sources) && sources.length === 0) || (sources instanceof Set && sources.size === 0)) {
      this.sourceFilters = null;
    } else {
      this.sourceFilters = new Set(sources);
    }
    this.applyFilters();
  }

  setIncludeDeleted(includeDeleted: boolean): void {
    if (this.includeDeletedProjects === includeDeleted) return;
    this.includeDeletedProjects = includeDeleted;
    void this.loadData();
  }

  refresh(): Promise<void> {
    return this.loadData();
  }

  /**
   * Re-render translatable UI text in place when locale changes.
   */
  refreshI18n(): void {
    this.createStructure();
    this.render();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    if (this.rafScrollSync !== 0) {
      window.cancelAnimationFrame(this.rafScrollSync);
      this.rafScrollSync = 0;
    }
    this.scrollArea.removeEventListener('scroll', this.handleScroll);
    this.scrollArea.removeEventListener('wheel', this.handleWheel);
    this.scrollArea.removeEventListener('keydown', this.handleKeyDown);

    if (this.tooltip) {
      this.tooltip.remove();
      this.tooltip = null;
    }

    this.container.innerHTML = '';
  }
}

// ============================================
// Factory Function
// ============================================

export function createTimelineVisualization(options: TimelineVisualizationOptions): TimelineVisualization {
  return new TimelineVisualization(options);
}
