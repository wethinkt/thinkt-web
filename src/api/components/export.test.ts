/**
 * Tests for export functionality
 */

import { describe, it, expect, beforeAll } from 'vitest';

beforeAll(() => {
  const mockDocument = {
    createElement: () => ({
      textContent: '',
      get innerHTML() {
        return this.textContent;
      },
      set innerHTML(value: string) {
        this.textContent = value;
      },
    }),
  } as unknown as Document;

  Object.defineProperty(globalThis, 'document', {
    value: mockDocument,
    configurable: true,
    writable: true,
  });
});

// Dynamic import after setting up mock
async function loadExport() {
  const mod = await import('./export');
  return mod;
}

import type { Entry } from '@wethinkt/ts-thinkt';

describe('getSafeFilename', () => {
  it('should convert spaces to dashes', async () => {
    const { getSafeFilename } = await loadExport();
    expect(getSafeFilename('Hello World')).toBe('hello-world');
  });

  it('should remove special characters', async () => {
    const { getSafeFilename } = await loadExport();
    // Note: trailing special chars become trailing dash
    expect(getSafeFilename('Test: File!')).toBe('test-file');
    expect(getSafeFilename('Test @#$')).toBe('test-');
  });

  it('should truncate long names', async () => {
    const { getSafeFilename } = await loadExport();
    const long = 'a'.repeat(100);
    expect(getSafeFilename(long).length).toBe(50);
  });

  it('should default to conversation', async () => {
    const { getSafeFilename } = await loadExport();
    expect(getSafeFilename('')).toBe('conversation');
    expect(getSafeFilename('!!!')).toBe('conversation');
  });
});

describe('exportAsHtml', () => {
  const createEntry = (role: 'user' | 'assistant' | 'system', contentBlocks: Entry['contentBlocks']): Entry => ({
    role,
    contentBlocks,
    timestamp: new Date('2024-01-15T10:30:00Z'),
    uuid: `test-${Math.random()}`,
    source: 'claude',
  });

  it('should export user and assistant entries separately', async () => {
    const { exportAsHtml } = await loadExport();
    const entries: Entry[] = [
      createEntry('user', [{ type: 'text', text: 'Hello!' }]),
      createEntry('assistant', [{ type: 'text', text: 'Hi there!' }]),
    ];

    const html = exportAsHtml(entries, 'Test Conversation');
    
    expect(html).toContain('Test Conversation');
    expect(html).toContain('Hello!');
    expect(html).toContain('Hi there!');
    expect(html).toContain('role-user');
    expect(html).toContain('role-assistant');
    // Should have two separate entries
    const entryMatches = html.match(/class="entry"/g);
    expect(entryMatches?.length).toBe(2);
  });

  it('should show thinking in its own box', async () => {
    const { exportAsHtml } = await loadExport();
    const entries: Entry[] = [
      createEntry('assistant', [
        { type: 'text', text: 'Let me think...' },
        { type: 'thinking', thinking: 'Deep thought...' },
        { type: 'text', text: 'Here is the answer.' },
      ]),
    ];

    const html = exportAsHtml(entries, 'Test');
    
    // Should have thinking block in the content
    expect(html).toContain('Deep thought...');
    expect(html).toContain('class="thinking"');
    expect(html).toContain('Let me think...');
    expect(html).toContain('Here is the answer.');
  });

  it('should show tools in their own boxes', async () => {
    const { exportAsHtml } = await loadExport();
    const entries: Entry[] = [
      createEntry('assistant', [
        { type: 'text', text: 'Let me check...' },
        { type: 'tool_use', toolName: 'read_file', toolInput: { path: 'test.txt' }, toolUseId: 'tool-1' },
        { type: 'text', text: 'Done!' },
      ]),
    ];

    const html = exportAsHtml(entries, 'Test');
    
    // Should have tool block
    expect(html).toContain('read_file');
    expect(html).toContain('class="tool"');
    expect(html).toContain('Let me check...');
    expect(html).toContain('Done!');
  });

  it('should filter out user entries when user filter is false', async () => {
    const { exportAsHtml } = await loadExport();
    const entries: Entry[] = [
      createEntry('user', [{ type: 'text', text: 'User message' }]),
      createEntry('assistant', [{ type: 'text', text: 'Assistant message' }]),
    ];

    const filters = {
      user: false,
      assistant: true,
      thinking: true,
      toolUse: true,
      toolResult: true,
      system: false,
    };

    const html = exportAsHtml(entries, 'Test', filters);
    
    const bodyMatch = html.match(/<body>([\s\S]*)<\/body>/);
    const bodyContent = bodyMatch ? bodyMatch[1] : html;
    expect(bodyContent).not.toContain('User message');
    expect(bodyContent).toContain('Assistant message');
  });

  it('should skip thinking blocks when thinking filter is false', async () => {
    const { exportAsHtml } = await loadExport();
    const entries: Entry[] = [
      createEntry('assistant', [
        { type: 'text', text: 'Hello' },
        { type: 'thinking', thinking: 'Secret thought' },
        { type: 'text', text: 'World' },
      ]),
    ];

    const filters = {
      user: true,
      assistant: true,
      thinking: false, // Disable thinking
      toolUse: true,
      toolResult: true,
      system: false,
    };

    const html = exportAsHtml(entries, 'Test', filters);
    
    const bodyMatch = html.match(/<body>([\s\S]*)<\/body>/);
    const bodyContent = bodyMatch ? bodyMatch[1] : html;
    expect(bodyContent).toContain('Hello');
    expect(bodyContent).toContain('World');
    expect(bodyContent).not.toContain('Secret thought');
  });

  it('should skip tool blocks when toolUse filter is false', async () => {
    const { exportAsHtml } = await loadExport();
    const entries: Entry[] = [
      createEntry('assistant', [
        { type: 'text', text: 'Before tool' },
        { type: 'tool_use', toolName: 'read_file', toolInput: { path: 'test.txt' }, toolUseId: 'tool-1' },
        { type: 'text', text: 'After tool' },
      ]),
    ];

    const filters = {
      user: true,
      assistant: true,
      thinking: true,
      toolUse: false, // Disable tool use
      toolResult: true,
      system: false,
    };

    const html = exportAsHtml(entries, 'Test', filters);
    
    const bodyMatch = html.match(/<body>([\s\S]*)<\/body>/);
    const bodyContent = bodyMatch ? bodyMatch[1] : html;
    expect(bodyContent).toContain('Before tool');
    expect(bodyContent).toContain('After tool');
    expect(bodyContent).not.toContain('read_file');
  });

  it('should handle entries with text property (no contentBlocks)', async () => {
    const { exportAsHtml } = await loadExport();
    const entries = [
      { role: 'user' as const, text: 'Plain text entry', timestamp: new Date(), uuid: 'test-1', source: 'claude' as const, contentBlocks: [] },
    ] as Entry[];

    const html = exportAsHtml(entries, 'Test');
    
    expect(html).toContain('Plain text entry');
  });

  it('should skip entries with empty contentBlocks array', async () => {
    const { exportAsHtml } = await loadExport();
    const entries: Entry[] = [
      { role: 'user', contentBlocks: [], timestamp: new Date(), uuid: 'test-1', source: 'claude' },
    ];

    const html = exportAsHtml(entries, 'Test');
    
    expect(html).toContain('Test');
    // Should NOT have entry since no visible content
    expect(html).not.toContain('class="entry"');
  });

  it('should be case insensitive with roles', async () => {
    const { exportAsHtml } = await loadExport();
    const entries: Entry[] = [
      { role: 'USER' as 'user', contentBlocks: [{ type: 'text', text: 'Uppercase' }], timestamp: new Date(), uuid: '1', source: 'claude' },
      { role: 'Assistant' as 'assistant', contentBlocks: [{ type: 'text', text: 'Mixed' }], timestamp: new Date(), uuid: '2', source: 'claude' },
    ];

    const html = exportAsHtml(entries, 'Test');
    
    expect(html).toContain('Uppercase');
    expect(html).toContain('Mixed');
  });
});

