/**
 * API Adapters
 *
 * Convert between THINKT API formats and internal library formats.
 */

import type { SessionMeta, Entry, ContentBlock as ApiContentBlock } from '@wethinkt/ts-thinkt/api';
import type { Session, Entry as ThinktEntry, ContentBlock, Source, Role } from '@wethinkt/ts-thinkt';

// ============================================
// Type Conversions
// ============================================

/**
 * Convert API Source to THINKT Source
 */
function convertSource(source: string | undefined): Source {
  if (source === 'kimi') return 'kimi';
  if (source === 'gemini') return 'gemini';
  return 'claude';
}

/**
 * Convert API Role to THINKT Role
 */
function convertRole(role: string | undefined): Role {
  switch (role) {
    case 'user': return 'user';
    case 'assistant': return 'assistant';
    case 'tool': return 'tool';
    case 'system': return 'system';
    case 'summary': return 'summary';
    case 'progress': return 'progress';
    case 'checkpoint': return 'checkpoint';
    default: return 'assistant';
  }
}

/**
 * Convert API ContentBlock to THINKT ContentBlock
 */
function convertContentBlock(block: ApiContentBlock): ContentBlock {
  const type = block.type ?? 'text';

  switch (type) {
    case 'text':
      return {
        type: 'text',
        text: block.text ?? '',
      };

    case 'thinking':
      return {
        type: 'thinking',
        thinking: block.thinking ?? '',
        signature: block.signature,
      };

    case 'tool_use':
      return {
        type: 'tool_use',
        toolUseId: block.tool_use_id ?? '',
        toolName: block.tool_name ?? 'unknown',
        toolInput: block.tool_input as Record<string, unknown> ?? {},
      };

    case 'tool_result':
      return {
        type: 'tool_result',
        toolUseId: block.tool_use_id ?? '',
        toolResult: block.tool_result ?? '',
        isError: block.is_error ?? false,
      };

    case 'image':
      return {
        type: 'image',
        mediaType: block.media_type ?? 'image/png',
        mediaData: block.media_data ?? '',
      };

    case 'document':
      return {
        type: 'document',
        mediaType: block.media_type ?? 'application/pdf',
        mediaData: block.media_data ?? '',
        filename: undefined, // API doesn't have filename in ContentBlock
      };

    default:
      return {
        type: 'text',
        text: block.text ?? '',
      };
  }
}

// ============================================
// Entry Conversion
// ============================================

/**
 * Convert an API Entry to THINKT Entry
 */
