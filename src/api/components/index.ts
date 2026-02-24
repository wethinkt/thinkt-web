/**
 * THINKT API Components
 *
 * UI components for browsing and interacting with THINKT API data.
 * These components can be used standalone or embedded in the main viewer.
 */

// Project Browser
export {
  ProjectBrowser,
  createProjectBrowser,
  type ProjectBrowserElements,
  type ProjectBrowserOptions,
  type ProjectItemState,
} from './ProjectBrowser';

// Session List
export {
  SessionList,
  createSessionList,
  type SessionListElements,
  type SessionListOptions,
} from './SessionList';

// API Viewer (high-level component)
export {
  ApiViewer,
  createApiViewer,
  type ApiViewerElements,
  type ApiViewerOptions,
  type LoadedSession,
} from './ApiViewer';

// Conversation View (simple text view, no 3D)
export {
  ConversationView,
  createConversationView,
  type ConversationViewElements,
  type ConversationViewOptions,
  type FilterState,
} from './ConversationView';

// Search Overlay (global session search)
export {
  SearchOverlay,
  createSearchOverlay,
  type SearchOverlayElements,
  type SearchOverlayOptions,
} from './SearchOverlay';

// Tree Project Browser (hierarchical project view)
export {
  TreeProjectBrowser,
  createTreeProjectBrowser,
  type TreeProjectBrowserElements,
  type TreeProjectBrowserOptions,
  type ProjectGroup,
  type SourceGroup,
  type TreeViewMode,
} from './TreeProjectBrowser';

// Timeline Visualization (time-based session view)
export {
  TimelineVisualization,
  createTimelineVisualization,
  type TimelineVisualizationElements,
  type TimelineVisualizationOptions,
} from './TimelineVisualization';

// Project Timeline Panel (per-project timeline below conversation)
export {
  ProjectTimelinePanel,
  createProjectTimelinePanel,
  type ProjectTimelinePanelElements,
  type ProjectTimelinePanelOptions,
} from './ProjectTimelinePanel';

// Style Manager
export { injectStyleSheet } from './style-manager';

