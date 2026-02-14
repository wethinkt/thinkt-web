// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionMeta } from '@wethinkt/ts-thinkt';
import type { ThinktClient } from '@wethinkt/ts-thinkt/api';
import { TimelineVisualization } from './TimelineVisualization';

function createSession(
  id: string,
  modifiedAtIso: string,
  source: string,
  firstPrompt = 'prompt',
  fullPath?: string,
): SessionMeta {
  return {
    id,
    source,
    firstPrompt,
    fullPath: fullPath ?? `/tmp/${id}`,
    modifiedAt: new Date(modifiedAtIso),
  } as SessionMeta;
}

function createClient(
  projectSessions: Record<string, SessionMeta[]>,
  projectSources: Record<string, string>,
  options?: {
    projectPaths?: Record<string, string>;
    projectSourceBasePaths?: Record<string, string>;
    sources?: Array<{ name: string; base_path?: string; available?: boolean }>;
  },
): ThinktClient {
  return {
    getProjects: vi.fn().mockResolvedValue(
      Object.keys(projectSessions).map((id) => ({
        id,
        name: id,
        source: projectSources[id] ?? 'unknown',
        path: options?.projectPaths?.[id],
        sourceBasePath: options?.projectSourceBasePaths?.[id],
      })),
    ),
    getSessions: vi.fn().mockImplementation(async (projectId: string) => projectSessions[projectId] ?? []),
    getSources: vi.fn().mockResolvedValue(options?.sources ?? []),
  } as unknown as ThinktClient;
}

async function flush(): Promise<void> {
  await Promise.resolve();
  await new Promise<void>((resolve) => {
    setTimeout(() => resolve(), 0);
  });
  await Promise.resolve();
}

