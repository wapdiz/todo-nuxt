import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getDrawerAccessibilityState, handleModalTabKey, resolveFocusTrapTarget } from '../app/utils/drawerFocus';

test('getDrawerAccessibilityState marks background elements inert and toggles modal role only for active drawer', () => {
  assert.deepEqual(getDrawerAccessibilityState(null), {
    isAnyOpen: false,
    isCalendarModal: false,
    isAiModal: false,
    mainInert: false,
    calendarInert: false,
    aiInert: false,
  });

  assert.deepEqual(getDrawerAccessibilityState('ai'), {
    isAnyOpen: true,
    isCalendarModal: false,
    isAiModal: true,
    mainInert: true,
    calendarInert: true,
    aiInert: false,
  });

  assert.deepEqual(getDrawerAccessibilityState('calendar'), {
    isAnyOpen: true,
    isCalendarModal: true,
    isAiModal: false,
    mainInert: true,
    calendarInert: false,
    aiInert: true,
  });
});

test('resolveFocusTrapTarget wraps Tab and Shift+Tab inside modal drawer and handles outside/roving focus', () => {
  const container = { id: 'ai-panel' };
  const closeBtn = { id: 'close-btn' };
  const rovingInside = { id: 'roving-day' };
  const input = { id: 'input' };
  const quickBtn = { id: 'quick-btn' };
  const outsideBg = { id: 'bg-task-checkbox' };
  const focusables = [closeBtn, input, quickBtn];
  const insideSet = new Set([container, closeBtn, rovingInside, input, quickBtn]);
  const domOrder = [container, closeBtn, rovingInside, input, quickBtn];
  const contains = (root: typeof container, node: typeof container) => root === container && insideSet.has(node);
  const isFollowing = (candidate: typeof container, current: typeof container) =>
    domOrder.indexOf(candidate) > domOrder.indexOf(current);

  // Tab on last focusable element wraps back to first focusable inside drawer.
  assert.deepEqual(
    resolveFocusTrapTarget({
      container,
      focusables,
      activeElement: quickBtn,
      shiftKey: false,
      contains,
      isFollowing,
    }),
    { preventDefault: true, target: closeBtn },
  );

  // Shift+Tab on first focusable element wraps to last focusable inside drawer.
  assert.deepEqual(
    resolveFocusTrapTarget({
      container,
      focusables,
      activeElement: closeBtn,
      shiftKey: true,
      contains,
      isFollowing,
    }),
    { preventDefault: true, target: quickBtn },
  );

  // Moving between middle controls lets native Tab proceed within the drawer.
  assert.deepEqual(
    resolveFocusTrapTarget({
      container,
      focusables,
      activeElement: input,
      shiftKey: false,
      contains,
      isFollowing,
    }),
    { preventDefault: false, target: null },
  );

  // If focus ever sits outside the modal (e.g. body or background), Tab pulls it back in.
  assert.deepEqual(
    resolveFocusTrapTarget({
      container,
      focusables,
      activeElement: outsideBg,
      shiftKey: false,
      contains,
      isFollowing,
    }),
    { preventDefault: true, target: closeBtn },
  );
  assert.deepEqual(
    resolveFocusTrapTarget({
      container,
      focusables,
      activeElement: null,
      shiftKey: true,
      contains,
      isFollowing,
    }),
    { preventDefault: true, target: quickBtn },
  );

  // If focus sits on a tabindex="-1" roving element inside calendar, Tab/Shift+Tab jump to neighbor focusables.
  assert.deepEqual(
    resolveFocusTrapTarget({
      container,
      focusables,
      activeElement: rovingInside,
      shiftKey: false,
      contains,
      isFollowing,
    }),
    { preventDefault: true, target: input },
  );
  assert.deepEqual(
    resolveFocusTrapTarget({
      container,
      focusables,
      activeElement: rovingInside,
      shiftKey: true,
      contains,
      isFollowing,
    }),
    { preventDefault: true, target: closeBtn },
  );

  // Empty focusables keep Tab anchored on the dialog container.
  assert.deepEqual(
    resolveFocusTrapTarget({
      container,
      focusables: [],
      activeElement: container,
      shiftKey: false,
      contains,
      isFollowing,
    }),
    { preventDefault: true, target: container },
  );
});

