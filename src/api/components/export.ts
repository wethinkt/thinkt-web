/**
 * Export functionality for conversation traces
 *
 * Provides HTML and Markdown export of conversation entries.
 */

import type { Entry, ToolUseBlock, ToolResultBlock, ThinkingBlock } from '@wethinkt/ts-thinkt';
import { escapeHtml, renderMarkdown } from './conversation-renderers';

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
 * CSS styles for HTML export
 */
const HTML_EXPORT_STYLES = `
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
      color: #333;
    }
    h1 { border-bottom: 2px solid #ddd; padding-bottom: 10px; }
    .entry { margin-bottom: 20px; background: #fff; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .user { background: #e3f2fd; }
    .assistant { }
    .system { background: #f5f5f5; }
    .thinking { background: #fff3e0; padding: 15px; border-radius: 6px; margin-bottom: 10px; }
    .thinking-header { font-weight: 600; color: #e65100; margin-bottom: 5px; }
    .thinking-content { white-space: pre-wrap; font-size: 14px; color: #666; }
    .tool { background: #f3e5f5; padding: 15px; border-radius: 6px; margin-bottom: 10px; }
    .tool-header { font-weight: 600; color: #7b1fa2; margin-bottom: 5px; }
    .tool-content { white-space: pre-wrap; font-size: 13px; font-family: monospace; background: rgba(0,0,0,0.05); padding: 10px; border-radius: 4px; overflow-x: auto; }
    .tool-result { background: #e8f5e9; }
    .tool-result .tool-header { color: #2e7d32; }
    .tool-error { background: #ffebee; }
    .tool-error .tool-header { color: #c62828; }
    .role-header { font-weight: 600; text-transform: uppercase; font-size: 12px; letter-spacing: 0.5px; margin-bottom: 10px; }
    .user .role-header { color: #1565c0; }
    .assistant .role-header { color: #d97750; }
    .system .role-header { color: #666; }
    .text { white-space: pre-wrap; }
    .timestamp { color: #999; font-size: 12px; margin-bottom: 10px; }
    .meta { color: #666; font-size: 12px; margin-top: 20px; padding-top: 10px; border-top: 1px solid #ddd; }
    /* Markdown content */
    .text p { margin: 0 0 0.75em 0; }
    .text p:last-child { margin-bottom: 0; }
    code { background: rgba(0,0,0,0.08); padding: 0.15em 0.4em; border-radius: 3px; font-family: monospace; font-size: 0.9em; }
    pre { background: rgba(0,0,0,0.08); padding: 12px; border-radius: 6px; overflow-x: auto; margin: 0.75em 0; }
    pre code { background: none; padding: 0; }
    blockquote { margin: 0.75em 0; padding: 0.5em 1em; border-left: 3px solid #ddd; background: rgba(0,0,0,0.03); }
    ul, ol { margin: 0.5em 0; padding-left: 1.5em; }
    table { border-collapse: collapse; margin: 0.75em 0; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 6px 10px; }
    th { background: rgba(0,0,0,0.05); }
`;

/**
 * Generate HTML export of the conversation
 */
export function exportAsHtml(entries: Entry[], title: string): string {
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

  for (const entry of entries) {
    const role = entry.role || 'unknown';
    const roleClass = role.toLowerCase();
    const timestamp = entry.timestamp
      ? new Date(entry.timestamp).toLocaleString()
      : '';

    html += `  <div class="entry ${roleClass}">\n`;
    html += `    <div class="role-header">${escapeHtml(role)}</div>\n`;
    if (timestamp) {
      html += `    <div class="timestamp">${escapeHtml(timestamp)}</div>\n`;
    }

    // Render content blocks if available
    if (entry.contentBlocks && entry.contentBlocks.length > 0) {
      for (const block of entry.contentBlocks) {
        html += renderContentBlockToHtml(block);
      }
    } else if (entry.text) {
      html += `    <div class="text">${renderMarkdown(entry.text)}</div>\n`;
    }

    html += `  </div>\n`;
  }

  html += `  <div class="meta">Exported from THINKT on ${new Date().toLocaleString()}</div>
</body>
</html>`;

  return html;
}

/**
 * Render a single content block to HTML for export
 */
function renderContentBlockToHtml(block: Entry['contentBlocks'][number]): string {
  switch (block.type) {
    case 'text':
      return block.text
        ? `    <div class="text">${renderMarkdown(block.text)}</div>\n`
        : '';

    case 'thinking': {
      const thinking = block as ThinkingBlock;
      return `    <details class="thinking">
      <summary class="thinking-header">Thinking</summary>
      <div class="thinking-content">${escapeHtml(thinking.thinking || '')}</div>
    </details>
`;
    }

    case 'tool_use': {
      const toolUse = block as ToolUseBlock;
      const input = JSON.stringify(toolUse.toolInput, null, 2);
      return `    <details class="tool">
      <summary class="tool-header">Tool: ${escapeHtml(toolUse.toolName)}</summary>
      <div class="tool-content">${escapeHtml(input)}</div>
    </details>
`;
    }

    case 'tool_result': {
      const toolResult = block as ToolResultBlock;
      const resultClass = toolResult.isError ? 'tool tool-error' : 'tool tool-result';
      const headerText = toolResult.isError ? 'Error' : 'Result';
      return `    <details class="${resultClass}">
      <summary class="tool-header">${headerText}</summary>
      <div class="tool-content">${escapeHtml(String(toolResult.toolResult || ''))}</div>
    </details>
`;
    }

    default:
      return '';
  }
}

/**
 * Generate Markdown export of the conversation
 */
export function exportAsMarkdown(entries: Entry[], title: string): string {
  let md = `# ${title}\n\n`;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const role = entry.role || 'unknown';
    const timestamp = entry.timestamp
      ? new Date(entry.timestamp).toLocaleString()
      : '';

    md += `---\n\n`;
    md += `## ${role.charAt(0).toUpperCase() + role.slice(1)}`;
    if (timestamp) {
      md += ` (${timestamp})`;
    }
    md += `\n\n`;

    // Render content blocks if available
    if (entry.contentBlocks && entry.contentBlocks.length > 0) {
      for (const block of entry.contentBlocks) {
        md += renderContentBlockToMarkdown(block);
      }
    } else if (entry.text) {
      md += `${entry.text}\n\n`;
    }
  }

  md += `---\n\n*Exported from THINKT on ${new Date().toLocaleString()}*\n`;

  return md;
}

/**
 * Render a single content block to Markdown for export
 */
function renderContentBlockToMarkdown(block: Entry['contentBlocks'][number]): string {
  switch (block.type) {
    case 'text':
      return block.text ? `${block.text}\n\n` : '';

    case 'thinking': {
      const thinking = block as ThinkingBlock;
      return `<details>
<summary>Thinking</summary>

\`\`\`
${thinking.thinking || ''}
\`\`\`

</details>

`;
    }

    case 'tool_use': {
      const toolUse = block as ToolUseBlock;
      const input = JSON.stringify(toolUse.toolInput, null, 2);
      return `<details>
<summary>Tool: ${toolUse.toolName}</summary>

\`\`\`json
${input}
\`\`\`

</details>

`;
    }

    case 'tool_result': {
      const toolResult = block as ToolResultBlock;
      const label = toolResult.isError ? 'Error' : 'Result';
      return `<details>
<summary>${label}</summary>

\`\`\`
${String(toolResult.toolResult || '')}
\`\`\`

</details>

`;
    }

    default:
      return '';
  }
}
