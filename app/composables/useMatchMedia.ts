import { ref, onMounted, onUnmounted } from 'vue';
import sizes from '@/assets/styles/config.module.scss';
import debounce from 'lodash.debounce';

function cleanMediaQuery(str: string) {
  let cleaned = str.replace(/^['"]|['"]$/g, '');

  cleaned = cleaned.replace(/\((\s*\d+\.?\d*\s*px\s*)\)/g, '$1');
  cleaned = cleaned.replace(/:\s+/g, ': ');

  return cleaned;
}
// base media queries
export const deviceMedia = cleanMediaQuery(
  sizes['breakpoints-devices'] || '(max-width: 1279) and (orientation: portrait)',
);
export const desktopMedia = cleanMediaQuery(sizes['breakpoints-desktop'] || '(orientation: landscape)');
export const tabletMedia = cleanMediaQuery(
  sizes['breakpoints-tablet'] || '(max-width: 1279.5px) and (min-width: 768px)',
);
// vertical media queries
export const desktopVerticalMedia = cleanMediaQuery(sizes['breakpoints-desktop-v'] || '(aspect-ratio >= 1440 / 700)');
export const deviceVerticalMedia = cleanMediaQuery(sizes['breakpoints-devices-v'] || '(aspect-ratio >= 375 / 630)');

interface UseViewportOptions {
  debounceTime?: number;
}

export function useMatchMedia(options: UseViewportOptions = {}) {
  const { debounceTime = 250 } = options;

  const isDevices = ref<boolean>(false);
  const isTablet = ref<boolean>(false);
  const isDesktop = ref<boolean>(false);

  const updateViewport = () => {
    isDevices.value = matchMedia(deviceMedia).matches;
    isDesktop.value = matchMedia(desktopMedia).matches;
    isTablet.value = isDevices.value && matchMedia(tabletMedia).matches;
  };

  const resizeHandler = debounce(updateViewport, debounceTime);

  onMounted(() => {
    updateViewport();
    window.addEventListener('resize', resizeHandler);
  });

  onUnmounted(() => {
    resizeHandler.cancel();
    window.removeEventListener('resize', resizeHandler);
  });

  return {
    isDevices,
    isTablet,
    isDesktop,
  };
}