describe('TimelineVisualization', () => {
  beforeEach(() => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('renders a single scroll pane with floating labels', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const client = createClient(
      {
        projectA: [createSession('a1', '2026-02-01T10:00:00Z', 'claude')],
      },
      { projectA: 'claude' },
    );

    const timeline = new TimelineVisualization({
      elements: { container },
      client,
    });

    await flush();

    expect(container.querySelector('.thinkt-timeline-scroll')).toBeTruthy();
    expect(container.querySelector('.thinkt-timeline-label-overlay')).toBeTruthy();
    expect(container.querySelector('.thinkt-timeline-labels')).toBeNull();
    expect(container.querySelector('.thinkt-timeline-chart-area')).toBeNull();
    expect(container.querySelector('.thinkt-timeline-legend')).toBeNull();
    expect(container.querySelectorAll('.thinkt-timeline-zoom-preset').length).toBe(3);
    expect(container.querySelector('.thinkt-timeline-zoom-slider')).toBeNull();

    timeline.dispose();
  });

  it('keeps labels vertically synced with scroll position', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const client = createClient(
      {
        projectA: [createSession('a1', '2026-02-01T10:00:00Z', 'claude')],
        projectB: [createSession('b1', '2026-02-01T12:00:00Z', 'kimi')],
      },
      { projectA: 'claude', projectB: 'kimi' },
    );

    const timeline = new TimelineVisualization({
      elements: { container },
      client,
    });

    await flush();

    const scrollArea = container.querySelector('.thinkt-timeline-scroll') as HTMLElement;
    const labelTrack = container.querySelector('.thinkt-timeline-label-track') as HTMLElement;

    scrollArea.scrollTop = 80;
    scrollArea.dispatchEvent(new Event('scroll'));

    expect(labelTrack.style.transform).toBe('translateY(-80px)');

    timeline.dispose();
  });

  it('expands chart width for large time spans', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const client = createClient(
      {
        projectA: [
          createSession('a1', '2026-01-01T00:00:00Z', 'claude'),
          createSession('a2', '2026-01-31T00:00:00Z', 'claude'),
        ],
      },
      { projectA: 'claude' },
    );

    const timeline = new TimelineVisualization({
      elements: { container },
      client,
    });

    await flush();

    const content = container.querySelector('.thinkt-timeline-chart-content') as HTMLElement;
    const width = Number.parseInt(content.style.width, 10);
    expect(width).toBeGreaterThan(3000);

    timeline.dispose();
  });

  it('supports wheel and keyboard zoom', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const client = createClient(
      {
        projectA: [
          createSession('a1', '2026-02-01T10:00:00Z', 'claude'),
          createSession('a2', '2026-02-15T16:00:00Z', 'claude'),
        ],
      },
      { projectA: 'claude' },
    );

    const timeline = new TimelineVisualization({
      elements: { container },
      client,
    });

    await flush();

    const scrollArea = container.querySelector('.thinkt-timeline-scroll') as HTMLElement;
    const getWidth = (): number => {
      const content = container.querySelector('.thinkt-timeline-chart-content') as HTMLElement;
      return Number.parseInt(content.style.width, 10);
    };

    const widthBefore = getWidth();
    scrollArea.dispatchEvent(new WheelEvent('wheel', { deltaY: -120, ctrlKey: true, clientX: 200 }));
    await flush();
    const widthAfterWheel = getWidth();
    expect(widthAfterWheel).toBeGreaterThan(widthBefore);

    scrollArea.dispatchEvent(new KeyboardEvent('keydown', { key: '-' }));
    await flush();
    const widthAfterKey = getWidth();
    expect(widthAfterKey).toBeLessThan(widthAfterWheel);

    timeline.dispose();
  });

  it('renders source grouping as a vertical timeline', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const client = createClient(
      {
        projectA: [
          createSession('a1', '2026-02-01T10:00:00Z', 'claude'),
          createSession('a2', '2026-02-03T10:00:00Z', 'claude'),
        ],
        projectB: [
          createSession('b1', '2026-02-02T11:00:00Z', 'kimi'),
        ],
      },
      { projectA: 'claude', projectB: 'kimi' },
    );

    const timeline = new TimelineVisualization({
      elements: { container },
      client,
      groupBy: 'source',
    });

    await flush();

    expect(container.querySelector('.thinkt-timeline-source-content')).toBeTruthy();
    expect(container.querySelector('.thinkt-timeline-source-header')).toBeTruthy();
    expect(container.querySelector('.thinkt-timeline-source-svg')).toBeTruthy();
    expect(container.querySelectorAll('.thinkt-timeline-source-header-label').length).toBe(2);

    const labelOverlay = container.querySelector('.thinkt-timeline-label-overlay') as HTMLElement;
    expect(labelOverlay.style.display).toBe('none');

    timeline.dispose();
  });

  it('shows newest sessions at the top in source mode', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const client = createClient(
      {
        projectA: [
          createSession('a-old', '2026-02-01T10:00:00Z', 'claude'),
          createSession('a-new', '2026-02-03T10:00:00Z', 'claude'),
        ],
      },
      { projectA: 'claude' },
    );

    const timeline = new TimelineVisualization({
      elements: { container },
      client,
      groupBy: 'source',
    });

    await flush();

    const circles = Array.from(container.querySelectorAll('.thinkt-timeline-source-svg circle'));
    expect(circles.length).toBe(2);

    const olderY = Number((circles[0] as SVGCircleElement).getAttribute('cy'));
    const newerY = Number((circles[1] as SVGCircleElement).getAttribute('cy'));
    expect(newerY).toBeLessThan(olderY);

    timeline.dispose();
  });

  it('infers copilot in source mode from source base paths', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const client = createClient(
      {
        projectA: [
          createSession(
            'copilot-1',
            '2026-02-03T10:00:00Z',
            'claude',
            'prompt',
            '/home/user/.copilot/projects/app/session-1.json',
          ),
        ],
      },
      { projectA: 'claude' },
      {
        projectPaths: { projectA: '/home/user/.copilot/projects/app' },
        projectSourceBasePaths: { projectA: '/home/user/.copilot' },
        sources: [{ name: 'copilot', base_path: '/home/user/.copilot', available: true }],
      },
    );

    const timeline = new TimelineVisualization({
      elements: { container },
      client,
      groupBy: 'source',
    });

    await flush();

    const labels = Array.from(
      container.querySelectorAll('.thinkt-timeline-source-header-label'),
    ).map((el) => (el.textContent ?? '').trim().toLowerCase());

    expect(labels).toContain('copilot');
    timeline.dispose();
  });
});
