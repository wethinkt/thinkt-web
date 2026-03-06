/**
 * THINKT Conversation Entry Point
 *
 * Lightweight page that mounts only ConversationView for a single session.
 * Used by the VS Code extension webview panel.
 *
 * URL fragment parameters:
 * - token: API auth token
 * - session_path: path to the session to load
 */

/// <reference types="vite/client" />

import { ConversationView } from './api/components/ConversationView';
import { configureDefaultClient, getDefaultClient } from '@wethinkt/ts-thinkt/api';
import type { SourceInfo } from '@wethinkt/ts-thinkt';
import { getApiBaseUrl, getApiToken, getInitialSessionTarget } from './config';
import { initI18n } from './i18n';

const STREAM_CHUNK_SIZE = 50;

async function init(): Promise<void> {
  // 1. Initialize i18n
  const locale = await initI18n();
  document.documentElement.lang = locale;

  // 2. Read config from URL fragment
  const baseUrl = getApiBaseUrl();
  const token = getApiToken();
  const target = getInitialSessionTarget();
  const sessionPath = target?.sessionPath;

  if (!sessionPath) {
    showError('No session path provided');
    return;
  }

  // 3. Configure API client
  configureDefaultClient({ baseUrl, ...(token ? { token } : {}) });
  const client = getDefaultClient();

  // 4. Determine resume capability
  const resumableSources = new Set<string>();
  try {
    const sources: SourceInfo[] = await client.getSources();
    for (const source of sources) {
      if (source.can_resume && source.name) {
        resumableSources.add(source.name.toLowerCase());
      }
    }
  } catch {
    // Non-critical — resume just won't be available
  }

  // 5. Get session metadata first to know source/model
  let sessionSource: string | null = null;
  let sessionModel: string | null = null;
  let sessionProjectPath: string | null = null;
  let totalEntries = 0;

  try {
    const metadata = await client.getSessionMetadata(sessionPath, {
      summaryOnly: true,
      limit: 1,
    });
    sessionSource = metadata.meta.source ?? null;
    sessionModel = metadata.meta.model ?? null;
    sessionProjectPath = metadata.meta.fullPath ?? sessionPath;
    totalEntries = metadata.totalEntries ?? metadata.meta.entryCount ?? 0;
  } catch {
    // Fall back to loading without metadata
    sessionProjectPath = sessionPath;
  }

  const canResume = Boolean(
    sessionSource && resumableSources.has(sessionSource.toLowerCase()) && sessionProjectPath,
  );

  // 6. Create ConversationView
  const container = document.getElementById('conversation-container');
  if (!container) {
    showError('Container element not found');
    return;
  }

  const conversationView = new ConversationView({
    elements: { container },
    client,
    onResumeSession: canResume
      ? async () => {
          if (sessionProjectPath) {
            await client.execResumeSession(sessionProjectPath);
          }
        }
      : undefined,
    canResumeSession: () => canResume,
  });

  // 7. Set session context and load entries progressively
  conversationView.setSessionContext({
    source: sessionSource,
    model: sessionModel,
  });
  conversationView.setProjectPath(sessionProjectPath, totalEntries);

  hideLoading();

  try {
    conversationView.beginProgressiveDisplay();

    for await (const entry of client.streamSessionEntries(sessionPath, STREAM_CHUNK_SIZE)) {
      conversationView.appendEntries([entry]);
    }

    conversationView.finalizeProgressiveDisplay();
  } catch (error) {
    console.error('[THINKT] Failed to load session entries:', error);
  }
}

function hideLoading(): void {
  const loading = document.getElementById('loading');
  if (loading) {
    loading.classList.add('hidden');
    setTimeout(() => loading.remove(), 300);
  }
}

function showError(message: string): void {
  hideLoading();
  const container = document.getElementById('conversation-container');
  if (container) {
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'center';
    container.style.color = '#ef4444';
    container.style.padding = '20px';
    container.textContent = message;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { void init(); });
} else {
  void init();
}
