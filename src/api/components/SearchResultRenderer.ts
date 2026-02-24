/**
 * SearchResultRenderer Component
 *
 * Renders search result lists for both text and semantic search modes.
 * Handles result item creation, match previews, and selection highlighting.
 */

import { i18n } from '@lingui/core';
import type { SearchSessionResult, SearchMatch, SemanticSearchResult } from '@wethinkt/ts-thinkt/api';

// ============================================
// Constants
// ============================================

const PREVIEW_TRUNCATE_LENGTH = 300;

// ============================================
// Types
// ============================================

export interface SearchResultRendererOptions {
  container: HTMLElement;
  onSelectResult: (index: number) => void;
  onHoverResult: (index: number) => void;
}

// ============================================
// Component Class
// ============================================

export class SearchResultRenderer {
  private container: HTMLElement;
  private onSelectResult: (index: number) => void;
  private onHoverResult: (index: number) => void;

  constructor(options: SearchResultRendererOptions) {
    this.container = options.container;
    this.onSelectResult = options.onSelectResult;
    this.onHoverResult = options.onHoverResult;
  }

  // ============================================
  // Text Search Results
  // ============================================

  renderTextResults(results: SearchSessionResult[], allResultsEmpty: boolean, selectedIndex: number): void {
    if (results.length === 0) {
      if (allResultsEmpty) {
        this.container.innerHTML = `
          <div class="thinkt-search-empty">
            <div class="thinkt-search-empty-icon">😕</div>
            <div>${i18n._('No results found')}</div>
          </div>
        `;
      } else {
        this.container.innerHTML = `
          <div class="thinkt-search-empty">
            <div class="thinkt-search-empty-icon">📁</div>
            <div>${i18n._('No results for selected projects')}</div>
            <div style="font-size: 11px; margin-top: 8px;">${i18n._('Select projects from the sidebar to filter')}</div>
          </div>
        `;
      }
      return;
    }

    const list = document.createElement('ul');
    list.className = 'thinkt-search-results';

    results.forEach((result, index) => {
      const item = this.createTextResultItem(result, index, selectedIndex);
      list.appendChild(item);
    });

    this.container.replaceChildren();
    this.container.appendChild(list);

    this.updateSelection(selectedIndex);
  }

  private createTextResultItem(result: SearchSessionResult, index: number, selectedIndex: number): HTMLElement {
    const li = document.createElement('li');
    li.className = 'thinkt-search-result';
    if (index === selectedIndex) {
      li.classList.add('selected');
    }

    const source = result.source ?? 'claude';
    const matches = result.matches ?? [];
    const matchCount = matches.length;

    const previewsHtml = matches.map((match: SearchMatch) => this.renderMatchPreview(match)).join('');

    li.innerHTML = `
      <div class="thinkt-search-result-header">
        <span class="thinkt-search-result-project">${escapeHtml(result.project_name ?? i18n._('Unknown'))}</span>
        <span class="thinkt-search-result-sep">·</span>
        <span class="thinkt-search-result-session">${escapeHtml(shortenId(result.session_id ?? ''))}</span>
        <span class="thinkt-search-result-source thinkt-search-result-source--${source}">${source}</span>
        <span class="thinkt-search-result-matches">${i18n._('{count, plural, one {# match} other {# matches}}', { count: matchCount })}</span>
      </div>
      ${previewsHtml}
    `;

    li.addEventListener('click', () => { this.onSelectResult(index); });
    li.addEventListener('mouseenter', () => { this.onHoverResult(index); });

    return li;
  }

  private renderMatchPreview(match: SearchMatch): string {
    const preview = match.preview ?? '';
    const role = match.role ?? 'unknown';

    return `
      <div class="thinkt-search-result-preview">
        <span class="thinkt-search-result-role">[${escapeHtml(role)}]:</span>
        ${escapeHtml(preview)}
      </div>
    `;
  }

  // ============================================
  // Semantic Search Results
  // ============================================

  renderSemanticResults(results: SemanticSearchResult[], previews: Map<string, string>, selectedIndex: number): void {
    if (results.length === 0) {
      this.container.innerHTML = `
        <div class="thinkt-search-empty">
          <div class="thinkt-search-empty-icon">🧠</div>
          <div>${i18n._('No semantic matches found')}</div>
        </div>
      `;
      return;
    }

    const list = document.createElement('ul');
    list.className = 'thinkt-search-results';

    results.forEach((result, index) => {
      const item = this.createSemanticResultItem(result, index, previews, selectedIndex);
      list.appendChild(item);
    });

    this.container.replaceChildren();
    this.container.appendChild(list);

    this.updateSelection(selectedIndex);
  }

