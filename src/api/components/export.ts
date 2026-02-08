/**
 * Export functionality for conversation traces
 *
 * Provides HTML and Markdown export of conversation entries.
 */

import type { Entry, ThinkingBlock, ToolUseBlock, ToolResultBlock } from '@wethinkt/ts-thinkt';
import { escapeHtml, renderMarkdown, formatToolSummary, formatDuration } from './conversation-renderers';

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
 * CSS styles for HTML export - matches ConversationView styling
 */
const HTML_EXPORT_STYLES = `
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      line-height: 1.6;
      max-width: 900px;
      margin: 0 auto;
      padding: 16px;
      background: #0a0a0a;
      color: #e0e0e0;
    }
    h1 { 
      font-size: 16px;
      font-weight: 500;
      margin-bottom: 16px;
      padding-bottom: 10px;
      border-bottom: 1px solid #2a2a2a;
      color: #e0e0e0;
    }
    
    /* Entry cards - matches .thinkt-conversation-entry */
    .entry { 
      margin-bottom: 16px;
      border-radius: 8px;
      border: 1px solid #2a2a2a;
      background: #141414;
      overflow: hidden;
    }
    
    /* Entry header - matches .thinkt-conversation-entry__header */
    .entry-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.03);
      border-bottom: 1px solid #2a2a2a;
    }
    
    .role {
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .role-user { color: #6366f1; }
    .role-assistant { color: #d97750; }
    .role-system { color: #888; }
    .role-tool { color: #19c39b; }
    
    .timestamp {
      margin-left: auto;
      font-size: 11px;
      color: #666;
    }
    
    /* Content area - matches .thinkt-conversation-entry__content */
    .content {
      padding: 12px;
    }
    
    /* Text blocks - matches .thinkt-conversation-entry__text */
    .text {
      white-space: pre-wrap;
      word-break: break-word;
    }
    
    /* Markdown content - matches .thinkt-conversation-entry__text--markdown */
    .text h1, .text h2, .text h3, .text h4, .text h5, .text h6 {
      margin: 1em 0 0.5em;
      line-height: 1.3;
      color: #e0e0e0;
    }
    .text h1:first-child, .text h2:first-child, .text h3:first-child { margin-top: 0; }
    .text h1 { font-size: 1.4em; }
    .text h2 { font-size: 1.2em; }
    .text h3 { font-size: 1.1em; }
    .text p { margin: 0.5em 0; }
    .text p:first-child { margin-top: 0; }
    .text p:last-child { margin-bottom: 0; }
    .text ul, .text ol { margin: 0.5em 0; padding-left: 1.5em; }
    .text li { margin: 0.2em 0; }
    .text blockquote { margin: 0.5em 0; padding: 0.5em 1em; border-left: 3px solid #444; color: #aaa; background: rgba(255, 255, 255, 0.02); }
    .text a { color: #6366f1; text-decoration: none; }
    .text a:hover { text-decoration: underline; }
    .text code { font-family: 'SF Mono', Monaco, monospace; font-size: 0.9em; padding: 0.15em 0.4em; background: rgba(255, 255, 255, 0.08); border-radius: 3px; }
    .text pre { margin: 0.5em 0; border-radius: 6px; border: 1px solid #2a2a2a; overflow: hidden; background: rgba(0, 0, 0, 0.3); }
    .text pre code { display: block; padding: 10px 12px; background: none; border-radius: 0; overflow-x: auto; font-size: 12px; line-height: 1.5; }
    .text table { border-collapse: collapse; margin: 0.5em 0; width: 100%; }
    .text th, .text td { border: 1px solid #333; padding: 6px 10px; text-align: left; }
    .text th { background: rgba(255, 255, 255, 0.05); font-weight: 600; }
    .text hr { border: none; border-top: 1px solid #333; margin: 1em 0; }
    .text img { max-width: 100%; }
    
    /* Thinking blocks - matches .thinkt-thinking-block */
    .thinking {
      margin-top: 12px;
      border-radius: 4px;
      background: rgba(99, 102, 241, 0.08);
      border-left: 3px solid #6366f1;
      overflow: hidden;
    }
    .thinking-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      cursor: pointer;
      user-select: none;
      transition: background 0.12s ease;
    }
    .thinking-header:hover { background: rgba(99, 102, 241, 0.06); }
    .thinking-toggle { font-size: 10px; color: #6366f1; transition: transform 0.15s ease; }
    .thinking-label { font-size: 11px; font-weight: 600; color: #6366f1; }
    .thinking-content {
      display: none;
      padding: 8px 12px;
      font-style: italic;
      color: #a5a6f3;
      white-space: pre-wrap;
      word-break: break-word;
      border-top: 1px solid rgba(99, 102, 241, 0.15);
      max-height: 400px;
      overflow-y: auto;
    }
    .thinking.expanded .thinking-content { display: block; }
    .thinking.expanded .thinking-toggle { transform: rotate(90deg); }
    
    /* Tool calls - matches .thinkt-tool-call */
    .tool {
      margin-top: 8px;
      border-radius: 4px;
      background: rgba(25, 195, 155, 0.06);
      border-left: 3px solid #19c39b;
      overflow: hidden;
    }
    .tool-header {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      cursor: pointer;
      user-select: none;
      font-size: 12px;
      transition: background 0.12s ease;
    }
    .tool-header:hover { background: rgba(25, 195, 155, 0.06); }
    .tool-toggle { font-size: 10px; color: #19c39b; transition: transform 0.15s ease; }
    .tool-bullet { color: #666; }
    .tool-name { font-weight: 600; color: #19c39b; }
    .tool-summary { color: #999; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; font-family: 'SF Mono', Monaco, monospace; font-size: 11px; }
    .tool-content {
      display: none;
      padding: 8px 12px;
      border-top: 1px solid rgba(25, 195, 155, 0.15);
      font-family: 'SF Mono', Monaco, monospace;
      font-size: 11px;
      background: rgba(0, 0, 0, 0.3);
      overflow-x: auto;
      max-height: 300px;
      overflow-y: auto;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .tool.expanded .tool-content { display: block; }
    .tool.expanded .tool-toggle { transform: rotate(90deg); }
    
    /* Tool result blocks */
    .tool-result { background: rgba(34, 197, 94, 0.1); border-left-color: #22c55e; }
    .tool-result .tool-header:hover { background: rgba(34, 197, 94, 0.06); }
    .tool-result .tool-toggle { color: #22c55e; }
    .tool-result .tool-label { color: #22c55e; }
    
    .tool-error { background: rgba(239, 68, 68, 0.1); border-left-color: #ef4444; }
    .tool-error .tool-header:hover { background: rgba(239, 68, 68, 0.06); }
    .tool-error .tool-toggle { color: #ef4444; }
    .tool-error .tool-label { color: #ef4444; }
    
    /* Inline tool result (nested inside tool call) */
    .tool-result-inline {
      margin-top: 4px;
      border-top: 1px solid rgba(25, 195, 155, 0.15);
    }
    .tool-result-inline .tool-header {
      background: rgba(34, 197, 94, 0.08);
    }
    .tool-result-inline.tool-result--error .tool-header {
      background: rgba(239, 68, 68, 0.08);
    }
    
    /* Meta footer */
    .meta { 
      color: #666; 
      font-size: 11px; 
      margin-top: 20px; 
      padding-top: 10px; 
      border-top: 1px solid #2a2a2a; 
    }
    
    /* Empty state */
    .empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px;
      color: #666;
      text-align: center;
    }
    .empty-icon { font-size: 40px; margin-bottom: 12px; opacity: 0.4; }
    .empty-title { font-size: 16px; font-weight: 500; margin-bottom: 6px; color: #e0e0e0; }
`;

/**
 * Generate HTML export of the conversation
 * Each block type (thinking, tool, output) gets its own box
 */
export function exportAsHtml(entries: Entry[], title: string, filterState?: ExportFilterState): string {
  // Default: show user/assistant/thinking/tool/toolResult (exclude system)
  const filters = filterState ?? {
    user: true,
    assistant: true,
    thinking: true,
    toolUse: true,
    toolResult: true,
    system: false,
  };

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
  // Default: show user/assistant/thinking/tool/toolResult (exclude system)
  const filters = filterState ?? {
    user: true,
    assistant: true,
    thinking: true,
    toolUse: true,
    toolResult: true,
    system: false,
  };

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

