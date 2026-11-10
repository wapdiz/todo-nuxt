export type ActiveDrawerKind = 'calendar' | 'ai' | null;

export const MOBILE_DRAWER_MEDIA_QUERY = '(max-width: 767px)';
export const AI_DRAWER_MEDIA_QUERY =
  '(max-width: 767px), (max-width: 1279.5px) and (min-width: 768px) and (orientation: portrait)';

export const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  'details > summary:first-of-type',
].join(', ');

export interface DrawerAccessibilityState {
  isAnyOpen: boolean;
  isCalendarModal: boolean;
  isAiModal: boolean;
  mainInert: boolean;
  calendarInert: boolean;
  aiInert: boolean;
}

export function getDrawerAccessibilityState(activeDrawer: ActiveDrawerKind): DrawerAccessibilityState {
  return {
    isAnyOpen: activeDrawer !== null,
    isCalendarModal: activeDrawer === 'calendar',
    isAiModal: activeDrawer === 'ai',
    mainInert: activeDrawer !== null,
    calendarInert: activeDrawer === 'ai',
    aiInert: activeDrawer === 'calendar',
  };
}

export interface FocusTrapTargetOptions<T> {
  container: T;
  focusables: readonly T[];
  activeElement: T | null;
  shiftKey: boolean;
  contains: (root: T, node: T) => boolean;
  isFollowing?: (candidate: T, current: T) => boolean;
}

export function resolveFocusTrapTarget<T>(options: FocusTrapTargetOptions<T>): {
  preventDefault: boolean;
  target: T | null;
} {
  const { container, focusables, activeElement, shiftKey, contains, isFollowing } = options;

  if (focusables.length === 0) {
    return { preventDefault: true, target: container };
  }

  const first = focusables[0]!;
  const last = focusables[focusables.length - 1]!;

  if (!activeElement || !contains(container, activeElement)) {
    return { preventDefault: true, target: shiftKey ? last : first };
  }

  const currentIndex = focusables.indexOf(activeElement);
  if (currentIndex === -1) {
    if (isFollowing) {
      if (shiftKey) {
        for (let i = focusables.length - 1; i >= 0; i -= 1) {
          if (isFollowing(activeElement, focusables[i]!)) {
            return { preventDefault: true, target: focusables[i]! };
          }
        }
      } else {
        for (const candidate of focusables) {
          if (isFollowing(candidate, activeElement)) {
            return { preventDefault: true, target: candidate };
          }
        }
      }
    }
    return { preventDefault: true, target: shiftKey ? last : first };
  }

  if (!shiftKey && currentIndex === focusables.length - 1) {
    return { preventDefault: true, target: first };
  }
  if (shiftKey && currentIndex === 0) {
    return { preventDefault: true, target: last };
  }

  return { preventDefault: false, target: null };
}

export function isElementFocusable(element: HTMLElement): boolean {
  if (element.hasAttribute('disabled') || element.matches(':disabled')) return false;

  const rawTabIndex = element.getAttribute('tabindex');
  if (rawTabIndex !== null && Number(rawTabIndex) < 0) return false;
  if (element.tabIndex < 0) return false;

  if (element.hasAttribute('hidden') || element.closest('[hidden], [inert]')) return false;

  if (typeof window !== 'undefined') {
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    if (
      typeof element.getClientRects === 'function' &&
      element.getClientRects().length === 0 &&
      style.display !== 'contents'
    ) {
      return false;
    }
  }

  return true;
}

export function getFocusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) return [];
  const candidates = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  return candidates.filter((el) => isElementFocusable(el));
}

export function focusFirstFocusable(container: HTMLElement | null): HTMLElement | null {
  if (!container) return null;
  const target = getFocusableElements(container)[0] ?? container;
  target.focus();
  return target;
}

export function handleModalTabKey(
  container: HTMLElement | null,
  event: Pick<KeyboardEvent, 'key' | 'shiftKey' | 'preventDefault'>,
  activeElement: Element | null = typeof document !== 'undefined' ? document.activeElement : null,
): boolean {
  if (!container || event.key !== 'Tab') return false;

  const focusables = getFocusableElements(container);
  const current = activeElement instanceof HTMLElement ? activeElement : null;
  const { preventDefault, target } = resolveFocusTrapTarget({
    container,
    focusables,
    activeElement: current,
    shiftKey: event.shiftKey,
    contains: (root, node) => root.contains(node),
    isFollowing: (candidate, refNode) =>
      typeof Node !== 'undefined' &&
      Boolean(refNode.compareDocumentPosition(candidate) & Node.DOCUMENT_POSITION_FOLLOWING),
  });

  if (!preventDefault) return false;
  event.preventDefault();
  target?.focus();
  return true;
}
