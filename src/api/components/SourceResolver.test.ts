import { describe, it, expect } from 'vitest';
import { SourceResolver, type SourceCapability } from './SourceResolver';
import type { Project, SessionMeta } from '@wethinkt/ts-thinkt';

describe('SourceResolver', () => {
  describe('normalizeSourceName', () => {
    it('trims whitespace and lowercases', () => {
      expect(SourceResolver.normalizeSourceName('  Claude  ')).toBe('claude');
      expect(SourceResolver.normalizeSourceName('KIMI')).toBe('kimi');
    });

    it('returns empty string for empty input', () => {
      expect(SourceResolver.normalizeSourceName('')).toBe('');
      expect(SourceResolver.normalizeSourceName('   ')).toBe('');
    });
  });

  describe('normalizePath', () => {
    it('converts backslashes to forward slashes', () => {
      expect(SourceResolver.normalizePath('C:\\Users\\test\\project')).toBe('c:/users/test/project');
    });

    it('collapses repeated slashes', () => {
      expect(SourceResolver.normalizePath('/home//user///project')).toBe('/home/user/project');
    });

    it('strips trailing slash', () => {
      expect(SourceResolver.normalizePath('/home/user/')).toBe('/home/user');
    });

    it('lowercases the path', () => {
      expect(SourceResolver.normalizePath('/Home/User/Project')).toBe('/home/user/project');
    });
  });

  describe('inferSourceFromPath', () => {
    it('extracts hidden directory name', () => {
      expect(SourceResolver.inferSourceFromPath('/home/user/.claude/projects')).toBe('claude');
      expect(SourceResolver.inferSourceFromPath('/home/user/.kimi/sessions')).toBe('kimi');
    });

    it('returns null for non-hidden paths', () => {
      expect(SourceResolver.inferSourceFromPath('/home/user/projects')).toBeNull();
    });

    it('ignores .config and .cache', () => {
      expect(SourceResolver.inferSourceFromPath('/home/user/.config/something')).toBeNull();
      expect(SourceResolver.inferSourceFromPath('/home/user/.cache/data')).toBeNull();
    });
  });

  describe('detectSourceFromPaths', () => {
    const capabilities: SourceCapability[] = [
      { name: 'claude', basePath: '/home/user/.claude', canResume: true },
      { name: 'kimi', basePath: '/home/user/.kimi', canResume: false },
      { name: 'claude-deep', basePath: '/home/user/.claude/deep', canResume: true },
    ];

    it('matches by basePath prefix', () => {
      expect(SourceResolver.detectSourceFromPaths(
        ['/home/user/.claude/projects/foo'],
        capabilities,
      )).toBe('claude');
    });

    it('picks longest (most specific) basePath match', () => {
      expect(SourceResolver.detectSourceFromPaths(
        ['/home/user/.claude/deep/sessions/abc'],
        capabilities,
      )).toBe('claude-deep');
    });

    it('falls back to inferSourceFromPath when no capability matches', () => {
      expect(SourceResolver.detectSourceFromPaths(
        ['/other/path/.cursor/projects'],
        [],
      )).toBe('cursor');
    });

    it('returns null for empty paths array', () => {
      expect(SourceResolver.detectSourceFromPaths([], capabilities)).toBeNull();
    });

    it('filters out null/undefined/empty entries', () => {
      expect(SourceResolver.detectSourceFromPaths(
        [null, undefined, '', '  '],
        capabilities,
      )).toBeNull();
    });
  });

  describe('resolveSessionSource', () => {
    const capabilities: SourceCapability[] = [
      { name: 'claude', basePath: '/home/user/.claude', canResume: true },
    ];

    const baseSession = {
      id: 'sess-1',
      entryCount: 5,
      source: '' as string,
    } as SessionMeta;

    it('resolves from session.fullPath', () => {
      const session = { ...baseSession, fullPath: '/home/user/.claude/projects/foo/session.jsonl' };
      expect(SourceResolver.resolveSessionSource(session, null, capabilities)).toBe('claude');
    });

    it('resolves from session.projectPath', () => {
      const session = { ...baseSession, projectPath: '/home/user/.claude/projects/bar' };
      expect(SourceResolver.resolveSessionSource(session, null, capabilities)).toBe('claude');
    });

    it('resolves from project.path', () => {
      const project = { id: 'p1', name: 'test', path: '/home/user/.claude/projects/baz', sessionCount: 1, source: '' } as Project;
      expect(SourceResolver.resolveSessionSource(baseSession, project, capabilities)).toBe('claude');
    });

    it('resolves from project.sourceBasePath', () => {
      const project = { id: 'p1', name: 'test', path: '/other', sourceBasePath: '/home/user/.claude', sessionCount: 1, source: '' } as Project;
      expect(SourceResolver.resolveSessionSource(baseSession, project, capabilities)).toBe('claude');
    });

    it('falls back to session.source string', () => {
      const session = { ...baseSession, source: 'kimi' } as SessionMeta;
      expect(SourceResolver.resolveSessionSource(session, null, [])).toBe('kimi');
    });

    it('falls back to project.source string', () => {
      const project = { id: 'p1', name: 'test', path: '/other', sessionCount: 1, source: 'Kimi' } as Project;
      expect(SourceResolver.resolveSessionSource(baseSession, project, [])).toBe('kimi');
    });

    it('returns null when nothing matches', () => {
      expect(SourceResolver.resolveSessionSource(baseSession, null, [])).toBeNull();
    });
  });
});
