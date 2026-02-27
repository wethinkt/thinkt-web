/**
 * Export functionality for conversation traces
 *
 * Provides HTML and Markdown export of conversation entries.
 */

import type { Entry, ThinkingBlock, ToolUseBlock, ToolResultBlock } from '@wethinkt/ts-thinkt';
import { escapeHtml, renderMarkdown, formatToolSummary, formatDuration } from './conversation-renderers';
import HTML_EXPORT_STYLES from './export-styles.css?inline';

/**
 * Filter state for export - matches FilterState from ConversationView
 */
export interface ExportFilterState {
  user: boolean;
  assistant: boolean;
  thinking: boolean;
  toolUse: boolean;
  toolResult: boolean;
  system: boolean;
}

export interface RawJsonExportPayload {
  schema: 'thinkt.conversation.export';
  version: 1;
  exportedAt: string;
  title: string;
  sourcePath?: string;
  filters: ExportFilterState;
  entries: Entry[];
  visibleEntries: Entry[];
}

export interface RawJsonExportOptions {
  sourcePath?: string;
}

function getDefaultExportFilters(): ExportFilterState {
  return {
    user: true,
    assistant: true,
    thinking: true,
    toolUse: true,
    toolResult: true,
    system: false,
  };
}

function normalizeExportFilters(filterState?: ExportFilterState): ExportFilterState {
  return filterState ?? getDefaultExportFilters();
}

function isRoleVisible(role: string | undefined, filters: ExportFilterState): boolean {
  const normalizedRole = (role || 'unknown').toLowerCase();
  if (normalizedRole === 'user') return filters.user;
  if (normalizedRole === 'assistant') return filters.assistant;
  if (normalizedRole === 'system') return filters.system;
  return false;
}

function filterVisibleEntries(entries: Entry[], filters: ExportFilterState): Entry[] {
  const visibleEntries: Entry[] = [];

  for (const entry of entries) {
    if (!isRoleVisible(entry.role, filters)) {
      continue;
    }

    const contentBlocks = entry.contentBlocks ?? [];
    if (contentBlocks.length === 0) {
      if (entry.text && entry.text.trim()) {
        visibleEntries.push({ ...entry });
      }
      continue;
    }

    const visibleBlocks = contentBlocks.filter((block) => {
      switch (block.type) {
        case 'text':
          return Boolean(block.text && block.text.trim());
        case 'thinking':
          return filters.thinking;
        case 'tool_use':
          return filters.toolUse;
        case 'tool_result':
          return filters.toolResult;
        default:
          return true;
      }
    });

    if (visibleBlocks.length > 0) {
      visibleEntries.push({ ...entry, contentBlocks: visibleBlocks });
    }
  }

  return visibleEntries;
}

/**
 * Get a safe filename from the conversation title
 */
export function getSafeFilename(title: string): string {
  return (
    title
      .replace(/[^a-z0-9\s-]/gi, '')
      .replace(/\s+/g, '-')
      .substring(0, 50)
      .toLowerCase() || 'conversation'
  );
}

/**
 * Trigger a file download
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate HTML export of the conversation
 * Each block type (thinking, tool, output) gets its own box
 */
