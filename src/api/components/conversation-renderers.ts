/**
 * Conversation Renderers
 *
 * Pure helper functions for rendering conversation content:
 * - HTML escaping
 * - Tool call summary formatting
 * - Markdown rendering (via marked)
 */

import { Marked, type MarkedOptions } from 'marked';

// ============================================
// HTML Escaping
// ============================================

const escapeEl = document.createElement('div');

export function escapeHtml(text: string): string {
  escapeEl.textContent = text;
  return escapeEl.innerHTML;
}

// ============================================
// Tool Summary
// ============================================

/** Map of tool names to the key whose value should be shown in the summary */
const TOOL_PRIMARY_KEYS: Record<string, string> = {
  Read: 'file_path',
  ReadFile: 'file_path',
  Write: 'file_path',
  Edit: 'file_path',
  Glob: 'pattern',
  Grep: 'pattern',
  Bash: 'command',
  WebFetch: 'url',
  WebSearch: 'query',
  Task: 'description',
  NotebookEdit: 'notebook_path',
};

/** Max length for the primary arg display */
const MAX_ARG_LEN = 80;

/**
 * Produce a compact one-line summary of a tool call.
 * E.g. `Read` → `src/main.ts`, `Bash` → `npm run build`, `Grep` → `TODO`
 */
export function formatToolSummary(toolName: string, toolInput: unknown): string {
  if (!toolInput || typeof toolInput !== 'object') return '';

  const input = toolInput as Record<string, unknown>;

  // Try the well-known primary key first
  const primaryKey = TOOL_PRIMARY_KEYS[toolName];
  if (primaryKey && input[primaryKey] != null) {
    return truncate(String(input[primaryKey]), MAX_ARG_LEN);
  }

  // Fallback: show the first string-valued key
  for (const val of Object.values(input)) {
    if (typeof val === 'string' && val.length > 0) {
      return truncate(val, MAX_ARG_LEN);
    }
  }

  return '';
}

function truncate(s: string, max: number): string {
  // Replace newlines with spaces for display
  const flat = s.replace(/\n/g, ' ');
  if (flat.length <= max) return flat;
  return flat.slice(0, max - 1) + '\u2026';
}

// ============================================
// Markdown Rendering
// ============================================

let markedInstance: Marked | null = null;

function getMarked(): Marked {
  if (markedInstance) return markedInstance;

  markedInstance = new Marked();

  const options: MarkedOptions = {
    gfm: true,
    breaks: false,
  };

  markedInstance.setOptions(options);
  markedInstance.use({
    renderer: {
      // Wrap code blocks with header + copy button
      code(token) {
        const lang = token.lang ? escapeHtml(token.lang) : '';
        const code = escapeHtml(token.text);
        const langLabel = lang
          ? `<span class="thinkt-code-block__lang">${lang}</span>`
          : '<span class="thinkt-code-block__lang">code</span>';
        return `<div class="thinkt-code-block">
          <div class="thinkt-code-block__header">
            ${langLabel}
            <button class="thinkt-copy-btn" data-copy-action="code">Copy</button>
          </div>
          <pre><code>${code}</code></pre>
        </div>`;
      },
      // Escape raw HTML tags to prevent XSS (no DOMPurify needed)
      html(token) {
        return escapeHtml(token.text);
      },
    },
  });

  return markedInstance;
}

/**
 * Render markdown text to HTML.
 * Uses GFM, escapes raw HTML, wraps code blocks with copy buttons.
 */
export function renderMarkdown(text: string): string {
  const marked = getMarked();
  return marked.parse(text, { async: false }) as string;
}

// ============================================
// Duration Formatting
// ============================================

export function formatDuration(ms: number | undefined): string {
  if (ms == null || ms <= 0) return '';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}
