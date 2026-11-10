import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import throttle from 'lodash.throttle';

/*
для элементов с внутренним скроллом добавить data-lenis-prevent,
например для попапов или текстовых инпутов
*/

export default defineNuxtPlugin((nuxtApp) => {
  const lenis = new Lenis({
    duration: 1.2,
    smoothWheel: true,
  });

  const resizeHandler = throttle(() => {
    lenis.resize();
  }, 10);

  function raf(time: number) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }

  const resizeObserver = new ResizeObserver(resizeHandler);
  resizeObserver.observe(document.body);

  requestAnimationFrame(raf);

  // reset scroll on page change
  // если анимации перехода нет, то нужно использовать page:finish
  nuxtApp.hook('page:transition:finish', () => {
    lenis.scrollTo(0, { immediate: true });
    resizeHandler();
  });

  return {
    provide: {
      lenis,
    },
  };
});
