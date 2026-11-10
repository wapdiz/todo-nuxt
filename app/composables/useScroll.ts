import type { ScrollToOptions } from 'lenis';
import throttle from 'lodash.throttle';

const SCROLL_EASE = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const LENIS_SCROLL_BASE_OPTIONS: ScrollToOptions = {
  duration: 2,
  easing: SCROLL_EASE,
};
const SCROLL_THROTTLE = 100;

export function useScroll() {
  const { $lenis } = useNuxtApp();
  let lastPosition = 0;
  const directionRef = ref<null | 'up' | 'down'>(null);

  const getScrollPosition = () => {
    if ($lenis) return $lenis.scroll;
    return window.scrollY;
  };

  const scrollTo = (
    target: number | string | HTMLElement,
    lenisOptions: ScrollToOptions = LENIS_SCROLL_BASE_OPTIONS,
    nativeOptions: globalThis.ScrollToOptions = {},
  ) => {
    if ($lenis) {
      $lenis?.scrollTo(target, lenisOptions);
      return;
    }

    let top: number | null = null;

    if (typeof target === 'string') {
      const element = document.querySelector(target);

      if (!element) {
        console.warn('Element not found');
        return;
      }

      top = element.getBoundingClientRect().top + window.scrollY || 0;
    } else if (typeof target === 'number') {
      top = target;
    } else {
      top = target.getBoundingClientRect().top + window.scrollY;
    }

    window.scrollTo({
      top,
      behavior: 'smooth',
      ...nativeOptions,
    });

    /*
      how to use:

      scrollTo('.element'), {
        duration: 2,
        immediate: true, // прерывает анимацию lenis
      });

      // если используем нативный скролл
      scrollTo('.element', {}, {
        block: 'nearest',
        inline: 'nearest',
      })
    */
  };

  const scrollToTop = (
    lenisOptions: ScrollToOptions = LENIS_SCROLL_BASE_OPTIONS,
    nativeOptions: globalThis.ScrollToOptions = {},
  ) => {
    scrollTo(0, lenisOptions, nativeOptions);
  };

  const scrollStop = () => {
    if ($lenis) {
      $lenis.stop();
    } else {
      helpers.scrollSet(true);
    }
  };

  const scrollResume = () => {
    if ($lenis) {
      $lenis.start();
    } else {
      helpers.scrollSet(false);
    }
  };

  const scrollLock = (condition: boolean) => {
    if (condition) {
      scrollStop();
    } else {
      scrollResume();
    }
  };

  const baseScrollHandler = throttle(() => {
    const position = getScrollPosition();
    directionRef.value = position > lastPosition ? 'down' : 'up';
    lastPosition = position;
  }, SCROLL_THROTTLE);

  onMounted(() => {
    window.addEventListener('scroll', baseScrollHandler);
  });

  onUnmounted(() => {
    window.removeEventListener('scroll', baseScrollHandler);
  });

  const getScrollDirection = () => {
    return directionRef.value;
  };

  return {
    scrollStop,
    scrollResume,
    scrollToTop,
    scrollTo,
    scrollLock,
    getScrollDirection,
    directionRef,
  };
}
