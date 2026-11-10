import { updateDragOrder, type TaskDragSlot } from './taskCalendar';

export interface TaskDragStartInput {
  id: string;
  pointerId: number;
  source: 'grip' | 'row';
  fromTitle: boolean;
  clientX: number;
  clientY: number;
  grabOffsetY: number;
  startLeft: number;
  startWidth: number;
  gap: number;
  slots: TaskDragSlot[];
}

export interface TaskDragState extends Omit<TaskDragStartInput, 'clientX' | 'clientY'> {
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  active: boolean;
}

export interface TaskDragHost {
  addEventListener(type: string, listener: (event: any) => void, options?: boolean | AddEventListenerOptions): void;
  removeEventListener(type: string, listener: (event: any) => void, options?: boolean | EventListenerOptions): void;
  setTimeout(handler: () => void, timeout?: number): number;
  clearTimeout(id: number): void;
  requestAnimationFrame(callback: () => void): number;
  cancelAnimationFrame(id: number): void;
  clearSelection(): void;
  getViewportHeight(): number;
  getScrollY(): number;
  scrollBy(x: number, y: number): void;
  getListTop(): number | null;
}

export interface TaskDragControllerOptions {
  host: TaskDragHost;
  onStateChange: (state: TaskDragState | null) => void;
  onCommit: (draggedId: string, orderedIds: string[]) => void;
}

const EDGE_SCROLL_ZONE = 64;
const EDGE_SCROLL_MAX_SPEED = 14;

export function createBrowserDragHost(getListTop: () => number | null): TaskDragHost {
  return {
    addEventListener: (type, listener, options) => window.addEventListener(type, listener, options),
    removeEventListener: (type, listener, options) => window.removeEventListener(type, listener, options),
    setTimeout: (handler, timeout) => window.setTimeout(handler, timeout),
    clearTimeout: (id) => window.clearTimeout(id),
    requestAnimationFrame: (callback) => window.requestAnimationFrame(callback),
    cancelAnimationFrame: (id) => window.cancelAnimationFrame(id),
    clearSelection: () => window.getSelection()?.removeAllRanges(),
    getViewportHeight: () => window.innerHeight,
    getScrollY: () => window.scrollY,
    scrollBy: (x, y) => window.scrollBy(x, y),
    getListTop,
  };
}

