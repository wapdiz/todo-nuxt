import { ref, onMounted, onUnmounted, type Ref } from 'vue';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export interface UseLenisReturn {
  lenis: Ref<any>;
  progress: Ref<number>;
  stop: () => void;
  start: () => void;
  scrollTo: (target: number | string | HTMLElement, options?: any) => void;
  scrollToTop: () => void;
  scrollToBottom: () => void;
  setProgress: (progress: number) => void;
}

export function useLenis(options?: any): UseLenisReturn {
  const lenis = ref<Lenis | null>(null);
  const progress = ref<number>(0);

  onMounted(() => {
    lenis.value = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - 2 ** (-10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      smoothTouch: false,
      touchMultiplier: 2,
      infinite: false,
      ...options,
    });

    lenis.value.on('scroll', ({ progress: scrollProgress }: any) => {
      progress.value = scrollProgress;
      ScrollTrigger.update();
    });

    function raf(time: number) {
      if (lenis.value) {
        lenis.value.raf(time);
      }
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    ScrollTrigger.refresh();
  });

  onUnmounted(() => {
    if (lenis.value) {
      lenis.value.destroy();
    }
  });

  const stop = () => {
    if (lenis.value) {
      lenis.value.stop();
    }
  };

  const start = () => {
    if (lenis.value) {
      lenis.value.start();
    }
  };

  const scrollTo = (target: number | string | HTMLElement, options?: any) => {
    if (lenis.value) {
      lenis.value.scrollTo(target, options);
    }
  };

  const scrollToTop = () => {
    if (lenis.value) {
      lenis.value.scrollTo(0, { immediate: false });
    }
  };

  const scrollToBottom = () => {
    if (lenis.value) {
      lenis.value.scrollTo(lenis.value.limit, { immediate: false });
    }
  };

  const setProgress = (value: number) => {
    if (lenis.value && value >= 0 && value <= 1) {
      const targetScroll = value * lenis.value.limit;
      lenis.value.scrollTo(targetScroll, { immediate: false });
    }
  };

  return {
    lenis,
    progress,
    stop,
    start,
    scrollTo,
    scrollToTop,
    scrollToBottom,
    setProgress,
  };
}