test('handleModalTabKey filters hidden/disabled/tabindex=-1 elements and cycles Tab inside drawer DOM mock', () => {
  const savedNode = globalThis.Node;
  const savedHTMLElement = globalThis.HTMLElement;
  const savedWindow = globalThis.window;

  let active: MockElement | null = null;
  function setActive(node: MockElement) {
    active = node;
  }

  class MockElement {
    focusCount = 0;
    constructor(
      public readonly id: string,
      public readonly options: {
        disabled?: boolean;
        hidden?: boolean;
        inert?: boolean;
        tabIndex?: number;
        display?: string;
        rects?: number;
      } = {},
    ) {}

    hasAttribute(name: string) {
      if (name === 'disabled') return Boolean(this.options.disabled);
      if (name === 'hidden') return Boolean(this.options.hidden);
      if (name === 'tabindex') return this.options.tabIndex !== undefined;
      return false;
    }

    getAttribute(name: string) {
      if (name === 'tabindex' && this.options.tabIndex !== undefined) return String(this.options.tabIndex);
      return null;
    }

    get tabIndex() {
      return this.options.tabIndex ?? 0;
    }

    matches(selector: string) {
      return selector === ':disabled' && Boolean(this.options.disabled);
    }

    closest(selector: string) {
      if (selector.includes('[hidden]') && this.options.hidden) return this;
      if (selector.includes('[inert]') && this.options.inert) return this;
      return null;
    }

    getClientRects() {
      return Array.from({ length: this.options.rects ?? 1 });
    }

    focus() {
      this.focusCount += 1;
      setActive(this);
    }

    compareDocumentPosition(other: MockElement) {
      const a = domNodes.indexOf(this);
      const b = domNodes.indexOf(other);
      return b > a ? 4 : 2;
    }
  }

  const closeBtn = new MockElement('close');
  const hiddenBtn = new MockElement('hidden', { display: 'none', rects: 0 });
  const rovingDay = new MockElement('roving', { tabIndex: -1 });
  const disabledSend = new MockElement('send', { disabled: true });
  const quickAction = new MockElement('quick');
  const backgroundTask = new MockElement('bg');

  const domNodes = [closeBtn, hiddenBtn, rovingDay, disabledSend, quickAction, backgroundTask];
  const container = {
    focusCount: 0,
    focus() {
      this.focusCount += 1;
    },
    querySelectorAll() {
      return [closeBtn, hiddenBtn, rovingDay, disabledSend, quickAction];
    },
    contains(node: MockElement) {
      return [closeBtn, hiddenBtn, rovingDay, disabledSend, quickAction].includes(node);
    },
  };

  (globalThis as any).Node = { DOCUMENT_POSITION_FOLLOWING: 4 };
  (globalThis as any).HTMLElement = MockElement;
  (globalThis as any).window = {
    getComputedStyle(el: MockElement) {
      return {
        display: el.options.display ?? 'block',
        visibility: 'visible',
      };
    },
  };

  try {
    active = quickAction;
    let prevented = false;
    const wrappedForward = handleModalTabKey(
      container as unknown as HTMLElement,
      {
        key: 'Tab',
        shiftKey: false,
        preventDefault: () => {
          prevented = true;
        },
      },
      active as unknown as Element,
    );
    assert.equal(wrappedForward, true);
    assert.equal(prevented, true);
    assert.equal(active, closeBtn);

    prevented = false;
    const wrappedBackward = handleModalTabKey(
      container as unknown as HTMLElement,
      {
        key: 'Tab',
        shiftKey: true,
        preventDefault: () => {
          prevented = true;
        },
      },
      active as unknown as Element,
    );
    assert.equal(wrappedBackward, true);
    assert.equal(prevented, true);
    assert.equal(active, quickAction);

    // Outside active element cannot stay outside modal on Shift+Tab.
    active = backgroundTask;
    prevented = false;
    const pulledInside = handleModalTabKey(
      container as unknown as HTMLElement,
      {
        key: 'Tab',
        shiftKey: true,
        preventDefault: () => {
          prevented = true;
        },
      },
      active as unknown as Element,
    );
    assert.equal(pulledInside, true);
    assert.equal(prevented, true);
    assert.equal(active, quickAction);
  } finally {
    (globalThis as any).Node = savedNode;
    (globalThis as any).HTMLElement = savedHTMLElement;
    (globalThis as any).window = savedWindow;
  }
});
