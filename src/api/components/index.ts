/**
 * THINKT API Components
 *
 * UI components for browsing and interacting with THINKT API data.
 * These components can be used standalone or embedded in the main viewer.
 */

// Project Browser
export {
  ProjectBrowser,
  type ProjectBrowserElements,
  type ProjectBrowserOptions,
  type ProjectItemState,
} from './ProjectBrowser';

// Session List
export {
  SessionList,
  type SessionListElements,
  type SessionListOptions,
} from './SessionList';

// API Viewer (high-level component)
export {
  ApiViewer,
  type ApiViewerElements,
  type ApiViewerOptions,
  type LoadedSession,
} from './ApiViewer';

// Conversation View (simple text view, no 3D)
export {
  ConversationView,
  type ConversationViewElements,
  type ConversationViewOptions,
  type FilterState,
} from './ConversationView';

// Search Overlay (global session search)
export {
  SearchOverlay,
  type SearchOverlayElements,
  type SearchOverlayOptions,
} from './SearchOverlay';

// Settings Overlay (global settings/info panels)
export {
  SettingsOverlay,
  type SettingsOverlayElements,
  type SettingsOverlayOptions,
} from './SettingsOverlay';

// Search sub-components
export { SearchProjectFilter, type SearchProjectFilterOptions, type ProjectInfo } from './SearchProjectFilter';
export { SearchResultRenderer, type SearchResultRendererOptions } from './SearchResultRenderer';

// Tree Project Browser (hierarchical project view)
export {
  TreeProjectBrowser,
  type TreeProjectBrowserElements,
  type TreeProjectBrowserOptions,
  type ProjectGroup,
  type SourceGroup,
  type TreeViewMode,
} from './TreeProjectBrowser';

// Timeline Visualization (time-based session view)
export {
  TimelineVisualization,
  type TimelineVisualizationElements,
  type TimelineVisualizationOptions,
} from './TimelineVisualization';

// Project Timeline Panel (per-project timeline below conversation)
export {
  ProjectTimelinePanel,
  type ProjectTimelinePanelElements,
  type ProjectTimelinePanelOptions,
} from './ProjectTimelinePanel';

// Source Resolver
export { SourceResolver, type SourceCapability } from './SourceResolver';

// Project Filter Bar
export { ProjectFilterBar, type ProjectFilterBarOptions } from './ProjectFilterBar';

// Sidebar Layout
export { SidebarLayout, type SidebarLayoutElements, type SidebarLayoutOptions } from './SidebarLayout';

// Style Manager
export { injectStyleSheet } from './style-manager';