  private createSemanticResultItem(
    result: SemanticSearchResult,
    index: number,
    previews: Map<string, string>,
    selectedIndex: number,
  ): HTMLElement {
    const li = document.createElement('li');
    li.className = 'thinkt-search-result';
    if (index === selectedIndex) {
      li.classList.add('selected');
    }

    const source = result.source ?? 'claude';
    const distance = result.distance ?? 1;
    const relevance = formatRelevance(distance);
    const firstPrompt = result.first_prompt
      ? escapeHtml(truncate(result.first_prompt, 120))
      : '';
    const timestamp = result.timestamp ? formatTimestamp(result.timestamp) : '';
    const entryUuid = result.entry_uuid ?? '';
    const preview = previews.get(entryUuid);
    const role = result.role ?? '';

    const previewHtml = preview
      ? `<div class="thinkt-search-result-preview"><span class="thinkt-search-result-role">[${escapeHtml(role)}]:</span> ${escapeHtml(truncate(preview, PREVIEW_TRUNCATE_LENGTH))}</div>`
      : `<div class="thinkt-search-preview-loading" data-entry-uuid="${escapeHtml(entryUuid)}">${i18n._('Loading preview...')}</div>`;

    li.innerHTML = `
      <div class="thinkt-search-result-header">
        <span class="thinkt-search-result-project">${escapeHtml(result.project_name ?? i18n._('Unknown'))}</span>
        <span class="thinkt-search-result-sep">·</span>
        <span class="thinkt-search-result-session">${escapeHtml(shortenId(result.session_id ?? ''))}</span>
        <span class="thinkt-search-result-source thinkt-search-result-source--${source}">${source}</span>
        <span class="thinkt-search-result-timestamp">${timestamp}</span>
        <span class="thinkt-search-result-relevance ${relevance.className}">${relevance.label}</span>
      </div>
      ${firstPrompt ? `<div class="thinkt-search-result-first-prompt">${firstPrompt}</div>` : ''}
      ${previewHtml}
    `;

    li.addEventListener('click', () => { this.onSelectResult(index); });
    li.addEventListener('mouseenter', () => { this.onHoverResult(index); });

    return li;
  }

  updateSemanticPreviews(results: SemanticSearchResult[], previews: Map<string, string>): void {
    const loadingElements = this.container.querySelectorAll<HTMLElement>('.thinkt-search-preview-loading');
    loadingElements.forEach(el => {
      const uuid = el.dataset.entryUuid;
      if (!uuid) return;
      const preview = previews.get(uuid);
      if (preview) {
        const result = results.find(r => r.entry_uuid === uuid);
        const role = result?.role ?? '';
        el.className = 'thinkt-search-result-preview';
        el.innerHTML = `<span class="thinkt-search-result-role">[${escapeHtml(role)}]:</span> ${escapeHtml(truncate(preview, PREVIEW_TRUNCATE_LENGTH))}`;
      }
    });
  }

  // ============================================
  // State Rendering
  // ============================================

  renderEmpty(): void {
    this.container.innerHTML = `
      <div class="thinkt-search-empty">
        <div class="thinkt-search-empty-icon">🔍</div>
        <div>Type to search across all indexed sessions</div>
      </div>
    `;
  }

  renderLoading(): void {
    this.container.innerHTML = `
      <div class="thinkt-search-loading">
        <div>${i18n._('Searching...')}</div>
      </div>
    `;
  }

  renderError(error: Error): void {
    const isIndexerError = error.message.includes('indexer') || error.message.includes('503');

    if (isIndexerError) {
      this.container.innerHTML = `
        <div class="thinkt-search-no-indexer">
          <div class="thinkt-search-no-indexer-title">${i18n._('Indexer not available')}</div>
          <div>${i18n._('The search feature requires the thinkt-indexer to be installed and configured.')}</div>
        </div>
      `;
    } else {
      this.container.innerHTML = `
        <div class="thinkt-search-error">
          <div>${i18n._('Error: {message}', { message: escapeHtml(error.message) })}</div>
        </div>
      `;
    }
  }

  // ============================================
  // Selection
  // ============================================

  updateSelection(selectedIndex: number): void {
    const results = this.container.querySelectorAll('.thinkt-search-result');
    results.forEach((el, index) => {
      el.classList.toggle('selected', index === selectedIndex);
      if (index === selectedIndex) {
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    });
  }
}

// ============================================
// Utilities (module-private)
// ============================================

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function shortenId(id: string): string {
  if (!id) return '';
  if (id.length > 8) {
    return id.slice(0, 8) + '...';
  }
  return id;
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '...';
}

function formatRelevance(distance: number): { label: string; className: string } {
  if (distance < 0.5) return { label: i18n._('High'), className: '' };
  if (distance < 1.0) return { label: i18n._('Medium'), className: 'medium' };
  return { label: i18n._('Low'), className: 'low' };
}

function formatTimestamp(ts: string): string {
  try {
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return i18n._('today');
    if (diffDays === 1) return i18n._('yesterday');
    if (diffDays < 7) return i18n._('{days}d ago', { days: diffDays });
    if (diffDays < 30) return i18n._('{weeks}w ago', { weeks: Math.floor(diffDays / 7) });
    return date.toLocaleDateString();
  } catch {
    return '';
  }
}
