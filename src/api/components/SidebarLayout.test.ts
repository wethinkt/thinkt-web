/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { SidebarLayout } from './SidebarLayout';

let container: HTMLElement;
let signal: AbortSignal;

function createElement(tag = 'div') {
  return document.createElement(tag);
}

function createLayout(initialView: 'list' | 'tree' = 'list') {
  return new SidebarLayout({
    elements: {
      container,
      projectBrowserContainer: createElement(),
      sessionListContainer: createElement(),
      viewerContainer: createElement(),
    },
    signal,
    initialView,
  });
}

beforeEach(() => {
  container = createElement();
  document.body.replaceChildren(container);
  signal = new AbortController().signal;
});

describe('SidebarLayout', () => {
  describe('construction', () => {
    it('creates sidebar, projects, sessions, and viewer sections', () => {
      const layout = createLayout();
      expect(layout.sidebar).toBeTruthy();
      expect(layout.projectsSection).toBeTruthy();
      expect(layout.sessionsSection).toBeTruthy();
      expect(layout.viewerSection).toBeTruthy();
    });

    it('applies thinkt-api-viewer class to container', () => {
      createLayout();
      expect(container.className).toBe('thinkt-api-viewer');
    });
  });

  describe('updateForView("list")', () => {
    it('shows projects, sessions, and splitter', () => {
      const layout = createLayout('tree');
      layout.updateForView('list');
      expect(layout.projectsSection.classList.contains('hidden')).toBe(false);
      expect(layout.sessionsSection.classList.contains('hidden')).toBe(false);
    });
  });

  describe('updateForView("tree")', () => {
    it('hides sessions and splitter, makes projects full-height', () => {
      const layout = createLayout('list');
      layout.updateForView('tree');
      expect(layout.projectsSection.classList.contains('full-height')).toBe(true);
      expect(layout.sessionsSection.classList.contains('hidden')).toBe(true);
    });
  });

  describe('closeMobileSidebar', () => {
    it('removes --open class from sidebar', () => {
      const layout = createLayout();
      layout.sidebar.classList.add('thinkt-api-viewer__sidebar--open');
      layout.closeMobileSidebar();
      expect(layout.sidebar.classList.contains('thinkt-api-viewer__sidebar--open')).toBe(false);
    });
  });
});