export function exportAsHtml(entries: Entry[], title: string, filterState?: ExportFilterState): string {
  const filters = normalizeExportFilters(filterState);

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>${HTML_EXPORT_STYLES}</style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
`;

  // Build tool result index for pairing
  const toolResultIndex = new Map<string, ToolResultBlock>();
  for (const entry of entries) {
    for (const block of entry.contentBlocks || []) {
      if (block.type === 'tool_result') {
        const result = block as ToolResultBlock;
        toolResultIndex.set(result.toolUseId, result);
      }
    }
  }

  const inlinedToolResults = new Set<string>();

  for (const entry of entries) {
    const role = (entry.role || 'unknown').toLowerCase();
    const timestamp = entry.timestamp
      ? new Date(entry.timestamp).toLocaleString()
      : '';

    // Check role filter
    const isUser = role === 'user';
    const isAssistant = role === 'assistant';
    const isSystem = role === 'system';

    if (isUser && !filters.user) continue;
    if (isAssistant && !filters.assistant) continue;
    if (isSystem && !filters.system) continue;
    if (!isUser && !isAssistant && !isSystem) continue;

    // Build content
    let contentHtml = '';
    let hasVisibleContent = false;

    if (entry.contentBlocks && entry.contentBlocks.length > 0) {
      for (const block of entry.contentBlocks) {
        switch (block.type) {
          case 'text': {
            if (block.text && block.text.trim()) {
              contentHtml += `      <div class="text">${renderMarkdown(block.text)}</div>\n`;
              hasVisibleContent = true;
            }
            break;
          }
          case 'thinking': {
            if (filters.thinking) {
              contentHtml += renderThinkingBlockToHtml(block as ThinkingBlock);
              hasVisibleContent = true;
            }
            break;
          }
          case 'tool_use': {
            if (filters.toolUse) {
              const toolUse = block as ToolUseBlock;
              const result = toolResultIndex.get(toolUse.toolUseId);
              if (result) {
                inlinedToolResults.add(toolUse.toolUseId);
              }
              contentHtml += renderToolCallToHtml(toolUse, result, filters);
              hasVisibleContent = true;
            }
            break;
          }
          case 'tool_result': {
            const toolResult = block as ToolResultBlock;
            // Only show if not already inlined with its tool_use
            if (filters.toolResult && !inlinedToolResults.has(toolResult.toolUseId)) {
              contentHtml += renderToolResultBlockToHtml(toolResult);
              hasVisibleContent = true;
            }
            break;
          }
        }
      }
    }

    // Also check entry.text for text-only entries (only if no contentBlocks)
    if ((!entry.contentBlocks || entry.contentBlocks.length === 0) && entry.text && entry.text.trim()) {
      contentHtml += `      <div class="text">${renderMarkdown(entry.text)}</div>\n`;
      hasVisibleContent = true;
    }

    // Skip entries with no visible content
    if (!hasVisibleContent) continue;

    // Output entry
    html += `  <div class="entry">\n`;
    html += `    <div class="entry-header">\n`;
    html += `      <span class="role role-${role}">${escapeHtml(role)}</span>\n`;
    if (timestamp) {
      html += `      <span class="timestamp">${escapeHtml(timestamp)}</span>\n`;
    }
    html += `    </div>\n`;
    html += `    <div class="content">\n`;
    html += contentHtml;
    html += `    </div>\n`;
    html += `  </div>\n`;
  }

  html += `  <div class="meta">Exported from THINKT on ${new Date().toLocaleString()}</div>
</body>
</html>`;

  return html;
}

/**
 * Render thinking block to HTML
 */
function renderThinkingBlockToHtml(thinking: ThinkingBlock): string {
  const duration = thinking.durationMs ? ` (${formatDuration(thinking.durationMs)})` : '';
  return `      <div class="thinking">
        <div class="thinking-header">
          <span class="thinking-toggle">▶</span>
          <span class="thinking-label">Thinking${duration}</span>
        </div>
        <div class="thinking-content">${escapeHtml(thinking.thinking || '')}</div>
      </div>
`;
}

/**
 * Render tool call to HTML, optionally with inline result
 */
function renderToolCallToHtml(toolUse: ToolUseBlock, result: ToolResultBlock | undefined, filters: ExportFilterState): string {
  const input = JSON.stringify(toolUse.toolInput, null, 2);
  const summary = formatToolSummary(toolUse.toolName, toolUse.toolInput);
  const summaryHtml = summary ? `<span class="tool-summary">(${escapeHtml(summary)})</span>` : '';

  // Build result HTML if available and filter allows
  let resultHtml = '';
  if (result && filters.toolResult) {
    const resultClass = result.isError ? 'tool-result--error' : '';
    const resultLabel = result.isError ? 'Error' : 'Result';
    const duration = result.durationMs ? ` (${formatDuration(result.durationMs)})` : '';
    resultHtml = `
        <div class="tool-result-inline ${resultClass}">
          <div class="tool-header">
            <span class="tool-toggle">▶</span>
            <span class="tool-label">${resultLabel}${duration}</span>
          </div>
          <div class="tool-content">${escapeHtml(String(result.toolResult || ''))}</div>
        </div>`;
  }

  return `      <div class="tool">
        <div class="tool-header">
          <span class="tool-toggle">▶</span>
          <span class="tool-bullet">•</span>
          <span class="tool-name">${escapeHtml(toolUse.toolName)}</span>
          ${summaryHtml}
        </div>
        <div class="tool-content">${escapeHtml(input)}</div>${resultHtml}
      </div>
`;
}

/**
 * Render standalone tool result block to HTML (for tool_results not paired with tool_use)
 */
function renderToolResultBlockToHtml(toolResult: ToolResultBlock): string {
  const resultClass = toolResult.isError ? 'tool tool-error' : 'tool tool-result';
  const labelText = toolResult.isError ? 'Error' : 'Result';
  const duration = toolResult.durationMs ? ` (${formatDuration(toolResult.durationMs)})` : '';
  return `      <div class="${resultClass}">
        <div class="tool-header">
          <span class="tool-toggle">▶</span>
          <span class="tool-label">${labelText}${duration}</span>
        </div>
        <div class="tool-content">${escapeHtml(String(toolResult.toolResult || ''))}</div>
      </div>
`;
}

/**
 * Generate Markdown export of the conversation
 * Each block type (thinking, tool, output) shown separately
 */
export function exportAsMarkdown(entries: Entry[], title: string, filterState?: ExportFilterState): string {
  const filters = normalizeExportFilters(filterState);

  let md = `# ${title}\n\n`;

  // Build tool result index for pairing
  const toolResultIndex = new Map<string, ToolResultBlock>();
  for (const entry of entries) {
    for (const block of entry.contentBlocks || []) {
      if (block.type === 'tool_result') {
        const result = block as ToolResultBlock;
        toolResultIndex.set(result.toolUseId, result);
      }
    }
  }

  const inlinedToolResults = new Set<string>();

  for (const entry of entries) {
    const role = (entry.role || 'unknown').toLowerCase();

    // Check role filter
    const isUser = role === 'user';
    const isAssistant = role === 'assistant';
    const isSystem = role === 'system';

    if (isUser && !filters.user) continue;
    if (isAssistant && !filters.assistant) continue;
    if (isSystem && !filters.system) continue;
    if (!isUser && !isAssistant && !isSystem) continue;

    // Build content
    let contentMd = '';

    if (entry.contentBlocks && entry.contentBlocks.length > 0) {
      for (const block of entry.contentBlocks) {
        switch (block.type) {
          case 'text': {
            if (block.text && block.text.trim()) {
              contentMd += block.text + '\n\n';
            }
            break;
          }
          case 'thinking': {
            if (filters.thinking) {
              const thinking = block as ThinkingBlock;
              const duration = thinking.durationMs ? ` (${formatDuration(thinking.durationMs)})` : '';
              contentMd += `<details>\n<summary>Thinking${duration}</summary>\n\n\`\`\`\n${thinking.thinking || ''}\n\`\`\`\n\n</details>\n\n`;
            }
            break;
          }
          case 'tool_use': {
            if (filters.toolUse) {
              const toolUse = block as ToolUseBlock;
              const input = JSON.stringify(toolUse.toolInput, null, 2);
              const summary = formatToolSummary(toolUse.toolName, toolUse.toolInput);
              const summaryText = summary ? ` (${summary})` : '';
              
              contentMd += `<details>\n<summary>Tool: ${toolUse.toolName}${summaryText}</summary>\n\n\`\`\`json\n${input}\n\`\`\`\n\n</details>\n\n`;

              // Inline result if available
              const result = toolResultIndex.get(toolUse.toolUseId);
              if (result) {
                inlinedToolResults.add(toolUse.toolUseId);
                if (filters.toolResult) {
                  const label = result.isError ? 'Error' : 'Result';
                  contentMd += `<details>\n<summary>${label}</summary>\n\n\`\`\`\n${String(result.toolResult || '')}\n\`\`\`\n\n</details>\n\n`;
                }
              }
            }
            break;
          }
          case 'tool_result': {
            const toolResult = block as ToolResultBlock;
            if (filters.toolResult && !inlinedToolResults.has(toolResult.toolUseId)) {
              const label = toolResult.isError ? 'Error' : 'Result';
              contentMd += `<details>\n<summary>${label}</summary>\n\n\`\`\`\n${String(toolResult.toolResult || '')}\n\`\`\`\n\n</details>\n\n`;
            }
            break;
          }
        }
      }
    }

    // Also check entry.text for text-only entries (only if no contentBlocks)
    if ((!entry.contentBlocks || entry.contentBlocks.length === 0) && entry.text && entry.text.trim()) {
      contentMd += entry.text + '\n\n';
    }

    // Skip entries with no visible content
    if (!contentMd.trim()) continue;

    const timestamp = entry.timestamp
      ? new Date(entry.timestamp).toLocaleString()
      : '';

    md += `---\n\n`;
    md += `## ${role.charAt(0).toUpperCase() + role.slice(1)}`;
    if (timestamp) {
      md += ` (${timestamp})`;
    }
    md += `\n\n`;
    md += contentMd;
  }

  md += `---\n\n*Exported from THINKT on ${new Date().toLocaleString()}*\n`;

  return md;
}

/**
 * Generate raw JSON export of the conversation.
 */
export function exportAsRawJson(
  entries: Entry[],
  title: string,
  filterState?: ExportFilterState,
  options?: RawJsonExportOptions,
): string {
  const filters = normalizeExportFilters(filterState);
  const payload: RawJsonExportPayload = {
    schema: 'thinkt.conversation.export',
    version: 1,
    exportedAt: new Date().toISOString(),
    title,
    ...(options?.sourcePath ? { sourcePath: options.sourcePath } : {}),
    filters,
    entries,
    visibleEntries: filterVisibleEntries(entries, filters),
  };

  return JSON.stringify(payload, null, 2);
}