export function convertApiEntry(entry: Entry): ThinktEntry {
  // Convert content blocks
  const contentBlocks = entry.content_blocks?.map(convertContentBlock) ?? [];

  // Build metadata from extra fields
  const metadata: Record<string, unknown> = {};
  if (entry.metadata) {
    Object.assign(metadata, entry.metadata);
  }
  if (entry.workspace_id) {
    metadata.workspaceId = entry.workspace_id;
  }

  return {
    uuid: entry.uuid ?? `entry-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    parentUuid: entry.parent_uuid ?? undefined,
    role: convertRole(entry.role),
    timestamp: entry.timestamp ? new Date(entry.timestamp) : new Date(),
    source: convertSource(entry.source),
    contentBlocks,
    text: entry.text ?? contentBlocks
      .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
      .map(b => b.text)
      .join('\n'),
    model: entry.model,
    usage: entry.usage ? {
      inputTokens: entry.usage.input_tokens ?? 0,
      outputTokens: entry.usage.output_tokens ?? 0,
      cacheCreationInputTokens: entry.usage.cache_creation_input_tokens,
      cacheReadInputTokens: entry.usage.cache_read_input_tokens,
    } : undefined,
    gitBranch: entry.git_branch,
    cwd: entry.cwd,
    isCheckpoint: entry.is_checkpoint ?? false,
    isSidechain: entry.is_sidechain ?? false,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
  };
}

// ============================================
// Session Conversion
// ============================================

/**
 * Convert API SessionMeta + Entries to THINKT Session
 */
export function convertApiToSession(meta: SessionMeta, entries: Entry[]): Session {
  // Convert all entries
  const thinktEntries = entries.map(convertApiEntry);

  return {
    meta: {
      id: meta.id ?? 'unknown',
      title: meta.first_prompt
        ? meta.first_prompt.slice(0, 60) + (meta.first_prompt.length > 60 ? '...' : '')
        : meta.id ?? 'Untitled Session',
      source: convertSource(meta.source),
      entryCount: meta.entry_count ?? thinktEntries.length,
      createdAt: meta.created_at ? new Date(meta.created_at) : undefined,
      modifiedAt: meta.modified_at ? new Date(meta.modified_at) : undefined,
      model: meta.model,
      projectPath: meta.project_path,
      gitBranch: meta.git_branch,
      durationMs: undefined, // API doesn't expose this directly
      totalUsage: undefined, // Would need to calculate from entries
    },
    entries: thinktEntries,
  };
}

/**
 * Convert API SessionMeta to partial THINKT SessionMeta
 */
export function convertApiSessionMeta(meta: SessionMeta): Session['meta'] {
  return {
    id: meta.id ?? 'unknown',
    title: meta.first_prompt
      ? meta.first_prompt.slice(0, 60) + (meta.first_prompt.length > 60 ? '...' : '')
      : meta.id ?? 'Untitled Session',
    source: convertSource(meta.source),
    entryCount: meta.entry_count ?? 0,
    createdAt: meta.created_at ? new Date(meta.created_at) : undefined,
    modifiedAt: meta.modified_at ? new Date(meta.modified_at) : undefined,
    model: meta.model,
    projectPath: meta.project_path,
    gitBranch: meta.git_branch,
    durationMs: undefined,
    totalUsage: undefined,
  };
}

// ============================================
// Reverse Conversions (THINKT -> API)
// ============================================

/**
 * Convert THINKT ContentBlock to API ContentBlock
 */
function convertToApiContentBlock(block: ContentBlock): ApiContentBlock {
  const base: ApiContentBlock = {
    type: block.type,
  };

  switch (block.type) {
    case 'text':
      base.text = block.text;
      break;
    case 'thinking':
      base.thinking = block.thinking;
      base.signature = block.signature;
      break;
    case 'tool_use':
      base.tool_use_id = block.toolUseId;
      base.tool_name = block.toolName;
      base.tool_input = block.toolInput;
      break;
    case 'tool_result':
      base.tool_use_id = block.toolUseId;
      base.tool_result = block.toolResult;
      base.is_error = block.isError;
      break;
    case 'image':
      base.media_type = block.mediaType;
      base.media_data = block.mediaData;
      break;
    case 'document':
      base.media_type = block.mediaType;
      base.media_data = block.mediaData;
      break;
  }

  return base;
}

/**
 * Convert THINKT Entry to API Entry
 */
export function convertToApiEntry(entry: ThinktEntry): Entry {
  const apiEntry: Entry = {
    uuid: entry.uuid,
    parent_uuid: entry.parentUuid,
    role: entry.role,
    timestamp: entry.timestamp.toISOString(),
    source: entry.source as Entry['source'],
    content_blocks: entry.contentBlocks.map(convertToApiContentBlock),
    text: entry.text,
    model: entry.model,
    usage: entry.usage ? {
      input_tokens: entry.usage.inputTokens,
      output_tokens: entry.usage.outputTokens,
      cache_creation_input_tokens: entry.usage.cacheCreationInputTokens,
      cache_read_input_tokens: entry.usage.cacheReadInputTokens,
    } : undefined,
    git_branch: entry.gitBranch,
    cwd: entry.cwd,
    is_checkpoint: entry.isCheckpoint,
    is_sidechain: entry.isSidechain,
    workspace_id: entry.metadata?.workspaceId as string | undefined,
    metadata: entry.metadata,
  };

  return apiEntry;
}
