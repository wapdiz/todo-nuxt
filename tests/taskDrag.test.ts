import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createTaskDragController, type TaskDragHost, type TaskDragState } from '../app/utils/taskDragSession';

interface MockEvent {
  type: string;
  pointerId?: number;
  pointerType?: string;
  clientX?: number;
  clientY?: number;
  key?: string;
  defaultPrevented: boolean;
  propagationStopped: boolean;
  preventDefault(): void;
  stopPropagation(): void;
}

function createEvent(type: string, props: Partial<MockEvent> = {}): MockEvent {
  const event: MockEvent = {
    type,
    defaultPrevented: false,
    propagationStopped: false,
    preventDefault() {
      event.defaultPrevented = true;
    },
    stopPropagation() {
      event.propagationStopped = true;
    },
    ...props,
  };
  return event;
}

function createMockHost() {
  const captureListeners = new Map<string, Set<(event: any) => void>>();
  const bubbleListeners = new Map<string, Set<(event: any) => void>>();
  const timers = new Map<number, () => void>();
  let nextTimerId = 1;
  let clearedSelection = 0;

  function bucket(options?: boolean | AddEventListenerOptions | EventListenerOptions) {
    const capture = typeof options === 'boolean' ? options : Boolean(options?.capture);
    return capture ? captureListeners : bubbleListeners;
  }

  const host: TaskDragHost = {
    addEventListener(type, listener, options) {
      const map = bucket(options);
      let set = map.get(type);
      if (!set) {
        set = new Set();
        map.set(type, set);
      }
      set.add(listener);
    },
    removeEventListener(type, listener, options) {
      bucket(options).get(type)?.delete(listener);
    },
    setTimeout(handler) {
      const id = nextTimerId++;
      timers.set(id, handler);
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
    requestAnimationFrame() {
      return 1;
    },
    cancelAnimationFrame() {},
    clearSelection() {
      clearedSelection++;
    },
    getViewportHeight() {
      return 800;
    },
    getScrollY() {
      return 0;
    },
    scrollBy() {},
    getListTop() {
      return 100;
    },
  };

  function dispatch(type: string, props: Partial<MockEvent> = {}): MockEvent {
    const event = createEvent(type, props);
    for (const listener of [...(captureListeners.get(type) ?? [])]) {
      listener(event);
    }
    if (!event.propagationStopped) {
      for (const listener of [...(bubbleListeners.get(type) ?? [])]) {
        listener(event);
      }
    }
    return event;
  }

  function dispatchLabelClick(onToggle: () => void): MockEvent {
    const event = dispatch('click');
    if (!event.defaultPrevented && !event.propagationStopped) {
      onToggle();
    }
    return event;
  }

  function flushTimers() {
    for (const [id, handler] of [...timers]) {
      timers.delete(id);
      handler();
    }
  }

  function listenerCount(type?: string): number {
    const countIn = (map: Map<string, Set<(event: any) => void>>) => {
      if (type) return map.get(type)?.size ?? 0;
      let total = 0;
      for (const set of map.values()) total += set.size;
      return total;
    };
    return countIn(captureListeners) + countIn(bubbleListeners);
  }

  return {
    host,
    dispatch,
    dispatchLabelClick,
    flushTimers,
    listenerCount,
    getClearedSelection: () => clearedSelection,
  };
}

function startTitleDrag(controller: ReturnType<typeof createTaskDragController>, clientY = 120) {
  controller.start({
    id: 'first',
    pointerId: 1,
    source: 'row',
    fromTitle: true,
    clientX: 50,
    clientY,
    grabOffsetY: 20,
    startLeft: 20,
    startWidth: 300,
    gap: 5,
    slots: [
      { id: 'first', height: 58 },
      { id: 'second', height: 58 },
    ],
  });
}

test('suppresses the trailing label click when Escape cancels an active drag before pointer release', () => {
  const mock = createMockHost();
  const states: Array<TaskDragState | null> = [];
  let committed: string[] | null = null;
  let completed = false;

  const controller = createTaskDragController({
    host: mock.host,
    onStateChange: (state) => states.push(state),
    onCommit: (_id, orderedIds) => {
      committed = orderedIds;
    },
  });

  startTitleDrag(controller, 120);
  mock.dispatch('pointermove', { pointerId: 1, pointerType: 'mouse', clientX: 50, clientY: 127 });
  assert.equal(controller.isActive(), true);
  assert.equal(mock.getClearedSelection(), 1);

  const escape = mock.dispatch('keydown', { key: 'Escape' });
  assert.equal(escape.defaultPrevented, true);
  assert.equal(escape.propagationStopped, true);
  assert.equal(controller.isActive(), false);
  assert.equal(controller.hasSession(), false);
  assert.equal(committed, null);
  assert.equal(states.at(-1), null);

  // Moving slightly while the pointer is still held after Escape must not drop click suppression.
  mock.dispatch('pointermove', { pointerId: 1, pointerType: 'mouse', clientX: 50, clientY: 128 });
  mock.dispatch('pointerup', { pointerId: 1, pointerType: 'mouse', clientX: 50, clientY: 128 });
  const suppressedClick = mock.dispatchLabelClick(() => {
    completed = !completed;
  });

  assert.equal(suppressedClick.defaultPrevented, true);
  assert.equal(suppressedClick.propagationStopped, true);
  assert.equal(completed, false);
  assert.equal(mock.listenerCount(), 0);

  mock.flushTimers();

  // Subsequent normal click toggles the checkbox as expected (even with same mouse pointerId).
  mock.dispatch('pointerdown', { pointerId: 1, pointerType: 'mouse', clientX: 50, clientY: 128 });
  mock.dispatch('pointerup', { pointerId: 1, pointerType: 'mouse', clientX: 50, clientY: 128 });
  const normalClick = mock.dispatchLabelClick(() => {
    completed = !completed;
  });

  assert.equal(normalClick.defaultPrevented, false);
  assert.equal(completed, true);
  controller.dispose();
});

test('restores normal clicks after Escape even if the pointer is released outside the window', () => {
  const mock = createMockHost();
  let completed = false;

  const controller = createTaskDragController({
    host: mock.host,
    onStateChange: () => {},
    onCommit: () => {},
  });

  startTitleDrag(controller, 120);
  mock.dispatch('pointermove', { pointerId: 1, pointerType: 'mouse', clientX: 50, clientY: 127 });
  mock.dispatch('keydown', { key: 'Escape' });

  // No pointerup arrives because the pointer was released outside the window; next click starts with pointerdown.
  mock.dispatch('pointerdown', { pointerId: 1, pointerType: 'mouse', clientX: 50, clientY: 120 });
  mock.dispatch('pointerup', { pointerId: 1, pointerType: 'mouse', clientX: 50, clientY: 120 });
  const nextClick = mock.dispatchLabelClick(() => {
    completed = !completed;
  });

  assert.equal(nextClick.defaultPrevented, false);
  assert.equal(completed, true);
  assert.equal(mock.listenerCount(), 0);
});

test('does not suppress clicks when Escape is pressed before the drag threshold', () => {
  const mock = createMockHost();
  let completed = false;

  const controller = createTaskDragController({
    host: mock.host,
    onStateChange: () => {},
    onCommit: () => {},
  });

  startTitleDrag(controller, 120);
  mock.dispatch('pointermove', { pointerId: 1, pointerType: 'mouse', clientX: 50, clientY: 123 });
  assert.equal(controller.isActive(), false);

  const escape = mock.dispatch('keydown', { key: 'Escape' });
  assert.equal(escape.defaultPrevented, false);

  mock.dispatch('pointerup', { pointerId: 1, pointerType: 'mouse', clientX: 50, clientY: 123 });
  const click = mock.dispatchLabelClick(() => {
    completed = !completed;
  });

  assert.equal(click.defaultPrevented, false);
  assert.equal(completed, true);
  assert.equal(mock.listenerCount(), 0);
});

test('commits drag reorder on pointerup, suppresses its trailing click, and preserves short clicks', () => {
  const mock = createMockHost();
  let committed: string[] | null = null;
  let completed = false;

  const controller = createTaskDragController({
    host: mock.host,
    onStateChange: () => {},
    onCommit: (_id, orderedIds) => {
      committed = orderedIds;
    },
  });

  // Below threshold: plain click still toggles the checkbox.
  startTitleDrag(controller, 120);
  mock.dispatch('pointermove', { pointerId: 1, pointerType: 'mouse', clientX: 50, clientY: 123 });
  assert.equal(controller.isActive(), false);
  mock.dispatch('pointerup', { pointerId: 1, pointerType: 'mouse', clientX: 50, clientY: 123 });
  mock.dispatchLabelClick(() => {
    completed = !completed;
  });
  assert.equal(completed, true);
  assert.equal(committed, null);

  // Above threshold and past second item midpoint: reorders without toggling checkbox.
  startTitleDrag(controller, 120);
  mock.dispatch('pointermove', { pointerId: 1, pointerType: 'mouse', clientX: 50, clientY: 190 });
  assert.equal(controller.isActive(), true);
  mock.dispatch('pointerup', { pointerId: 1, pointerType: 'mouse', clientX: 50, clientY: 190 });
  const dragClick = mock.dispatchLabelClick(() => {
    completed = !completed;
  });

  assert.deepEqual(committed, ['second', 'first']);
  assert.equal(dragClick.defaultPrevented, true);
  assert.equal(completed, true);
  mock.flushTimers();
  assert.equal(mock.listenerCount(), 0);
});

test('dispose removes all drag and click-suppression listeners cleanly', () => {
  const mock = createMockHost();
  const controller = createTaskDragController({
    host: mock.host,
    onStateChange: () => {},
    onCommit: () => {},
  });

  startTitleDrag(controller, 120);
  mock.dispatch('pointermove', { pointerId: 1, pointerType: 'mouse', clientX: 50, clientY: 127 });
  mock.dispatch('keydown', { key: 'Escape' });
  assert.ok(mock.listenerCount() > 0);

  controller.dispose();
  assert.equal(mock.listenerCount(), 0);
});

test('cancelling an active drag when reorder is disabled keeps suppressing trailing label click', () => {
  const mock = createMockHost();
  let completed = false;
  const controller = createTaskDragController({
    host: mock.host,
    onStateChange: () => {},
    onCommit: () => {},
  });

  startTitleDrag(controller, 120);
  mock.dispatch('pointermove', { pointerId: 1, pointerType: 'mouse', clientX: 50, clientY: 127 });
  assert.equal(controller.isActive(), true);

  controller.cancel(true);
  assert.equal(controller.isActive(), false);

  mock.dispatch('pointerup', { pointerId: 1, pointerType: 'mouse', clientX: 50, clientY: 127 });
  const click = mock.dispatchLabelClick(() => {
    completed = !completed;
  });
  assert.equal(click.defaultPrevented, true);
  assert.equal(completed, false);
  controller.dispose();
});
