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

  it('aligns source mode to upper-left on initial render', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const rafCallbacks: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) => {
      rafCallbacks.push(callback);
      return rafCallbacks.length;
    });

    const client = createClient(
      {
        projectA: [
          createSession('a-old', '2026-02-01T10:00:00Z', 'claude'),
          createSession('a-new', '2026-02-03T10:00:00Z', 'claude'),
        ],
        projectB: [
          createSession('b1', '2026-02-02T10:00:00Z', 'kimi'),
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

    const scrollArea = container.querySelector('.thinkt-timeline-scroll') as HTMLElement;
    let scrollLeftValue = 450;
    let scrollTopValue = 320;
    Object.defineProperty(scrollArea, 'clientWidth', {
      configurable: true,
      get: () => 400,
    });
    Object.defineProperty(scrollArea, 'scrollWidth', {
      configurable: true,
      get: () => 2000,
    });
    Object.defineProperty(scrollArea, 'clientHeight', {
      configurable: true,
      get: () => 300,
    });
    Object.defineProperty(scrollArea, 'scrollHeight', {
      configurable: true,
      get: () => 1800,
    });
    Object.defineProperty(scrollArea, 'scrollLeft', {
      configurable: true,
      get: () => scrollLeftValue,
      set: (value: number) => {
        scrollLeftValue = value;
      },
    });
    Object.defineProperty(scrollArea, 'scrollTop', {
      configurable: true,
      get: () => scrollTopValue,
      set: (value: number) => {
        scrollTopValue = value;
      },
    });

    const firstAlign = rafCallbacks.shift();
    expect(firstAlign).toBeTruthy();
    firstAlign?.(0);

    expect(scrollLeftValue).toBe(0);
    expect(scrollTopValue).toBe(0);

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

  it('renders progressively while project sessions are still loading', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    let resolveSlowProject: (value: SessionMeta[]) => void = () => undefined;
    const slowProjectPromise = new Promise<SessionMeta[]>((resolve) => {
      resolveSlowProject = resolve;
    });

    const client = {
      getProjects: vi.fn().mockResolvedValue([
        { id: 'projectA', name: 'projectA', source: 'claude' },
        { id: 'projectB', name: 'projectB', source: 'kimi' },
      ]),
      getSessions: vi.fn().mockImplementation(async (projectId: string) => {
        if (projectId === 'projectA') {
          return [createSession('a1', '2026-02-01T10:00:00Z', 'claude')];
        }
        return slowProjectPromise;
      }),
      getSources: vi.fn().mockResolvedValue([]),
    } as unknown as ThinktClient;

    const timeline = new TimelineVisualization({
      elements: { container },
      client,
    });

    await flush();

    // projectA has resolved, projectB is still pending.
    expect(container.querySelectorAll('.thinkt-timeline-label-item').length).toBe(1);

    resolveSlowProject([createSession('b1', '2026-02-02T10:00:00Z', 'kimi')]);
    await flush();

    expect(container.querySelectorAll('.thinkt-timeline-label-item').length).toBe(2);

    timeline.dispose();
  });

  it('loads project sessions in parallel so a later fast project can render first', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    let resolveSlowProject: (value: SessionMeta[]) => void = () => undefined;
    const slowProjectPromise = new Promise<SessionMeta[]>((resolve) => {
      resolveSlowProject = resolve;
    });

    const client = {
      getProjects: vi.fn().mockResolvedValue([
        { id: 'projectSlow', name: 'projectSlow', source: 'claude' },
        { id: 'projectFast', name: 'projectFast', source: 'kimi' },
      ]),
      getSessions: vi.fn().mockImplementation(async (projectId: string) => {
        if (projectId === 'projectSlow') {
          return slowProjectPromise;
        }
        return [createSession('fast-1', '2026-02-01T10:00:00Z', 'kimi')];
      }),
      getSources: vi.fn().mockResolvedValue([]),
    } as unknown as ThinktClient;

    const timeline = new TimelineVisualization({
      elements: { container },
      client,
    });

    await flush();

    expect(client.getSessions).toHaveBeenCalledTimes(2);
    expect(container.querySelectorAll('.thinkt-timeline-label-item').length).toBe(1);

    resolveSlowProject([createSession('slow-1', '2026-02-02T10:00:00Z', 'claude')]);
    await flush();

    expect(container.querySelectorAll('.thinkt-timeline-label-item').length).toBe(2);

    timeline.dispose();
  });

  it('auto-follows timeline edge during progressive loading until user navigates', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    let resolveSlowProject: (value: SessionMeta[]) => void = () => undefined;
    const slowProjectPromise = new Promise<SessionMeta[]>((resolve) => {
      resolveSlowProject = resolve;
    });

    const client = {
      getProjects: vi.fn().mockResolvedValue([
        { id: 'projectFast', name: 'projectFast', source: 'claude' },
        { id: 'projectSlow', name: 'projectSlow', source: 'kimi' },
      ]),
      getSessions: vi.fn().mockImplementation(async (projectId: string) => {
        if (projectId === 'projectSlow') {
          return slowProjectPromise;
        }
        return [createSession('fast-1', '2026-02-10T10:00:00Z', 'claude')];
      }),
      getSources: vi.fn().mockResolvedValue([]),
    } as unknown as ThinktClient;

    const timeline = new TimelineVisualization({
      elements: { container },
      client,
    });
    await flush();

    const scrollArea = container.querySelector('.thinkt-timeline-scroll') as HTMLElement;
    const scrollLeftAssignments: number[] = [];
    let scrollLeftValue = 0;
    Object.defineProperty(scrollArea, 'scrollLeft', {
      configurable: true,
      get: () => scrollLeftValue,
      set: (value: number) => {
        scrollLeftValue = value;
        scrollLeftAssignments.push(value);
      },
    });

    resolveSlowProject([createSession('slow-1', '2026-01-01T10:00:00Z', 'kimi')]);
    await flush();

    expect(scrollLeftAssignments.length).toBeGreaterThan(0);

    timeline.dispose();
  });

  it('stops auto-following progressive updates after user scroll interaction', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    let resolveSlowProject: (value: SessionMeta[]) => void = () => undefined;
    const slowProjectPromise = new Promise<SessionMeta[]>((resolve) => {
      resolveSlowProject = resolve;
    });

    const client = {
      getProjects: vi.fn().mockResolvedValue([
        { id: 'projectFast', name: 'projectFast', source: 'claude' },
        { id: 'projectSlow', name: 'projectSlow', source: 'kimi' },
      ]),
      getSessions: vi.fn().mockImplementation(async (projectId: string) => {
        if (projectId === 'projectSlow') {
          return slowProjectPromise;
        }
        return [createSession('fast-1', '2026-02-10T10:00:00Z', 'claude')];
      }),
      getSources: vi.fn().mockResolvedValue([]),
    } as unknown as ThinktClient;

    const timeline = new TimelineVisualization({
      elements: { container },
      client,
    });
    await flush();

    const scrollArea = container.querySelector('.thinkt-timeline-scroll') as HTMLElement;
    const scrollLeftAssignments: number[] = [];
    let scrollLeftValue = 0;
    Object.defineProperty(scrollArea, 'scrollLeft', {
      configurable: true,
      get: () => scrollLeftValue,
      set: (value: number) => {
        scrollLeftValue = value;
        scrollLeftAssignments.push(value);
      },
    });

    scrollLeftValue = 250;
    scrollArea.dispatchEvent(new Event('scroll'));
    resolveSlowProject([createSession('slow-1', '2026-01-01T10:00:00Z', 'kimi')]);
    await flush();

    expect(scrollLeftAssignments.length).toBe(0);

    timeline.dispose();
  });

  it('pins project timeline to top during progressive auto-follow', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    let resolveSlowProject: (value: SessionMeta[]) => void = () => undefined;
    const slowProjectPromise = new Promise<SessionMeta[]>((resolve) => {
      resolveSlowProject = resolve;
    });

    const client = {
      getProjects: vi.fn().mockResolvedValue([
        { id: 'projectFast', name: 'projectFast', source: 'claude' },
        { id: 'projectSlow', name: 'projectSlow', source: 'kimi' },
      ]),
      getSessions: vi.fn().mockImplementation(async (projectId: string) => {
        if (projectId === 'projectSlow') {
          return slowProjectPromise;
        }
        return [createSession('fast-1', '2026-02-10T10:00:00Z', 'claude')];
      }),
      getSources: vi.fn().mockResolvedValue([]),
    } as unknown as ThinktClient;

    const timeline = new TimelineVisualization({
      elements: { container },
      client,
      groupBy: 'project',
    });
    await flush();

    const scrollArea = container.querySelector('.thinkt-timeline-scroll') as HTMLElement;
    let scrollTopValue = 0;
    Object.defineProperty(scrollArea, 'scrollTop', {
      configurable: true,
      get: () => scrollTopValue,
      set: (value: number) => {
        scrollTopValue = value;
      },
    });

    scrollTopValue = 420;
    resolveSlowProject([createSession('slow-1', '2026-01-01T10:00:00Z', 'kimi')]);
    await flush();

    expect(scrollTopValue).toBe(0);

    timeline.dispose();
  });

  it('keeps auto-follow active when a render-driven scroll event fires between progressive renders', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    let resolveSlowProject: (value: SessionMeta[]) => void = () => undefined;
    const slowProjectPromise = new Promise<SessionMeta[]>((resolve) => {
      resolveSlowProject = resolve;
    });

    const rafCallbacks: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) => {
      rafCallbacks.push(callback);
      return rafCallbacks.length;
    });

    const client = {
      getProjects: vi.fn().mockResolvedValue([
        { id: 'projectFast', name: 'projectFast', source: 'claude' },
        { id: 'projectSlow', name: 'projectSlow', source: 'kimi' },
      ]),
      getSessions: vi.fn().mockImplementation(async (projectId: string) => {
        if (projectId === 'projectSlow') {
          return slowProjectPromise;
        }
        return [createSession('fast-1', '2026-02-10T10:00:00Z', 'claude')];
      }),
      getSources: vi.fn().mockResolvedValue([]),
    } as unknown as ThinktClient;

    const timeline = new TimelineVisualization({
      elements: { container },
      client,
      groupBy: 'project',
    });
    await flush();

    const scrollArea = container.querySelector('.thinkt-timeline-scroll') as HTMLElement;
    let scrollLeftValue = 0;
    let scrollWidthValue = 1600;
    const scrollLeftAssignments: number[] = [];
    Object.defineProperty(scrollArea, 'clientWidth', {
      configurable: true,
      get: () => 400,
    });
    Object.defineProperty(scrollArea, 'scrollWidth', {
      configurable: true,
      get: () => scrollWidthValue,
    });
    Object.defineProperty(scrollArea, 'scrollLeft', {
      configurable: true,
      get: () => scrollLeftValue,
      set: (value: number) => {
        scrollLeftValue = value;
        scrollLeftAssignments.push(value);
      },
    });

    const firstAlign = rafCallbacks.shift();
    expect(firstAlign).toBeTruthy();
    firstAlign?.(0);
    scrollLeftAssignments.length = 0;

    resolveSlowProject([createSession('slow-1', '2026-01-01T10:00:00Z', 'kimi')]);
    await flush();

    scrollWidthValue = 2000;
    scrollLeftValue = 0;
    scrollArea.dispatchEvent(new Event('scroll'));

    const secondAlign = rafCallbacks.shift();
    expect(secondAlign).toBeTruthy();
    secondAlign?.(0);

    expect(scrollLeftAssignments.length).toBeGreaterThan(0);
    expect(scrollLeftValue).toBe(1600);

    timeline.dispose();
  });

  it('anchors project timeline right edge to current time', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-02-20T00:00:00Z').getTime());

    const client = createClient(
      {
        projectA: [createSession('a1', '2026-02-01T10:00:00Z', 'claude')],
      },
      { projectA: 'claude' },
    );

    const timeline = new TimelineVisualization({
      elements: { container },
      client,
      groupBy: 'project',
    });

    await flush();

    const content = container.querySelector('.thinkt-timeline-chart-content') as HTMLElement;
    const width = Number.parseInt(content.style.width, 10);
    expect(width).toBeGreaterThan(3000);

    timeline.dispose();
  });

  it('keeps newest project rows at the top as older projects stream in', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    let resolveSlowProject: (value: SessionMeta[]) => void = () => undefined;
    const slowProjectPromise = new Promise<SessionMeta[]>((resolve) => {
      resolveSlowProject = resolve;
    });

    const client = {
      getProjects: vi.fn().mockResolvedValue([
        { id: 'projectFast', name: 'projectFast', source: 'claude' },
        { id: 'projectSlow', name: 'projectSlow', source: 'kimi' },
      ]),
      getSessions: vi.fn().mockImplementation(async (projectId: string) => {
        if (projectId === 'projectSlow') {
          return slowProjectPromise;
        }
        return [createSession('fast-1', '2026-02-10T10:00:00Z', 'claude')];
      }),
      getSources: vi.fn().mockResolvedValue([]),
    } as unknown as ThinktClient;

    const timeline = new TimelineVisualization({
      elements: { container },
      client,
      groupBy: 'project',
    });
    await flush();

    const labelsBefore = Array.from(container.querySelectorAll('.thinkt-timeline-label-item'))
      .map((el) => (el.textContent ?? '').trim().toLowerCase());
    expect(labelsBefore).toEqual(['projectfast']);

    resolveSlowProject([createSession('slow-1', '2026-01-01T10:00:00Z', 'kimi')]);
    await flush();

    const labelsAfter = Array.from(container.querySelectorAll('.thinkt-timeline-label-item'))
      .map((el) => (el.textContent ?? '').trim().toLowerCase());
    expect(labelsAfter).toEqual(['projectfast', 'projectslow']);

    timeline.dispose();
  });
});