describe('exportAsMarkdown', () => {
  const createEntry = (role: 'user' | 'assistant' | 'system', contentBlocks: Entry['contentBlocks']): Entry => ({
    role,
    contentBlocks,
    timestamp: new Date('2024-01-15T10:30:00Z'),
    uuid: `test-${Math.random()}`,
    source: 'claude',
  });

  it('should export user and assistant entries separately', async () => {
    const { exportAsMarkdown } = await loadExport();
    const entries: Entry[] = [
      createEntry('user', [{ type: 'text', text: 'Hello!' }]),
      createEntry('assistant', [{ type: 'text', text: 'Hi there!' }]),
    ];

    const md = exportAsMarkdown(entries, 'Test Conversation');
    
    expect(md).toContain('# Test Conversation');
    expect(md).toContain('## User');
    expect(md).toContain('## Assistant');
    expect(md).toContain('Hello!');
    expect(md).toContain('Hi there!');
  });

  it('should show thinking blocks in markdown', async () => {
    const { exportAsMarkdown } = await loadExport();
    const entries: Entry[] = [
      createEntry('assistant', [
        { type: 'text', text: 'Let me think...' },
        { type: 'thinking', thinking: 'Deep thought...' },
      ]),
    ];

    const md = exportAsMarkdown(entries, 'Test');
    
    expect(md).toContain('Let me think...');
    expect(md).toContain('Deep thought...');
    expect(md).toContain('<details>');
    expect(md).toContain('Thinking');
  });

  it('should filter entries based on filter state', async () => {
    const { exportAsMarkdown } = await loadExport();
    const entries: Entry[] = [
      createEntry('user', [{ type: 'text', text: 'User message' }]),
      createEntry('assistant', [{ type: 'text', text: 'Assistant message' }]),
    ];

    const filters = {
      user: false,
      assistant: true,
      thinking: true,
      toolUse: true,
      toolResult: true,
      system: false,
    };

    const md = exportAsMarkdown(entries, 'Test', filters);
    
    expect(md).not.toContain('User message');
    expect(md).toContain('Assistant message');
  });
});
