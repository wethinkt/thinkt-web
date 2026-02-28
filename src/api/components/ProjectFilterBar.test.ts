/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ProjectFilterState } from './ApiViewer';
import type { ThinktClient } from '@wethinkt/ts-thinkt/api';

let container: HTMLElement;
let filters: ProjectFilterState;
let onFiltersChanged: ReturnType<typeof vi.fn>;
let signal: AbortSignal;

beforeEach(() => {
  vi.useFakeTimers();
  container = document.createElement('div');
  filters = { searchQuery: '', sources: new Set(), sort: 'date_desc', includeDeleted: false };
  onFiltersChanged = vi.fn();
  signal = new AbortController().signal;
});

afterEach(() => {
  vi.useRealTimers();
});

async function createBar(clientOverrides: Partial<ThinktClient> = {}) {
  const client = { getProjects: vi.fn().mockResolvedValue([]), ...clientOverrides } as unknown as ThinktClient;
  const { ProjectFilterBar } = await import('./ProjectFilterBar');
  return new ProjectFilterBar({
    container,
    client,
    filters,
    signal,
    onFiltersChanged,
    defaultSelectAllSources: true,
  });
}

describe('ProjectFilterBar', () => {
  describe('construction', () => {
    it('creates search input, source dropdown, and sort select', async () => {
      await createBar();
      expect(container.querySelector('input[type="text"]')).toBeTruthy();
      expect(container.querySelector('button')).toBeTruthy();
      expect(container.querySelector('select')).toBeTruthy();
    });
  });

  describe('syncFromDom', () => {
    it('reads search input value into filters', async () => {
      const bar = await createBar();
      const searchInput = container.querySelector('input[type="text"]') as HTMLInputElement;
      searchInput.value = 'hello';
      bar.syncFromDom();
      expect(filters.searchQuery).toBe('hello');
    });

    it('reads sort select value into filters', async () => {
      const bar = await createBar();
      const sortSelect = container.querySelector('select') as HTMLSelectElement;
      sortSelect.value = 'name_asc';
      bar.syncFromDom();
      expect(filters.sort).toBe('name_asc');
    });
  });

  describe('source capabilities', () => {
    it('stores and retrieves capabilities', async () => {
      const bar = await createBar();
      const caps = [{ name: 'claude', basePath: '/home/.claude', canResume: true }];
      bar.setSourceCapabilities(caps, new Set(['claude']));
      expect(bar.getSourceCapabilities()).toEqual(caps);
    });

    it('checks resumability', async () => {
      const bar = await createBar();
      bar.setSourceCapabilities(
        [{ name: 'claude', basePath: '/home/.claude', canResume: true }],
        new Set(['claude']),
      );
      expect(bar.isSourceResumable('claude')).toBe(true);
      expect(bar.isSourceResumable('kimi')).toBe(false);
    });
  });

  describe('mergeDiscoveredSources', () => {
    it('deduplicates and sorts sources, selecting all by default', async () => {
      const bar = await createBar();
      bar.mergeDiscoveredSources(['Kimi', 'claude', 'KIMI']);
      // Verify dropdown options reflect the merged sources
      const sourceLabels = Array.from(
        container.querySelectorAll<HTMLLabelElement>('.thinkt-source-option:not(.thinkt-source-option--toggle)'),
      );
      const texts = sourceLabels.map((label) => label.querySelector('span')?.textContent?.trim());
      expect(texts).toContain('Claude');
      expect(texts).toContain('Kimi');
      // "KIMI" should have been deduplicated with "Kimi"
      expect(texts.filter((t) => t?.toLowerCase() === 'kimi')).toHaveLength(1);
      expect(filters.sources).toEqual(new Set(['claude', 'kimi']));
      expect(onFiltersChanged).toHaveBeenCalledOnce();

      const options = Array.from(
        container.querySelectorAll<HTMLInputElement>('.thinkt-source-option:not(.thinkt-source-option--toggle) input[type="checkbox"]'),
      );
      expect(options).toHaveLength(2);
      options.forEach((input) => expect(input.checked).toBe(true));
    });
  });

  describe('callbacks', () => {
    it('fires onFiltersChanged on search input after debounce', async () => {
      await createBar();
      const searchInput = container.querySelector('input[type="text"]') as HTMLInputElement;
      searchInput.value = 'test';
      searchInput.dispatchEvent(new Event('input'));
      expect(onFiltersChanged).not.toHaveBeenCalled();
      vi.advanceTimersByTime(150);
      expect(onFiltersChanged).toHaveBeenCalledOnce();
      expect(filters.searchQuery).toBe('test');
    });

    it('fires onFiltersChanged on sort change', async () => {
      await createBar();
      const sortSelect = container.querySelector('select') as HTMLSelectElement;
      sortSelect.value = 'name_desc';
      sortSelect.dispatchEvent(new Event('change'));
      expect(onFiltersChanged).toHaveBeenCalledOnce();
      expect(filters.sort).toBe('name_desc');
    });
  });
});
