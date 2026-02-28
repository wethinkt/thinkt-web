/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { SessionMeta } from '@wethinkt/ts-thinkt';
import type { ThinktClient } from '@wethinkt/ts-thinkt/api';
import { SessionList } from './SessionList';

let container: HTMLElement;
let list: SessionList | null = null;

function makeSession(overrides: Partial<SessionMeta>): SessionMeta {
  return {
    id: 'session-id',
    entryCount: 1,
    source: 'claude',
    ...overrides,
  };
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.replaceChildren(container);
});

afterEach(() => {
  list?.dispose();
  list = null;
});

describe('SessionList', () => {
  it('matches search query against session title (name)', async () => {
    const sessions: SessionMeta[] = [
      makeSession({
        id: 'sess-1',
        title: 'Release Planning',
        firstPrompt: 'Prompt A',
      }),
      makeSession({
        id: 'sess-2',
        title: 'Bug Triage',
        firstPrompt: 'Prompt B',
      }),
    ];
    const client = {
      getSessions: vi.fn().mockResolvedValue(sessions),
    } as unknown as ThinktClient;

    list = new SessionList({ elements: { container }, client });
    await list.setProjectId('project-1', 'claude');

    list.setSearch('planning');
    const filtered = list.getFilteredSessions();

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe('sess-1');
  });

  it('matches search query against session ID', async () => {
    const targetId = 'ae5cfbcd-47bb-4934-9051-d97ca435ff9';
    const sessions: SessionMeta[] = [
      makeSession({ id: targetId, firstPrompt: 'Prompt A' }),
      makeSession({ id: 'other-session-id', firstPrompt: 'Prompt B' }),
    ];
    const client = {
      getSessions: vi.fn().mockResolvedValue(sessions),
    } as unknown as ThinktClient;

    list = new SessionList({ elements: { container }, client });
    await list.setProjectId('project-1', 'claude');

    list.setSearch('ae5cfbc');
    const filtered = list.getFilteredSessions();

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe(targetId);
  });

  it('shows full session ID in tooltip', async () => {
    const targetId = 'ae5cfbcd-47bb-4934-9051-d97ca435ff9';
    const sessions: SessionMeta[] = [
      makeSession({
        id: targetId,
        firstPrompt: 'A very long session prompt title that is likely to be truncated in the UI',
      }),
    ];
    const client = {
      getSessions: vi.fn().mockResolvedValue(sessions),
    } as unknown as ThinktClient;

    list = new SessionList({ elements: { container }, client });
    await list.setProjectId('project-1', 'claude');

    const item = container.querySelector<HTMLElement>('li.thinkt-session-list__item');
    expect(item).not.toBeNull();
    expect(item?.getAttribute('title')).toBe(targetId);
  });
});
