import sizes from '@/assets/styles/config.module.scss';
import { desktopMedia, deviceMedia, desktopVerticalMedia, deviceVerticalMedia } from '@/composables/useMatchMedia';

const MOBILE = sizes['sizes-mobile'] ? +sizes['sizes-mobile'] : 375;
const MOBILE_V = sizes['sizes-mobile-v'] ? +sizes['sizes-mobile-v'] : 630;
const DESKTOP = sizes['sizes-desktop-sm'] ? +sizes['sizes-desktop-sm'] : 1440;
const DESKTOP_V = sizes['sizes-desktop-v'] ? +sizes['sizes-desktop-v'] : 700;

export const vc = (
  value: number,
  options = {
    baseSize: {
      desktop: DESKTOP,
      devices: MOBILE,
      devicesV: MOBILE_V,
      desktopV: DESKTOP_V,
    },
  },
): number => {
  const desktop = matchMedia(desktopMedia).matches;
  const desktopVer = matchMedia(desktopVerticalMedia).matches;
  const devices = matchMedia(deviceMedia).matches;
  const devicesVer = matchMedia(deviceVerticalMedia).matches;

  // device vertical sizes
  if (devices && devicesVer) {
    return value * (innerHeight / options.baseSize.devicesV);
  }

  // device horizontal sizes
  if (devices) {
    return value * (innerWidth / options.baseSize.devices);
  }

  // desktop vertical sizes
  if (desktop && desktopVer) {
    return value * (innerHeight / options.baseSize.desktopV);
  }

  // desktop horizontal sizes
  if (desktop) {
    return value * (innerWidth / options.baseSize.desktop);
  }

  console.error('no match');
  return value;
};

export const cssVc = (value: string | number) => `calc(${value} * var(--width-multiplier))`;
