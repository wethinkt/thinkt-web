/**
 * API Adapters Tests
 */

import { describe, it, expect } from 'vitest';
import {
  convertApiEntry,
  convertApiToSession,
  convertApiSessionMeta,
  convertToApiEntry,
} from '../components/api-adapters';
import type { Entry as ApiEntry, SessionMeta } from '../client';

describe('API Adapters', () => {
  describe('convertApiEntry', () => {
    it('should convert basic API entry', () => {
      const apiEntry: ApiEntry = {
        uuid: 'entry-1',
        role: 'user',
        timestamp: '2024-01-15T10:30:00Z',
        source: 'claude',
        text: 'Hello world',
      };

      const entry = convertApiEntry(apiEntry);

      expect(entry.uuid).toBe('entry-1');
      expect(entry.role).toBe('user');
      expect(entry.source).toBe('claude');
      expect(entry.timestamp).toBeInstanceOf(Date);
      expect(entry.text).toBe('Hello world');
    });

    it('should convert entry with content blocks', () => {
      const apiEntry: ApiEntry = {
        uuid: 'entry-2',
        role: 'assistant',
        timestamp: '2024-01-15T10:31:00Z',
        source: 'claude',
        content_blocks: [
          { type: 'text', text: 'Hello' },
          { type: 'thinking', thinking: 'Thinking...' },
        ],
      };

      const entry = convertApiEntry(apiEntry);

      expect(entry.contentBlocks).toHaveLength(2);
      expect(entry.contentBlocks[0].type).toBe('text');
      expect(entry.contentBlocks[1].type).toBe('thinking');
    });

    it('should convert entry with tool use', () => {
      const apiEntry: ApiEntry = {
        uuid: 'entry-3',
        role: 'assistant',
        timestamp: '2024-01-15T10:32:00Z',
        source: 'claude',
        content_blocks: [
          {
            type: 'tool_use',
            tool_use_id: 'tool-1',
            tool_name: 'read_file',
            tool_input: { path: '/test.txt' },
          },
        ],
      };

      const entry = convertApiEntry(apiEntry);

      expect(entry.contentBlocks[0].type).toBe('tool_use');
      const toolBlock = entry.contentBlocks[0] as import('@wethinkt/ts-thinkt').ToolUseBlock;
      expect(toolBlock.toolUseId).toBe('tool-1');
      expect(toolBlock.toolName).toBe('read_file');
    });

    it('should convert entry with usage', () => {
      const apiEntry: ApiEntry = {
        uuid: 'entry-4',
        role: 'assistant',
        timestamp: '2024-01-15T10:33:00Z',
        source: 'claude',
        usage: {
          input_tokens: 100,
          output_tokens: 50,
          cache_creation_input_tokens: 10,
          cache_read_input_tokens: 20,
        },
      };

      const entry = convertApiEntry(apiEntry);

      expect(entry.usage).toEqual({
        inputTokens: 100,
        outputTokens: 50,
        cacheCreationInputTokens: 10,
        cacheReadInputTokens: 20,
      });
    });

    it('should handle missing UUID', () => {
      const apiEntry: ApiEntry = {
        role: 'user',
        timestamp: '2024-01-15T10:30:00Z',
        source: 'claude',
      };

      const entry = convertApiEntry(apiEntry);

      expect(entry.uuid).toMatch(/^entry-\d+/);
    });

    it('should handle all role types', () => {
      const roles: Array<ApiEntry['role']> = [
        'user', 'assistant', 'tool', 'system', 'summary', 'progress', 'checkpoint'
      ];

      for (const role of roles) {
        const apiEntry: ApiEntry = {
          uuid: `entry-${role}`,
          role,
          timestamp: '2024-01-15T10:30:00Z',
        };

        const entry = convertApiEntry(apiEntry);
        expect(entry.role).toBe(role);
      }
    });
  });

  describe('convertApiToSession', () => {
    it('should convert API session to THINKT session', () => {
      const meta: SessionMeta = {
        id: 'session-1',
        first_prompt: 'Hello world',
        source: 'claude',
        entry_count: 2,
        created_at: '2024-01-15T10:30:00Z',
        modified_at: '2024-01-15T10:35:00Z',
      };

      const entries: ApiEntry[] = [
        { uuid: 'entry-1', role: 'user', timestamp: '2024-01-15T10:30:00Z' },
        { uuid: 'entry-2', role: 'assistant', timestamp: '2024-01-15T10:31:00Z' },
      ];

      const session = convertApiToSession(meta, entries);

      expect(session.meta.id).toBe('session-1');
      expect(session.meta.title).toBe('Hello world');
      expect(session.meta.source).toBe('claude');
      expect(session.entries).toHaveLength(2);
    });

    it('should truncate long first_prompt for title', () => {
      const meta: SessionMeta = {
        id: 'session-1',
        first_prompt: 'a'.repeat(100),
        source: 'claude',
      };

      const session = convertApiToSession(meta, []);

      expect(session.meta.title).toHaveLength(63); // 60 + '...'
      expect(session.meta.title?.endsWith('...')).toBe(true);
    });

    it('should use ID as title when first_prompt is missing', () => {
      const meta: SessionMeta = {
        id: 'my-session-id',
        source: 'kimi',
      };

      const session = convertApiToSession(meta, []);

      expect(session.meta.title).toBe('my-session-id');
    });
  });

  describe('convertApiSessionMeta', () => {
    it('should convert API session metadata', () => {
      const meta: SessionMeta = {
        id: 'session-1',
        first_prompt: 'Test',
        source: 'claude',
        model: 'claude-3-opus-20240229',
        project_path: '/home/user/project',
        git_branch: 'main',
        entry_count: 10,
        file_size: 1024,
      };

      const thinktMeta = convertApiSessionMeta(meta);

      expect(thinktMeta.id).toBe('session-1');
      expect(thinktMeta.model).toBe('claude-3-opus-20240229');
      expect(thinktMeta.projectPath).toBe('/home/user/project');
      expect(thinktMeta.gitBranch).toBe('main');
    });
  });

  describe('convertToApiEntry', () => {
    it('should convert THINKT entry back to API entry', () => {
      const thinktEntry = {
        uuid: 'entry-1',
        role: 'user' as const,
        timestamp: new Date('2024-01-15T10:30:00Z'),
        source: 'claude' as const,
        text: 'Hello',
        contentBlocks: [{ type: 'text' as const, text: 'Hello' }],
        model: 'claude-3-opus',
      };

      const apiEntry = convertToApiEntry(thinktEntry);

      expect(apiEntry.uuid).toBe('entry-1');
      expect(apiEntry.role).toBe('user');
      expect(apiEntry.source).toBe('claude');
      expect(apiEntry.text).toBe('Hello');
    });

    it('should convert entry with usage back to API format', () => {
      const thinktEntry = {
        uuid: 'entry-1',
        role: 'assistant' as const,
        timestamp: new Date('2024-01-15T10:30:00Z'),
        source: 'claude' as const,
        contentBlocks: [],
        usage: {
          inputTokens: 100,
          outputTokens: 50,
          cacheCreationInputTokens: 10,
          cacheReadInputTokens: 20,
        },
      };

      const apiEntry = convertToApiEntry(thinktEntry);

      expect(apiEntry.usage).toEqual({
        input_tokens: 100,
        output_tokens: 50,
        cache_creation_input_tokens: 10,
        cache_read_input_tokens: 20,
      });
    });
  });
});