export function createTaskDragController({ host, onStateChange, onCommit }: TaskDragControllerOptions) {
  let session: TaskDragState | null = null;
  let autoScrollRaf: number | null = null;
  let suppressCleanup: (() => void) | null = null;

  function emitState() {
    onStateChange(session?.active ? { ...session, slots: [...session.slots] } : null);
  }

  function stopAutoScroll() {
    if (autoScrollRaf !== null) {
      host.cancelAnimationFrame(autoScrollRaf);
      autoScrollRaf = null;
    }
  }

  function clearClickSuppression() {
    if (!suppressCleanup) return;
    const cleanup = suppressCleanup;
    suppressCleanup = null;
    cleanup();
  }

  function armClickSuppression(waitForRelease: boolean, pointerId?: number) {
    clearClickSuppression();

    let timerId: number | null = null;

    const suppressClick = (event: { preventDefault(): void; stopPropagation(): void }) => {
      event.preventDefault();
      event.stopPropagation();
      clearClickSuppression();
    };

    const scheduleClear = () => {
      if (timerId !== null) return;
      timerId = host.setTimeout(() => {
        timerId = null;
        clearClickSuppression();
      }, 0);
    };

    const onReleasePointer = (event: { pointerId: number }) => {
      if (pointerId !== undefined && event.pointerId !== pointerId) return;
      removeReleaseListeners();
      scheduleClear();
    };

    const onPointerDown = () => {
      clearClickSuppression();
    };

    const onKeyDown = (event: { key: string }) => {
      if (event.key === 'Enter' || event.key === ' ') clearClickSuppression();
    };

    const onBlur = () => {
      clearClickSuppression();
    };

    function removeReleaseListeners() {
      host.removeEventListener('pointerup', onReleasePointer);
      host.removeEventListener('pointercancel', onReleasePointer);
      host.removeEventListener('pointerdown', onPointerDown, true);
      host.removeEventListener('keydown', onKeyDown, true);
      host.removeEventListener('blur', onBlur);
    }

    host.addEventListener('click', suppressClick, true);
    host.addEventListener('pointerdown', onPointerDown, true);
    host.addEventListener('keydown', onKeyDown, true);
    host.addEventListener('blur', onBlur);

    if (waitForRelease) {
      host.addEventListener('pointerup', onReleasePointer);
      host.addEventListener('pointercancel', onReleasePointer);
    } else {
      scheduleClear();
    }

    suppressCleanup = () => {
      if (timerId !== null) {
        host.clearTimeout(timerId);
        timerId = null;
      }
      host.removeEventListener('click', suppressClick, true);
      removeReleaseListeners();
    };
  }

  function syncDragOrder(): boolean {
    if (!session?.active) return false;
    const listTop = host.getListTop();
    if (listTop === null) return false;

    const visualTop = session.lastY - listTop - session.grabOffsetY;
    const nextSlots = updateDragOrder(session.slots, session.id, visualTop, session.gap);
    if (!nextSlots.some((slot, index) => slot.id !== session?.slots[index]?.id)) return false;

    session.slots = nextSlots;
    return true;
  }

  function stepAutoScroll() {
    autoScrollRaf = null;
    if (!session?.active) return;

    const viewportHeight = host.getViewportHeight();
    let delta = 0;

    if (session.lastY < EDGE_SCROLL_ZONE) {
      delta = -Math.ceil(((EDGE_SCROLL_ZONE - session.lastY) / EDGE_SCROLL_ZONE) * EDGE_SCROLL_MAX_SPEED);
    } else if (session.lastY > viewportHeight - EDGE_SCROLL_ZONE) {
      delta = Math.ceil(
        ((session.lastY - (viewportHeight - EDGE_SCROLL_ZONE)) / EDGE_SCROLL_ZONE) * EDGE_SCROLL_MAX_SPEED,
      );
    }

    if (delta === 0) return;

    const previousScrollY = host.getScrollY();
    host.scrollBy(0, delta);
    if (host.getScrollY() === previousScrollY) return;

    if (syncDragOrder()) emitState();
    autoScrollRaf = host.requestAnimationFrame(stepAutoScroll);
  }

  function scheduleAutoScroll() {
    if (!session?.active) {
      stopAutoScroll();
      return;
    }

    const nearEdge = session.lastY < EDGE_SCROLL_ZONE || session.lastY > host.getViewportHeight() - EDGE_SCROLL_ZONE;
    if (!nearEdge) {
      stopAutoScroll();
      return;
    }

    if (autoScrollRaf === null) {
      autoScrollRaf = host.requestAnimationFrame(stepAutoScroll);
    }
  }

  function cleanupDrag() {
    stopAutoScroll();
    session = null;
    host.removeEventListener('pointermove', handlePointerMove);
    host.removeEventListener('pointerup', handlePointerUp);
    host.removeEventListener('pointercancel', handlePointerCancel);
    host.removeEventListener('keydown', handleKeydown, true);
    host.removeEventListener('blur', handleBlur);
    onStateChange(null);
  }

  function handlePointerMove(event: { pointerId: number; clientX: number; clientY: number }) {
    if (!session || event.pointerId !== session.pointerId) return;

    session.lastX = event.clientX;
    session.lastY = event.clientY;

    if (!session.active) {
      const dx = event.clientX - session.startX;
      const dy = event.clientY - session.startY;
      const thresholdMet =
        session.source === 'grip'
          ? Math.hypot(dx, dy) >= 3
          : session.fromTitle
            ? Math.abs(dy) >= 6
            : Math.hypot(dx, dy) >= 5;

      if (!thresholdMet) return;

      session.active = true;
      host.clearSelection();
    }

    syncDragOrder();
    emitState();
    scheduleAutoScroll();
  }

  function handlePointerUp(event: { pointerId: number; clientX: number; clientY: number }) {
    if (!session || event.pointerId !== session.pointerId) return;

    session.lastX = event.clientX;
    session.lastY = event.clientY;

    if (!session.active) {
      cleanupDrag();
      return;
    }

    syncDragOrder();
    const draggedId = session.id;
    const orderedIds = session.slots.map((slot) => slot.id);

    cleanupDrag();
    armClickSuppression(false);
    onCommit(draggedId, orderedIds);
  }

  function handlePointerCancel(event: { pointerId: number }) {
    if (!session || event.pointerId !== session.pointerId) return;
    cleanupDrag();
  }

  function handleKeydown(event: { key: string; preventDefault(): void; stopPropagation(): void }) {
    if (event.key !== 'Escape' || !session) return;

    const wasActive = session.active;
    const pointerId = session.pointerId;
    if (wasActive) {
      event.preventDefault();
      event.stopPropagation();
    }

    cleanupDrag();
    if (wasActive) armClickSuppression(true, pointerId);
  }

  function handleBlur() {
    if (session) cleanupDrag();
    clearClickSuppression();
  }

  function start(input: TaskDragStartInput) {
    if (session) cleanupDrag();
    clearClickSuppression();

    const { clientX, clientY, ...rest } = input;
    session = {
      ...rest,
      slots: [...input.slots],
      startX: clientX,
      startY: clientY,
      lastX: clientX,
      lastY: clientY,
      active: false,
    };

    host.addEventListener('pointermove', handlePointerMove);
    host.addEventListener('pointerup', handlePointerUp);
    host.addEventListener('pointercancel', handlePointerCancel);
    host.addEventListener('keydown', handleKeydown, true);
    host.addEventListener('blur', handleBlur);
  }

  function cancel(waitForRelease = true) {
    if (!session) return;
    const wasActive = session.active;
    const pointerId = session.pointerId;
    cleanupDrag();
    if (wasActive && waitForRelease) armClickSuppression(true, pointerId);
  }

  function dispose() {
    if (session) cleanupDrag();
    clearClickSuppression();
  }

  return {
    start,
    cancel,
    dispose,
    isActive: () => Boolean(session?.active),
    hasSession: () => session !== null,
  };
}
