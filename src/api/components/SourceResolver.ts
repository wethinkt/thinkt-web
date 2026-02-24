/**
 * SourceResolver
 *
 * Pure logic for resolving, normalizing, and detecting session sources
 * from paths and source capability metadata. No DOM dependency.
 */

import type { Project, SessionMeta } from '@wethinkt/ts-thinkt';

export interface SourceCapability {
  name: string;
  basePath: string;
  canResume: boolean;
}

export class SourceResolver {
  static normalizeSourceName(source: string): string {
    return source.trim().toLowerCase();
  }

  static normalizePath(pathValue: string): string {
    return pathValue.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/\/$/, '').toLowerCase();
  }

  static inferSourceFromPath(pathValue: string): string | null {
    const hiddenSourceMatch = pathValue.match(/\/\.([a-z0-9_-]+)(?:\/|$)/);
    if (!hiddenSourceMatch) return null;

    const inferred = hiddenSourceMatch[1];
    if (!inferred || inferred === 'config' || inferred === 'cache') {
      return null;
    }
    return inferred;
  }

  static detectSourceFromPaths(
    paths: Array<string | null | undefined>,
    sourceCapabilities: SourceCapability[],
  ): string | null {
    const normalizedPaths = paths
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .map((value) => SourceResolver.normalizePath(value));
    if (normalizedPaths.length === 0) return null;

    let bestMatch: SourceCapability | null = null;
    for (const sourceInfo of sourceCapabilities) {
      if (!sourceInfo.basePath) continue;
      const isMatch = normalizedPaths.some((pathValue) =>
        pathValue === sourceInfo.basePath || pathValue.startsWith(`${sourceInfo.basePath}/`));
      if (!isMatch) continue;
      if (!bestMatch || sourceInfo.basePath.length > bestMatch.basePath.length) {
        bestMatch = sourceInfo;
      }
    }
    if (bestMatch) {
      return bestMatch.name;
    }

    for (const pathValue of normalizedPaths) {
      const inferred = SourceResolver.inferSourceFromPath(pathValue);
      if (inferred) return inferred;
    }

    return null;
  }

  static resolveSessionSource(
    session: SessionMeta,
    currentProject: Project | null,
    sourceCapabilities: SourceCapability[],
  ): string | null {
    const pathSource = SourceResolver.detectSourceFromPaths(
      [
        session.fullPath,
        session.projectPath,
        currentProject?.path,
        currentProject?.sourceBasePath,
      ],
      sourceCapabilities,
    );
    if (pathSource) {
      return pathSource;
    }

    const direct = (session.source || currentProject?.source || '').toString().trim().toLowerCase();
    return direct || null;
  }
}
